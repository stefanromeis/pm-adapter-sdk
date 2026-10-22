import assert from "node:assert/strict";
import { test } from "node:test";
import { TtlCache } from "./ttl-cache.js";

test("reuses a value within the ttl and reloads after it", async () => {
  let t = 0;
  let loads = 0;
  const cache = new TtlCache(1000, () => t);
  const load = async () => ++loads;

  assert.equal(await cache.get("k", load), 1);
  assert.equal(await cache.get("k", load), 1);
  t = 1001;
  assert.equal(await cache.get("k", load), 2);
});

test("de-duplicates concurrent loads of the same key", async () => {
  let loads = 0;
  const cache = new TtlCache(1000);
  const load = async () => {
    loads++;
    await new Promise((r) => setTimeout(r, 5));
    return "v";
  };

  const results = await Promise.all([cache.get("k", load), cache.get("k", load), cache.get("k", load)]);
  assert.deepEqual(results, ["v", "v", "v"]);
  assert.equal(loads, 1);
});

test("does not cache failed loads", async () => {
  const cache = new TtlCache(1000);
  await assert.rejects(cache.get("k", async () => { throw new Error("boom"); }));
  assert.equal(await cache.get("k", async () => "ok"), "ok");
});
