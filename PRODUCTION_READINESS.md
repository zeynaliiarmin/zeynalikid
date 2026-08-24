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
