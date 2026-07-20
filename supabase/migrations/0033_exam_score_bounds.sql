-- Bounds for per-subject exam scores (audit finding 1.3).
--
-- 0016 capped attendance_pct and test_score at 100, but the individual
-- values inside exams.subject_scores were unconstrained — a crafted
-- request could store a subject score of a billion and the row would
-- save. Each value must now be a number in 0..100, and total_score
-- can't exceed what the stored subjects could possibly add up to
-- (100 per subject + the 100-point test).
--
-- NOT VALID, per the 0016 pattern: new and updated rows are checked
-- immediately; validate once existing data is confirmed clean with
--   alter table public.exams validate constraint exams_subject_scores_range;
--   alter table public.exams validate constraint exams_total_score_max;
--
-- (total_score and grade are still computed by the app rather than the
-- database — recomputing them in a trigger is queued behind the larger
-- "gradebook joined to the subjects table" refactor.)

create or replace function public.subject_scores_valid(p jsonb)
returns boolean
language sql
immutable
as $$
  select p is not null
     and jsonb_typeof(p) = 'object'
     and not exists (
       select 1 from jsonb_each(p) kv
       where jsonb_typeof(kv.value) <> 'number'
          or (kv.value)::text::numeric < 0
          or (kv.value)::text::numeric > 100
     );
$$;

create or replace function public.subject_scores_max_total(p jsonb)
returns numeric
language sql
immutable
as $$
  select 100 + 100 * (select count(*) from jsonb_object_keys(coalesce(p, '{}'::jsonb)));
$$;

alter table public.exams drop constraint if exists exams_subject_scores_range;
alter table public.exams add constraint exams_subject_scores_range
  check (public.subject_scores_valid(subject_scores)) not valid;

alter table public.exams drop constraint if exists exams_total_score_max;
alter table public.exams add constraint exams_total_score_max
  check (total_score <= public.subject_scores_max_total(subject_scores)) not valid;
