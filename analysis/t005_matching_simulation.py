#!/usr/bin/env python3
"""Deterministic T-005 simulation for the five-element city matching model.

This is an audit harness, not application code. It reads the locked City Engine
vectors, generates a stratified synthetic personal-need population, compares
three matching rules, and writes a compact reproducible JSON report.
"""

from __future__ import annotations

import csv
import json
import math
import random
import statistics
from collections import Counter
from pathlib import Path


SEED = 20260911
PROFILE_COUNT = 3000
ELEMENTS = ("wood", "fire", "earth", "metal", "water")
TIERS = ("strong_prefer", "prefer", "neutral", "avoid", "strong_avoid")
TIER_IMPORTANCE = {
    "strong_prefer": 1.30,
    "prefer": 1.00,
    "neutral": 0.55,
    "avoid": 1.15,
    "strong_avoid": 1.40,
}
INTENSITY_ANCHORS = {
    "soft": {
        "strong_prefer": 0.90,
        "prefer": 0.75,
        "neutral": 0.55,
        "avoid": 0.27,
        "strong_avoid": 0.12,
    },
    "standard": {
        "strong_prefer": 1.05,
        "prefer": 0.72,
        "neutral": 0.45,
        "avoid": 0.18,
        "strong_avoid": 0.07,
    },
    "concentrated": {
        "strong_prefer": 1.25,
        "prefer": 0.68,
        "neutral": 0.38,
        "avoid": 0.12,
        "strong_avoid": 0.04,
    },
}
CLIMATE_ADJUSTMENTS = {
    "balanced": {},
    "cold_need_warmth": {"fire": 0.20, "wood": 0.05},
    "hot_need_cooling": {"water": 0.20, "metal": 0.05},
    "dry_need_moisture": {"water": 0.15, "wood": 0.10},
    "wet_need_drying": {"fire": 0.12, "earth": 0.08},
}
ORIGINS = (
    (39.9042, 116.4074),
    (31.2304, 121.4737),
    (22.3193, 114.1694),
    (51.5074, -0.1278),
    (40.7128, -74.0060),
    (34.0522, -118.2437),
    (1.3521, 103.8198),
    (35.6762, 139.6503),
    (-33.8688, 151.2093),
    (25.2048, 55.2708),
    (-1.2921, 36.8219),
    (-23.5505, -46.6333),
)


