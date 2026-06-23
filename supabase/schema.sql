-- รันใน Supabase SQL Editor แล้วสร้าง bucket ชื่อ "training-images" (public: off)

create table if not exists images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  width int not null,
  height int not null,
  session_id text not null,
  image_hash text unique,
  created_at timestamptz not null default now()
);

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references images(id) on delete cascade,
  class_name text not null,
  class_id int,
  x_center float not null,
  y_center float not null,
  width float not null,
  height float not null,
  source text not null check (source in ('yolo', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists idx_images_session on images(session_id);
create index if not exists idx_annotations_image on annotations(image_id);

-- รายการ class กลาง (ใช้ train โมเดลใหม่ + ป้องกันชื่อซ้ำ)
create table if not exists classes (
  id serial primary key,
  name_th text not null,
  name_normalized text not null unique,
  source text not null default 'seed' check (source in ('seed', 'user')),
  created_at timestamptz not null default now()
);

create unique index if not exists idx_classes_name_th on classes(name_th);
create index if not exists idx_classes_normalized on classes(name_normalized);
