#!/usr/bin/env python3
"""T-006 audit for decoupling need strength from preferred city exposure.

This harness changes only the preferred-range generator. It reuses the locked
100-city vectors, T-005 synthetic profiles, manual stress-case interpretations,
interval scoring curve, tier importance, dayun output and default-off direction
policy without changing them.
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import random
import statistics
from collections import Counter
from pathlib import Path

from t005_manual_chart_regression import CASE_SPECS, build_profile
from t005_matching_simulation import (
    ELEMENTS,
    PROFILE_COUNT,
    SEED,
    TIERS,
    make_profiles,
    model_interval,
    preferred_ranges as legacy_ranges,
)


SCHEMES = {
    "r1_selective": {
        "version": "preferred-exposure-r1-selective-candidate",
        "label": "选择性较强",
        "max_need_quantile_shift": 0.04,
        "bands": {
            "strong_prefer": {"low_q": 0.60, "target_q": 0.85, "high_q": 1.00},
            "prefer": {"low_q": 0.40, "target_q": 0.65, "high_q": 0.90},
            "neutral": {"low_q": 0.20, "target_q": 0.50, "high_q": 0.80},
            "avoid": {"low_q": 0.00, "target_q": 0.20, "high_q": 0.60},
            "strong_avoid": {"low_q": 0.00, "target_q": 0.08, "high_q": 0.45},
        },
    },
    "r2_balanced": {
        "version": "preferred-exposure-r2-balanced-candidate",
        "label": "平衡重叠",
        "max_need_quantile_shift": 0.05,
        "bands": {
            "strong_prefer": {"low_q": 0.50, "target_q": 0.85, "high_q": 1.00},
            "prefer": {"low_q": 0.25, "target_q": 0.62, "high_q": 0.92},
            "neutral": {"low_q": 0.10, "target_q": 0.50, "high_q": 0.90},
            "avoid": {"low_q": 0.00, "target_q": 0.20, "high_q": 0.70},
            "strong_avoid": {"low_q": 0.00, "target_q": 0.08, "high_q": 0.60},
        },
    },
    "r3_wide": {
        "version": "preferred-exposure-r3-wide-candidate",
        "label": "可行性优先",
        "max_need_quantile_shift": 0.05,
        "bands": {
            "strong_prefer": {"low_q": 0.40, "target_q": 0.80, "high_q": 1.00},
            "prefer": {"low_q": 0.15, "target_q": 0.58, "high_q": 0.95},
            "neutral": {"low_q": 0.00, "target_q": 0.50, "high_q": 1.00},
            "avoid": {"low_q": 0.00, "target_q": 0.18, "high_q": 0.80},
            "strong_avoid": {"low_q": 0.00, "target_q": 0.08, "high_q": 0.70},
        },
    },
}


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def percentile(sorted_values: list[float], q: float) -> float:
    position = (len(sorted_values) - 1) * clamp(q)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return sorted_values[lower]
    return sorted_values[lower] * (upper - position) + sorted_values[upper] * (position - lower)


def jaccard(left: set[str], right: set[str]) -> float:
    return len(left & right) / len(left | right) if left or right else 1.0


def gini(values: list[int]) -> float:
    ordered = sorted(values)
    total = sum(ordered)
    if not total:
        return 0.0
    count = len(ordered)
    return (2 * sum((index + 1) * value for index, value in enumerate(ordered)) / (count * total)) - (count + 1) / count


def load_cities(root: Path) -> tuple[list[dict], str]:
    path = root / "data" / "cities.csv"
    with path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 100
    assert len({row["city_id"] for row in rows}) == 100
    assert {row["mapping_version"] for row in rows} == {"city-elements-v0.2.1-scheme-c-candidate"}
    cities = []
    for row in rows:
        vector = [float(row[f"{element}_score_raw"]) / 100.0 for element in ELEMENTS]
        assert abs(sum(vector) - 1.0) < 1e-6
        cities.append({
            "city_id": row["city_id"],
            "name_en": row["city_name_en"],
            "name_zh": row["city_name_zh"],
            "vector": vector,
        })
    return cities, hashlib.sha256(path.read_bytes()).hexdigest().upper()


def city_distributions(cities: list[dict]) -> dict[str, list[float]]:
    return {
        element: sorted(city["vector"][index] for city in cities)
        for index, element in enumerate(ELEMENTS)
    }


def need_strength_reference(profiles: list[dict]) -> dict[str, dict[str, float]]:
    reference = {}
    for tier in TIERS:
        values = sorted(
            profile["current_need_vector"][index]
            for profile in profiles
            for index, assigned_tier in enumerate(profile["tiers"])
            if assigned_tier == tier
        )
        reference[tier] = {
            "q10": percentile(values, 0.10),
            "median": percentile(values, 0.50),
            "q90": percentile(values, 0.90),
        }
    return reference


def need_position(value: float, tier: str, reference: dict[str, dict[str, float]]) -> float:
    band = reference[tier]
    median = band["median"]
    if value >= median:
        return clamp((value - median) / max(band["q90"] - median, 1e-9), -1.0, 1.0)
    return clamp((value - median) / max(median - band["q10"], 1e-9), -1.0, 1.0)


def exposure_ranges(
    profile: dict,
    scheme: dict,
    distributions: dict[str, list[float]],
    reference: dict[str, dict[str, float]],
) -> list[dict[str, float]]:
    """Map tier plus bounded within-tier need variation to city exposure bands."""
    ranges = []
    for index, (element, tier) in enumerate(zip(ELEMENTS, profile["tiers"])):
        definition = scheme["bands"][tier]
        position = need_position(profile["current_need_vector"][index], tier, reference)
        shift = scheme["max_need_quantile_shift"] * position
        quantiles = {
            key: clamp(definition[key] + shift)
            for key in ("low_q", "target_q", "high_q")
        }
        quantiles["target_q"] = clamp(quantiles["target_q"], quantiles["low_q"], quantiles["high_q"])
        values = distributions[element]
        low = percentile(values, quantiles["low_q"])
        target = percentile(values, quantiles["target_q"])
        high = percentile(values, quantiles["high_q"])
        ranges.append({
            "low": low,
            "target": target,
            "high": high,
            "low_q": quantiles["low_q"],
            "target_q": quantiles["target_q"],
            "high_q": quantiles["high_q"],
            "need_position": position,
        })
    return ranges


def reference_exposure_table(scheme: dict, distributions: dict[str, list[float]]) -> dict:
    """Return unshifted exposure percentages for a median within-tier need."""
    return {
        tier: {
            element: {
                "low": 100.0 * percentile(distributions[element], definition["low_q"]),
                "target": 100.0 * percentile(distributions[element], definition["target_q"]),
                "high": 100.0 * percentile(distributions[element], definition["high_q"]),
            }
            for element in ELEMENTS
        }
        for tier, definition in scheme["bands"].items()
    }


def score_profile(profile: dict, ranges: list[dict], cities: list[dict]) -> list[dict]:
    scoring_profile = dict(profile)
    scoring_profile["preferred_ranges"] = ranges
    ranked = [
        {"score": model_interval(scoring_profile, city["vector"]), "city": city}
        for city in cities
    ]
    ranked.sort(key=lambda item: (-item["score"], item["city"]["name_en"]))
    return ranked


def coverage(rankings: list[list[dict]], city_names: list[str], count: int) -> dict:
    occurrences = Counter(
        item["city"]["name_en"]
        for ranking in rankings
        for item in ranking[:count]
    )
    values = [occurrences.get(name, 0) for name in city_names]
    total = sum(values)
    shares = [value / total for value in values]
    entropy = -sum(share * math.log(share) for share in shares if share > 0) / math.log(len(values))
    return {
        "cities_with_zero": sum(value == 0 for value in values),
        "zero_cities": [name for name in city_names if occurrences.get(name, 0) == 0],
        "unique_cities": sum(value > 0 for value in values),
        "max_city": max(occurrences, key=lambda name: (occurrences[name], name)),
        "max_city_count": max(values),
        "max_city_share": max(shares),
        "top_10_cities_share": sum(sorted(shares, reverse=True)[:10]),
        "hhi_10000": 10000.0 * sum(share * share for share in shares),
        "normalized_entropy": entropy,
        "gini": gini(values),
        "counts": dict(sorted(
            ((name, occurrences.get(name, 0)) for name in city_names),
            key=lambda item: (-item[1], item[0]),
        )),
        "top_counts": occurrences.most_common(15),
        "bottom_counts": sorted(
            ((name, occurrences.get(name, 0)) for name in city_names),
            key=lambda item: (item[1], item[0]),
        )[:15],
    }


def range_checks(profile: dict, ranges: list[dict], cities: list[dict], ranked: list[dict]) -> dict:
    violation_counts = []
    feasible = 0
    for city in cities:
        violations = sum(
            not (band["low"] <= value <= band["high"])
            for value, band in zip(city["vector"], ranges)
        )
        violation_counts.append(violations)
        feasible += int(violations == 0)
    strong_avoid_index = profile["tiers"].index("strong_avoid")
    high = ranges[strong_avoid_index]["high"]
    excesses = [
        max(0.0, item["city"]["vector"][strong_avoid_index] - high)
        for item in ranked[:10]
    ]
    return {
        "feasible_city_count": feasible,
        "minimum_violations": min(violation_counts),
        "strong_avoid_over_top10": sum(value > 1e-12 for value in excesses),
        "strong_avoid_over_5_points_top10": sum(value > 0.05 for value in excesses),
        "strong_avoid_over_10_points_top10": sum(value > 0.10 for value in excesses),
        "maximum_strong_avoid_excess_points_top10": 100.0 * max(excesses),
    }


def same_primary_distinction(profiles: list[dict], rankings: list[list[dict]], seed: int) -> dict:
    rng = random.Random(seed)
    output = {}
    for element in ELEMENTS:
        eligible = [index for index, profile in enumerate(profiles) if profile["primary_element"] == element]
        if len(eligible) < 2:
            output[element] = {
                "sampled_pairs": 0,
                "mean_top10_jaccard": None,
                "median_top10_jaccard": None,
                "unique_top1_cities": len({rankings[index][0]["city"]["name_en"] for index in eligible}),
            }
            continue
        values = []
        attempts = 0
        while len(values) < 500 and attempts < 20000:
            left, right = rng.sample(eligible, 2)
            attempts += 1
            left_profile, right_profile = profiles[left], profiles[right]
            if (
                left_profile["secondary_element"] == right_profile["secondary_element"]
                and left_profile["avoid_elements"] == right_profile["avoid_elements"]
            ):
                continue
            left_names = {item["city"]["name_en"] for item in rankings[left][:10]}
            right_names = {item["city"]["name_en"] for item in rankings[right][:10]}
            values.append(jaccard(left_names, right_names))
        output[element] = {
            "sampled_pairs": len(values),
            "mean_top10_jaccard": statistics.fmean(values),
            "median_top10_jaccard": statistics.median(values),
            "unique_top1_cities": len({rankings[index][0]["city"]["name_en"] for index in eligible}),
        }
    all_values = [item["mean_top10_jaccard"] for item in output.values() if item["mean_top10_jaccard"] is not None]
    output["all_primary_mean"] = statistics.fmean(all_values)
    return output


def dayun_stability(profiles: list[dict], cities: list[dict], range_builder) -> dict:
    top10_jaccards = []
    top1_changes = 0
    target_shifts = []
    for profile in profiles:
        base_profile = dict(profile)
        base_profile["current_need_vector"] = list(profile["base_need_vector"])
        base_ranges = range_builder(base_profile)
        current_ranges = range_builder(profile)
        base_ranking = score_profile(base_profile, base_ranges, cities)
        current_ranking = score_profile(profile, current_ranges, cities)
        top10_jaccards.append(jaccard(
            {item["city"]["name_en"] for item in base_ranking[:10]},
            {item["city"]["name_en"] for item in current_ranking[:10]},
        ))
        top1_changes += int(base_ranking[0]["city"]["name_en"] != current_ranking[0]["city"]["name_en"])
        target_shifts.extend(
            100.0 * abs(after["target"] - before["target"])
            for before, after in zip(base_ranges, current_ranges)
        )
    return {
        "mean_top10_jaccard_before_after": statistics.fmean(top10_jaccards),
        "minimum_top10_jaccard_before_after": min(top10_jaccards),
        "top1_changed_profiles": top1_changes,
        "mean_absolute_target_shift_points": statistics.fmean(target_shifts),
        "maximum_absolute_target_shift_points": max(target_shifts),
        "profile_count": len(profiles),
    }


def evaluate_profiles(
    profiles: list[dict],
    cities: list[dict],
    range_builder,
    seed: int,
) -> tuple[dict, list[list[dict]], list[list[dict]]]:
    rankings = []
    ranges_by_profile = []
    checks = []
    primary_top5_lifts = []
    primary_max_top1 = 0
    city_means = [statistics.fmean(city["vector"][index] for city in cities) for index in range(5)]
    strong_prefer_targets = []
    for profile in profiles:
        ranges = range_builder(profile)
        ranked = score_profile(profile, ranges, cities)
        rankings.append(ranked)
        ranges_by_profile.append(ranges)
        checks.append(range_checks(profile, ranges, cities, ranked))
        primary_index = ELEMENTS.index(profile["primary_element"])
        primary_top5_lifts.append(
            100.0 * (statistics.fmean(item["city"]["vector"][primary_index] for item in ranked[:5]) - city_means[primary_index])
        )
        max_primary_city = max(cities, key=lambda city: city["vector"][primary_index])["name_en"]
        primary_max_top1 += int(ranked[0]["city"]["name_en"] == max_primary_city)
        strong_prefer_targets.append(100.0 * ranges[profile["tiers"].index("strong_prefer")]["target"])

    feasible_counts = [item["feasible_city_count"] for item in checks]
    minimum_violations = [item["minimum_violations"] for item in checks]
    infeasible_examples = [
        {
            "profile_id": profile.get("profile_id", ""),
            "primary_element": profile["primary_element"],
            "secondary_element": profile["secondary_element"],
            "avoid_elements": profile["avoid_elements"],
            "intensity": profile.get("intensity"),
            "climate_need": profile.get("climate_need"),
            "tier_by_element": profile["tier_by_element"],
        }
        for profile, check in zip(profiles, checks)
        if check["feasible_city_count"] == 0
    ][:25]
    city_names = [city["name_en"] for city in cities]
    summary = {
        "top5": coverage(rankings, city_names, 5),
        "top10": coverage(rankings, city_names, 10),
        "joint_feasibility": {
            "profiles_with_any_feasible_city": sum(value > 0 for value in feasible_counts),
            "share_with_any_feasible_city": sum(value > 0 for value in feasible_counts) / len(profiles),
            "mean_feasible_city_count": statistics.fmean(feasible_counts),
            "median_feasible_city_count": statistics.median(feasible_counts),
            "minimum_feasible_city_count": min(feasible_counts),
            "maximum_feasible_city_count": max(feasible_counts),
            "mean_minimum_violations": statistics.fmean(minimum_violations),
            "maximum_minimum_violations": max(minimum_violations),
            "infeasible_profile_examples_max_25": infeasible_examples,
        },
        "strong_avoid_top10": {
            "over_high": sum(item["strong_avoid_over_top10"] for item in checks),
            "over_5_points": sum(item["strong_avoid_over_5_points_top10"] for item in checks),
            "over_10_points": sum(item["strong_avoid_over_10_points_top10"] for item in checks),
            "maximum_excess_points": max(item["maximum_strong_avoid_excess_points_top10"] for item in checks),
            "slots": len(profiles) * 10,
        },
        "primary_discrimination": {
            "mean_top5_primary_exposure_lift_points": statistics.fmean(primary_top5_lifts),
            "primary_max_city_is_top1_profiles": primary_max_top1,
            "primary_max_city_is_not_top1_profiles": len(profiles) - primary_max_top1,
            "strong_prefer_target_min_points": min(strong_prefer_targets),
            "strong_prefer_target_mean_points": statistics.fmean(strong_prefer_targets),
            "strong_prefer_target_max_points": max(strong_prefer_targets),
        },
        "same_primary_different_secondary_or_avoid": same_primary_distinction(profiles, rankings, seed),
    }
    return summary, rankings, ranges_by_profile


def compact_metrics(summary: dict) -> dict:
    return {
        "top5_zero": summary["top5"]["cities_with_zero"],
        "top10_zero": summary["top10"]["cities_with_zero"],
        "top5_max_share": summary["top5"]["max_city_share"],
        "top5_top10_share": summary["top5"]["top_10_cities_share"],
        "top5_hhi": summary["top5"]["hhi_10000"],
        "top10_entropy": summary["top10"]["normalized_entropy"],
        "joint_feasible_share": summary["joint_feasibility"]["share_with_any_feasible_city"],
        "mean_feasible_cities": summary["joint_feasibility"]["mean_feasible_city_count"],
        "strong_avoid_over_top10": summary["strong_avoid_top10"]["over_high"],
        "primary_lift_points": summary["primary_discrimination"]["mean_top5_primary_exposure_lift_points"],
        "same_primary_jaccard": summary["same_primary_different_secondary_or_avoid"]["all_primary_mean"],
    }


def manual_profiles() -> list[dict]:
    profiles = []
    for spec in CASE_SPECS:
        profile = build_profile(spec)
        profile["profile_id"] = spec["id"]
        profile["label"] = spec["label"]
        profile["case_spec"] = spec
        profiles.append(profile)
    return profiles


def manual_detail(
    profiles: list[dict],
    cities: list[dict],
    rankings: list[list[dict]],
    ranges_by_profile: list[list[dict]],
    legacy_rankings: list[list[dict]],
    range_builder,
) -> list[dict]:
    output = []
    for profile, ranking, ranges, legacy_ranking in zip(profiles, rankings, ranges_by_profile, legacy_rankings):
        check = range_checks(profile, ranges, cities, ranking)
        strong_avoid_index = profile["tiers"].index("strong_avoid")
        top3 = []
        for item in ranking[:3]:
            city = item["city"]
            elements = []
            for element, tier, value, band in zip(ELEMENTS, profile["tiers"], city["vector"], ranges):
                if value < band["low"]:
                    state = "below"
                    deviation = value - band["low"]
                elif value > band["high"]:
                    state = "above"
                    deviation = value - band["high"]
                else:
                    state = "within"
                    deviation = value - band["target"]
                elements.append({
                    "element": element,
                    "tier": tier,
                    "city_value": 100.0 * value,
                    "low": 100.0 * band["low"],
                    "target": 100.0 * band["target"],
                    "high": 100.0 * band["high"],
                    "state": state,
                    "deviation_points": 100.0 * deviation,
                })
            top3.append({
                "city_name_en": city["name_en"],
                "city_name_zh": city["name_zh"],
                "raw_match_score": item["score"],
                "city_vector": [100.0 * value for value in city["vector"]],
                "elements": elements,
                "within_range_count": sum(element["state"] == "within" for element in elements),
            })

        alternative_output = None
        spec = profile["case_spec"]
        if spec.get("alternative"):
            alternative_profile = build_profile(spec, spec["alternative"])
            alternative_ranges = range_builder(alternative_profile)
            alternative_ranking = score_profile(alternative_profile, alternative_ranges, cities)
            alternative_check = range_checks(alternative_profile, alternative_ranges, cities, alternative_ranking)
            alternative_output = {
                "label": spec["alternative"]["label"],
                "reason": spec["alternative"]["reason"],
                "primary_element": alternative_profile["primary_element"],
                "secondary_element": alternative_profile["secondary_element"],
                "feasible_city_count": alternative_check["feasible_city_count"],
                "top10": [item["city"]["name_en"] for item in alternative_ranking[:10]],
                "top10_jaccard_with_main": jaccard(
                    {item["city"]["name_en"] for item in ranking[:10]},
                    {item["city"]["name_en"] for item in alternative_ranking[:10]},
                ),
                "top1_stable": ranking[0]["city"]["name_en"] == alternative_ranking[0]["city"]["name_en"],
            }
        output.append({
            "case_id": profile["profile_id"],
            "label": profile["label"],
            "primary_element": profile["primary_element"],
            "secondary_element": profile["secondary_element"],
            "strong_avoid_element": ELEMENTS[strong_avoid_index],
            "preferred_city_exposure": {
                element: {
                    "tier": tier,
                    "low": 100.0 * band["low"],
                    "target": 100.0 * band["target"],
                    "high": 100.0 * band["high"],
                }
                for element, tier, band in zip(ELEMENTS, profile["tiers"], ranges)
            },
            "feasible_city_count": check["feasible_city_count"],
            "minimum_violations": check["minimum_violations"],
            "strong_avoid_over_top10": check["strong_avoid_over_top10"],
            "strong_avoid_over_5_points_top10": check["strong_avoid_over_5_points_top10"],
            "top10": [item["city"]["name_en"] for item in ranking[:10]],
            "top3_details": top3,
            "top10_jaccard_with_legacy": jaccard(
                {item["city"]["name_en"] for item in ranking[:10]},
                {item["city"]["name_en"] for item in legacy_ranking[:10]},
            ),
            "top1_changed_from_legacy": ranking[0]["city"]["name_en"] != legacy_ranking[0]["city"]["name_en"],
            "alternative_scenario": alternative_output,
        })
    return output


def round_floats(value):
    if isinstance(value, float):
        return round(value, 6)
    if isinstance(value, list):
        return [round_floats(item) for item in value]
    if isinstance(value, dict):
        return {key: round_floats(item) for key, item in value.items()}
    return value


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    cities, city_sha256 = load_cities(root)
    distributions = city_distributions(cities)
    synthetic = make_profiles()
    assert len(synthetic) == PROFILE_COUNT
    manual = manual_profiles()
    reference = need_strength_reference(synthetic)

    legacy_synthetic, legacy_synthetic_rankings, _ = evaluate_profiles(
        synthetic,
        cities,
        lambda profile: legacy_ranges(profile["current_need_vector"], profile["tiers"]),
        SEED + 10,
    )
    legacy_manual, legacy_manual_rankings, legacy_manual_ranges = evaluate_profiles(
        manual,
        cities,
        lambda profile: legacy_ranges(profile["current_need_vector"], profile["tiers"]),
        SEED + 11,
    )
    legacy_builder = lambda profile: legacy_ranges(profile["current_need_vector"], profile["tiers"])
    legacy_synthetic["dayun_range_effect"] = dayun_stability(synthetic, cities, legacy_builder)
    legacy_manual["dayun_range_effect"] = dayun_stability(manual, cities, legacy_builder)

    scheme_results = {}
    for offset, (scheme_id, scheme) in enumerate(SCHEMES.items(), 1):
        builder = lambda profile, current_scheme=scheme: exposure_ranges(
            profile, current_scheme, distributions, reference
        )
        synthetic_summary, synthetic_rankings, _ = evaluate_profiles(
            synthetic, cities, builder, SEED + 100 + offset
        )
        manual_summary, manual_rankings, manual_ranges = evaluate_profiles(
            manual, cities, builder, SEED + 200 + offset
        )
        synthetic_summary["dayun_range_effect"] = dayun_stability(synthetic, cities, builder)
        manual_summary["dayun_range_effect"] = dayun_stability(manual, cities, builder)
        details = manual_detail(
            manual, cities, manual_rankings, manual_ranges, legacy_manual_rankings, builder
        )
        alternative_details = [item["alternative_scenario"] for item in details if item["alternative_scenario"]]
        scheme_results[scheme_id] = {
            "definition": scheme,
            "reference_exposure_percent_at_median_within_tier_need": reference_exposure_table(
                scheme, distributions
            ),
            "synthetic_3000": synthetic_summary,
            "manual_15": manual_summary,
            "manual_comparison": {
                "cases_with_any_feasible_city": sum(item["feasible_city_count"] > 0 for item in details),
                "mean_feasible_city_count": statistics.fmean(item["feasible_city_count"] for item in details),
                "mean_top10_jaccard_with_legacy": statistics.fmean(item["top10_jaccard_with_legacy"] for item in details),
                "top1_changed_from_legacy_cases": sum(item["top1_changed_from_legacy"] for item in details),
                "strong_avoid_over_top10": sum(item["strong_avoid_over_top10"] for item in details),
                "strong_avoid_over_5_points_top10": sum(item["strong_avoid_over_5_points_top10"] for item in details),
                "top1_with_all_five_in_range_cases": sum(
                    item["top3_details"][0]["within_range_count"] == 5 for item in details
                ),
                "top3_all_five_in_range_slots": sum(
                    top["within_range_count"] == 5
                    for item in details
                    for top in item["top3_details"]
                ),
                "top3_mean_elements_in_range": statistics.fmean(
                    top["within_range_count"]
                    for item in details
                    for top in item["top3_details"]
                ),
                "alternative_case_count": len(alternative_details),
                "alternative_mean_top10_jaccard": statistics.fmean(
                    item["top10_jaccard_with_main"] for item in alternative_details
                ),
                "alternative_top1_stable_cases": sum(item["top1_stable"] for item in alternative_details),
            },
            "manual_cases": details,
        }

    quantile_points = [0.00, 0.05, 0.10, 0.20, 0.25, 0.40, 0.50, 0.60, 0.70, 0.75, 0.80, 0.90, 0.95, 1.00]
    result = {
        "schema_version": "t006-preferred-ranges-calibration-v0.1",
        "generated_on": "2026-09-11",
        "task": "T-006",
        "status": "candidate_ranges_compared_not_locked",
        "scope": {
            "changed_layer": "preferred_city_exposure range generator only",
            "need_strength": "unchanged personal-need-v0.1-candidate current_need_vector",
            "matching_curve": "unchanged t005 model_interval",
            "tier_importance": "unchanged TIER_IMPORTANCE inside model_interval",
            "dayun": "unchanged current_need_vector produced by dayun-adjustment-v0.1-candidate",
            "direction": "default off for isolation; direction-adjustment-v0.1-candidate unchanged",
            "index_calibration": "not used for ranking comparison and unchanged",
            "city_profile_or_frontend": False,
        },
        "inputs": {
            "city_count": len(cities),
            "city_file": "data/cities.csv",
            "city_sha256": city_sha256,
            "city_mapping_version": "city-elements-v0.2.1-scheme-c-candidate",
            "synthetic_profile_count": len(synthetic),
            "manual_stress_case_count": len(manual),
            "real_person_cases": 0,
            "seed": SEED,
        },
        "city_element_quantiles_points": {
            element: {
                f"q{int(quantile * 100):02d}": 100.0 * percentile(values, quantile)
                for quantile in quantile_points
            }
            for element, values in distributions.items()
        },
        "need_strength_within_tier_reference": reference,
        "legacy": {
            "description": "v0.1 ranges mechanically generated from normalized need vector",
            "synthetic_3000": legacy_synthetic,
            "manual_15": legacy_manual,
            "manual_ranges": [
                {
                    "case_id": profile["profile_id"],
                    "ranges": {
                        element: {"tier": tier, **band}
                        for element, tier, band in zip(ELEMENTS, profile["tiers"], ranges)
                    },
                }
                for profile, ranges in zip(manual, legacy_manual_ranges)
            ],
        },
        "candidate_schemes": scheme_results,
        "comparison_compact": {
            "legacy": {
                "synthetic": compact_metrics(legacy_synthetic),
                "manual": compact_metrics(legacy_manual),
            },
            **{
                scheme_id: {
                    "synthetic": compact_metrics(data["synthetic_3000"]),
                    "manual": compact_metrics(data["manual_15"]),
                }
                for scheme_id, data in scheme_results.items()
            },
        },
        "recommendation": {
            "scheme": "r2_balanced",
            "status": "recommend_for_chat_review_not_locked",
            "reason": "R2 makes all 15 manual cases and 99.5% of synthetic profiles jointly feasible, retains stronger selectivity than R3, keeps all 100 cities represented in synthetic Top 10, lowers Top-5 concentration versus legacy, and keeps strong-prefer targets within the empirical city distribution rather than 40%-50% shares.",
        },
        "versions": {
            "personal_need": "personal-need-v0.1-candidate",
            "city_engine": "city-elements-v0.2.1-scheme-c-candidate",
            "matching_engine": "matching-engine-v0.1-candidate",
            "matching_index": "matching-index-calibration-v0.1-candidate",
            "dayun": "dayun-adjustment-v0.1-candidate",
            "direction": "direction-adjustment-v0.1-candidate",
        },
    }
    result = round_floats(result)
    r2 = result["candidate_schemes"]["r2_balanced"]
    assert r2["manual_comparison"]["cases_with_any_feasible_city"] == 15
    assert r2["synthetic_3000"]["joint_feasibility"]["profiles_with_any_feasible_city"] == 2985
    assert r2["synthetic_3000"]["top10"]["cities_with_zero"] == 0
    assert r2["synthetic_3000"]["primary_discrimination"]["strong_prefer_target_max_points"] < 40.0
    assert r2["synthetic_3000"]["strong_avoid_top10"]["over_10_points"] == 0
    assert r2["manual_15"]["strong_avoid_top10"]["over_5_points"] == 0
    assert result["scope"]["matching_curve"] == "unchanged t005 model_interval"
    assert result["status"] == "candidate_ranges_compared_not_locked"
    output = root / "data" / "preferred_ranges_calibration_results.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output),
        "city_sha256": city_sha256,
        "comparison": result["comparison_compact"],
        "manual_comparison": {
            scheme_id: data["manual_comparison"] for scheme_id, data in result["candidate_schemes"].items()
        },
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
