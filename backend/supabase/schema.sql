-- =====================================================================
-- SkinWise veritabani semasi (Jira DP-14)
-- Tum tablolar bu TEK dosyadan olusturulur.
-- Calistirma: Supabase Dashboard > SQL Editor > dosyanin tamamini yapistir > Run
--
-- DIKKAT: Script bastan kurar. En bastaki DROP komutlari mevcut tablolari
-- ve icindeki verileri siler. Gelistirme asamasinda bilerek boyle;
-- canliya ciktiktan sonra degisiklikler ayri "migration" dosyalariyla yapilmali.
--
-- Diyagram: docs/er-diagram.md
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0) Temizlik: once view'lar, sonra bagimli tablolar
-- ---------------------------------------------------------------------
drop view  if exists public.product_catalog;
drop view  if exists public.delivery_list;
drop table if exists public.chat_messages      cascade;
drop table if exists public.chat_conversations cascade;
drop table if exists public.refund_requests    cascade;
drop table if exists public.wishlist_items     cascade;
drop table if exists public.reviews            cascade;
drop table if exists public.invoices           cascade;
drop table if exists public.payments           cascade;
drop table if exists public.order_items        cascade;
drop table if exists public.orders             cascade;
drop table if exists public.cart_items         cascade;
drop table if exists public.products           cascade;
drop table if exists public.categories         cascade;
drop table if exists public.users              cascade;


-- ---------------------------------------------------------------------
-- 1) USERS - musteriler ve yoneticiler tek tabloda, "role" ile ayrilir
--    (Madde 10: 4 rol, Madde 14: musteri alanlari, Madde 17: hash)
-- ---------------------------------------------------------------------
create table public.users (
  id            bigint generated always as identity primary key,
  name          text not null,
  tax_id        text,                       -- yoneticilerde bos olabilir
  email         text not null,
  home_address  text,
  password_hash text not null,              -- bcrypt hash; duz sifre ASLA saklanmaz
  role          text not null default 'customer'
                check (role in ('customer', 'sales_manager', 'product_manager', 'support_agent')),
  created_at    timestamptz not null default now()
);
-- "Ali@x.com" ile "ali@x.com" ayni hesap sayilsin diye kucuk harfle tekil
create unique index users_email_unique on public.users (lower(email));


-- ---------------------------------------------------------------------
-- 2) CATEGORIES - product manager ekler/siler (Madde 12)
-- ---------------------------------------------------------------------
create table public.categories (
  id         bigint generated always as identity primary key,
  name       text not null unique,          -- ekranda gorunen ad: "Serums"
  slug       text not null unique           -- URL'de kullanilan ad: "serum"
             check (slug ~ '^[a-z0-9-]+$'),
  icon       text not null default '🧴',
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 3) PRODUCTS - Madde 9'daki zorunlu alanlar + SkinWise'a ozel alanlar
-- ---------------------------------------------------------------------
create table public.products (
  id              bigint generated always as identity primary key,
  category_id     bigint not null references public.categories (id) on delete restrict,
  name            text not null,
  brand           text not null,
  model           text not null,
  serial_number   text not null unique,
  description     text not null,
  price           numeric(10, 2) not null check (price >= 0),
  cost            numeric(10, 2) check (cost >= 0),   -- bos ise kar/zarar hesabinda fiyatin %50'si kullanilir (Madde 11)
  discount_rate   numeric(5, 2) not null default 0 check (discount_rate between 0 and 100),
  stock           integer not null default 0 check (stock >= 0),   -- eksiye dusemez (Madde 18)
  warranty_status text not null,
  distributor     text not null,
  skin_type       text,                     -- Dry, Oily, Sensitive ...
  badges          text[] not null default '{}',
  emoji           text not null default '🧴',
  image_url       text,
  is_active       boolean not null default true,      -- urun silinmez, pasif yapilir
  created_at      timestamptz not null default now()
);
create index products_category_id_idx on public.products (category_id);


