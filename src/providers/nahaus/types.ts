/**
 * The subset of the Nahaus API v2 response shapes this adapter reads.
 * Everything is optional on purpose: only fields that were observed in real
 * responses are listed, and none are trusted to be present.
 */
export interface NahausTimestamp {
  _seconds: number;
  _nanoseconds?: number;
}

export interface NahausPage<T> {
  pagination?: { totalRecords: number; totalPages: number; currentPage: number; recordsOnPage: number };
  data: T[];
  nextCursor?: string | null;
}

export interface NahausAddress {
  streetName?: string;
  streetNumber?: string;
  postalCode?: string;
  locality?: { long?: string };
}

export interface NahausProperty {
  id: string;
  address?: NahausAddress;
  landlord?: { id?: string };
  archived?: boolean;
  deleted?: boolean;
}

export interface NahausTenant {
  isCurrent?: boolean;
  isMain?: boolean;
  contactData?: { firstName?: string; lastName?: string; displayName?: string };
}

export interface NahausPeriod {
  isCurrent?: boolean;
  rental?: { isRented?: boolean; endDate?: NahausTimestamp | null };
  costs?: { kalt?: { amount?: number }; total?: number };
  tenants?: NahausTenant[];
}

export interface NahausUnit {
  id: string;
  label?: string;
  currentPeriod?: NahausPeriod | null;
}

export interface NahausLandlord {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  emails?: { value?: string }[] | null;
}
