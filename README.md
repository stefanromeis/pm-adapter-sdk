# pm-adapter-sdk

A small, **read-only** adapter interface for connecting property management (PM)
systems, plus reference adapters.

An adapter pulls properties, units, rent figures and landlord contacts out of a
PM system and maps them into one common shape. It never writes back, so
read-only credentials are enough.

```ts
import { MockAdapter, type PropertyManagementAdapter } from "pm-adapter-sdk";

const adapter: PropertyManagementAdapter = new MockAdapter();
const properties = await adapter.getProperties();
```

## The interface

```ts
interface PropertyManagementAdapter {
  getProperties(): Promise<Property[]>;
  getPropertyById(id: string): Promise<Property | undefined>;
  getMetrics(): Promise<PropertyMetrics>;                       // rent, occupancy, arrears
  getRecipientByEmail(email: string): Promise<Recipient | undefined>;
  getLandlordsForProperty(propertyId: string): Promise<Recipient[]>;
}
```

Fields a PM system cannot provide (`Unit.area`, `Unit.arrears`,
`PropertyMetrics.totalArrears`) are optional — leave them out rather than
inventing values.

## Adapters

| Adapter | Description |
| --- | --- |
| `MockAdapter` | In-memory demo data; a template for new adapters. |
| `NahausAdapter` | [Nahaus](https://nahaus.de) API v2, read-only. |

### NahausAdapter

```ts
import { NahausAdapter } from "pm-adapter-sdk";

const adapter = new NahausAdapter({
  email: process.env.NAHAUS_EMAIL!,      // use a read-only Nahaus user
  password: process.env.NAHAUS_PASSWORD!,
  monthlyBudget: 4500,                   // refuse requests beyond this per calendar month
  cacheTtlMs: 10 * 60_000,               // reuse responses for 10 minutes
});
```

The Nahaus API is quota-limited (5,000 requests per month), so the adapter is
frugal by design:

- one login per token lifetime (tokens are reused),
- an in-memory response cache with request de-duplication,
- a request counter with a monthly budget (`adapter.getUsage()`); it warns at
  80% and throws `NahausBudgetExceededError` at 100%,
- only `GET` requests for data.

Uncached request cost: `getProperties` = 1 + one call per property;
`getPropertyById` = 1 + 1; landlord lookups = 1. Cached repeats cost nothing.
The counter lives in process memory and resets on restart.

Not available from the Nahaus API and therefore omitted: living area and rent
arrears.

## Writing an adapter

Implement `PropertyManagementAdapter`, keep it read-only, and be explicit about
what your PM system cannot provide. `src/mock/mock-adapter.ts` is the shortest
complete example.

## Development

```bash
pnpm install
pnpm test
pnpm build
```

## License

MIT
