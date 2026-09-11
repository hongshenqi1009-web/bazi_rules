#!/usr/bin/env node
"use strict";

/**
 * Verify the deterministic pillars used by the T-005 manual regression.
 *
 * Usage:
 *   node analysis/t005_verify_manual_case_pillars.js /path/to/lunar.js
 *
 * The supplied lunar.js must be the locked lunar-javascript 1.7.7 source at
 * commit 4c45a59f79b856125516f31aefa8295035c16afd. This is an audit helper, not
 * application code. It deliberately calls EightChar.setSect(1) to enforce the
 * product's approved 23:00 day boundary.
 */

const path = require("path");

const entry = process.argv[2];
if (!entry) {
  throw new Error("Pass the path to the locked lunar-javascript lunar.js file.");
}

const { Solar } = require(path.resolve(entry));

const cases = [
  ["T005-MR-01", [1988, 2, 15, 22, 30, 0], "戊辰 甲寅 庚子 丁亥"],
  ["T005-MR-02", [2005, 12, 23, 8, 37, 0], "乙酉 戊子 辛巳 壬辰"],
  ["T005-MR-03", [1999, 6, 7, 9, 11, 0], "己卯 庚午 庚寅 辛巳"],
  ["T005-MR-04", [1995, 12, 18, 10, 28, 0], "乙亥 戊子 癸未 丁巳"],
  ["T005-MR-05", [1998, 6, 11, 4, 28, 0], "戊寅 戊午 己丑 丙寅"],
  ["T005-MR-06", [1994, 12, 6, 2, 0, 0], "甲戌 乙亥 丙寅 己丑"],
  ["T005-MR-07", [1990, 12, 11, 6, 0, 0], "庚午 戊子 庚戌 己卯"],
  ["T005-MR-08", [1993, 5, 23, 4, 0, 0], "癸酉 丁巳 甲辰 丙寅"],
  ["T005-MR-09", [2024, 2, 4, 16, 28, 0], "甲辰 丙寅 戊戌 庚申"],
  ["T005-MR-10", [2024, 3, 5, 10, 24, 0], "甲辰 丁卯 戊辰 丁巳"],
  ["T005-MR-11", [2022, 3, 9, 20, 51, 0], "壬寅 癸卯 辛酉 戊戌"],
  ["T005-MR-12", [2024, 6, 15, 10, 0, 0], "甲辰 庚午 庚戌 辛巳"],
  ["T005-MR-13", [2024, 11, 3, 8, 50, 0], "甲辰 甲戌 辛未 壬辰"],
  ["T005-MR-14", [2019, 3, 27, 2, 0, 0], "己亥 丁卯 癸亥 癸丑"],
  ["T005-MR-15", [2019, 3, 7, 8, 0, 0], "己亥 丁卯 癸卯 丙辰"],
];

const results = [];
for (const [id, parts, expected] of cases) {
  const eightChar = Solar.fromYmdHms(...parts).getLunar().getEightChar();
  eightChar.setSect(1);
  const observed = eightChar.toString();
  const pass = observed === expected;
  results.push({ id, input: parts.join("-"), expected, observed, pass });
  if (!pass) {
    process.exitCode = 1;
  }
}

console.log(JSON.stringify({
  implementation: "lunar-javascript@1.7.7",
  commit: "4c45a59f79b856125516f31aefa8295035c16afd",
  sect: 1,
  passed: results.filter((item) => item.pass).length,
  total: results.length,
  results,
}, null, 2));
