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


## Payment CAPTCHA gate — 2026-08-25

- Bank-card, IBAN, and cryptocurrency destinations are not requested or rendered until Cloudflare Turnstile succeeds.
- The browser token is verified by `checkout-session` against Cloudflare Siteverify; success, `payment_details` action, and the exact request hostname must all match.
- The Turnstile secret is stored only as a Supabase Edge secret. Only the public site key is included in the client bundle.
- CAPTCHA tokens are short-lived and single-use. A successful verification can issue the existing SHA-256-hashed, course-scoped checkout token; `payment-details` still requires that second token.
- Missing, invalid, expired, wrong-action, wrong-hostname, or unavailable CAPTCHA verification fails closed and returns no payment destination.
- Final registration and online gateway actions are also blocked until payment details have been unlocked by server verification.


## Payment-app launcher and consent UX — 2026-08-25

- After CAPTCHA unlock, a `Choose a payment application` action is placed before payment destinations and remains sticky/visible in the payment card.
- The feature is controlled by `PAYMENT_APP_LAUNCHER_ENABLED`; setting it to `false` rolls the experiment back without touching payment data.
- If the visitor has not copied a card, IBAN, or crypto address, only the first/default card of the returned payment scope is copied. For referral checkout this is the consultant's first returned card.
- If the visitor already copied any card, IBAN, or crypto address, the launcher preserves that exact selection and never overwrites the clipboard with the default card.
- Clipboard and Web Share payloads contain only the raw card/IBAN/wallet value; labels remain UI-only.
- The browser Web Share chooser is used when available; installed banking applications are shown only when the operating system/application declares support for shared text.
- CAPTCHA copy changes between bank-only and bank-or-crypto wording according to destination and `cryptoVisibility`.
- Consultation and child-course consent buttons remain visually enabled. An attempted continuation without consent is blocked and highlights the consent container with a red two-pixel border and an inline explanation.
- Consent text uses one inline text flow with normalized line-height to prevent an empty visual line on narrow screens.


## Experimental responsive Home V2 — 2026-08-25

- The redesign is controlled by `EXPERIMENTAL_RESPONSIVE_HOME_V2`; disabling it restores the previous layout while preserving every Home item and admin setting.
- Pre-change mobile and desktop screenshots for both projects are stored outside the repositories under `/home/user/backups/pre-home-v2-20260825`.
- Mobile uses compact section shells, two-column quick access, and keyboard-accessible swipe regions for core areas and parent experiences.
- Tablet expands quick access to three columns. Desktop uses a 1240px twelve-column layout, five-column quick access, balanced product grids, and paired services/core and parent/testimonial sections.
- Themes, referral behavior, visibility/order settings, courses, products, contact content, and all uploaded media remain unchanged.
- Mobile/desktop overflow, bento placement, keyboard focus, critical paths, and WCAG checks are covered by automated tests.
