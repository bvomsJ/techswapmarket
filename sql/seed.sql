-- Базовый каталог моделей. Реальные устройства добавляйте из админки.
-- Цена 0 и status=hidden специально не показывают эти шаблоны посетителям.
insert into public.products (slug,name,series,model,storage_gb,color,condition,price,stock,status,description,short_description,specs)
select slug,name,series,model,storage,color,'Б/у',0,0,'hidden',description,short_description,specs::jsonb
from (values
('iphone-6-template','iPhone 6','6','iPhone 6','16','Space Gray','Классическая модель iPhone 6.','Шаблон модели','{}'),
('iphone-7-template','iPhone 7','7','iPhone 7','32','Black','Компактный iPhone 7.','Шаблон модели','{}'),
('iphone-8-template','iPhone 8','8','iPhone 8','64','Space Gray','Стеклянный корпус и Touch ID.','Шаблон модели','{}'),
('iphone-x-template','iPhone X','X','iPhone X','64','Space Gray','Безрамочный дизайн и Face ID.','Шаблон модели','{}'),
('iphone-xr-template','iPhone XR','XR','iPhone XR','64','Black','Цветной корпус и Face ID.','Шаблон модели','{}'),
('iphone-xs-template','iPhone XS','XS','iPhone XS','64','Space Gray','OLED-дисплей и Face ID.','Шаблон модели','{}'),
('iphone-11-template','iPhone 11','11','iPhone 11','64','Black','Две камеры и A13 Bionic.','Шаблон модели','{}'),
('iphone-11-pro-template','iPhone 11 Pro','11 Pro','iPhone 11 Pro','64','Midnight Green','Pro-линейка с тройной камерой.','Шаблон модели','{}'),
('iphone-11-pro-max-template','iPhone 11 Pro Max','11 Pro Max','iPhone 11 Pro Max','64','Space Gray','Большой OLED-дисплей и тройная камера.','Шаблон модели','{}'),
('iphone-se-2020-template','iPhone SE (2nd gen)','SE','iPhone SE 2020','64','Black','Компактный iPhone с Touch ID.','Шаблон модели','{}'),
('iphone-se-2022-template','iPhone SE (3rd gen)','SE','iPhone SE 2022','64','Midnight','Компактный iPhone с 5G.','Шаблон модели','{}'),
('iphone-12-template','iPhone 12','12','iPhone 12','64','Black','OLED-дисплей, 5G и A14 Bionic.','Шаблон модели','{}'),
('iphone-12-mini-template','iPhone 12 mini','12','iPhone 12 mini','64','Black','Компактный OLED iPhone.','Шаблон модели','{}'),
('iphone-12-pro-template','iPhone 12 Pro','12 Pro','iPhone 12 Pro','128','Graphite','Pro-линейка с LiDAR и тройной камерой.','Шаблон модели','{}'),
('iphone-12-pro-max-template','iPhone 12 Pro Max','12 Pro Max','iPhone 12 Pro Max','128','Pacific Blue','Максимальный размер и камера Pro.','Шаблон модели','{}')
) as t(slug,name,series,model,storage,color,description,short_description,specs)
on conflict (slug) do nothing;
