export type UnitStatus = "Vermietet" | "Leerstehend";

export interface Unit {
  id: string;
  /** Display label of the unit, e.g. "Whg. 1.OG links". */
  number: string;
  /** Living area in m². Omitted when the PM system does not provide it. */
  area?: number;
  /** Current tenant(s) as "Lastname, Firstname", or "Leerstehend" when vacant. */
  tenant: string;
  /** Base rent per month (€). */
  kaltmiete: number;
  /** Additional charges per month (€), i.e. total rent minus base rent. */
  nebenkosten: number;
  status: UnitStatus;
  /** Rent arrears (€). Omitted when the PM system does not provide it. */
  arrears?: number;
}

export interface Property {
  id: string;
  address: string;
  city: string;
  zip: string;
  units: Unit[];
  /** Sum of base rent and additional charges over all units (€ per month). */
  totalRent: number;
  /** Share of rented units in percent (0–100). */
  occupancyRate: number;
  /** Optional image URL; the consuming app picks a fallback when omitted. */
  imageUrl?: string;
}

export interface Recipient {
  id: string;
  email: string;
  name: string;
  role: "tenant" | "landlord";
  unitId?: string;
  propertyId?: string;
}

/** Portfolio figures a property management system can supply. */
export interface PropertyMetrics {
  totalRent: number;
  rentTrend: number;
  occupancyRate: number;
  occupancyTrend: number;
  /** Omitted when the PM system does not provide arrears. */
  totalArrears?: number;
  arrearsTrend?: number;
}
