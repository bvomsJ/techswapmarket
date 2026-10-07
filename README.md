# techswapmarket

Полноценный магазин iPhone на GitHub Pages + Supabase.

## Стек
- Vanilla HTML/CSS/JS — без тяжёлого фреймворка.
- Supabase — PostgreSQL, Auth, Storage и API.
- GitHub Pages — бесплатный статический хостинг.

## Что есть
- каталог iPhone до 12-й серии;
- поиск и фильтры;
- полноценная страница товара;
- корзина;
- оформление заказа;
- сохранение заказов в Supabase;
- генерация сообщения для Telegram;
- мобильная адаптация;
- SEO/Open Graph/JSON-LD;
- страницы доставки, оплаты, гарантии, возврата, FAQ, контактов;
- управление видимостью страниц;
- полноценная админка `/admin/`;
- управление товарами, фото, остатками, заказами, страницами и настройками;
- Supabase Auth для администратора;
- Supabase Storage для фотографий.

## 1. Создать Supabase
1. Создайте проект на Supabase.
2. Откройте SQL Editor.
3. Выполните `sql/schema.sql`.
4. Выполните `sql/seed.sql`.
5. В Storage создайте/используйте bucket `product-images` (seed создаёт его автоматически, если разрешено вашей версии Supabase).
6. В Authentication → Users создайте пользователя-администратора с email/password.

## 2. Настроить сайт
Скопируйте `src/config.example.js` в `src/config.js` и вставьте:
- Supabase Project URL
- Supabase anon/publishable key
- Telegram username позже, когда будете готовы

Для GitHub Pages также можно использовать GitHub Actions и заменить значения в `src/config.js` перед публикацией.

## 3. Локальный запуск
Нужен любой статический сервер. Например:

```bash
python -m http.server 8080
```

Откройте `http://localhost:8080/src/`.

## 4. GitHub Pages
Репозиторий можно сделать обычным public/private repository. Для Pages лучше использовать GitHub Actions workflow из `.github/workflows/pages.yml`.

## 5. Админка
Откройте `/admin/` и войдите через Supabase Auth.

Путь `/admin/` не выводится в публичной навигации и sitemap, но безопасность обеспечивается не секретностью URL, а Supabase Auth + RLS.

## Важно
Никогда не вставляйте Supabase `service_role` key в этот проект. На GitHub и в браузере используется только anon/publishable key.
