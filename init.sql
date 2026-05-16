-- SQL-скрипт для заполнения базы данных PostgreSQL, задача - наполнить таблицы так называемыми справочниками (или словарями)

INSERT INTO categories (code, name) VALUES
  ('restaurant', 'Ресторан'),
  ('cafe', 'Кафе'),
  ('bar', 'Бар'),
  ('coffee','Кофейня'),
  ('fastfood','Фастфуд'),
  ('canteen','Столовая'),
  ('venue','Площадка')
ON CONFLICT (code) DO NOTHING;


INSERT INTO cuisines (code, name) VALUES
  ('yakut', 'Якутская'),
  ('european', 'Европейская'),
  ('asian', 'Азиатская'),
  ('japanese', 'Японская'),
  ('chinese', 'Китайская'),
  ('italian', 'Итальянская'),
  ('georgian', 'Грузинская'),
  ('russian', 'Русская'),
  ('mixed', 'Смешанная')
ON CONFLICT (code) DO NOTHING;


INSERT INTO diet_tags (code, name) VALUES
  ('vegetarian', 'Вегетерианское'),
  ('vegan', 'Веганское'),
  ('halal', 'Халяль'),
  ('gluten_free', 'Без глютена'),
  ('lactose_free', 'Без лактозы'),
  ('kids_menu', 'Детское меню'),
  ('lent', 'Постное меню')
ON CONFLICT (code) DO NOTHING;

INSERT INTO amenity_tags (code, name) VALUES
  ('wifi', 'Wi-Fi'),
  ('kids_zone', 'Детская зона'),
  ('terrace', 'Веранда'),
  ('live_music', 'Живая музыка'),
  ('parking', 'Парковка'),
  ('wheelchair', 'Доступная среда'),
  ('private_room', 'Отдельная комната'),
  ('pet_friendly', 'Можно с животными')
ON CONFLICT (code) do NOTHING;

INSERT INTO event_types (code, name) VALUES
  ('concert', 'Концерт'),
  ('movie', 'Кино'),
  ('theatre','Спектакль'),
  ('quiz', 'Квиз'),
  ('exhibition', 'Выставка'),
  ('masterclass', 'Мастер-класс'),
  ('sport', 'Спорт'),
  ('lecture', 'Лекция'),
  ('festival', 'Фестиваль')
ON CONFLICT (code) do NOTHING;

INSERT INTO age_groups (code, name, min_age) VALUES
  ('0+', '0+', 0),
  ('6+', '6+', 6),
  ('12+', '12+', 12),
  ('16+', '16+', 16),
  ('18+', '18+', 18)
ON CONFLICT (code) do NOTHING;

INSERT INTO price_bands (code, name, min_price, max_price)
  ('P1', '₽', 0, 500),
  ('P2', '₽₽', 500, 1500),
  ('P3', '₽₽₽', 1500, 3000),
  ('P4', '₽₽₽₽', 3000, 10000)
ON CONFLICT (code) DO NOTHING;
