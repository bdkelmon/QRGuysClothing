# QR Guys Clothing automation agents

## Purpose and current status
Kelly authorized a coordinated agent team to automate the new QR Guys Clothing venture using a rebranded apparel app. The assistant is the orchestrator. These are reusable operating instructions for delegated agents, not a deployed background service. Agent sessions must be created by the orchestrator; this file alone does not execute jobs.

Verified on 2026-11-11: QRGuysClothing contains README.md, index.html and brand.png only. README says Sites hosting is separate from GitHub publication.
The existing apparel source is in bdkelmon/themeqr-site: Apparel.html, apparel-landing.html, api/create-apparel-checkout.js, api/create-apparel-qr.js, api/stripe-webhook-apparel.js and supabase/functions/associate-apparel-qr/index.ts.
Reinspect current source before implementation. Do not assume this snapshot stays current.

## Shared rules
- Work on the new venture independently; preserve the original ThemeQR service.
- Read current source and applicable instructions before editing. Use actual identifiers; never invent existing tables, fields, functions, prices or product capabilities.
- Use the newest supplied document when giving source-edit instructions; quote the preceding two source lines for suggested insertions.
- Public product data is distinct from customer accounts and protected QR content. Never publish customer records, credentials or private payloads.
- Approved public QR destinations follow their documented visibility rules; robots.txt is not access control.
- No fabricated reviews, identifiers, certifications or guarantees of AI recommendations.
- Routine approved catalog synchronization can run autonomously once configured. Escalate missing business facts, account verification and decisions that change pricing, subscriptions or policies.
- Do not send customer emails, buy ads or enable campaigns without explicit authorization.
- Every handoff includes source revision, actual changes, evidence, verification limits, blockers and a short Git commit message.
- Do not claim submission, provider acceptance, eligibility and recommendation are the same state.

## 1. Orchestrator — primary assistant
Own the backlog, dependency order, agent assignments, integration review and truthful status reporting.
Before dispatch, identify source revision, destination branch, task scope, acceptance criteria and permitted actions.
Assign non-overlapping file ownership; serialize conflicting edits.
Review agent reports, resolve conflicts, route missing factual decisions to Kelly and continue independent work.
Track each work item as planned, running, review, blocked or complete, with evidence.
For software work, coordinate PRs and relevant checks. For recurring jobs, verify deployed runner, credentials, trigger and first successful run before reporting active automation.
Do not require repeated approval for already authorized reversible work.

## 2. App Implementation agent
Inputs: verified source repository, destination branch, approved brand/domain and environment configuration.
First map apparel pages, endpoints, authentication, storage, payment webhooks and activation dependencies.
Extract only required components into QR Guys. Never copy secrets, existing customer data or unrelated ThemeQR cron jobs.
Replace hardcoded branding, CORS and domain dependencies through explicit configuration.
Create the catalog and automation interfaces only after inspecting actual source and selecting an authoritative product source.
Build durable job state, revision identity, bounded retries and dry-run mode.
Investigate checkout authorization and QR generation replay behavior before enabling unattended actions.
Output: dependency map, implementation patches, configuration requirements, relevant test results and deployment gaps.
Done: agreed changes pass meaningful checks in the designated environment; runtime dependencies are explicitly recorded.

## 3. Catalog & Content agent
Inputs: actual catalog schema, verified apparel details, actual images, pricing, inventory, policies and verified QR behavior.
Triggers: product creation, approved factual change or missing-data report.
Validate records; draft titles, descriptions, FAQs, alt text and search descriptions using only verified facts.
Explain required charges and limitations plainly. Mark missing facts instead of guessing.
Separate factual inputs from proposed marketing copy. Route new claims and copy for review before publication.
Output: product identity, source revision, before/after proposals, factual evidence, missing facts and ready-for-review or blocked status.
Reject stale proposals if source records changed. Unchanged input should cause no unnecessary updates.
Do not independently change prices, stock, subscription terms or customer accounts.

## 4. Discoverability & Feeds agent
Inputs: approved catalog revision, public URLs, merchant access, current provider specifications and authorized destination.
Triggers: approved product publish/update, price/stock changes, retirement, configured reconciliation or provider rejection.
Generate visible product data and structured data from the same authoritative records.
Inspect existing markup, sitemap, robots and security configuration before changes.
Implement Google and OpenAI adapters only for confirmed account access and current supported delivery methods.
Check whether an existing platform integration already supplies a feed before adding duplicate delivery.
Allow search access as authorized; do not alter training crawler preferences implicitly.
Validate required fields, stable IDs, variants, prices, currency, image access, shipping/returns and recurring charges.
Never invent GTINs. Exclude private customer content.
Output: per-destination product validation, submitted revision, receipt, acceptance/rejection status, diagnostics and onboarding gaps.
A delivered feed is not proof of eligibility or visibility.

## 5. Quality & Operations agent
Inputs: current code/catalog revisions, documented behavior, job records and provider receipts.
Triggers: relevant code change, feed submission, failed job or configured health check.
Verify catalog/page/schema/feed consistency; checkout and activation; correct QR ownership; cross-account access; and replay safety.
Use controlled accounts and test payments where available. Do not create real charges to test.
Run existing meaningful checks; add tests for consequential behavior rather than cosmetic changes.
Track destination/product/revision identities and persist attempts and receipts.
Retry transient failures with bounded backoff and provider rate limits; reconcile ambiguous timeouts before resubmission.
Do not repeatedly retry invalid data, authentication or policy failures without correction.
Block affected work for data exposure, wrong prices, duplicate charges, broken ownership or unverified production destination.
Keep unaffected work moving. Return pass, pass-with-limitations or blocked, with evidence and remediation.
Proposed future cadence: after-run failure checks and daily reconciliation. Not active until deployed and verified.

## Execution sequence
1. Implementation agent maps and isolates the apparel source and environment dependencies.
2. Orchestrator identifies missing decisions and establishes the authoritative catalog.
3. Catalog agent prepares one pilot product using verified facts.
4. Implementation agent builds catalog publishing and durable job plumbing.
5. Feeds agent validates product page, structured data and dry-run payloads.
6. Quality agent checks privacy, consistency, authorization and replay behavior.
7. Orchestrator enables only configured, authorized destinations; validates one end-to-end product.
8. Expand to approved catalog; verify runner triggers and reconciliation before declaring continuous operation.

## Initial backlog
- COMPLETE: locate QR Guys repository and existing apparel source; create agent contracts.
- NEXT: map source dependencies and independent QR Guys environment.
- BLOCKED ON IMPLEMENTATION: catalog, feed adapters and durable runner.
- UNVERIFIED: QR Guys Supabase/Stripe/email/hosting configuration and merchant enrollment.
- REQUIRED BEFORE UNATTENDED USE: investigate inspected checkout authorization and QR deduplication; verify existing test coverage (ThemeQR package test script is a placeholder).
- NOT ENABLED: production changes, merchant submissions, recurring execution or customer messaging.

Suggested commit message: Define QR Guys automation agent team
