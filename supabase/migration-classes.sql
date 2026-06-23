-- รันถ้าสร้างตาราง images/annotations ไปแล้วก่อนหน้านี้

create table if not exists classes (
  id serial primary key,
  name_th text not null,
  name_normalized text not null unique,
  source text not null default 'seed' check (source in ('seed', 'user')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_classes_name_th on classes(name_th);
create index if not exists idx_classes_normalized on classes(name_normalized);
