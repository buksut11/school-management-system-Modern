-- ============================================================================
-- Demo data for Sh.Asharow LMS — populates every table with realistic records.
--
-- HOW TO RUN
--   • Supabase dashboard → SQL Editor → paste this whole file → Run, OR
--   • psql "$DATABASE_URL" -f supabase/seed.sql, OR
--   • it runs automatically on `supabase db reset`.
--
-- Safe to run more than once: it skips everything if students already exist,
-- so it never duplicates data or clobbers real records. The SQL editor runs
-- with the service role, so it bypasses the admin-only RLS on fees/expenses.
-- ============================================================================

do $$
declare
  gradebook text[] := array['Somali', 'English', 'Chemistry', 'Physics', 'Maths', 'Arabic', 'Geography'];
  teachers  uuid[];
  t_by_subject jsonb := '{}'::jsonb;
  cls        record;
  subj       record;
  dept       record;
  stu        record;
  cnt        int := 0;
  day        int;
  status_cycle text[] := array['present','present','present','late','present','present','absent','present','present','late'];
  method_cycle text[] := array['cash','mobile_money','bank_transfer'];
  scores     jsonb;
  subj_total numeric;
  test_score numeric;
  total      numeric;
  grade_txt  text;
  fee_amount numeric;
  j          int;
