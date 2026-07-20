#!/usr/bin/env bash
# Runs the database behavior tests against a throwaway database on
# whatever Postgres psql is pointed at (PGHOST/PGPORT/PGUSER envs).
set -euo pipefail
cd "$(dirname "$0")/../.."

DB="${LMS_TEST_DB:-lms_behavior_test}"

dropdb --if-exists "$DB"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT

psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/00*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" > /dev/null
done
psql -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/behavior_test.sql
