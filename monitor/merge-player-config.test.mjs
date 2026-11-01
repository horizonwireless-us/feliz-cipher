import { test } from "node:test";
import assert from "node:assert/strict";
import { mergePlayerConfig } from "./merge-player-config.mjs";
import { parsePlayerConfigs } from "./player-configs.mjs";

const entry = { sig: "Qxa(1,2829,INPUT)", nClass: "hq", sts: 20753, aliases: ["b5f7c4ff"] };

test("a player sharing an MD5 is published as a URL alias and the full table stays valid", () => {
  const players = { "950316ef": structuredClone(entry) };
  assert.deepEqual(mergePlayerConfig(players, "11a45ffb", entry), { changed: true, primary: "950316ef" });
  assert.deepEqual(players["950316ef"].aliases, ["b5f7c4ff", "11a45ffb"]);
  assert.equal(Object.keys(players).length, 1);
  assert.doesNotThrow(() => parsePlayerConfigs(JSON.stringify({ schemaVersion: 1, players })));
  assert.deepEqual(mergePlayerConfig(players, "11a45ffb", entry), { changed: false, primary: "950316ef" });
});

test("a distinct player becomes a new primary entry", () => {
  const players = {};
  assert.deepEqual(mergePlayerConfig(players, "950316ef", entry), { changed: true, primary: "950316ef" });
  assert.deepEqual(players["950316ef"], entry);
});

test("conflicting cipher expressions, n classes or timestamps cannot overwrite an existing entry", () => {
  for (const patch of [{ sig: "AB(1,2,INPUT)" }, { nClass: "xx" }, { sts: 20754 }]) {
    const players = { "950316ef": structuredClone(entry) };
    const original = structuredClone(players);
    assert.throws(() => mergePlayerConfig(players, "11a45ffb", { ...entry, ...patch }), /conflicts/);
    assert.deepEqual(players, original);
  }
});

test("an entry overlapping two existing players is rejected without changing either", () => {
  const players = { "950316ef": structuredClone(entry), "abcdef01": { ...entry, aliases: ["12345678"] } };
  const original = structuredClone(players);
  assert.throws(() => mergePlayerConfig(players, "11a45ffb", { ...entry, aliases: ["b5f7c4ff", "12345678"] }), /multiple/);
  assert.deepEqual(players, original);
});
