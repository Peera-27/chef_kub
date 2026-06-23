-- รันถ้าสร้างตาราง images ไปแล้วก่อนหน้านี้

alter table images add column if not exists image_hash text unique;
create index if not exists idx_images_hash on images(image_hash);
