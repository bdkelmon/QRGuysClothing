# QR Guys setup and ownership

Business operator: MWM Visionary Solutions. Customer brand: QR Guys Clothing Co.
Kelly approved copying the current apparel features into a separate venture with new services. Launch products remain undecided.

## Account setup

Create new QR Guys resources owned by MWM Visionary Solutions. Account owners complete identity verification, billing details and payout bank setup directly with providers. Use individual admin access and business-controlled recovery details. Never put credentials in Git, chat, public config or catalog records.

1. New Supabase project: apply the included migration in a test environment first; configure authentication and exact redirect origins. Confirm isolation from ThemeQR before importing any data. No customer data migration is authorized or needed for this foundation.
2. Server hosting: the existing GitHub README describes a static Sites coming-soon page. The new api/ handlers need a compatible server runtime; copying this repository to static hosting does not run them. Configure a separate server project and secure environment variables, then verify routes in a preview before replacing the live site.
3. Stripe: new account under the correct MWM business identity. Use a separate QR Guys Stripe account under the existing login, with MWM as legal operator. Start in test mode. Payment handlers are not implemented yet. After implementation, create only approved products/prices, populate the server price map, then configure and verify the apparel webhook. Never use client-submitted prices as the charge amount.
4. Email: configure a separately verified sender when transactional mail implementation is ready. No inherited mail credentials or automatic customer messages are enabled in this foundation.
5. Merchant feeds: enroll and connect only after approved product pages and catalog data exist. No feeds or recurring jobs are activated by this branch.

## Credentials

.env.example documents environment variable names with empty secrets. QRG_SUPABASE_ANON_KEY is the browser-facing key and depends on correct row-level security. QRG_SUPABASE_SERVICE_ROLE_KEY and Stripe keys remain server-only. The public-config endpoint must never serialize the environment wholesale.

## Launch gates

- Confirm hosting runtime, domain routing and TLS.
- Test new auth, owner isolation, activation races, payment webhook replay and QR scan rendering.
- Validate storage policies using two independent customer accounts.
- Verify prices from approved Stripe IDs and published catalog records.
- Review actual shipping, return, privacy and subscription terms before publishing them; no legal text or pricing is inferred.
- Restore or explicitly retire optional source features only after their new integrations are tested.
- Configure and verify a runner before describing any monitoring or catalog sync as continuous.

No production service or billing plan is provisioned by these source changes.
