// Unit tests for the pure core of scan-live-players.mjs (no network).
//   node --test tests/scan-live-players.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate, coveredKeys, createTextFetcher, summarizeScan } from "./scan-live-players.mjs";

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

test("successful responses without hashes are inconclusive rather than failed or all covered", async () => {
  const client = createTextFetcher(async () => ({ ok: true, text: async () => "<html>No player on this page</html>" }));
  await client.text("https://www.youtube.com/");
  const scan = await summarizeScan([null], new Set(), undefined, client.stats);
  assert.equal(scan.status, "inconclusive");
  assert.equal(scan.samples, 0);
  assert.deepEqual(scan.unknown, []);
  assert.equal(client.stats.succeeded, 1);
  assert.equal(client.stats.failed, 0);
});

test("an empty observation list alone is not a fetch failure", async () => {
  assert.equal((await summarizeScan([], new Set())).status, "inconclusive");
});

test("a header-overflow failure is reported as a fetch failure, independently of missing hashes", async () => {
  const client = createTextFetcher(async () => {
    throw Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_HEADERS_OVERFLOW" } });
  });
  await client.text("https://www.youtube.com/iframe_api");
  const scan = await summarizeScan([null], new Set(), undefined, client.stats);
  assert.equal(scan.status, "fetch_failed");
  assert.deepEqual([...client.errors], ["UND_ERR_HEADERS_OVERFLOW"]);
  assert.equal(client.stats.failed, 1);
});

test("an HTTP rejection is counted once even when cancelling its body fails", async () => {
  const client = createTextFetcher(async () => ({ ok: false, status: 503, body: { cancel: async () => { throw Error("closed"); } } }));
  assert.equal(await client.text("https://www.youtube.com/iframe_api"), "");
  assert.deepEqual(client.stats, { attempted: 1, succeeded: 0, failed: 1 });
  assert.deepEqual([...client.errors], ["HTTP 503 (www.youtube.com)"]);
});

test("partial request failures do not turn successfully observed known hashes into a failed scan", async () => {
  const scan = await summarizeScan([null, "11a45ffb"], new Set(["11a45ffb"]), undefined,
    { attempted: 2, succeeded: 1, failed: 1 });
  assert.equal(scan.status, "covered");
  assert.equal(scan.samples, 1);
  assert.deepEqual(scan.unknown, []);
});

test("a successful hash-free response can coexist with failed requests without failing the scan", async () => {
  const scan = await summarizeScan([null, null], new Set(), undefined,
    { attempted: 2, succeeded: 1, failed: 1 });
  assert.equal(scan.status, "inconclusive");
});

test("an unknown URL hash still requires publication when its MD5 alias is known", async () => {
  const scan = await summarizeScan(["11a45ffb", null, "11a45ffb"], new Set(["950316ef", "b5f7c4ff"]),
    async () => ({ md5: "b5f7c4ff", sts: 20753 }));
  assert.equal(scan.samples, 2);
  assert.equal(scan.status, "unknown_players");
  assert.deepEqual(scan.unknown, [{ hash: "11a45ffb", count: 2, md5: "b5f7c4ff", sts: 20753 }]);
});

test("a published URL alias is covered without downloading its player", async () => {
  const scan = await summarizeScan(["11a45ffb"], new Set(["11a45ffb"]),
    async () => assert.fail("covered players must not be downloaded"));
  assert.deepEqual(scan.unknown, []);
  assert.equal(scan.status, "covered");
});
