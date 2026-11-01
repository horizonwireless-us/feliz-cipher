// Unit tests for the pure core of scan-live-players.mjs (no network).
//   node --test tests/scan-live-players.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, coveredKeys, summarizeScan } from "./scan-live-players.mjs";

test("aggregate counts and sorts most-seen first, dropping nulls", () => {
  const out = aggregate(["aaaaaaaa", "bbbbbbbb", "aaaaaaaa", null, "aaaaaaaa", "bbbbbbbb"]);
  assert.deepEqual(out, [
    { hash: "aaaaaaaa", count: 3 },
    { hash: "bbbbbbbb", count: 2 },
  ]);
});

test("aggregate breaks count ties by hash for stable output", () => {
  const out = aggregate(["ffffffff", "11111111"]);
  assert.deepEqual(out, [
    { hash: "11111111", count: 1 },
    { hash: "ffffffff", count: 1 },
  ]);
});

test("aggregate of empty / all-null is empty", () => {
  assert.deepEqual(aggregate([]), []);
  assert.deepEqual(aggregate([null, null]), []);
});

test("coveredKeys includes both primaries and aliases", () => {
  const cfg = JSON.stringify({
    schemaVersion: 1,
    players: {
      "12345678": { sig: "Tl(48,5831,INPUT)", nClass: "W_", sts: 20602, aliases: ["abcdef01"] },
    },
  });
  const keys = coveredKeys(cfg, "test.json");
  assert.ok(keys.has("12345678"), "primary covered");
  assert.ok(keys.has("abcdef01"), "alias covered");
  assert.ok(!keys.has("deadbeef"), "unknown not covered");
});

test("coveredKeys throws on an invalid config (device would reject it wholesale)", () => {
  assert.throws(() => coveredKeys(JSON.stringify({ players: {} }), "bad.json"));
});

test("a scan with no observations fails instead of reporting all covered", async () => {
  await assert.rejects(summarizeScan([null, null], new Set()), /coverage is unknown/);
});

test("an unknown URL hash still requires publication when its MD5 alias is known", async () => {
  const scan = await summarizeScan(["11a45ffb", null, "11a45ffb"], new Set(["950316ef", "b5f7c4ff"]),
    async () => ({ md5: "b5f7c4ff", sts: 20753 }));
  assert.equal(scan.samples, 2);
  assert.deepEqual(scan.unknown, [{ hash: "11a45ffb", count: 2, md5: "b5f7c4ff", sts: 20753 }]);
});

test("a published URL alias is covered without downloading its player", async () => {
  const scan = await summarizeScan(["11a45ffb"], new Set(["11a45ffb"]),
    async () => assert.fail("covered players must not be downloaded"));
  assert.deepEqual(scan.unknown, []);
});
