// Synthetic data shaped like real Nahaus API v2 responses. No real people or addresses.
import type { NahausLandlord, NahausProperty, NahausUnit } from "./types.js";

export const NOW = Date.parse("2026-10-22T12:00:00Z");
const ts = (iso: string) => ({ _seconds: Date.parse(iso) / 1000, _nanoseconds: 0 });

export const properties: NahausProperty[] = [
  {
    id: "prop-1",
    address: { streetName: "Beispielweg", streetNumber: "12", postalCode: "12345", locality: { long: "Musterstadt" } },
    landlord: { id: "ll-1" },
  },
  {
    id: "prop-2",
    address: { streetName: "Testallee", streetNumber: "3a", postalCode: "54321", locality: { long: "Probeburg" } },
    landlord: { id: "ll-2" },
  },
  { id: "prop-deleted", deleted: true, address: { streetName: "Altlast", streetNumber: "1" } },
  { id: "prop-archived", archived: true, address: { streetName: "Archiv", streetNumber: "2" } },
];

export const unitsByProperty: Record<string, NahausUnit[]> = {
  "prop-1": [
    {
      id: "u-1",
      label: "Whg. EG links",
      currentPeriod: {
        isCurrent: true,
        rental: { isRented: true },
        costs: { kalt: { amount: 307.41 }, total: 511.68 },
        tenants: [
          { isCurrent: true, isMain: false, contactData: { firstName: "Erika", lastName: "Mustermann" } },
          { isCurrent: true, isMain: true, contactData: { firstName: "Max", lastName: "Beispiel" } },
        ],
      },
    },
    {
      // Flagged as rented, but the period has already ended -> vacant.
      id: "u-2",
      label: "Whg. 1.OG",
      currentPeriod: {
        isCurrent: true,
        rental: { isRented: true, endDate: ts("2026-03-31T00:00:00Z") },
        costs: { kalt: { amount: 400 }, total: 560 },
        tenants: [{ isCurrent: true, isMain: true, contactData: { firstName: "Alt", lastName: "Mieter" } }],
      },
    },
    { id: "u-3", label: "Garage 1", currentPeriod: null },
  ],
  "prop-2": [
    {
      id: "u-4",
      label: "Büro",
      currentPeriod: {
        rental: { isRented: true },
        costs: { kalt: { amount: 1500 }, total: 1500 },
        tenants: [{ isCurrent: true, contactData: { displayName: "Beispiel GmbH" } }],
      },
    },
  ],
};

export const landlords: NahausLandlord[] = [
  { id: "ll-1", firstName: "Lara", lastName: "Landlord", displayName: "Lara Landlord", emails: [{ value: "Lara@example.com" }] },
  { id: "ll-2", displayName: "Ohne Mail", emails: null },
];
