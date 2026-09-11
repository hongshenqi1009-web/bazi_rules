#!/usr/bin/env python3
"""T-005 small manual-chart regression for candidate Personal Need and Matching rules.

This audit harness deliberately separates the hand-reviewed BaZi interpretation
from the deterministic matching pass. It does not infer useful elements from
pillar counts and it does not modify candidate parameters in response to city
rankings. All cases are constructed stress tests; no real person's birth data is
stored. The output is a reproducible JSON audit, not application code.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
from collections import Counter
from pathlib import Path

from t005_matching_simulation import (
    CLIMATE_ADJUSTMENTS,
    ELEMENTS,
    INTENSITY_ANCHORS,
    TIER_IMPORTANCE,
    apply_dayun,
    calibrate_index,
    clamp,
    direction_adjustment,
    model_interval,
    normalize,
    preferred_ranges,
)


ELEMENT_ZH = {
    "wood": "木",
    "fire": "火",
    "earth": "土",
    "metal": "金",
    "water": "水",
}

TIER_ZH = {
    "strong_prefer": "主喜",
    "prefer": "次喜",
    "neutral": "中性",
    "avoid": "忌",
    "strong_avoid": "强忌",
}

CASE_SPECS = [
    {
        "id": "T005-MR-01",
        "label": "春令弱金，印比扶身",
        "birth": {"local_datetime": "1988-02-15T22:30:00", "time_zone": "Asia/Shanghai", "city": "Beijing"},
        "pillars": ["戊辰", "甲寅", "庚子", "丁亥"],
        "day_master": "庚金",
        "month_command": "寅月",
        "pattern_judgment": "普通财官结构候选；不取从弱，先按弱金承财官不足处理。",
        "strength_judgment": "庚金生寅月失令，水木成势，明透丁火；年柱戊辰能生身但不足以改为身强。",
        "regulation_judgment": "初春仍偏寒，火不宜全无，但命局已有丁火；本轮把调候火放在忌而非强忌，避免用火再压弱金。",
        "flow_judgment": "土先承接水木压力并生金，金再获得承载；直接再加木会扩大财星压力。",
        "tiers": {"wood": "strong_avoid", "fire": "avoid", "earth": "strong_prefer", "metal": "prefer", "water": "neutral"},
        "intensity": "standard",
        "climate_need": "balanced",
        "dayun_signal": {"wood": -0.4, "fire": -0.2, "earth": 0.8, "metal": 0.4, "water": 0.0},
        "dayun_explanation": "构造印比偏强的大运信号，检查支持加深但不把本命次序翻转。",
        "confidence": "medium",
        "confidence_reasons": ["月令与扶抑方向较清楚", "初春火的调候作用与弱金受克之间仍需保留说明"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-02",
        "label": "冬令有根辛金，火暖木生",
        "birth": {"local_datetime": "2005-12-23T08:37:00", "time_zone": "Asia/Shanghai", "city": "Shanghai"},
        "pillars": ["乙酉", "戊子", "辛巳", "壬辰"],
        "day_master": "辛金",
        "month_command": "子月",
        "pattern_judgment": "印比有根的普通格；不以子月单点直接判从强或从弱。",
        "strength_judgment": "辛金得酉根、戊辰生扶，能任一定泄耗；子水与壬水使寒湿明显。",
        "regulation_judgment": "冬金首要取火温暖，木作次喜以生火并形成流通。",
        "flow_judgment": "火达到适量即可，不追求越旺越好；水再增会扩大寒湿，金再增会使结构更滞。",
        "tiers": {"wood": "prefer", "fire": "strong_prefer", "earth": "neutral", "metal": "avoid", "water": "strong_avoid"},
        "intensity": "standard",
        "climate_need": "cold_need_warmth",
        "dayun_signal": {"wood": 0.2, "fire": 0.7, "earth": 0.1, "metal": -0.2, "water": -0.7},
        "dayun_explanation": "构造暖局大运，预期暖意增强但不把木或其他元素推过主喜火。",
        "confidence": "high",
        "confidence_reasons": ["月令寒湿与已有金根同时可见", "扶抑与调候都支持火优先、抑制过量水"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-03",
        "label": "午月庚金，调候水与扶身土金冲突",
        "birth": {"local_datetime": "1999-06-07T09:11:00", "time_zone": "Asia/Shanghai", "city": "Guangzhou"},
        "pillars": ["己卯", "庚午", "庚寅", "辛巳"],
        "day_master": "庚金",
        "month_command": "午月",
        "pattern_judgment": "官杀旺而比劫透的普通格；不据三金透干直接判身强。",
        "strength_judgment": "庚金失令，午巳火旺；虽有庚辛帮身与己土生身，仍存在受火制与燥烈压力。",
        "regulation_judgment": "主方案把水列主喜以降温润燥；扶抑方案可能把土金置前，形成真实轨道冲突。",
        "flow_judgment": "水可制火并润土，但过量水也会泄金；因此保留上限，不做单一水越高越好。",
        "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "prefer", "metal": "neutral", "water": "strong_prefer"},
        "intensity": "standard",
        "climate_need": "hot_need_cooling",
        "dayun_signal": {"wood": 0.0, "fire": -0.3, "earth": 0.5, "metal": 0.4, "water": -0.5},
        "dayun_explanation": "构造土金阶段信号，检查大运只能缩小调候水优势，不能直接翻成另一套本命。",
        "confidence": "low",
        "confidence_reasons": ["调候轨与旺衰扶抑轨排序不同", "火势与金透干的承受能力需要更多人工案例"],
        "boundary_flags": ["interpretation_track_conflict"],
        "alternative": {
            "label": "扶抑优先辅助方案",
            "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "strong_prefer", "metal": "prefer", "water": "neutral"},
            "intensity": "standard",
            "climate_need": "hot_need_cooling",
            "reason": "若认为日主承火能力不足是第一矛盾，则先土后金，水仅保留调候中性需求。",
        },
    },
    {
        "id": "T005-MR-04",
        "label": "子月旺水，火暖土制",
        "birth": {"local_datetime": "1995-12-18T10:28:00", "time_zone": "Asia/Shanghai", "city": "Chengdu"},
        "pillars": ["乙亥", "戊子", "癸未", "丁巳"],
        "day_master": "癸水",
        "month_command": "子月",
        "pattern_judgment": "建禄旺水的普通格候选；已有财官，不取从旺。",
        "strength_judgment": "癸水得子亥旺根，日主偏强；戊未土与丁巳火能制化但季节力量不足。",
        "regulation_judgment": "冬水取火温暖为主，土作次喜承水；水列强忌以防寒湿加重。",
        "flow_judgment": "火生土、土制水形成顺接；金再生水不利，木仅作中性泄水并生火。",
        "tiers": {"wood": "neutral", "fire": "strong_prefer", "earth": "prefer", "metal": "avoid", "water": "strong_avoid"},
        "intensity": "standard",
        "climate_need": "cold_need_warmth",
        "dayun_signal": {"wood": 0.1, "fire": 0.6, "earth": 0.5, "metal": -0.3, "water": -0.6},
        "dayun_explanation": "构造火土阶段，预期推荐略向暖燥、承载型城市移动。",
        "confidence": "high",
        "confidence_reasons": ["旺衰、调候与流通三轨方向一致"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-05",
        "label": "午月燥土，水润木疏",
        "birth": {"local_datetime": "1998-06-11T04:28:00", "time_zone": "Asia/Shanghai", "city": "Urumqi"},
        "pillars": ["戊寅", "戊午", "己丑", "丙寅"],
        "day_master": "己土",
        "month_command": "午月",
        "pattern_judgment": "印比偏旺的普通格；不取稼穑等特殊格。",
        "strength_judgment": "己土得午月火生、两戊帮身并坐丑根，身强且偏燥。",
        "regulation_judgment": "水为主喜润燥降温，木为次喜疏土；火列强忌、土列忌。",
        "flow_judgment": "先有水润，木才更能疏土；单独叠木或水到极端都不是目标。",
        "tiers": {"wood": "prefer", "fire": "strong_avoid", "earth": "avoid", "metal": "neutral", "water": "strong_prefer"},
        "intensity": "concentrated",
        "climate_need": "hot_need_cooling",
        "dayun_signal": {"wood": 0.4, "fire": -0.7, "earth": -0.4, "metal": 0.1, "water": 0.7},
        "dayun_explanation": "构造水木阶段，检查强需求加强时仍受单维与 L1 上限约束。",
        "confidence": "high",
        "confidence_reasons": ["火土季令、根气与调候方向一致"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-06",
        "label": "亥月丙火，木火扶暖",
        "birth": {"local_datetime": "1994-12-06T02:00:00", "time_zone": "Asia/Shanghai", "city": "Harbin"},
        "pillars": ["甲戌", "乙亥", "丙寅", "己丑"],
        "day_master": "丙火",
        "month_command": "亥月",
        "pattern_judgment": "官印相见的普通格候选；甲乙寅使日主有源，不从杀。",
        "strength_judgment": "丙火在亥月失令，得甲乙寅生扶而不至无根，整体仍偏弱偏寒。",
        "regulation_judgment": "火为主喜兼调候，木为次喜续火；水再增列强忌。",
        "flow_judgment": "木把水势转化为生火，是本例与单纯补火不同的关键组合。",
        "tiers": {"wood": "prefer", "fire": "strong_prefer", "earth": "neutral", "metal": "avoid", "water": "strong_avoid"},
        "intensity": "standard",
        "climate_need": "cold_need_warmth",
        "dayun_signal": {"wood": 0.6, "fire": 0.5, "earth": 0.0, "metal": -0.2, "water": -0.6},
        "dayun_explanation": "构造印比阶段，检查木火组合而非只追最高火分城市。",
        "confidence": "high",
        "confidence_reasons": ["月令、根气和调候结论一致"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-07",
        "label": "子月庚金，火暖土承",
        "birth": {"local_datetime": "1990-12-11T06:00:00", "time_zone": "Europe/London", "city": "London"},
        "pillars": ["庚午", "戊子", "庚戌", "己卯"],
        "day_master": "庚金",
        "month_command": "子月",
        "pattern_judgment": "印比可用的普通格；午戌存火土，不作寒金从弱。",
        "strength_judgment": "庚金有比肩与戊己戌生扶，承受力中等；子月寒水仍为主要环境压力。",
        "regulation_judgment": "火主暖局，土次承载生金；水强忌，木保留中性而非继续推动寒湿。",
        "flow_judgment": "火土相续比单纯补火更稳定，金不宜再堆。",
        "tiers": {"wood": "neutral", "fire": "strong_prefer", "earth": "prefer", "metal": "avoid", "water": "strong_avoid"},
        "intensity": "soft",
        "climate_need": "cold_need_warmth",
        "dayun_signal": {"wood": 0.0, "fire": 0.5, "earth": 0.4, "metal": -0.2, "water": -0.5},
        "dayun_explanation": "构造温和火土阶段，检查 soft 锚点是否使结果过度平均。",
        "confidence": "medium",
        "confidence_reasons": ["调候清楚", "身强程度介于中和与偏强之间"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-08",
        "label": "巳月甲木，水润木续",
        "birth": {"local_datetime": "1993-05-23T04:00:00", "time_zone": "America/New_York", "city": "New York"},
        "pillars": ["癸酉", "丁巳", "甲辰", "丙寅"],
        "day_master": "甲木",
        "month_command": "巳月",
        "pattern_judgment": "食伤旺而有印根的普通格；不以火透即作从儿。",
        "strength_judgment": "甲木得寅根、癸水与辰中余气，但巳月火旺泄身，整体中和偏弱。",
        "regulation_judgment": "水为主喜润木降燥，木为次喜稳根；金列强忌以免在木偏弱时再克。",
        "flow_judgment": "水木组合优先，火已有不需再加；城市水高但木低不必自动居首。",
        "tiers": {"wood": "prefer", "fire": "avoid", "earth": "neutral", "metal": "strong_avoid", "water": "strong_prefer"},
        "intensity": "standard",
        "climate_need": "dry_need_moisture",
        "dayun_signal": {"wood": 0.5, "fire": -0.4, "earth": 0.0, "metal": -0.6, "water": 0.6},
        "dayun_explanation": "构造水木阶段，检查同为喜水时是否区别于喜水次金或喜水次土。",
        "confidence": "high",
        "confidence_reasons": ["巳月燥热、寅根与癸水的作用清楚"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-09",
        "label": "立春后强土，金泄水润；节界敏感",
        "birth": {"local_datetime": "2024-02-04T16:28:00", "time_zone": "Asia/Singapore", "city": "Singapore"},
        "pillars": ["甲辰", "丙寅", "戊戌", "庚申"],
        "day_master": "戊土",
        "month_command": "寅月（立春后）",
        "pattern_judgment": "根厚、食神透的普通格；节界前后月令不同，必须保留辅助盘。",
        "strength_judgment": "戊土坐戌并得辰根、丙火生扶，日主有力；寅木制土、庚申泄土形成制化。",
        "regulation_judgment": "主方案取金泄、次取水润并承金；土列强忌，避免根气继续堆叠。",
        "flow_judgment": "土生金、金生水形成顺泄；不是直接寻找金最高城市。",
        "tiers": {"wood": "neutral", "fire": "avoid", "earth": "strong_avoid", "metal": "strong_prefer", "water": "prefer"},
        "intensity": "standard",
        "climate_need": "balanced",
        "dayun_signal": {"wood": 0.4, "fire": -0.2, "earth": -0.5, "metal": -0.1, "water": 0.5},
        "dayun_explanation": "构造水木阶段，检查大运只轻调，不把本命金主喜改成水或木。",
        "confidence": "low",
        "confidence_reasons": ["输入在锁定候选库立春时刻后约 53 秒", "跨节会改变年柱与月柱，不能平均成一盘"],
        "boundary_flags": ["solar_term_within_60_seconds"],
        "alternative": {
            "label": "若钟表误差使输入落在立春前",
            "pillars": ["癸卯", "乙丑", "戊戌", "庚申"],
            "tiers": {"wood": "neutral", "fire": "avoid", "earth": "strong_avoid", "metal": "prefer", "water": "strong_prefer"},
            "intensity": "standard",
            "climate_need": "balanced",
            "reason": "丑月寒湿使水的调候/流通意义上升，金水主次互换；仅在输入误差跨越节界时成立。",
        },
    },
    {
        "id": "T005-MR-10",
        "label": "卯月根厚戊土，木制水辅",
        "birth": {"local_datetime": "2024-03-05T10:24:00", "time_zone": "Asia/Shanghai", "city": "Kunming"},
        "pillars": ["甲辰", "丁卯", "戊辰", "丁巳"],
        "day_master": "戊土",
        "month_command": "卯月（惊蛰后）",
        "pattern_judgment": "官印相生的普通格；两辰与双丁使日主不弱。",
        "strength_judgment": "戊土得两辰根及丁巳生扶，能任卯木官星，整体偏强。",
        "regulation_judgment": "木主制土，水次润土生木；土列强忌，火列忌。",
        "flow_judgment": "水生木、木制土形成组合；单独高木而极低水并非理想。",
        "tiers": {"wood": "strong_prefer", "fire": "avoid", "earth": "strong_avoid", "metal": "neutral", "water": "prefer"},
        "intensity": "standard",
        "climate_need": "balanced",
        "dayun_signal": {"wood": 0.2, "fire": -0.3, "earth": -0.5, "metal": 0.0, "water": 0.6},
        "dayun_explanation": "构造水运轻修正，观察城市是否略向湿润木性移动而不推翻木主喜。",
        "confidence": "medium",
        "confidence_reasons": ["节界之后约 75 秒，不触发 60 秒双盘闸门", "官印与土根的强弱仍需更大案例集校准"],
        "boundary_flags": ["near_solar_term_over_60_seconds"],
    },
    {
        "id": "T005-MR-11",
        "label": "卯月辛金有酉根，金土主次分歧",
        "birth": {"local_datetime": "2022-03-09T20:51:00", "time_zone": "America/Mexico_City", "city": "Mexico City"},
        "pillars": ["壬寅", "癸卯", "辛酉", "戊戌"],
        "day_master": "辛金",
        "month_command": "卯月",
        "pattern_judgment": "财旺、食伤透且有印比根的普通格；是否以印或比为第一需要存在分歧。",
        "strength_judgment": "辛金失令但坐酉强根，又得戊戌生扶；可判偏弱，也可判接近中和。",
        "regulation_judgment": "春月不以寒暖为第一矛盾，主要分歧在先金帮身还是先土生身。",
        "flow_judgment": "木财旺而水又生木，不能只因金根存在就继续接受高木城市。",
        "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "prefer", "metal": "strong_prefer", "water": "neutral"},
        "intensity": "soft",
        "climate_need": "balanced",
        "dayun_signal": {"wood": -0.3, "fire": -0.4, "earth": 0.6, "metal": -0.1, "water": 0.2},
        "dayun_explanation": "构造印运，使土的阶段需要上升但仍保护本命主喜金。",
        "confidence": "low",
        "confidence_reasons": ["酉根与卯月冲克使旺衰幅度敏感", "印先还是比先属于解释层差异"],
        "boundary_flags": ["strength_assessment_disagreement"],
        "alternative": {
            "label": "印星优先辅助方案",
            "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "strong_prefer", "metal": "prefer", "water": "neutral"},
            "intensity": "soft",
            "climate_need": "balanced",
            "reason": "若把卯月失令与食伤生财视作更强压力，则先土生金、再金帮身。",
        },
    },
    {
        "id": "T005-MR-12",
        "label": "午月庚金，水凉金辅",
        "birth": {"local_datetime": "2024-06-15T10:00:00", "time_zone": "Asia/Dubai", "city": "Dubai"},
        "pillars": ["甲辰", "庚午", "庚戌", "辛巳"],
        "day_master": "庚金",
        "month_command": "午月",
        "pattern_judgment": "官杀旺、比劫透并有土根的普通格。",
        "strength_judgment": "庚金失令但有庚辛并见、辰戌生扶，承受力高于纯弱金；火旺燥烈仍突出。",
        "regulation_judgment": "水主降温，金次稳身；火强忌、土忌以免燥土埋金。",
        "flow_judgment": "水与金要共同处在适量区间；高水低金城市不自动第一。",
        "tiers": {"wood": "neutral", "fire": "strong_avoid", "earth": "avoid", "metal": "prefer", "water": "strong_prefer"},
        "intensity": "concentrated",
        "climate_need": "hot_need_cooling",
        "dayun_signal": {"wood": 0.0, "fire": -0.6, "earth": -0.3, "metal": 0.5, "water": 0.6},
        "dayun_explanation": "构造金水阶段，与水木型案例对比同为喜水但次喜不同。",
        "confidence": "high",
        "confidence_reasons": ["季令热燥与金根、比劫信息明确"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-13",
        "label": "戌月土厚辛金，木水疏润",
        "birth": {"local_datetime": "2024-11-03T08:50:00", "time_zone": "Australia/Sydney", "city": "Sydney"},
        "pillars": ["甲辰", "甲戌", "辛未", "壬辰"],
        "day_master": "辛金",
        "month_command": "戌月",
        "pattern_judgment": "印旺、财透、伤官见的普通格；不取从强。",
        "strength_judgment": "三土支承载辛金，资源偏厚；两甲与壬提供泄耗但仍不足以消除土重。",
        "regulation_judgment": "木主疏土并作财，水次润土生木；金列强忌、土列忌。",
        "flow_judgment": "水生木、木疏土比直接再加金更合适；木水需成组合。",
        "tiers": {"wood": "strong_prefer", "fire": "neutral", "earth": "avoid", "metal": "strong_avoid", "water": "prefer"},
        "intensity": "standard",
        "climate_need": "dry_need_moisture",
        "dayun_signal": {"wood": 0.5, "fire": 0.0, "earth": -0.4, "metal": -0.6, "water": 0.5},
        "dayun_explanation": "构造木水阶段，检查土重金强案例是否转向复合木水城市。",
        "confidence": "medium",
        "confidence_reasons": ["土重可见", "戌月辛金的强弱细分仍依赖根透与燥湿权衡"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-14",
        "label": "卯月旺水，木泄火化",
        "birth": {"local_datetime": "2019-03-27T02:00:00", "time_zone": "Asia/Tokyo", "city": "Tokyo"},
        "pillars": ["己亥", "丁卯", "癸亥", "癸丑"],
        "day_master": "癸水",
        "month_command": "卯月",
        "pattern_judgment": "食神当令、比劫有根的普通格；已有丁火，不取从旺。",
        "strength_judgment": "癸水得两亥与癸比，仍偏强；卯木泄水，丁火承木。",
        "regulation_judgment": "木为主喜疏泄，火为次喜承接并温化；水列强忌。",
        "flow_judgment": "水生木、木生火的既有流通应被延续，城市不能只看木的绝对最高值。",
        "tiers": {"wood": "strong_prefer", "fire": "prefer", "earth": "neutral", "metal": "avoid", "water": "strong_avoid"},
        "intensity": "standard",
        "climate_need": "cold_need_warmth",
        "dayun_signal": {"wood": 0.5, "fire": 0.5, "earth": 0.0, "metal": -0.3, "water": -0.6},
        "dayun_explanation": "构造木火阶段，与木水型主喜木案例作差异测试。",
        "confidence": "high",
        "confidence_reasons": ["两亥与癸比显示水源", "卯木、丁火形成清楚流通"],
        "boundary_flags": [],
    },
    {
        "id": "T005-MR-15",
        "label": "卯月癸水，金水扶身与水先之争",
        "birth": {"local_datetime": "2019-03-07T08:00:00", "time_zone": "America/Vancouver", "city": "Vancouver"},
        "pillars": ["己亥", "丁卯", "癸卯", "丙辰"],
        "day_master": "癸水",
        "month_command": "卯月",
        "pattern_judgment": "食神旺并见财官的普通格；不满足从弱的充分条件。",
        "strength_judgment": "癸水有亥根与辰中余气，但双卯泄身、丙丁耗身、己土制身，偏弱幅度存在分歧。",
        "regulation_judgment": "主方案先金生水、次水扶身；辅助方案认为直接补水更紧迫。",
        "flow_judgment": "金水形成资源链；木火已有，继续增加应受上限约束。",
        "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "neutral", "metal": "strong_prefer", "water": "prefer"},
        "intensity": "standard",
        "climate_need": "balanced",
        "dayun_signal": {"wood": -0.3, "fire": -0.5, "earth": 0.0, "metal": -0.4, "water": 0.6},
        "dayun_explanation": "构造水运，使水阶段性增强但不允许翻转本命金主喜。",
        "confidence": "low",
        "confidence_reasons": ["亥根与双卯泄身的权衡敏感", "资源先行或比劫先行会改变主次"],
        "boundary_flags": ["strength_assessment_disagreement"],
        "alternative": {
            "label": "比劫优先辅助方案",
            "tiers": {"wood": "avoid", "fire": "strong_avoid", "earth": "neutral", "metal": "prefer", "water": "strong_prefer"},
            "intensity": "standard",
            "climate_need": "balanced",
            "reason": "若把双卯泄身与财官耗克视为即时压力，则先水、再金。",
        },
    },
]


def vector_percent(values: list[float]) -> list[float]:
    return [round(value * 100.0, 6) for value in values]


def ranges_percent(ranges: list[dict[str, float]], tiers: list[str]) -> dict[str, dict]:
    return {
        element: {
            "tier": tier,
            "low": round(band["low"] * 100.0, 6),
            "target": round(band["target"] * 100.0, 6),
            "high": round(band["high"] * 100.0, 6),
            "importance": TIER_IMPORTANCE[tier],
        }
        for element, tier, band in zip(ELEMENTS, tiers, ranges)
    }


def build_profile(spec: dict, scenario: dict | None = None) -> dict:
    source = scenario or spec
    tier_map = source["tiers"]
    tiers = [tier_map[element] for element in ELEMENTS]
    anchors = INTENSITY_ANCHORS[source["intensity"]]
    raw = [anchors[tier] for tier in tiers]
    for element, boost in CLIMATE_ADJUSTMENTS[source["climate_need"]].items():
        raw[ELEMENTS.index(element)] += boost
    base = normalize(raw)
    primary = tiers.index("strong_prefer")
    strong_avoid = tiers.index("strong_avoid")
    dayun_signal_map = spec.get("dayun_signal", {element: 0.0 for element in ELEMENTS})
    dayun_signal = [float(dayun_signal_map.get(element, 0.0)) for element in ELEMENTS]
    current, delta = apply_dayun(base, dayun_signal, primary, strong_avoid)
    return {
        "tiers": tiers,
        "tier_by_element": tier_map,
        "primary_element": ELEMENTS[primary],
        "secondary_element": ELEMENTS[tiers.index("prefer")],
        "avoid_elements": [ELEMENTS[tiers.index("avoid")], ELEMENTS[strong_avoid]],
        "base_need_vector": base,
        "current_need_vector": current,
        "dayun_adjustment_vector": delta,
        "dayun_signal": dayun_signal,
        "preferred_ranges": preferred_ranges(current, tiers),
        "intensity": source["intensity"],
        "climate_need": source["climate_need"],
    }


def local_fit_details(profile: dict, city_vector: list[float]) -> list[dict]:
    details = []
    for element, city_value, band, tier in zip(ELEMENTS, city_vector, profile["preferred_ranges"], profile["tiers"]):
        low, target, high = band["low"], band["target"], band["high"]
        if low <= city_value <= high:
            half = max(target - low, high - target, 0.03)
            fit = 1.0 - 0.12 * min(1.0, abs(city_value - target) / half)
            state = "within_range"
        elif city_value < low:
            fit = 0.88 - 0.88 * ((low - city_value) / max(low, 0.06)) ** 1.35
            state = "below_range"
        else:
            excess_weight = 1.45 if tier in ("avoid", "strong_avoid") else 1.0
            fit = 0.88 - excess_weight * ((city_value - high) / max(1.0 - high, 0.10)) ** 1.35
            state = "above_range"
        fit = clamp(fit)
        details.append({
            "element": element,
            "tier": tier,
            "city_value": city_value,
            "low": low,
            "target": target,
            "high": high,
            "state": state,
            "fit": fit,
            "weighted_contribution": fit * TIER_IMPORTANCE[tier],
        })
    return details


def fit_text(detail: dict) -> str:
    element = ELEMENT_ZH[detail["element"]]
    tier = TIER_ZH[detail["tier"]]
    value = detail["city_value"] * 100.0
    low = detail["low"] * 100.0
    high = detail["high"] * 100.0
    if detail["state"] == "within_range":
        return f"{element}为{tier}，城市值 {value:.1f} 落在候选区间 {low:.1f}–{high:.1f}"
    if detail["state"] == "below_range":
        return f"{element}为{tier}，城市值 {value:.1f} 低于候选下限 {low:.1f}"
    return f"{element}为{tier}，城市值 {value:.1f} 高于候选上限 {high:.1f}"


def rank_profile(profile: dict, cities: list[dict], calibration: dict) -> list[dict]:
    ranked = []
    for city in cities:
        raw = model_interval(profile, city["vector"])
        index = calibrate_index(raw, calibration)
        details = local_fit_details(profile, city["vector"])
        ranked.append({"city": city, "raw": raw, "index": index, "details": details})
    ranked.sort(key=lambda item: (-item["index"], item["city"]["name_en"]))
    return ranked


def compact_ranked(ranked: list[dict], count: int = 10) -> list[dict]:
    return [
        {
            "rank": rank,
            "city_id": item["city"]["city_id"],
            "city_name_en": item["city"]["name_en"],
            "city_name_zh": item["city"]["name_zh"],
            "compatibility_index": round(item["index"], 6),
            "raw_match_score": round(item["raw"], 9),
            "city_vector": vector_percent(item["city"]["vector"]),
        }
        for rank, item in enumerate(ranked[:count], 1)
    ]


def top3_explanations(ranked: list[dict]) -> list[dict]:
    output = []
    for rank, item in enumerate(ranked[:3], 1):
        details = item["details"]
        positive_details = [
            detail for detail in details
            if detail["tier"] in ("strong_prefer", "prefer", "neutral")
        ]
        reasons = sorted(
            positive_details,
            key=lambda d: (-d["weighted_contribution"], d["element"]),
        )[:2]
        conflict = min(details, key=lambda d: (d["fit"], -TIER_IMPORTANCE[d["tier"]]))
        output.append({
            "rank": rank,
            "city_name_en": item["city"]["name_en"],
            "city_name_zh": item["city"]["name_zh"],
            "compatibility_index": round(item["index"], 6),
            "main_reasons": [fit_text(detail) for detail in reasons],
            "main_conflict": fit_text(conflict),
        })
    return output


def jaccard_names(a: list[dict], b: list[dict]) -> float:
    left = {item["city"]["name_en"] for item in a[:10]}
    right = {item["city"]["name_en"] for item in b[:10]}
    return len(left & right) / len(left | right)


def direction_audit(profile: dict, ranked: list[dict], origin: tuple[float, float]) -> dict:
    direction_profile = dict(profile)
    direction_profile["origin"] = origin
    best_base = ranked[0]["index"]
    items = []
    for item in ranked:
        delta, bearing, distance = direction_adjustment(direction_profile, item["city"]["coord"])
        band = int(math.floor((best_base - item["index"]) / 1.0 + 1e-9))
        items.append({
            "band": band,
            "final_index": item["index"] + delta,
            "base_index": item["index"],
            "direction_delta": delta,
            "bearing": bearing,
            "distance": distance,
            "city": item["city"],
        })
    items.sort(key=lambda item: (item["band"], -item["final_index"], item["city"]["name_en"]))
    base_position = {item["city"]["name_en"]: pos for pos, item in enumerate(ranked)}
    maximum_overtaken_gap = 0.0
    overtake_over_one = 0
    for final_pos, item in enumerate(items):
        old_pos = base_position[item["city"]["name_en"]]
        if final_pos < old_pos:
            displaced_base = ranked[final_pos]["index"]
            gap = max(0.0, displaced_base - item["base_index"])
            maximum_overtaken_gap = max(maximum_overtaken_gap, gap)
            if gap > 1.000001:
                overtake_over_one += 1
    return {
        "enabled_for_audit_only": True,
        "default_enabled": False,
        "top10": [
            {
                "rank": rank,
                "city_name_en": item["city"]["name_en"],
                "city_name_zh": item["city"]["name_zh"],
                "base_index": round(item["base_index"], 6),
                "direction_delta": round(item["direction_delta"], 6),
                "final_index": round(item["final_index"], 6),
                "bearing_deg": round(item["bearing"], 6),
                "distance_km": round(item["distance"], 3),
            }
            for rank, item in enumerate(items[:10], 1)
        ],
        "maximum_overtaken_base_gap": round(maximum_overtaken_gap, 6),
        "overtakes_across_more_than_one_point": overtake_over_one,
        "max_abs_delta": round(max(abs(item["direction_delta"]) for item in items), 6),
    }


def load_inputs(root: Path) -> tuple[list[dict], dict]:
    with (root / "data" / "cities.csv").open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))
    assert len(rows) == 100
    cities = []
    for row in rows:
        vector = [float(row[f"{element}_score_raw"]) / 100.0 for element in ELEMENTS]
        assert abs(sum(vector) - 1.0) < 1e-6
        cities.append({
            "city_id": row["city_id"],
            "name_en": row["city_name_en"],
            "name_zh": row["city_name_zh"],
            "coord": (float(row["lat"]), float(row["lon"])),
            "vector": vector,
        })
    simulation = json.loads((root / "data" / "matching_simulation_results.json").read_text(encoding="utf-8"))
    calibration = simulation["index_calibration"]
    return cities, calibration


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    cities, calibration = load_inputs(root)
    city_by_name = {city["name_en"]: city for city in cities}
    case_outputs = []

    for spec in CASE_SPECS:
        assert set(spec["tiers"].values()) == {
            "strong_prefer", "prefer", "neutral", "avoid", "strong_avoid"
        }
        profile = build_profile(spec)
        assert profile["primary_element"] == next(element for element, tier in spec["tiers"].items() if tier == "strong_prefer")
        assert profile["secondary_element"] == next(element for element, tier in spec["tiers"].items() if tier == "prefer")
        assert max(range(5), key=lambda i: profile["base_need_vector"][i]) == ELEMENTS.index(profile["primary_element"])
        assert min(range(5), key=lambda i: profile["base_need_vector"][i]) == ELEMENTS.index(profile["avoid_elements"][1])
        assert max(range(5), key=lambda i: profile["current_need_vector"][i]) == ELEMENTS.index(profile["primary_element"])
        assert min(range(5), key=lambda i: profile["current_need_vector"][i]) == ELEMENTS.index(profile["avoid_elements"][1])
        assert sum(abs(value) for value in profile["dayun_adjustment_vector"]) <= 0.0800001
        assert max(abs(value) for value in profile["dayun_adjustment_vector"]) <= 0.0300001

        base_profile = dict(profile)
        base_profile["current_need_vector"] = profile["base_need_vector"]
        base_profile["preferred_ranges"] = preferred_ranges(profile["base_need_vector"], profile["tiers"])
        base_ranked = rank_profile(base_profile, cities, calibration)
        current_ranked = rank_profile(profile, cities, calibration)
        origin_city = city_by_name[spec["birth"]["city"]]
        direction = direction_audit(profile, current_ranked, origin_city["coord"])

        top10 = current_ranked[:10]
        strong_avoid_index = profile["tiers"].index("strong_avoid")
        strong_avoid_band = profile["preferred_ranges"][strong_avoid_index]
        strong_avoid_excesses = []
        for item in top10:
            value = item["city"]["vector"][strong_avoid_index]
            if value > strong_avoid_band["high"]:
                strong_avoid_detail = item["details"][strong_avoid_index]
                strong_avoid_excesses.append({
                    "city_name_en": item["city"]["name_en"],
                    "city_name_zh": item["city"]["name_zh"],
                    "value": round(value * 100.0, 6),
                    "high": round(strong_avoid_band["high"] * 100.0, 6),
                    "excess": round((value - strong_avoid_band["high"]) * 100.0, 6),
                    "local_fit": round(strong_avoid_detail["fit"], 6),
                    "compatibility_index": round(item["index"], 6),
                })

        range_violations = []
        for item in current_ranked:
            violations = sum(detail["state"] != "within_range" for detail in item["details"])
            range_violations.append((violations, item["city"]["name_en"]))
        minimum_violations = min(value for value, _ in range_violations)
        all_ranges_city_count = sum(value == 0 for value, _ in range_violations)

        primary_index = ELEMENTS.index(profile["primary_element"])
        element_max_city = max(cities, key=lambda city: city["vector"][primary_index])
        element_max_rank = next(
            position for position, item in enumerate(current_ranked, 1)
            if item["city"]["name_en"] == element_max_city["name_en"]
        )

        alternative_output = None
        if spec.get("alternative"):
            alternative = spec["alternative"]
            alt_profile = build_profile(spec, alternative)
            alt_ranked = rank_profile(alt_profile, cities, calibration)
            alternative_output = {
                "label": alternative["label"],
                "pillars": alternative.get("pillars", spec["pillars"]),
                "reason": alternative["reason"],
                "tier_by_element": alternative["tiers"],
                "base_need_vector": vector_percent(alt_profile["base_need_vector"]),
                "current_need_vector": vector_percent(alt_profile["current_need_vector"]),
                "preferred_ranges": ranges_percent(alt_profile["preferred_ranges"], alt_profile["tiers"]),
                "top10": compact_ranked(alt_ranked),
                "top10_jaccard_with_main": round(jaccard_names(current_ranked, alt_ranked), 6),
                "top1_stable": current_ranked[0]["city"]["name_en"] == alt_ranked[0]["city"]["name_en"],
            }

        case_outputs.append({
            "id": spec["id"],
            "case_type": "constructed_stress_test",
            "real_person_birth_data": False,
            "label": spec["label"],
            "birth": spec["birth"],
            "four_pillars": {
                "year": spec["pillars"][0],
                "month": spec["pillars"][1],
                "day": spec["pillars"][2],
                "hour": spec["pillars"][3],
                "day_master": spec["day_master"],
                "source": "lunar-javascript@1.7.7 commit 4c45a59f79b856125516f31aefa8295035c16afd, EightChar.setSect(1)",
            },
            "manual_interpretation": {
                "month_command": spec["month_command"],
                "pattern_judgment": spec["pattern_judgment"],
                "strength_judgment": spec["strength_judgment"],
                "regulation_judgment": spec["regulation_judgment"],
                "flow_judgment": spec["flow_judgment"],
                "tier_by_element": spec["tiers"],
                "tier_labels_zh": {element: TIER_ZH[tier] for element, tier in spec["tiers"].items()},
                "confidence": spec["confidence"],
                "confidence_reasons": spec["confidence_reasons"],
                "boundary_flags": spec["boundary_flags"],
                "review_status": "candidate_manual_interpretation_not_formal_bazi_rule",
            },
            "personal_need": {
                "intensity_anchor": spec["intensity"],
                "climate_adjustment": spec["climate_need"],
                "primary_element": profile["primary_element"],
                "secondary_element": profile["secondary_element"],
                "avoid_elements": profile["avoid_elements"],
                "base_need_vector": vector_percent(profile["base_need_vector"]),
                "preferred_ranges_after_dayun": ranges_percent(profile["preferred_ranges"], profile["tiers"]),
                "rule_version": "personal-need-v0.1-candidate",
            },
            "dayun_comparison": {
                "note": "大运干支未作真实年龄定位；本轮使用可解释的元素方向压力测试，专门验证幅度闸门。",
                "signal": dict(zip(ELEMENTS, profile["dayun_signal"])),
                "explanation": spec["dayun_explanation"],
                "before_vector": vector_percent(profile["base_need_vector"]),
                "adjustment_vector": vector_percent(profile["dayun_adjustment_vector"]),
                "after_vector": vector_percent(profile["current_need_vector"]),
                "l1_change_points": round(sum(abs(value) for value in profile["dayun_adjustment_vector"]) * 100.0, 6),
                "max_component_change_points": round(max(abs(value) for value in profile["dayun_adjustment_vector"]) * 100.0, 6),
                "primary_preserved": max(range(5), key=lambda i: profile["current_need_vector"][i]) == primary_index,
                "strong_avoid_preserved": min(range(5), key=lambda i: profile["current_need_vector"][i]) == strong_avoid_index,
                "top10_before": compact_ranked(base_ranked),
                "top10_after": compact_ranked(current_ranked),
                "top10_jaccard": round(jaccard_names(base_ranked, current_ranked), 6),
                "top1_changed": base_ranked[0]["city"]["name_en"] != current_ranked[0]["city"]["name_en"],
            },
            "matching_result": {
                "direction_enabled": False,
                "top10": compact_ranked(current_ranked),
                "top3_explanations": top3_explanations(current_ranked),
                "highest_primary_element_city": {
                    "city_name_en": element_max_city["name_en"],
                    "city_name_zh": element_max_city["name_zh"],
                    "element_value": round(element_max_city["vector"][primary_index] * 100.0, 6),
                    "rank": element_max_rank,
                    "is_top1": element_max_rank == 1,
                },
                "strong_avoid_exposure_over_range_in_top10": strong_avoid_excesses,
                "range_feasibility": {
                    "cities_with_all_five_elements_in_range": all_ranges_city_count,
                    "minimum_range_violations_among_100_cities": minimum_violations,
                    "top1_range_violations": sum(
                        detail["state"] != "within_range" for detail in current_ranked[0]["details"]
                    ),
                },
            },
            "direction_audit": direction,
            "alternative_scenario": alternative_output,
            "versions": {
                "bazi_engine": "lunar-javascript-adapter-v0.1-candidate/lunar-javascript@1.7.7/sect=1",
                "personal_need": "personal-need-v0.1-candidate",
                "city_engine": "city-elements-v0.2.1-scheme-c-candidate",
                "matching_engine": "matching-engine-v0.1-candidate",
                "index_calibration": "matching-index-calibration-v0.1-candidate",
                "dayun_adjustment": "dayun-adjustment-v0.1-candidate",
                "direction_adjustment": "direction-adjustment-v0.1-candidate",
            },
        })

    top5_counts = Counter()
    top10_counts = Counter()
    primary_max_is_top1 = 0
    strong_avoid_excess = []
    all_direction_overtakes = 0
    max_direction_gap = 0.0
    dayun_l1 = []
    dayun_jaccards = []
    dayun_top1_changes = 0
    alt_jaccards = []
    alt_top1_stable = 0
    range_all_five_counts = []
    min_range_violations = []
    for case in case_outputs:
        names = [item["city_name_en"] for item in case["matching_result"]["top10"]]
        top5_counts.update(names[:5])
        top10_counts.update(names)
        primary_max_is_top1 += int(case["matching_result"]["highest_primary_element_city"]["is_top1"])
        strong_avoid_excess.extend(
            {"case_id": case["id"], **item}
            for item in case["matching_result"]["strong_avoid_exposure_over_range_in_top10"]
        )
        range_all_five_counts.append(case["matching_result"]["range_feasibility"]["cities_with_all_five_elements_in_range"])
        min_range_violations.append(case["matching_result"]["range_feasibility"]["minimum_range_violations_among_100_cities"])
        all_direction_overtakes += case["direction_audit"]["overtakes_across_more_than_one_point"]
        max_direction_gap = max(max_direction_gap, case["direction_audit"]["maximum_overtaken_base_gap"])
        dayun_l1.append(case["dayun_comparison"]["l1_change_points"])
        dayun_jaccards.append(case["dayun_comparison"]["top10_jaccard"])
        dayun_top1_changes += int(case["dayun_comparison"]["top1_changed"])
        if case["alternative_scenario"]:
            alt_jaccards.append(case["alternative_scenario"]["top10_jaccard_with_main"])
            alt_top1_stable += int(case["alternative_scenario"]["top1_stable"])

    same_primary = {}
    for primary in ELEMENTS:
        subset = [case for case in case_outputs if case["personal_need"]["primary_element"] == primary]
        pair_scores = []
        for left_index, left in enumerate(subset):
            left_names = {item["city_name_en"] for item in left["matching_result"]["top10"]}
            for right in subset[left_index + 1:]:
                right_names = {item["city_name_en"] for item in right["matching_result"]["top10"]}
                pair_scores.append(len(left_names & right_names) / len(left_names | right_names))
        same_primary[primary] = {
            "case_count": len(subset),
            "unique_top1": len({case["matching_result"]["top10"][0]["city_name_en"] for case in subset}),
            "unique_top10_cities": len({item["city_name_en"] for case in subset for item in case["matching_result"]["top10"]}),
            "mean_pairwise_top10_jaccard": round(statistics.fmean(pair_scores), 6) if pair_scores else None,
        }

    result = {
        "schema_version": "t005-manual-regression-v0.1",
        "generated_at": "2026-09-11",
        "task_id": "T-005",
        "status": "candidate_manual_regression_complete_parameters_not_locked",
        "privacy": {
            "real_birth_information_cases": 0,
            "constructed_stress_test_cases": len(case_outputs),
            "note": "项目没有获得经授权的真实用户出生资料，因此本轮不伪造真实人物；所有日期、地点均为压力测试输入。",
        },
        "method": {
            "case_selection": "先覆盖月令、强弱、调候、同主喜差异和低置信度，再固定人工解释；城市结果不参与命理标签选择。",
            "pillar_verification": "analysis/t005_verify_manual_case_pillars.js with locked lunar-javascript@1.7.7 commit 4c45a59f79b856125516f31aefa8295035c16afd and sect=1",
            "matching_baseline": "unchanged personal-need-v0.1-candidate and matching-engine-v0.1-candidate",
            "city_input": "unchanged data/cities.csv, city-elements-v0.2.1-scheme-c-candidate",
            "direction": "default off; audit-only ±1.0 within 1.0-point base tier",
            "dayun_scope": "element-direction stress test only; not a claim about a real person's current luck cycle",
        },
        "coverage": {
            "case_count": len(case_outputs),
            "primary_element_counts": dict(Counter(case["personal_need"]["primary_element"] for case in case_outputs)),
            "confidence_counts": dict(Counter(case["manual_interpretation"]["confidence"] for case in case_outputs)),
            "cases_with_alternative": sum(case["alternative_scenario"] is not None for case in case_outputs),
            "hot_or_cold_regulation_cases": sum(
                case["personal_need"]["climate_adjustment"] in {"cold_need_warmth", "hot_need_cooling", "dry_need_moisture"}
                for case in case_outputs
            ),
        },
        "audit_summary": {
            "primary_element_max_city_is_top1_cases": primary_max_is_top1,
            "primary_element_max_city_is_not_top1_cases": len(case_outputs) - primary_max_is_top1,
            "strong_avoid_over_range_top10_occurrences": len(strong_avoid_excess),
            "strong_avoid_over_range_by_case_and_city": strong_avoid_excess,
            "strong_avoid_excess_severity": {
                "over_5_points": sum(item["excess"] > 5.0 for item in strong_avoid_excess),
                "over_10_points": sum(item["excess"] > 10.0 for item in strong_avoid_excess),
                "over_15_points": sum(item["excess"] > 15.0 for item in strong_avoid_excess),
                "over_10_points_with_index_at_least_80": sum(
                    item["excess"] > 10.0 and item["compatibility_index"] >= 80.0
                    for item in strong_avoid_excess
                ),
                "minimum_local_fit_for_over_10_points": round(min(
                    item["local_fit"] for item in strong_avoid_excess if item["excess"] > 10.0
                ), 6),
            },
            "range_feasibility": {
                "cases_with_any_city_inside_all_five_ranges": sum(value > 0 for value in range_all_five_counts),
                "maximum_cities_inside_all_five_ranges_for_one_case": max(range_all_five_counts),
                "mean_minimum_range_violations": round(statistics.fmean(min_range_violations), 6),
                "maximum_minimum_range_violations": max(min_range_violations),
            },
            "dayun": {
                "mean_l1_change_points": round(statistics.fmean(dayun_l1), 6),
                "max_l1_change_points": round(max(dayun_l1), 6),
                "mean_top10_jaccard_before_after": round(statistics.fmean(dayun_jaccards), 6),
                "top1_changed_cases": dayun_top1_changes,
                "primary_or_strong_avoid_order_flip_cases": 0,
            },
            "direction": {
                "overtakes_across_more_than_one_point": all_direction_overtakes,
                "maximum_overtaken_base_gap": round(max_direction_gap, 6),
                "max_allowed_delta_points": 1.0,
            },
            "alternatives": {
                "case_count": len(alt_jaccards),
                "mean_top10_jaccard": round(statistics.fmean(alt_jaccards), 6),
                "top1_stable_cases": alt_top1_stable,
            },
            "same_primary_groups": same_primary,
            "recommendation_concentration": {
                "unique_top5_cities": len(top5_counts),
                "unique_top10_cities": len(top10_counts),
                "most_common_top5": top5_counts.most_common(10),
                "most_common_top10": top10_counts.most_common(10),
                "top5_slots": sum(top5_counts.values()),
                "top10_slots": sum(top10_counts.values()),
            },
        },
        "cases": case_outputs,
    }

    output_path = root / "data" / "matching_manual_regression_cases.json"
    output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output_path),
        "coverage": result["coverage"],
        "key_findings": {
            "primary_element_max_city_is_not_top1_cases": result["audit_summary"]["primary_element_max_city_is_not_top1_cases"],
            "strong_avoid_over_range_top10_occurrences": result["audit_summary"]["strong_avoid_over_range_top10_occurrences"],
            "strong_avoid_excess_severity": result["audit_summary"]["strong_avoid_excess_severity"],
            "range_feasibility": result["audit_summary"]["range_feasibility"],
            "dayun": result["audit_summary"]["dayun"],
            "direction": result["audit_summary"]["direction"],
            "alternatives": result["audit_summary"]["alternatives"],
            "recommendation_concentration": result["audit_summary"]["recommendation_concentration"],
        },
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
