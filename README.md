# QR Guys Clothing Co.

Operated by MWM Visionary Solutions. Independent apparel migration foundation.

## Current state

The original coming-soon page remains index.html. Apparel.html contains the rebranded editor, login.html/signup.html provide new account flows, and scan.html renders a restricted public content response. Missing service configuration disables app interactions. Products remain undecided; catalog/products.json is empty.

This is a draft migration, not a production-ready equivalent of the original app. The original ThemeQR service is untouched.

## Local checks

Node.js 22 or newer; no installed packages required for this increment.

    npm test
    npm run build

The build copies only public assets to dist/. Never serve the whole repository: catalog source contains review metadata, and server configuration must remain private. api/ handlers require a compatible Node server runtime and are NOT included in the static build.

## Implemented

- Rebranded editor and separate auth namespace.
- Public configuration allowlist; services disabled by default.
- Authenticated activation endpoint using verified user identity and secret claim proof.
- Proposed Supabase schema, owner policies, atomic claim function and paid/public scan resolver.
- Empty catalog with publication validation, approval revision checks and explicit public projection.
- Public scan rendering without injected HTML or automatic external redirects.
- 18 unit tests (mocked backend requests); static asset build.

## Not yet enabled or complete

- SQL migration has NOT been executed against Supabase. RLS, simultaneous claims and browser end-to-end behavior need integration tests.
- Payment checkout, signed Stripe webhooks, paid entitlement issuance and fulfillment jobs still need implementation. Do not insert production entitlements manually or treat a client claim as proof of payment.
- Image/video hosting, password recovery, full account management and notification delivery remain pending. Upload controls are disabled.
- Product pages, merchant feeds and recurring jobs are not implemented or active.
- No new accounts, secrets, domain routing or deployment were provisioned.

Read docs/SETUP.md and catalog/README.md before enabling anything. Keep QRG_SERVICES_READY=false until the new environment and integration tests pass. QRG_CHECKOUT_ENABLED is reserved for later work; current public configuration always disables checkout.

The existing live page is hosted with Sites. GitHub changes do not automatically publish there. No production publication is included in this branch.

Source reference: bdkelmon/themeqr-site commit 77fe9b1c5a138bd97dcacfe3000c70b7472727c3. Reused editor source was reconfigured; unsafe original payment/activation/retry handlers were not copied.
