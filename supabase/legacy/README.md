# Legacy SQL — DO NOT RUN

These files are retained only for historical reference and deliberately use the
`.disabled` suffix. Several contain obsolete public `USING (true)` policies and
must never be executed on staging or production.

The only supported schema source is the ordered SQL in `supabase/migrations/`.
For a new project, apply migrations by timestamp from the baseline onward.
