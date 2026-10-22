import assert from "node:assert/strict";
import { test } from "node:test";
import { NahausAdapter } from "./adapter.js";
import { NahausBudgetExceededError } from "./client.js";
import { landlords, NOW, properties, unitsByProperty } from "./fixtures.js";

function setup(opts: { monthlyBudget?: number; failFirstWith401?: boolean } = {}) {
  const calls: string[] = [];
  let clock = NOW;
  let tokens = 0;
  let first = true;

  const fakeFetch = (async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname.replace(/^\/api-v2/, "");
    calls.push(`${init?.method ?? "GET"} ${path}`);
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

    if (path === "/api-auth/login") return json({ idToken: `token-${++tokens}`, expiresIn: "3600" });
    if (opts.failFirstWith401 && first) { first = false; return json({}, 401); }
    if (path === "/properties") return json({ data: properties, nextCursor: null });
    if (path === "/landlords") return json({ data: landlords, nextCursor: null });
    const m = path.match(/^\/properties\/([^/]+)\/units$/);
    if (m) return json({ data: unitsByProperty[m[1]] ?? [], nextCursor: null });
    return json({}, 404);
  }) as typeof fetch;

  const adapter = new NahausAdapter({
    email: "x@example.com", password: "pw", fetch: fakeFetch, now: () => clock,
    monthlyBudget: opts.monthlyBudget, onBudgetWarning: () => {},
  });
  return { adapter, calls, advance: (ms: number) => { clock += ms; } };
}

test("getProperties: skips deleted/archived and costs 1 login + 1 list + 1 call per property", async () => {
  const { adapter, calls } = setup();
  const result = await adapter.getProperties();

  assert.deepEqual(result.map((p) => p.id), ["prop-1", "prop-2"]);
  assert.equal(calls.filter((c) => c.includes("login")).length, 1);
  assert.equal(calls.length, 1 + 1 + 2);
});

test("repeated reads within the cache ttl cost no further requests", async () => {
  const { adapter, calls } = setup();
  await adapter.getProperties();
  const before = calls.length;

  await adapter.getProperties();
  await adapter.getPropertyById("prop-1");
  await adapter.getMetrics();
  assert.equal(calls.length, before);
});

test("concurrent identical reads trigger a single load", async () => {
  const { adapter, calls } = setup();
  await Promise.all([adapter.getProperties(), adapter.getProperties(), adapter.getMetrics()]);
  assert.equal(calls.filter((c) => c === "GET /properties").length, 0 + 1);
});

test("the token is reused across cache expiry; a new login happens only after it expires", async () => {
  const { adapter, calls, advance } = setup();
  await adapter.getProperties();
  advance(11 * 60_000); // cache expired, token (1h) still valid
  await adapter.getProperties();
  assert.equal(calls.filter((c) => c.includes("login")).length, 1);

  advance(60 * 60_000);
  await adapter.getProperties();
  assert.equal(calls.filter((c) => c.includes("login")).length, 2);
});

test("a rejected token (401) triggers one re-login and a retry", async () => {
  const { adapter, calls } = setup({ failFirstWith401: true });
  const result = await adapter.getProperties();
  assert.equal(result.length, 2);
  assert.equal(calls.filter((c) => c.includes("login")).length, 2);
});

test("only issues GET requests for data (login is the single POST)", async () => {
  const { adapter, calls } = setup();
  await adapter.getProperties();
  await adapter.getLandlordsForProperty("prop-1");
  assert.deepEqual(calls.filter((c) => c.startsWith("POST")), ["POST /api-auth/login"]);
});

test("metrics aggregate rent and occupancy and omit arrears", async () => {
  const { adapter } = setup();
  const metrics = await adapter.getMetrics();
  assert.equal(metrics.totalRent, 2011.68);
  assert.equal(metrics.occupancyRate, 50); // 2 of 4 units rented
  assert.equal(metrics.totalArrears, undefined);
});

test("landlord lookups by email (case-insensitive) and by property", async () => {
  const { adapter } = setup();
  assert.equal((await adapter.getRecipientByEmail("lara@EXAMPLE.com"))?.id, "ll-1");
  assert.equal(await adapter.getRecipientByEmail("nobody@example.com"), undefined);
  assert.deepEqual((await adapter.getLandlordsForProperty("prop-1")).map((r) => r.id), ["ll-1"]);
  assert.deepEqual(await adapter.getLandlordsForProperty("prop-2"), []); // landlord has no email
});

test("stops before exceeding the monthly request budget", async () => {
  const { adapter, calls } = setup({ monthlyBudget: 3 });
  await assert.rejects(adapter.getProperties(), NahausBudgetExceededError);
  assert.equal(calls.length, 3);
  assert.equal(adapter.getUsage().count, 3);
});

test("onRequest reports every request with the running usage count", async () => {
  const seen: string[] = [];
  const calls: string[] = [];
  const adapter = new NahausAdapter({
    email: "x@example.com", password: "pw", now: () => NOW,
    onRequest: ({ method, path, usage }) => seen.push(`${method} ${path} ${usage.count}`),
    fetch: (async (url: string) => {
      const path = new URL(url).pathname;
      calls.push(path);
      const body = path.endsWith("/login") ? { idToken: "t", expiresIn: "3600" } : { data: [], nextCursor: null };
      return new Response(JSON.stringify(body));
    }) as typeof fetch,
  });
  await adapter.getRecipientByEmail("a@example.com");
  assert.deepEqual(seen, ["POST /api-auth/login 1", "GET /landlords?limit=100 2"]);
});
