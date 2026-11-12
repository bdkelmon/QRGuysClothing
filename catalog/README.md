# Product catalog contract

`products.json` is the initial authoritative catalog file. It is deliberately empty: no launch products, prices, materials, fees, or QR capabilities have been approved. This contract is newly introduced for QR Guys; it is not a claim about the existing apparel database schema.

Use Node.js 20+ and import `validateCatalog`, `validateProduct`, and `selectPublishableProducts` from `validate.mjs`. There are no package dependencies. Run `node --test tests/catalog.test.mjs` from the repository root.

## Records

The catalog has `schemaVersion: 1`, a nonempty `revision`, and a `products` array. Product IDs must be unique and stable. Change the catalog revision whenever records change. Every product has `id`, `revision`, `status`, and `facts`. Increment the product revision whenever its factual/public copy changes; approvals and copy proposals must identify that exact revision.

| Product field | Contract |
| --- | --- |
| `status` | `draft`, `review`, `approved`, or `retired` |
| `facts.name`, `description`, `brand` | Reviewed customer-facing text; description is approved copy, not an AI proposal |
| `facts.url` | Canonical public HTTPS product URL |
| `facts.images` | Nonempty array of public HTTPS `url` and factual `alt` text |
| `facts.price` | `amountMinor`: nonnegative safe integer in the currency's minor unit; `currency`: uppercase three-letter code |
| `facts.availability` | `in_stock`, `out_of_stock`, or `preorder` |
| `facts.apparel` | `material`, `careInstructions`, nonempty `sizes` and `colors` text arrays |
| `facts.qr` | Public `summary`, `activation`, and `fees` text explaining the actual feature and all required charges |
| `facts.shipping`, `returns` | Reviewed customer-facing terms |
| `evidence` | Nonempty array of `field` and `reference` identifying factual sources for review; use `field: "facts"` only when a source covers the complete record |
| `approval` | `revision`, `reviewer`, and `approvedAt` (ISO UTC timestamp), recorded by the authorized review workflow |
| `copyDraft` | Optional `basedOnRevision`, proposed `name` and/or `description`; never published automatically |

Incomplete facts may be stored as drafts or in review. Any supplied fields must still have valid shapes. Approved records require all public fields, evidence, and approval. Retired records never enter the public projection. This first version supports one price and availability per product record; it does not infer variant-level stock or pricing. Do not use it for differently priced variants until a reviewed variant contract is implemented.

## Publication and factual review

1. Collect verified apparel details, policies, images, and QR behavior. Keep unknown facts absent and the record in `draft`.
2. Generate proposed wording under `copyDraft`, tied to the source revision. Do not have AI set approval metadata.
3. A reviewer checks all claims against the evidence, transfers accepted wording into `facts`, assigns the final revision, clears or refreshes any proposal, and records approval for that revision.
4. Set `status` to `approved` only through that review workflow. Use `selectPublishableProducts(catalog)` as the sole source for page/schema/feed adapters.
5. A later factual change resets status to `draft` or `review`, removes approval, and changes the revision. New approval is needed before republishing.

The validator checks the record structure and revision match; it cannot establish that a person truly approved a record, that claims are true, or that a currency code is officially assigned. Enforce reviewer permissions in the future authenticated admin workflow. Catalog writers must obey the revision rules; this module has no database or history with which to detect an illicit same-revision edit. Downstream price formatting must use the currency's actual minor-unit exponent, not blindly divide every amount by 100.

## Privacy boundary

Never put customer IDs, emails, account records, QR tokens, private QR destinations, uploaded customer content, payment secrets, or credentials in this catalog. The existing apparel account/QR store remains a separate protected system. QR fields describe the public product capability only.

Unknown fields are rejected at every defined object boundary. URLs cannot contain credentials, query strings, or fragments, avoiding accidental use of signed/private links. Supply stable public image URLs. This intentionally excludes signed image URLs and parameterized image transforms in this initial contract.

`selectPublishableProducts` fails closed for an invalid catalog and returns only approved products, flattened as `{ id, revision, ...facts }`. It clones output and excludes evidence, reviewer identity, status, and draft copy. Never serve the source JSON directly or serialize the full record into product markup. The schema cannot detect a secret pasted into ordinary free text or prove a URL is publicly accessible; review and deployment checks must cover those risks.

## Deliberate limits

This module does not publish, crawl URLs, submit feeds, send email, manage inventory, charge customers, or run scheduled jobs. An empty valid catalog means no products are ready; it is not launch readiness or merchant acceptance. Synthetic products in `tests/catalog.test.mjs` are test fixtures only and must never be copied into the live catalog.

Suggested commit message: `Add validated QR Guys product catalog foundation`
