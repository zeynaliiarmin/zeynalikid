# Supabase schema guide

## Source of truth

Only `supabase/migrations/` is executable schema. Apply files in timestamp order.
Files under `supabase/legacy/` are historical and must not be run.

## Current tables

- `settings` — complete admin settings JSON; service-role only
- `submissions` — consultation/course records; creation only through `create-submission`, admin management through `admin-api`
- `reviews` — pending public submissions and approved-only public reads
- `user_questions` — pending public submissions, sanitized public answers
- `page_views` — write-only public analytics events
- `error_logs` — service-role only technical errors
- `admin_devices` / `admin_sessions` — service-role only admin security state
- `admin_credentials` — PBKDF2 password hashes
- `admin_audit_logs` — security/admin audit events
- `security_rate_limits` — centralized abuse counters

## Storage

Public read: `images`, `media`.
Private: `files`, `voice-notes`, `tongue-photos`, `receipts`.
All writes use short-lived tokens from the `storage-upload` Edge Function. Direct
anonymous insert/update/delete policies are forbidden.

## Access model

- Browser: anon/publishable key only
- Public writes: narrow RLS policy or validated Edge Function
- Admin reads/writes: validated admin session + Edge Function + service role
- `service_role`: Edge Function environment only

## Deployment order

1. Back up data, policy metadata and Storage objects.
2. Apply the new migration to a staging project first.
3. Deploy affected Edge Functions with `--no-verify-jwt` only when they perform
   their own documented validation.
4. Run anonymous-access, build, unit and browser smoke tests.
5. Apply production migration and verify row/object counts.

Never run a legacy setup script to “repair” production.