-- ---------------------------------------------------------------------
-- 4) CART_ITEMS - GIRIS YAPMIS kullanicinin sepeti.
--    Misafir sepeti tarayicida (localStorage) durur; giriste buraya tasinir.
-- ---------------------------------------------------------------------
create table public.cart_items (
  user_id    bigint not null references public.users (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)         -- ayni urun iki satir olamaz, adet artar
);


-- ---------------------------------------------------------------------
-- 5) ORDERS + ORDER_ITEMS (Madde 3, 14)
-- ---------------------------------------------------------------------
create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          bigint not null references public.users (id) on delete restrict,
  status           text not null default 'processing'
                   check (status in ('processing', 'in_transit', 'delivered', 'cancelled')),
  total_amount     numeric(10, 2) not null check (total_amount >= 0),
  delivery_address text not null,           -- siparis anindaki adresin kopyasi
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_user_id_idx    on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at);

create table public.order_items (
  id         bigint generated always as identity primary key,
  order_id   bigint not null references public.orders (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete restrict,
  quantity   integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0)  -- SATIN ALMA ANINDAKI (indirimli) fiyat
);
create index order_items_order_id_idx   on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);


-- ---------------------------------------------------------------------
-- 6) PAYMENTS - mock banka sonucu. Kart numarasi SAKLANMAZ (Madde 15, 17)
-- ---------------------------------------------------------------------
create table public.payments (
  id         bigint generated always as identity primary key,
  order_id   bigint not null unique references public.orders (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount >= 0),
  card_last4 text not null check (card_last4 ~ '^[0-9]{4}$'),
  card_hash  text not null,                 -- kart bilgisinin hash'i
  status     text not null check (status in ('approved', 'declined')),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 7) INVOICES - bir siparisin tek faturasi olur (Madde 4, 11)
-- ---------------------------------------------------------------------
create table public.invoices (
  id             bigint generated always as identity primary key,
  order_id       bigint not null unique references public.orders (id) on delete restrict,
  invoice_number text not null unique,
  total          numeric(10, 2) not null check (total >= 0),
  pdf_url        text,
  emailed_at     timestamptz,
  created_at     timestamptz not null default now()
);
create index invoices_created_at_idx on public.invoices (created_at);  -- tarih araligi sorgulari icin


-- ---------------------------------------------------------------------
-- 8) REVIEWS - puan hemen gorunur, yorum onay bekler (Madde 5)
-- ---------------------------------------------------------------------
create table public.reviews (
  id             bigint generated always as identity primary key,
  user_id        bigint not null references public.users (id) on delete cascade,
  product_id     bigint not null references public.products (id) on delete cascade,
  rating         integer not null check (rating between 1 and 5),
  comment        text,
  comment_status text not null default 'pending'
                 check (comment_status in ('pending', 'approved', 'rejected')),
  created_at     timestamptz not null default now(),
  unique (user_id, product_id)              -- bir kisi bir urune bir kez
);
create index reviews_product_id_idx on public.reviews (product_id);


