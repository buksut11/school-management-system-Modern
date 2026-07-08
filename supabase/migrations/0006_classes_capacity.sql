alter table public.classes
  add column if not exists capacity int not null default 40;
