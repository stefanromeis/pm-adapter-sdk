import type { PropertyManagementAdapter } from "../adapter.js";
import type { Property, PropertyMetrics, Recipient } from "../types.js";

const properties: Property[] = [
  {
    id: "p1",
    address: "Berliner Str. 42",
    city: "Berlin",
    zip: "10115",
    totalRent: 4200,
    occupancyRate: 87.5,
    units: [
      { id: "u1-1", number: "Whg. EG links", area: 65, tenant: "Müller, J.", kaltmiete: 850, nebenkosten: 150, status: "Vermietet", arrears: 0 },
      { id: "u1-2", number: "Whg. EG rechts", area: 70, tenant: "Schmidt, A.", kaltmiete: 900, nebenkosten: 160, status: "Vermietet", arrears: 0 },
      { id: "u1-3", number: "Whg. 1.OG links", area: 65, tenant: "Weber, K.", kaltmiete: 850, nebenkosten: 150, status: "Vermietet", arrears: 850 },
      { id: "u1-4", number: "Whg. 1.OG rechts", area: 70, tenant: "Leerstehend", kaltmiete: 0, nebenkosten: 0, status: "Leerstehend", arrears: 0 },
      { id: "u1-5", number: "Whg. 2.OG links", area: 65, tenant: "Wagner, P.", kaltmiete: 850, nebenkosten: 150, status: "Vermietet", arrears: 0 },
      { id: "u1-6", number: "Whg. 2.OG rechts", area: 70, tenant: "Becker, S.", kaltmiete: 900, nebenkosten: 160, status: "Vermietet", arrears: 0 },
      { id: "u1-7", number: "Whg. 3.OG links", area: 60, tenant: "Hoffmann, T.", kaltmiete: 800, nebenkosten: 140, status: "Vermietet", arrears: 0 },
      { id: "u1-8", number: "Whg. 3.OG rechts", area: 60, tenant: "Schäfer, M.", kaltmiete: 800, nebenkosten: 140, status: "Vermietet", arrears: 0 },
    ],
  },
  {
    id: "p2",
    address: "Münchner Allee 15",
    city: "München",
    zip: "80331",
    totalRent: 3850,
    occupancyRate: 83.3,
    units: [
      { id: "u2-1", number: "Whg. EG", area: 90, tenant: "Bauer, H.", kaltmiete: 1200, nebenkosten: 200, status: "Vermietet", arrears: 0 },
      { id: "u2-2", number: "Whg. 1.OG", area: 85, tenant: "Richter, L.", kaltmiete: 1150, nebenkosten: 190, status: "Vermietet", arrears: 0 },
      { id: "u2-3", number: "Whg. 2.OG", area: 85, tenant: "Klein, F.", kaltmiete: 1150, nebenkosten: 190, status: "Vermietet", arrears: 0 },
      { id: "u2-4", number: "Whg. 3.OG", area: 80, tenant: "Wolf, D.", kaltmiete: 1100, nebenkosten: 180, status: "Vermietet", arrears: 1100 },
      { id: "u2-5", number: "Whg. 4.OG links", area: 40, tenant: "Schröder, J.", kaltmiete: 600, nebenkosten: 100, status: "Vermietet", arrears: 0 },
      { id: "u2-6", number: "Whg. 4.OG rechts", area: 40, tenant: "Leerstehend", kaltmiete: 0, nebenkosten: 0, status: "Leerstehend", arrears: 0 },
    ],
  },
  {
    id: "p3",
    address: "Hamburger Weg 8",
    city: "Hamburg",
    zip: "20095",
    totalRent: 2800,
    occupancyRate: 100,
    units: [
      { id: "u3-1", number: "Whg. EG", area: 75, tenant: "Neumann, R.", kaltmiete: 950, nebenkosten: 180, status: "Vermietet", arrears: 0 },
      { id: "u3-2", number: "Whg. 1.OG", area: 75, tenant: "Schwarz, B.", kaltmiete: 950, nebenkosten: 180, status: "Vermietet", arrears: 0 },
      { id: "u3-3", number: "Whg. 2.OG", area: 70, tenant: "Zimmermann, K.", kaltmiete: 900, nebenkosten: 170, status: "Vermietet", arrears: 390 },
      { id: "u3-4", number: "Whg. 3.OG", area: 70, tenant: "Braun, E.", kaltmiete: 900, nebenkosten: 170, status: "Vermietet", arrears: 0 },
    ],
  },
  {
    id: "p4",
    address: "Kölner Ring 23",
    city: "Köln",
    zip: "50667",
    totalRent: 1600,
    occupancyRate: 66.6,
    units: [
      { id: "u4-1", number: "Whg. EG", area: 55, tenant: "Leerstehend", kaltmiete: 0, nebenkosten: 0, status: "Leerstehend", arrears: 0 },
      { id: "u4-2", number: "Whg. 1.OG links", area: 45, tenant: "Krüger, M.", kaltmiete: 600, nebenkosten: 120, status: "Vermietet", arrears: 0 },
      { id: "u4-3", number: "Whg. 1.OG rechts", area: 45, tenant: "Hofmann, S.", kaltmiete: 600, nebenkosten: 120, status: "Vermietet", arrears: 0 },
      { id: "u4-4", number: "Whg. 2.OG", area: 90, tenant: "Leerstehend", kaltmiete: 0, nebenkosten: 0, status: "Leerstehend", arrears: 0 },
      { id: "u4-5", number: "Whg. 3.OG links", area: 45, tenant: "Lange, T.", kaltmiete: 600, nebenkosten: 120, status: "Vermietet", arrears: 0 },
      { id: "u4-6", number: "Whg. 3.OG rechts", area: 45, tenant: "Werner, C.", kaltmiete: 600, nebenkosten: 120, status: "Vermietet", arrears: 0 },
    ],
  },
];

const metrics: PropertyMetrics = {
  totalRent: 12450,
  rentTrend: 2.4,
  occupancyRate: 87.5,
  occupancyTrend: 1.2,
  totalArrears: 2340,
  arrearsTrend: -5.4,
};

const recipients: Recipient[] = [
  { id: "rec1", email: "johannes.doe@beispiel.de", name: "Johannes Doe", role: "landlord" },
  { id: "rec2", email: "mueller@beispiel.de", name: "Müller, J.", role: "tenant", unitId: "u1-1", propertyId: "p1" },
  { id: "rec3", email: "weber@beispiel.de", name: "Weber, K.", role: "tenant", unitId: "u1-3", propertyId: "p1" },
  { id: "rec4", email: "wolf@beispiel.de", name: "Wolf, D.", role: "tenant", unitId: "u2-4", propertyId: "p2" },
];

/**
 * In-memory reference adapter with fictional demo data. Useful for local
 * development and as a template for new adapters.
 */
export class MockAdapter implements PropertyManagementAdapter {
  async getProperties(): Promise<Property[]> {
    return properties;
  }

  async getPropertyById(id: string): Promise<Property | undefined> {
    return properties.find((p) => p.id === id);
  }

  async getMetrics(): Promise<PropertyMetrics> {
    return metrics;
  }

  async getRecipientByEmail(email: string): Promise<Recipient | undefined> {
    return recipients.find((r) => r.email === email);
  }

  async getLandlordsForProperty(propertyId: string): Promise<Recipient[]> {
    return recipients.filter(
      (r) => r.role === "landlord" &&
        (r.propertyId === propertyId || !r.propertyId)
    );
  }
}
