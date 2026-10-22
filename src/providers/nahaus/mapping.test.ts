import assert from "node:assert/strict";
import { test } from "node:test";
import { landlords, NOW, properties, unitsByProperty } from "./fixtures.js";
import { mapLandlord, mapProperty, mapUnit } from "./mapping.js";

test("maps a rented unit: tenants (main first), base rent and charges", () => {
  const unit = mapUnit(unitsByProperty["prop-1"][0], NOW);
  assert.equal(unit.status, "Vermietet");
  assert.equal(unit.tenant, "Beispiel, Max / Mustermann, Erika");
  assert.equal(unit.kaltmiete, 307.41);
  assert.equal(unit.nebenkosten, 204.27); // total - kalt, rounded to cents
  assert.equal(unit.area, undefined);
  assert.equal(unit.arrears, undefined);
});

test("treats a unit whose period already ended as vacant", () => {
  const unit = mapUnit(unitsByProperty["prop-1"][1], NOW);
  assert.deepEqual([unit.status, unit.tenant, unit.kaltmiete], ["Leerstehend", "Leerstehend", 0]);
});

test("treats a unit without a period as vacant", () => {
  assert.equal(mapUnit(unitsByProperty["prop-1"][2], NOW).status, "Leerstehend");
});

test("falls back to displayName for company tenants", () => {
  assert.equal(mapUnit(unitsByProperty["prop-2"][0], NOW).tenant, "Beispiel GmbH");
});

test("maps a property with address parts, totals and occupancy", () => {
  const units = unitsByProperty["prop-1"].map((u) => mapUnit(u, NOW));
  const property = mapProperty(properties[0], units);
  assert.equal(property.address, "Beispielweg 12");
  assert.equal(property.city, "Musterstadt");
  assert.equal(property.zip, "12345");
  assert.equal(property.totalRent, 511.68);
  assert.equal(property.occupancyRate, 33.3);
});

test("maps landlords with email; skips those without", () => {
  assert.deepEqual(mapLandlord(landlords[0], "prop-1"), {
    id: "ll-1", email: "Lara@example.com", name: "Lara Landlord", role: "landlord", propertyId: "prop-1",
  });
  assert.equal(mapLandlord(landlords[1]), undefined);
});
