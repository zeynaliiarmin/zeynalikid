# Production readiness

## Completed without owner input
- strict RLS/Storage, signed uploads and server-side submission creation
- PBKDF2 admin credentials, centralized rate limits and audit logs
- security headers, route-aware SEO, server 404 and accessibility tests
- CI, migrations, database-side analytics and daily operational maintenance
- runtime-configurable CORS via `ALLOWED_ORIGINS`

## Owner-supplied items still required
1. Custom domain(s): then set `ALLOWED_ORIGINS` and provider callback allowlists.
2. Official payment provider account/credentials: placeholder gateways remain disabled.
3. External backup destination and retention contract.
4. `ERROR_ALERT_WEBHOOK_URL` if external incident alerts are wanted.
5. Legal review of privacy wording and professional review of health content.

No item above should be guessed or activated with placeholder values.


## Technical completion update — 2026-08-24

- `App.tsx` is now a small orchestration shell; shared runtime support and route loading live under `src/app/`.
- Route pages consume a typed application Context instead of receiving the full runtime object as a prop.
- `App.tsx` contains no explicit `any`; the still-flexible legacy settings boundary is isolated in `AppContext.DynamicRecord` and can be narrowed domain by domain.
- Ten public/indexable routes are generated as complete static HTML during every production build. Stateful form/admin/payment routes use a separate empty SPA shell to prevent stale personal state in HTML.
- A server-side Vercel referral validator returns 307 only for a current consultant code and a true HTTP 404 for unknown single-segment paths.
- Submission JSONB remains backward compatible. Reporting fields are also synchronized into `submission_contacts`, `submission_orders`, and `submission_consultations`; RLS is enabled and browser roles have no access.
- Payment destinations require a random, short-lived checkout token tied to an active course and optional consultant. Tokens are stored only as SHA-256 hashes and expire after 15 minutes.
- Article author, English author, scientific source, review date, and highlighted quotation are editable in the Content panel and safely delivered by `public-settings`.
- CI uses Node 22.12 and now runs read-only E2E plus WCAG checks with stable Chrome after the normal lint/type/unit/build gates.
- Puppeteer was upgraded to the maintained release line; full `npm audit` is zero, including development dependencies.
- Before the additive database migration, a restricted backup with data, schema metadata, all Farzandman Storage objects, and SHA-256 checksums was created outside both repositories.

### Compatibility guarantees

- Existing `submissions.payload` values are not rewritten or removed.
- Existing public content and uploaded Storage objects are not migrated, renamed, or deleted.
- Normalized tables are projections; JSONB remains the compatibility source until all admin/reporting consumers explicitly move.
- Checkout sessions contain no phone, receipt, card number, bank account, or user profile data.
