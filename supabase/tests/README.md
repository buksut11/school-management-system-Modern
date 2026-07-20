# Database behavior tests

Verifies the schema's security and integrity guarantees against a real
Postgres — RLS tenant isolation, the activity-log actor stamp, single-use
invites, cross-tenant foreign keys, overpayment guards, and the atomic
backup restore. No Docker or hosted Supabase project needed: the stub
provides just enough of the Supabase environment (auth/storage schemas,
`auth.uid()`, roles) for the migrations to run on a plain cluster.

## Run

```bash
./supabase/tests/run.sh            # uses psql defaults (PGHOST etc.)
```

or manually against any empty database:

```bash
createdb lms_test
psql -v ON_ERROR_STOP=1 -d lms_test -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/00*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d lms_test -f "$f"
done
psql -v ON_ERROR_STOP=1 -d lms_test -f supabase/tests/behavior_test.sql
```

The suite prints one `PASS:` line per assertion and ends with
`ALL TESTS PASSED`; any failure aborts with a `TEST FAIL` exception.
Tests impersonate users exactly the way PostgREST does — `SET ROLE
authenticated` plus the `request.jwt.claims` GUC — so what passes here is
what the real API enforces.
