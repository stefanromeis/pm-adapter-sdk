import type { Property, PropertyMetrics, Recipient } from "./types.js";

/**
 * The interface an integrator implements to connect a property management
 * (PM) system.
 *
 * Strictly read-only: an adapter only pulls data out of the PM system and
 * never writes back to it, so read-only credentials are enough.
 */
export interface PropertyManagementAdapter {
  getProperties(): Promise<Property[]>;
  getPropertyById(id: string): Promise<Property | undefined>;

  /** Rent, occupancy and (if available) arrears across the portfolio. */
  getMetrics(): Promise<PropertyMetrics>;

  /** Looks up a person who may receive confirmation links, by email. */
  getRecipientByEmail(email: string): Promise<Recipient | undefined>;
  /** Landlords responsible for a property. */
  getLandlordsForProperty(propertyId: string): Promise<Recipient[]>;
}
