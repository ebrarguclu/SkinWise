-- Kullanici bilgilerini ve rolleri tutan profiles tablosunu olusturur.
-- Supabase Dashboard > SQL Editor icinde bir kez calistirilir.
-- Her yeni kullanici icin satir, asagidaki trigger ile otomatik acilir.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  tax_id text not null default '',
  address text not null default '',
  role text not null default 'customer'
    check (role in ('customer', 'product_manager', 'sales_manager')),
  created_at timestamptz not null default now()
);

-- Kullanici sadece kendi satirini okuyabilir, hicbir satiri degistiremez.
-- Boylece kimse kendi rolunu yukseltemez.
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Kayit sirasinda profili acar. Rol bilerek metadata'dan okunmaz:
-- herkes 'customer' baslar, kayit istegiyle yonetici olunamaz.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, tax_id, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'tax_id', ''),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Yonetici atamak icin SQL Editor'de:
-- update public.profiles set role = 'product_manager'
-- where id = (select id from auth.users where email = 'kisi@ornek.com');