-- ---------------------------------------------------------------------
-- 9) WISHLIST_ITEMS - indirim bildirimleri buradan bulunur (Madde 11)
-- ---------------------------------------------------------------------
create table public.wishlist_items (
  user_id    bigint not null references public.users (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index wishlist_items_product_id_idx on public.wishlist_items (product_id);


-- ---------------------------------------------------------------------
-- 10) REFUND_REQUESTS - siparisin tek bir satiri iade edilir (Madde 16)
-- ---------------------------------------------------------------------
create table public.refund_requests (
  id            bigint generated always as identity primary key,
  order_item_id bigint not null references public.order_items (id) on delete restrict,
  user_id       bigint not null references public.users (id) on delete restrict,
  quantity      integer not null check (quantity > 0),
  refund_amount numeric(10, 2) not null check (refund_amount >= 0),  -- unit_price x quantity
  reason        text,
  status        text not null default 'requested'
                check (status in ('requested', 'approved', 'rejected')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz
);
create index refund_requests_order_item_id_idx on public.refund_requests (order_item_id);


-- ---------------------------------------------------------------------
-- 11) CHAT - canli destek (Madde 13). Misafir de sohbet acabilir.
-- ---------------------------------------------------------------------
create table public.chat_conversations (
  id          bigint generated always as identity primary key,
  customer_id bigint references public.users (id) on delete set null,  -- bos = misafir
  agent_id    bigint references public.users (id) on delete set null,  -- bos = kuyrukta bekliyor
  guest_token text,                                                     -- misafiri tanimak icin
  status      text not null default 'waiting'
              check (status in ('waiting', 'active', 'closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  check (customer_id is not null or guest_token is not null)
);
create index chat_conversations_status_idx on public.chat_conversations (status);

create table public.chat_messages (
  id              bigint generated always as identity primary key,
  conversation_id bigint not null references public.chat_conversations (id) on delete cascade,
  sender_id       bigint references public.users (id) on delete set null,  -- bos = misafir
  sender_role     text not null check (sender_role in ('customer', 'agent')),
  body            text,
  attachment_url  text,
  created_at      timestamptz not null default now(),
  check (body is not null or attachment_url is not null)  -- bos mesaj olmaz
);
create index chat_messages_conversation_id_idx on public.chat_messages (conversation_id);


-- ---------------------------------------------------------------------
-- 12) VIEW'LAR - veri kopyalanmaz, her seferinde tablolardan hesaplanir
-- ---------------------------------------------------------------------

-- Magazada gorunen urun listesi. Frontend'in bekledigi alan adlarini verir:
-- category = kategori slug'i, skin = cilt tipi, rating = yorumlardan ortalama,
-- sold_count = populerlik icin satilan adet.
create view public.product_catalog
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.brand,
  c.slug                                         as category,
  c.name                                         as category_name,
  p.model,
  p.serial_number,
  p.description,
  p.price,
  p.discount_rate,
  round(p.price * (1 - p.discount_rate / 100), 2) as final_price,
  p.stock,
  p.warranty_status,
  p.distributor,
  p.skin_type                                    as skin,
  p.badges,
  p.emoji,
  p.image_url,
  coalesce(r.avg_rating, 0)                      as rating,
  coalesce(r.review_count, 0)                    as review_count,
  coalesce(s.sold_count, 0)                      as sold_count
from public.products p
join public.categories c on c.id = p.category_id
left join (
  select product_id, round(avg(rating), 1) as avg_rating, count(*) as review_count
  from public.reviews group by product_id
) r on r.product_id = p.id
left join (
  select product_id, sum(quantity) as sold_count
  from public.order_items group by product_id
) s on s.product_id = p.id
where p.is_active;

-- Product manager'in teslimat listesi (Madde 12): her siparis satiri bir teslimat
create view public.delivery_list
with (security_invoker = true) as
select
  oi.id                         as delivery_id,
  o.id                          as order_id,
  o.user_id                     as customer_id,
  oi.product_id,
  oi.quantity,
  oi.quantity * oi.unit_price   as total_price,
  o.delivery_address,
  o.status,
  (o.status = 'delivered')      as is_completed,
  o.created_at
from public.order_items oi
join public.orders o on o.id = oi.order_id;


-- ---------------------------------------------------------------------
-- 13) GUVENLIK (RLS) - tum tablolarda acik.
--     Herkese acik olan tek sey katalog: kategoriler ve aktif urunler.
--     Geri kalan her sey sadece backend (secret key) uzerinden erisilir.
-- ---------------------------------------------------------------------
alter table public.users              enable row level security;
alter table public.categories         enable row level security;
alter table public.products           enable row level security;
alter table public.cart_items         enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.payments           enable row level security;
alter table public.invoices           enable row level security;
alter table public.reviews            enable row level security;
alter table public.wishlist_items     enable row level security;
alter table public.refund_requests    enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages      enable row level security;

create policy "Categories are readable by everyone"
  on public.categories for select to anon, authenticated using (true);

create policy "Active products are readable by everyone"
  on public.products for select to anon, authenticated using (is_active);


-- ---------------------------------------------------------------------
-- 14) BASLANGIC VERISI
-- ---------------------------------------------------------------------
insert into public.categories (name, slug, icon) values
  ('Cleansers',    'cleanser',    '🫧'),
  ('Moisturizers', 'moisturizer', '💧'),
  ('Serums',       'serum',       '✨'),
  ('Sunscreens',   'sunscreen',   '☀️'),
  ('Masks',        'mask',        '🌿'),
  ('Toners',       'toner',       '🌸');

