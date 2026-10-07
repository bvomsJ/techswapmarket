create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  series text not null,
  model text not null,
  storage_gb integer,
  color text,
  condition text not null default 'Б/у',
  battery_percent integer,
  price numeric(12,2) not null default 0,
  old_price numeric(12,2),
  stock integer not null default 1,
  description text,
  short_description text,
  included text,
  warranty text,
  status text not null default 'active' check (status in ('active','hidden','sold')),
  featured boolean not null default false,
  sort_order integer not null default 0,
  seo_title text,
  seo_description text,
  specs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  content text not null default '',
  is_visible boolean not null default true,
  show_in_nav boolean not null default true,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'techswapmarket',
  tagline text not null default 'iPhone с проверенной историей и честным описанием.',
  telegram_username text not null default 'username',
  contact_email text default '',
  phone text default '',
  currency text not null default '₽',
  shipping_text text not null default 'Доставка согласовывается при оформлении заказа.',
  payment_text text not null default 'Способ оплаты согласовывается с менеджером.',
  warranty_text text not null default 'Условия гарантии указываются в карточке каждого устройства.',
  return_text text not null default 'Условия возврата согласовываются до покупки.',
  seo_title text not null default 'techswapmarket — iPhone',
  seo_description text not null default 'Магазин iPhone: каталог, проверенные устройства, характеристики и заказ.',
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_name text not null,
  customer_phone text,
  customer_telegram text,
  city text,
  comment text,
  status text not null default 'new' check (status in ('new','processing','confirmed','shipped','completed','cancelled')),
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  price numeric(12,2) not null,
  quantity integer not null check (quantity > 0)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  is_visible boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (slug,name,sort_order) values
('iphone-6','iPhone 6',10),('iphone-7','iPhone 7',20),('iphone-8','iPhone 8',30),
('iphone-x','iPhone X',40),('iphone-xr','iPhone XR',50),('iphone-xs','iPhone XS',60),
('iphone-11','iPhone 11',70),('iphone-11-pro','iPhone 11 Pro',80),('iphone-11-pro-max','iPhone 11 Pro Max',90),
('iphone-se','iPhone SE',100),('iphone-12','iPhone 12',110),('iphone-12-mini','iPhone 12 mini',120),
('iphone-12-pro','iPhone 12 Pro',130),('iphone-12-pro-max','iPhone 12 Pro Max',140)
on conflict (slug) do nothing;

insert into public.pages (slug,title,content,sort_order) values
('delivery','Доставка','Доставка согласовывается с менеджером после оформления заказа. Доступные варианты и стоимость зависят от города.',10),
('payment','Оплата','Способ оплаты согласовывается индивидуально до подтверждения заказа.',20),
('warranty','Гарантия','Условия гарантии указываются в карточке конкретного устройства и подтверждаются менеджером перед покупкой.',30),
('returns','Возврат','Условия возврата и обмена согласовываются до покупки.',40),
('faq','FAQ','Ответы на частые вопросы появятся здесь. Этот раздел полностью редактируется из админки.',50),
('about','О магазине','techswapmarket — магазин iPhone с подробным описанием состояния устройств и прозрачной карточкой товара.',60),
('contacts','Контакты','Свяжитесь с нами через Telegram. Username можно изменить в админке.',70)
on conflict (slug) do nothing;

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.categories enable row level security;
alter table public.pages enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select using (status = 'active' or auth.role() = 'authenticated');
drop policy if exists "public read images" on public.product_images;
create policy "public read images" on public.product_images for select using (true);
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (is_visible = true or auth.role() = 'authenticated');
drop policy if exists "public read pages" on public.pages;
create policy "public read pages" on public.pages for select using (is_visible = true or auth.role() = 'authenticated');
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select using (true);
drop policy if exists "public read reviews" on public.reviews;
create policy "public read reviews" on public.reviews for select using (is_visible = true or auth.role() = 'authenticated');

create policy "public create orders" on public.orders for insert with check (true);
create policy "public create order items" on public.order_items for insert with check (true);

create policy "admin manage products" on public.products for all to authenticated using (true) with check (true);
create policy "admin manage images" on public.product_images for all to authenticated using (true) with check (true);
create policy "admin manage categories" on public.categories for all to authenticated using (true) with check (true);
create policy "admin manage pages" on public.pages for all to authenticated using (true) with check (true);
create policy "admin manage settings" on public.site_settings for all to authenticated using (true) with check (true);
create policy "admin manage orders" on public.orders for all to authenticated using (true) with check (true);
create policy "admin manage order items" on public.order_items for all to authenticated using (true) with check (true);
create policy "admin manage reviews" on public.reviews for all to authenticated using (true) with check (true);

insert into storage.buckets (id,name,public) values ('product-images','product-images',true) on conflict (id) do update set public=true;
create policy "public product images" on storage.objects for select using (bucket_id = 'product-images');
create policy "admin upload product images" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
create policy "admin update product images" on storage.objects for update to authenticated using (bucket_id = 'product-images');
create policy "admin delete product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images');
