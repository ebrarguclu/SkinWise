-- products tablosunu olusturur ve frontend'deki ornek urunlerle doldurur.
-- Supabase Dashboard > SQL Editor icinde bir kez calistirilir.
-- Kolon adlari frontend'in bekledigi alanlarla aynidir.

create table public.products (
  id bigint generated always as identity primary key,
  name text not null,
  brand text not null,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  skin text not null,
  badges text[] not null default '{}',
  emoji text not null default '🧴'
);

-- Backend publishable key kullandigi icin RLS kurallari gecerlidir.
-- Bu policy olmazsa GET /products hata vermeden bos liste doner.
alter table public.products enable row level security;

create policy "Products are readable by everyone"
  on public.products for select
  to anon, authenticated
  using (true);

insert into public.products (name, brand, category, price, stock, rating, skin, badges, emoji) values
  ('Gentle Foam Cleanser', 'SkinWise Lab', 'cleanser', 12.99, 24, 4.6, 'Sensitive', array['Vegan', 'Fragrance-free'], '🫧'),
  ('Hyaluron Barrier Cream', 'Dermia', 'moisturizer', 19.99, 12, 4.8, 'Dry', array['Fragrance-free'], '💧'),
  ('Niacinamide 10% Serum', 'PureLab', 'serum', 17.99, 5, 4.5, 'Combination', array['Vegan'], '✨'),
  ('Daily SPF 50 Fluid', 'Sunly', 'sunscreen', 15.99, 40, 4.7, 'Oily', array['Lightweight'], '☀️'),
  ('Clay Detox Mask', 'Verde', 'mask', 9.99, 0, 4.2, 'Oily', array['Vegan'], '🌿'),
  ('Rose Calming Toner', 'Petal', 'toner', 11.49, 18, 4.4, 'Sensitive', array['Alcohol-free'], '🌸'),
  ('Vitamin C Brightening Serum', 'PureLab', 'serum', 21.99, 9, 4.6, 'Normal', array['Dark-spot care'], '🍊'),
  ('Ceramide Night Cream', 'Dermia', 'moisturizer', 23.99, 7, 4.9, 'Dry', array['Fragrance-free', 'Vegan'], '🌙');