-- Kategori id'si slug'dan bulunur; boylece id numaralarina bagimli olmayiz
insert into public.products
  (category_id, name, brand, model, serial_number, description, price, stock,
   warranty_status, distributor, skin_type, badges, emoji)
select c.id, v.name, v.brand, v.model, v.serial_number, v.description, v.price, v.stock,
       v.warranty_status, v.distributor, v.skin_type, v.badges, v.emoji
from (values
  (1, 'cleanser',    'Gentle Foam Cleanser',        'SkinWise Lab', 'GFC-150',  'SW-CL-0001',
   'A soft foaming cleanser that removes make-up and dirt without drying the skin.',
   12.99, 24, 'No warranty, 30-day satisfaction guarantee', 'SkinWise Distribution Ltd.', 'Sensitive', array['Vegan', 'Fragrance-free'], '🫧'),
  (2, 'moisturizer', 'Hyaluron Barrier Cream',      'Dermia',       'HBC-50',   'SW-MO-0001',
   'A rich cream with hyaluronic acid and ceramides that keeps dry skin hydrated all day.',
   19.99, 12, 'No warranty, 30-day satisfaction guarantee', 'Dermia Cosmetics Inc.', 'Dry', array['Fragrance-free'], '💧'),
  (3, 'serum',       'Niacinamide 10% Serum',       'PureLab',      'NS10-30',  'SW-SE-0001',
   'A lightweight serum with 10% niacinamide that helps reduce oil and visible pores.',
   17.99, 5, 'No warranty, 30-day satisfaction guarantee', 'PureLab Europe GmbH', 'Combination', array['Vegan'], '✨'),
  (4, 'sunscreen',   'Daily SPF 50 Fluid',          'Sunly',        'SPF50-F',  'SW-SU-0001',
   'A non-greasy SPF 50 fluid for daily use that leaves no white cast.',
   15.99, 40, 'No warranty, 30-day satisfaction guarantee', 'Sunly Skincare Co.', 'Oily', array['Lightweight'], '☀️'),
  (5, 'mask',        'Clay Detox Mask',             'Verde',        'CDM-100',  'SW-MA-0001',
   'A kaolin clay mask that cleans pores and absorbs extra oil in 10 minutes.',
   9.99, 0, 'No warranty, 30-day satisfaction guarantee', 'Verde Naturals Ltd.', 'Oily', array['Vegan'], '🌿'),
  (6, 'toner',       'Rose Calming Toner',          'Petal',        'RCT-200',  'SW-TO-0001',
   'An alcohol-free rose water toner that calms redness and prepares the skin for serum.',
   11.49, 18, 'No warranty, 30-day satisfaction guarantee', 'Petal Beauty Inc.', 'Sensitive', array['Alcohol-free'], '🌸'),
  (7, 'serum',       'Vitamin C Brightening Serum', 'PureLab',      'VCS-30',   'SW-SE-0002',
   'A vitamin C serum that brightens dull skin and helps fade dark spots.',
   21.99, 9, 'No warranty, 30-day satisfaction guarantee', 'PureLab Europe GmbH', 'Normal', array['Dark-spot care'], '🍊'),
  (8, 'moisturizer', 'Ceramide Night Cream',        'Dermia',       'CNC-50',   'SW-MO-0002',
   'A nourishing night cream with ceramides that repairs the skin barrier while you sleep.',
   23.99, 7, 'No warranty, 30-day satisfaction guarantee', 'Dermia Cosmetics Inc.', 'Dry', array['Fragrance-free', 'Vegan'], '🌙')
) as v (sort_order, category_slug, name, brand, model, serial_number, description, price, stock,
        warranty_status, distributor, skin_type, badges, emoji)
join public.categories c on c.slug = v.category_slug
order by v.sort_order;