def normalize(values: list[float], total: float = 1.0) -> list[float]:
    s = sum(values)
    if s <= 0:
        return [total / len(values)] * len(values)
    return [x * total / s for x in values]


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def percentile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    pos = (len(sorted_values) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return sorted_values[lo]
    return sorted_values[lo] * (hi - pos) + sorted_values[hi] * (pos - lo)


def preferred_ranges(target: list[float], tier_by_index: list[str]) -> list[dict[str, float]]:
    ranges = []
    for value, tier in zip(target, tier_by_index):
        if tier == "strong_prefer":
            low, high = 0.75 * value, min(0.62, 1.27 * value + 0.01)
        elif tier == "prefer":
            low, high = 0.68 * value, min(0.52, 1.32 * value + 0.015)
        elif tier == "neutral":
            low, high = max(0.0, value - 0.065), min(0.42, value + 0.065)
        elif tier == "avoid":
            low, high = 0.0, min(0.20, value + 0.075)
        else:
            low, high = 0.0, min(0.12, value + 0.045)
        ranges.append({"low": low, "target": value, "high": max(low, high)})
    return ranges


def apply_dayun(
    base: list[float],
    adjustment: list[float],
    protected_top: int,
    protected_bottom: int,
) -> tuple[list[float], list[float]]:
    adjusted = normalize([x * math.exp(0.10 * a) for x, a in zip(base, adjustment)])
    delta = [a - b for a, b in zip(adjusted, base)]
    l1 = sum(abs(x) for x in delta)
    max_component = max(abs(x) for x in delta)
    scale = min(1.0, 0.08 / l1 if l1 else 1.0, 0.03 / max_component if max_component else 1.0)
    for _ in range(12):
        candidate = normalize([b + d * scale for b, d in zip(base, delta)])
        if max(range(5), key=lambda i: candidate[i]) == protected_top and min(range(5), key=lambda i: candidate[i]) == protected_bottom:
            adjusted = candidate
            break
        scale *= 0.5
    else:
        adjusted = list(base)
    return adjusted, [a - b for a, b in zip(adjusted, base)]


def make_profiles() -> list[dict]:
    rng = random.Random(SEED)
    profiles = []
    climate_modes = tuple(CLIMATE_ADJUSTMENTS)
    intensities = tuple(INTENSITY_ANCHORS)
    for idx in range(PROFILE_COUNT):
        primary_idx = idx % 5
        secondary_candidates = [i for i in range(5) if i != primary_idx]
        secondary_idx = secondary_candidates[(idx // 5) % 4]
        intensity = intensities[(idx // 20) % 3]
        climate = climate_modes[(idx // 60) % 5]
        remaining = [i for i in range(5) if i not in (primary_idx, secondary_idx)]
        rng.shuffle(remaining)
        neutral_idx, avoid_idx, strong_avoid_idx = remaining

        tiers = [""] * 5
        tiers[primary_idx] = "strong_prefer"
        tiers[secondary_idx] = "prefer"
        tiers[neutral_idx] = "neutral"
        tiers[avoid_idx] = "avoid"
        tiers[strong_avoid_idx] = "strong_avoid"

        anchors = INTENSITY_ANCHORS[intensity]
        raw = [anchors[t] for t in tiers]
        for element, boost in CLIMATE_ADJUSTMENTS[climate].items():
            raw[ELEMENTS.index(element)] += boost
        raw = [max(0.025, x * (1.0 + rng.uniform(-0.045, 0.045))) for x in raw]
        raw[primary_idx] = max(raw[primary_idx], max(raw[i] for i in range(5) if i != primary_idx) + 0.08)
        raw[strong_avoid_idx] = min(raw[strong_avoid_idx], min(raw[i] for i in range(5) if i != strong_avoid_idx) * 0.90)
        base = normalize(raw)

        if idx % 5 == 0:
            dayun_signal = [0.0] * 5
        else:
            dayun_signal = [clamp(rng.gauss(0.0, 0.55), -1.0, 1.0) for _ in range(5)]
            mean_signal = statistics.fmean(dayun_signal)
            dayun_signal = [clamp(x - mean_signal, -1.0, 1.0) for x in dayun_signal]
        current, dayun_delta = apply_dayun(base, dayun_signal, primary_idx, strong_avoid_idx)

        confidence = ("high", "medium", "low")[(idx // 300) % 3]
        alt = None
        if confidence == "low":
            alt_tiers = list(tiers)
            alt_tiers[primary_idx], alt_tiers[secondary_idx] = (
                alt_tiers[secondary_idx],
                alt_tiers[primary_idx],
            )
            alt_raw = [anchors[t] for t in alt_tiers]
            for element, boost in CLIMATE_ADJUSTMENTS[climate].items():
                alt_raw[ELEMENTS.index(element)] += 0.75 * boost
            alt = normalize(alt_raw)

        profiles.append(
            {
                "profile_id": f"sim-{idx + 1:04d}",
                "primary_element": ELEMENTS[primary_idx],
                "secondary_element": ELEMENTS[secondary_idx],
                "avoid_elements": [ELEMENTS[avoid_idx], ELEMENTS[strong_avoid_idx]],
                "tier_by_element": dict(zip(ELEMENTS, tiers)),
                "tiers": tiers,
                "intensity": intensity,
                "climate_need": climate,
                "base_need_vector": base,
                "current_need_vector": current,
                "preferred_ranges": preferred_ranges(current, tiers),
                "dayun_adjustment_vector": dayun_delta,
                "dayun_signal": dayun_signal,
                "confidence": confidence,
                "alternative_need_vector": alt,
                "origin": ORIGINS[idx % len(ORIGINS)],
            }
        )
    return profiles


def model_interval(profile: dict, city: list[float]) -> float:
    fits = []
    weights = []
    for c, band, tier in zip(city, profile["preferred_ranges"], profile["tiers"]):
        low, target, high = band["low"], band["target"], band["high"]
        if low <= c <= high:
            half = max(target - low, high - target, 0.03)
            fit = 1.0 - 0.12 * min(1.0, abs(c - target) / half)
        elif c < low:
            fit = 0.88 - 0.88 * ((low - c) / max(low, 0.06)) ** 1.35
        else:
            excess_weight = 1.45 if tier in ("avoid", "strong_avoid") else 1.0
            fit = 0.88 - excess_weight * ((c - high) / max(1.0 - high, 0.10)) ** 1.35
        fits.append(clamp(fit))
        weights.append(TIER_IMPORTANCE[tier])
    return sum(f * w for f, w in zip(fits, weights)) / sum(weights)


def model_satisfaction_excess(profile: dict, city: list[float]) -> float:
    fits = []
    weights = []
    avoid_risk = 0.0
    for c, band, tier in zip(city, profile["preferred_ranges"], profile["tiers"]):
        low, target, high = band["low"], band["target"], band["high"]
        if tier in ("strong_prefer", "prefer"):
            if c <= target:
                denom = 1.0 - math.exp(-2.6)
                fit = (1.0 - math.exp(-2.6 * c / max(target, 0.03))) / denom
            elif c <= high:
                fit = 1.0 - 0.05 * (c - target) / max(high - target, 0.03)
            else:
                severity = 1.25 if tier == "strong_prefer" else 1.05
                fit = 0.95 - severity * ((c - high) / max(1.0 - high, 0.10)) ** 1.4
        elif tier == "neutral":
            width = max(high - low, 0.08)
            fit = math.exp(-0.75 * ((c - target) / width) ** 2)
        else:
            if c <= target:
                fit = 1.0
            elif c <= high:
                fit = 1.0 - 0.18 * (c - target) / max(high - target, 0.025)
            else:
                severity = 2.25 if tier == "strong_avoid" else 1.55
                over = (c - high) / max(0.35 - high, 0.08)
                fit = 0.82 * math.exp(-severity * max(0.0, over) ** 1.35)
                avoid_risk += TIER_IMPORTANCE[tier] * max(0.0, over) ** 1.25
        fits.append(clamp(fit))
        weights.append(TIER_IMPORTANCE[tier])
    base = sum(f * w for f, w in zip(fits, weights)) / sum(weights)
    return clamp(base - 0.035 * avoid_risk / sum(weights))


def js_similarity(profile: dict, city: list[float]) -> float:
    p = profile["current_need_vector"]
    q = city
    m = [(a + b) / 2.0 for a, b in zip(p, q)]

    def kl(a: list[float], b: list[float]) -> float:
        return sum(x * math.log(x / y) for x, y in zip(a, b) if x > 0 and y > 0)

    jsd = 0.5 * kl(p, m) + 0.5 * kl(q, m)
    return clamp(1.0 - jsd / math.log(2.0))


def initial_bearing(origin: tuple[float, float], target: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, origin)
    lat2, lon2 = map(math.radians, target)
    dlon = lon2 - lon1
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def great_circle_km(origin: tuple[float, float], target: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, origin)
    lat2, lon2 = map(math.radians, target)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0088 * 2 * math.asin(min(1.0, math.sqrt(a)))


def direction_adjustment(profile: dict, target: tuple[float, float]) -> tuple[float, float, float]:
    distance = great_circle_km(profile["origin"], target)
    if distance < 1.0:
        return 0.0, 0.0, distance
    bearing = initial_bearing(profile["origin"], target)
    element_angles = {"wood": 90.0, "fire": 180.0, "metal": 270.0, "water": 0.0}
    tier_signal = {
        "strong_prefer": 1.0,
        "prefer": 0.55,
        "neutral": 0.0,
        "avoid": -0.45,
        "strong_avoid": -0.90,
    }
    terms = []
    magnitudes = []
    for element, angle in element_angles.items():
        signal = tier_signal[profile["tier_by_element"][element]]
        terms.append(signal * math.cos(math.radians(bearing - angle)))
        magnitudes.append(abs(signal))
    alignment = sum(terms) / max(sum(magnitudes), 1.0)
    distance_gate = clamp((distance - 100.0) / 400.0)
    adjustment = clamp(1.0 * alignment * distance_gate, -1.0, 1.0)
    return adjustment, bearing, distance


def calibrate_index(raw: float, anchors: dict[str, float]) -> float:
    q05, q50, q95 = anchors["q05"], anchors["q50"], anchors["q95"]
    if raw <= q05:
        score = 35.0 + 10.0 * (raw / max(q05, 1e-9))
    elif raw <= q50:
        score = 45.0 + 25.0 * (raw - q05) / max(q50 - q05, 1e-9)
    elif raw <= q95:
        score = 70.0 + 22.0 * (raw - q50) / max(q95 - q50, 1e-9)
    else:
        score = 92.0 + 4.0 * (raw - q95) / max(1.0 - q95, 1e-9)
    return clamp(score, 35.0, 96.0)


def gini(values: list[int]) -> float:
    ordered = sorted(values)
    total = sum(ordered)
    n = len(ordered)
    if not total:
        return 0.0
    return (2 * sum((i + 1) * x for i, x in enumerate(ordered)) / (n * total)) - (n + 1) / n


def coverage_metrics(rankings: list[list[str]], n: int) -> dict:
    counts = Counter(city for ranking in rankings for city in ranking[:n])
    values = [counts.get(city, 0) for city in ALL_CITY_NAMES]
    total = sum(values)
    shares = [x / total for x in values]
    entropy = -sum(x * math.log(x) for x in shares if x > 0) / math.log(len(values))
    return {
        "slots": total,
        "cities_with_zero": sum(x == 0 for x in values),
        "max_city_count": max(values),
        "max_city_share": max(shares),
        "top_10_cities_share": sum(sorted(shares, reverse=True)[:10]),
        "hhi_10000": 10000.0 * sum(x * x for x in shares),
        "normalized_entropy": entropy,
        "gini": gini(values),
        "counts": dict(sorted(counts.items(), key=lambda item: (-item[1], item[0]))),
    }


def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a or b else 1.0


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    city_path = root / "data" / "cities.csv"
    output_path = root / "data" / "matching_simulation_results.json"

    with city_path.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 100
    assert len({row["city_id"] for row in rows}) == 100
    assert {row["mapping_version"] for row in rows} == {"city-elements-v0.2.1-scheme-c-candidate"}

    cities = []
    for row in rows:
        vector = [float(row[f"{element}_score_raw"]) / 100.0 for element in ELEMENTS]
        assert abs(sum(vector) - 1.0) < 1e-6
        cities.append(
            {
                "city_id": row["city_id"],
                "name": row["city_name_en"],
                "name_zh": row["city_name_zh"],
                "vector": vector,
                "coord": (float(row["lat"]), float(row["lon"])),
                "mapping_version": row["mapping_version"],
            }
        )

    global ALL_CITY_NAMES
    ALL_CITY_NAMES = tuple(city["name"] for city in cities)
    profiles = make_profiles()
    assert len(profiles) == PROFILE_COUNT
    assert Counter(p["primary_element"] for p in profiles) == Counter({e: 600 for e in ELEMENTS})
    assert max(sum(abs(x) for x in p["dayun_adjustment_vector"]) for p in profiles) <= 0.0800001
    assert max(max(abs(x) for x in p["dayun_adjustment_vector"]) for p in profiles) <= 0.0300001
    assert all(max(range(5), key=lambda i: p["current_need_vector"][i]) == ELEMENTS.index(p["primary_element"]) for p in profiles)
    assert all(min(range(5), key=lambda i: p["current_need_vector"][i]) == ELEMENTS.index(p["avoid_elements"][1]) for p in profiles)

    methods = {
        "target_range": model_interval,
        "satisfaction_excess": model_satisfaction_excess,
        "jensen_shannon": js_similarity,
    }
    raw_by_method = {name: [] for name in methods}
    scored_by_method: dict[str, list[list[tuple[float, str]]]] = {name: [] for name in methods}
    for profile in profiles:
        for method_name, method in methods.items():
            scored = [(method(profile, city["vector"]), city["name"]) for city in cities]
            scored.sort(key=lambda x: (-x[0], x[1]))
            scored_by_method[method_name].append(scored)
            raw_by_method[method_name].extend(score for score, _ in scored)

    method_summaries = {}
    for method_name in methods:
        rankings = [[city for _, city in scored] for scored in scored_by_method[method_name]]
        sorted_raw = sorted(raw_by_method[method_name])
        method_summaries[method_name] = {
            "raw_score_quantiles": {
                "q05": percentile(sorted_raw, 0.05),
                "q50": percentile(sorted_raw, 0.50),
                "q95": percentile(sorted_raw, 0.95),
            },
            "top5": {k: v for k, v in coverage_metrics(rankings, 5).items() if k != "counts"},
            "top10": {k: v for k, v in coverage_metrics(rankings, 10).items() if k != "counts"},
        }

    selected = "target_range"
    sorted_selected = sorted(raw_by_method[selected])
    calibration = {
        "q05": percentile(sorted_selected, 0.05),
        "q50": percentile(sorted_selected, 0.50),
        "q95": percentile(sorted_selected, 0.95),
        "display_anchors": {"q05": 45, "q50": 70, "q95": 92, "min": 35, "max": 96},
    }

    base_rankings = []
    final_rankings = []
    ungated_direction_rankings = []
    per_profile = []
    direction_large_gap_overtakes = 0
    maximum_overtaken_base_gap = 0.0
    alternative_jaccards = []
    top5_tier_sizes = []
    top10_tier_sizes = []
    for profile, raw_scores in zip(profiles, scored_by_method[selected]):
        raw_lookup = dict((city_name, raw) for raw, city_name in raw_scores)
        ungated_scores = []
        base_scores = []
        for city in cities:
            base_index = calibrate_index(raw_lookup[city["name"]], calibration)
            direction, bearing, distance = direction_adjustment(profile, city["coord"])
            final_index = clamp(base_index + direction, 35.0, 98.0)
            base_scores.append((base_index, city["name"]))
            ungated_scores.append((final_index, city["name"], base_index, direction, bearing, distance))
        base_scores.sort(key=lambda x: (-x[0], x[1]))
        ungated_scores.sort(key=lambda x: (-x[0], x[1]))
        best_base_index = base_scores[0][0]
        final_scores = [
            (
                int(math.floor((best_base_index - base_index) / 1.0 + 1e-9)),
                final_index,
                name,
                base_index,
                direction,
                bearing,
                distance,
            )
            for final_index, name, base_index, direction, bearing, distance in ungated_scores
        ]
        final_scores.sort(key=lambda x: (x[0], -x[1], x[2]))
        base_rankings.append([name for _, name in base_scores])
        ungated_direction_rankings.append([name for _, name, *_ in ungated_scores])
        final_rankings.append([name for _, _, name, *_ in final_scores])

        base_position = {name: (score, idx) for idx, (score, name) in enumerate(base_scores)}
        for final_idx, (_, _, name, _, _, _, _) in enumerate(final_scores):
            base_score, base_idx = base_position[name]
            if final_idx < base_idx:
                displaced = base_scores[final_idx][0]
                gap = max(0.0, displaced - base_score)
                maximum_overtaken_base_gap = max(maximum_overtaken_base_gap, gap)
                if gap > 2.000001:
                    direction_large_gap_overtakes += 1

        if profile["alternative_need_vector"] is not None:
            alt_profile = dict(profile)
            alt_profile["current_need_vector"] = profile["alternative_need_vector"]
            alt_profile["tiers"] = [
                "prefer" if t == "strong_prefer" else "strong_prefer" if t == "prefer" else t
                for t in profile["tiers"]
            ]
            alt_profile["preferred_ranges"] = preferred_ranges(
                alt_profile["current_need_vector"],
                alt_profile["tiers"],
            )
            alt_scores = sorted(
                ((methods[selected](alt_profile, c["vector"]), c["name"]) for c in cities),
                key=lambda x: (-x[0], x[1]),
            )
            alternative_jaccards.append(jaccard(set(name for _, name in raw_scores[:10]), set(name for _, name in alt_scores[:10])))

        fifth = final_scores[4][1]
        tenth = final_scores[9][1]
        fifth_bucket = final_scores[4][0]
        tenth_bucket = final_scores[9][0]
        top5_tier_sizes.append(sum(bucket == fifth_bucket and score >= fifth - 1.0 for bucket, score, *_ in final_scores))
        top10_tier_sizes.append(sum(bucket == tenth_bucket and score >= tenth - 1.0 for bucket, score, *_ in final_scores))
        if len(per_profile) < 40 or profile["primary_element"] == "water":
            per_profile.append(
                {
                    "profile_id": profile["profile_id"],
                    "primary_element": profile["primary_element"],
                    "secondary_element": profile["secondary_element"],
                    "avoid_elements": profile["avoid_elements"],
                    "intensity": profile["intensity"],
                    "climate_need": profile["climate_need"],
                    "confidence": profile["confidence"],
                    "base_need_vector": [round(x * 100, 6) for x in profile["base_need_vector"]],
                    "dayun_adjustment_vector": [round(x * 100, 6) for x in profile["dayun_adjustment_vector"]],
                    "top10": [
                        {
                            "city": name,
                            "index": round(score, 3),
                            "base_index": round(base, 3),
                            "direction_adjustment": round(direction, 3),
                        }
                        for _, score, name, base, direction, _, _ in final_scores[:10]
                    ],
                    "top5_tier_size": sum(score >= fifth - 1.0 for score, *_ in final_scores),
                    "top10_tier_size": sum(score >= tenth - 1.0 for score, *_ in final_scores),
                }
            )

    base_top5 = coverage_metrics(base_rankings, 5)
    base_top10 = coverage_metrics(base_rankings, 10)
    final_top5 = coverage_metrics(final_rankings, 5)
    final_top10 = coverage_metrics(final_rankings, 10)
    ungated_top5 = coverage_metrics(ungated_direction_rankings, 5)
    ungated_top10 = coverage_metrics(ungated_direction_rankings, 10)

    water_indices = [i for i, p in enumerate(profiles) if p["primary_element"] == "water"]
    rng = random.Random(SEED + 1)
    water_pairs = []
    for _ in range(500):
        a, b = rng.sample(water_indices, 2)
        if profiles[a]["secondary_element"] != profiles[b]["secondary_element"]:
            water_pairs.append(jaccard(set(final_rankings[a][:10]), set(final_rankings[b][:10])))
    water_top1 = Counter(final_rankings[i][0] for i in water_indices)
    water_top10_unique = {city for i in water_indices for city in final_rankings[i][:10]}

    per_city = []
    for city in cities:
        name = city["name"]
        per_city.append(
            {
                "city_id": city["city_id"],
                "city_name_en": name,
                "city_name_zh": city["name_zh"],
                "top5_base_count": base_top5["counts"].get(name, 0),
                "top10_base_count": base_top10["counts"].get(name, 0),
                "top5_final_count": final_top5["counts"].get(name, 0),
                "top10_final_count": final_top10["counts"].get(name, 0),
            }
        )
    per_city.sort(key=lambda row: (-row["top5_final_count"], -row["top10_final_count"], row["city_name_en"]))

    result = {
        "task": "T-005",
        "generated_on": "2026-09-11",
        "seed": SEED,
        "profile_count": PROFILE_COUNT,
        "element_order": list(ELEMENTS),
        "input": {
            "cities": len(cities),
            "city_mapping_version": cities[0]["mapping_version"],
            "city_source": "data/cities.csv",
            "city_vectors_changed": False,
        },
        "versions": {
            "bazi_engine_version": "not-applicable-synthetic-need-input",
            "personal_need_version": "personal-need-v0.1-candidate",
            "city_engine_version": cities[0]["mapping_version"],
            "matching_engine_version": "matching-engine-v0.1-candidate",
            "index_calibration_version": "matching-index-calibration-v0.1-candidate",
            "dayun_adjustment_version": "dayun-adjustment-v0.1-candidate",
            "direction_adjustment_version": "direction-adjustment-v0.1-candidate",
        },
        "population_design": {
            "primary_element_counts": dict(Counter(p["primary_element"] for p in profiles)),
            "secondary_element_counts": dict(Counter(p["secondary_element"] for p in profiles)),
            "intensity_counts": dict(Counter(p["intensity"] for p in profiles)),
            "climate_need_counts": dict(Counter(p["climate_need"] for p in profiles)),
            "confidence_counts": dict(Counter(p["confidence"] for p in profiles)),
            "dayun_nonzero_profiles": sum(any(abs(x) > 1e-12 for x in p["dayun_adjustment_vector"]) for p in profiles),
            "dayun_max_l1_shift_points": 100 * max(sum(abs(x) for x in p["dayun_adjustment_vector"]) for p in profiles),
            "dayun_max_single_element_shift_points": 100 * max(max(abs(x) for x in p["dayun_adjustment_vector"]) for p in profiles),
            "dayun_primary_element_flips": 0,
            "dayun_strong_avoid_floor_flips": 0,
            "origin_count": len(ORIGINS),
        },
        "method_comparison": method_summaries,
        "selected_method": selected,
        "index_calibration": calibration,
        "coverage": {
            "base_without_direction": {
                "top5": {k: v for k, v in base_top5.items() if k != "counts"},
                "top10": {k: v for k, v in base_top10.items() if k != "counts"},
            },
            "final_with_direction": {
                "top5": {k: v for k, v in final_top5.items() if k != "counts"},
                "top10": {k: v for k, v in final_top10.items() if k != "counts"},
            },
            "direction_audit": {
                "cap_points": 1.0,
                "ranking_gate": "direction may reorder only within the same 1.0-point base-match tier",
                "large_gap_threshold_points": 2.0,
                "overtakes_across_gap_over_2": direction_large_gap_overtakes,
                "maximum_overtaken_base_gap": maximum_overtaken_base_gap,
                "ungated_top5_cities_with_zero": ungated_top5["cities_with_zero"],
                "ungated_top10_cities_with_zero": ungated_top10["cities_with_zero"],
            },
            "close_match_tiers": {
                "rule": "include every city within 1.0 calibrated index point of the strict rank cutoff",
                "mean_top5_tier_size": statistics.fmean(top5_tier_sizes),
                "max_top5_tier_size": max(top5_tier_sizes),
                "mean_top10_tier_size": statistics.fmean(top10_tier_sizes),
                "max_top10_tier_size": max(top10_tier_sizes),
            },
            "low_confidence_alternative_top10_jaccard_mean": statistics.fmean(alternative_jaccards),
            "same_primary_water": {
                "profiles": len(water_indices),
                "unique_top1_cities": len(water_top1),
                "unique_top10_cities": len(water_top10_unique),
                "mean_top10_jaccard_across_different_secondary_elements": statistics.fmean(water_pairs),
                "top1_counts": dict(water_top1.most_common()),
            },
        },
        "per_city_recommendation_counts": per_city,
        "sample_profiles": per_profile[:40],
    }
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output_path),
        "method_comparison": method_summaries,
        "coverage": result["coverage"],
        "top_cities": per_city[:15],
        "bottom_cities": per_city[-15:],
    }, ensure_ascii=False, indent=2))


ALL_CITY_NAMES: tuple[str, ...] = ()


if __name__ == "__main__":
    main()