begin
  if exists (select 1 from public.students) then
    raise notice 'Students already exist — demo seed skipped.';
    return;
  end if;

  -- Multi-tenant (0019): the seed runs with the service role (no signed-in
  -- user), so tell current_school_id() which school these rows belong to.
  perform set_config('app.school_id', (select id::text from public.schools limit 1), true);

  -- ---- teachers ---------------------------------------------------------
  insert into public.teachers (full_name, gender, dob, mobile, address, subjects) values
    ('Axmed Cali Xasan',        'male',   '1985-03-12', '0615551201', 'Wadajir, Mogadishu',     array['Maths','Physics']),
    ('Faadumo Maxamed Nuur',    'female', '1990-07-24', '0615551202', 'Hodan, Mogadishu',       array['English','Somali']),
    ('Cabdullahi Yusuf Warsame','male',   '1982-11-05', '0615551203', 'Hamar Weyne, Mogadishu', array['Chemistry']),
    ('Khadiija Ibraahim Cumar', 'female', '1988-01-30', '0615551204', 'Waberi, Mogadishu',      array['Arabic']),
    ('Maxamuud Siciid Jaamac',  'male',   '1979-09-17', '0615551205', 'Karan, Mogadishu',       array['Geography']),
    ('Hodan Cabdi Faarax',      'female', '1992-05-02', '0615551206', 'Shibis, Mogadishu',      array['Somali','Arabic']);

  select array_agg(id order by seq) into teachers from public.teachers;

  -- map each gradebook subject to a teacher that teaches it (for subject FK)
  select jsonb_object_agg(s, tid) into t_by_subject
  from (
    select gs.s, (select t.id from public.teachers t where gs.s = any(t.subjects) order by t.seq limit 1) as tid
    from unnest(gradebook) as gs(s)
  ) m
  where tid is not null;

  -- ---- class teachers (round-robin over the seeded classes) -------------
  cnt := 0;
  for cls in select id from public.classes order by name loop
    update public.classes set teacher_id = teachers[1 + (cnt % array_length(teachers, 1))] where id = cls.id;
    cnt := cnt + 1;
  end loop;

  -- ---- subject teachers -------------------------------------------------
  for subj in select id, name from public.subjects where teacher_id is null loop
    if t_by_subject ? subj.name then
      update public.subjects set teacher_id = (t_by_subject ->> subj.name)::uuid where id = subj.id;
    end if;
  end loop;

  -- ---- department heads (round-robin) -----------------------------------
  cnt := 0;
  for dept in select id from public.departments where head_teacher_id is null order by seq loop
    update public.departments set head_teacher_id = teachers[1 + (cnt % array_length(teachers, 1))] where id = dept.id;
    cnt := cnt + 1;
  end loop;

  -- ---- students (4 per class) -------------------------------------------
  insert into public.students (full_name, gender, dob, address, mobile, parent_mobile, class_id, base_fees)
  select v.full_name, v.gender, v.dob::date, 'Mogadishu', v.mobile, v.parent, c.id, c.base_fees
  from (values
    ('Liibaan Axmed Maxamed',   'male',   '2012-04-15', '0616661300', '0617771300', 'Form 1C'),
    ('Nasteexo Cali Yusuf',     'female', '2012-08-03', '0616661301', '0617771301', 'Form 1C'),
    ('Yaxye Cabdiraxmaan Nuur', 'male',   '2011-12-21', '0616661302', '0617771302', 'Form 1C'),
    ('Sagal Maxamuud Cismaan',  'female', '2012-02-09', '0616661303', '0617771303', 'Form 1C'),
    ('Mustafe Xuseen Cabdi',    'male',   '2011-06-27', '0616661304', '0617771304', 'Form 2A'),
    ('Hamdi Ibraahim Siciid',   'female', '2011-10-14', '0616661305', '0617771305', 'Form 2A'),
    ('Cumar Faarax Jaamac',     'male',   '2010-03-08', '0616661306', '0617771306', 'Form 2A'),
    ('Ruun Cabdullahi Xasan',   'female', '2011-01-19', '0616661307', '0617771307', 'Form 2A'),
    ('Zakariye Maxamed Warsame','male',   '2010-07-30', '0616661308', '0617771308', 'Form 3B'),
    ('Ilhaan Yusuf Cali',       'female', '2009-11-11', '0616661309', '0617771309', 'Form 3B'),
    ('Bashiir Siciid Cumar',    'male',   '2010-05-25', '0616661310', '0617771310', 'Form 3B'),
    ('Nimco Axmed Faarax',      'female', '2009-09-06', '0616661311', '0617771311', 'Form 3B'),
    ('Xamse Cabdi Maxamuud',    'male',   '2009-02-17', '0616661312', '0617771312', 'Form 4A'),
    ('Deeqa Nuur Ibraahim',     'female', '2008-12-01', '0616661313', '0617771313', 'Form 4A'),
    ('Saleebaan Cali Xuseen',   'male',   '2008-06-13', '0616661314', '0617771314', 'Form 4A'),
    ('Ubax Warsame Yusuf',      'female', '2009-04-22', '0616661315', '0617771315', 'Form 4A')
  ) as v(full_name, gender, dob, mobile, parent, class_name)
  join public.classes c on c.name = v.class_name;

  -- ---- attendance / exams / fees (per student) --------------------------
  cnt := 0;
  for stu in select id, class_id, base_fees from public.students order by seq loop
    -- attendance: today + previous 4 days
    for day in 0..4 loop
      insert into public.attendance (student_id, class_id, date, status)
      values (
        stu.id, stu.class_id, current_date - day,
        status_cycle[1 + ((cnt + day * 3) % 10)]
      )
      on conflict (student_id, date) do nothing;
    end loop;

    -- exam: Term 1 across every gradebook subject
    scores := '{}'::jsonb;
    subj_total := 0;
    for j in 1 .. array_length(gradebook, 1) loop
      declare sc numeric := 55 + ((cnt * 7 + (j - 1) * 11) % 43);
      begin
        scores := scores || jsonb_build_object(gradebook[j], sc);
        subj_total := subj_total + sc;
      end;
    end loop;
    test_score := 60 + ((cnt * 13) % 38);
    total := subj_total + test_score;
    grade_txt := case
      when total >= 640 then 'A'
      when total >= 560 then 'B'
      when total >= 480 then 'C'
      when total >= 400 then 'D'
      else 'F'
    end;
    insert into public.exams (student_id, class_id, term, exam_date, attendance_pct, test_score, subject_scores, total_score, grade)
    values (stu.id, stu.class_id, 'Term 1', current_date - 10, 85 + (cnt % 15), test_score, scores, total, grade_txt)
    on conflict (student_id, term, year_id) do nothing;

    -- fees: mix of full, half, and unpaid (every 4th student)
    if (cnt % 4) <> 3 then
      if (cnt % 4) = 0 then
        fee_amount := stu.base_fees;
      else
        fee_amount := round(stu.base_fees / 2);
      end if;
      insert into public.fee_payments (student_id, amount, method, note, paid_at)
      values (
        stu.id, fee_amount, method_cycle[1 + (cnt % 3)],
        case when fee_amount >= stu.base_fees then 'Term fees paid in full' else 'First installment' end,
        now() - ((cnt % 7) || ' days')::interval
      );
    end if;

    cnt := cnt + 1;
  end loop;

  -- ---- expenses ---------------------------------------------------------
  insert into public.expenses (payee, category, description, amount, paid, date, method) values
    ('Teaching staff payroll', 'salaries',    'Monthly teacher salaries',        2400, 2400, current_date - 6,  'bank_transfer'),
    ('Xasan Properties',       'rent',        'School building rent',             800,  800, current_date - 12, 'bank_transfer'),
    ('Mogadishu Power Co.',    'utilities',   'Electricity bill',                 150,  100, current_date - 4,  'mobile_money'),
    ('Saafi Water Services',   'utilities',   'Water delivery',                    60,   60, current_date - 9,  'cash'),
    ('Daryeel Stationery',     'supplies',    'Chalk, exercise books and markers',220,  120, current_date - 3,  'cash'),
    ('Nujuum Furniture',       'maintenance', 'Desk and chair repairs',           180,    0, current_date - 2,  'other'),
    ('Geeddi Bus Service',     'transport',   'Student transport contract',       350,  350, current_date - 15, 'mobile_money'),
    ('Caafi Cleaning',         'maintenance', 'Compound cleaning service',         90,   45, current_date - 1,  'cash');

  -- ---- activity feed ----------------------------------------------------
  insert into public.activity_log (kind, message) values
    ('import', 'Loaded demo data across all modules'),
    ('student', 'Enrolled 16 students into Forms 1C–4A'),
    ('fee', 'Recorded term fee payments'),
    ('expense', 'Logged 8 school expenses');

  raise notice 'Demo data seeded: 6 teachers, 16 students, attendance, exams, fees and expenses.';
end $$;
