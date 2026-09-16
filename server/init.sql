-- =============================================================================
-- MAIN SERVICE DATABASE DUMP (Strict SSOT - No Auth Data)
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Enable UUID generation (Required for schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- -----------------------------------------------------------------------------
-- 1. FUNCTIONS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;

SET default_tablespace = '';
SET default_table_access_method = heap;

-- -----------------------------------------------------------------------------
-- 2. TABLES
-- -----------------------------------------------------------------------------

CREATE TABLE public.restaurant_details (
    id UUID PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    pan character varying(10) NOT NULL,
    fassai character varying(256) NOT NULL,
    adhaar_card character varying(256) NOT NULL,
    gst character varying(256) NOT NULL,
    logo_url character varying(256),
    full_img character varying(256),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.restaurant_addresses (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID UNIQUE NOT NULL REFERENCES public.restaurant_details(id) ON DELETE CASCADE,
    full_address text,
    street character varying(255),
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    latitude numeric(9,6),
    longitude numeric(9,6),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);

CREATE TABLE public.restaurant_hours (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_details(id) ON DELETE CASCADE,
    day_of_week integer,
    open_time time without time zone,
    close_time time without time zone,
    is_closed time without time zone, 
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.menu (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES public.restaurant_details(id) ON DELETE CASCADE,
    name character varying(256) NOT NULL,
    short_desc character varying(500) NOT NULL,
    long_desc text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    available_from time without time zone,
    available_until time without time zone,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.categories (
    id SERIAL PRIMARY KEY,
    menu_id integer NOT NULL REFERENCES public.menu(id) ON DELETE CASCADE,
    name character varying(256) NOT NULL,
    short_desc character varying(500),
    long_desc text,
    display_order integer,
    is_active boolean,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.menue_items (
    id SERIAL PRIMARY KEY,
    category_id integer NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name character varying(256) NOT NULL,
    short_desc character varying(500),
    long_desc text,
    base_price integer NOT NULL,
    is_available boolean DEFAULT false,
    is_veg boolean NOT NULL,
    spice_level character varying,
    prep_time integer,
    tags json,
    img_url json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.item_availability (
    id SERIAL PRIMARY KEY,
    item_id integer NOT NULL REFERENCES public.menue_items(id) ON DELETE CASCADE,
    available_from time without time zone NOT NULL,
    available_until time without time zone NOT NULL,
    days_available json,
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.variants (
    id SERIAL PRIMARY KEY,
    name character varying(256),
    description text,
    is_active boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.variant_options (
    id SERIAL PRIMARY KEY,
    variant_id integer REFERENCES public.variants(id) ON DELETE CASCADE,
    name character varying(265),
    description text,
    price_modifier integer,
    display_order integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.item_variants (
    id SERIAL PRIMARY KEY,
    item_id integer REFERENCES public.menue_items(id) ON DELETE CASCADE,
    variant_id integer REFERENCES public.variants(id) ON DELETE CASCADE,
    is_required boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.addons (
    id SERIAL PRIMARY KEY,
    name character varying(256),
    description character varying(500),
    is_active boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.item_addons (
    id SERIAL PRIMARY KEY,
    item_id integer REFERENCES public.menue_items(id) ON DELETE CASCADE,
    addon_id integer REFERENCES public.addons(id) ON DELETE CASCADE,
    price integer,
    is_required integer,
    max_quantity integer,
    min_quantity integer,
    display_order integer,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. TRIGGERS
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_restaurant_hours BEFORE UPDATE ON public.restaurant_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_mennu BEFORE UPDATE ON public.menu FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_menue_items BEFORE UPDATE ON public.menue_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 4. SEED DATA 
-- =============================================================================
BEGIN;

-- EXACTLY 3 RESTAURANTS
INSERT INTO public.restaurant_details (id, name, description, pan, fassai, adhaar_card, gst) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Delhi Chaat Express', 'Authentic Chandni Chowk street food.', 'ABCDE1111A', '10022011000123', '200030004000', '07AAAAA1111A1Z1'),
('550e8400-e29b-41d4-a716-446655440002', 'The Hyderabadi Sun', 'Premium long-grain slow dum biryanis.', 'BCDEF2222B', '10022044000456', '300040005000', '36BBBBB2222B1Z2'),
('550e8400-e29b-41d4-a716-446655440003', 'Mumbai Tiffin Co.', 'Pure vegetarian coastal maharashtrian.', 'CDEFG3333C', '10022022000789', '400050006000', '27CCCCC3333C1Z3');

-- EXACTLY 3 ADDRESSES (1 per restaurant due to UNIQUE constraint)
INSERT INTO public.restaurant_addresses (id, restaurant_id, full_address, street, city, state, postal_code, country, latitude, longitude) VALUES
(1, '550e8400-e29b-41d4-a716-446655440001', 'Shop 4, Connaught Place', 'Connaught Place', 'New Delhi', 'Delhi', '110001', 'India', 28.6304, 77.2177),
(2, '550e8400-e29b-41d4-a716-446655440002', 'Plot 88, Gachibowli IT', 'Gachibowli', 'Hyderabad', 'Telangana', '500032', 'India', 17.4401, 78.3489),
(3, '550e8400-e29b-41d4-a716-446655440003', 'Building 12, Linking Road', 'Linking Road', 'Mumbai', 'Maharashtra', '400054', 'India', 19.0843, 72.8360);

-- 21 HOURS (3 restaurants x 7 days)
INSERT INTO public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time) 
SELECT r_id, day, '09:00:00', '23:00:00'
FROM unnest(ARRAY[
    '550e8400-e29b-41d4-a716-446655440001'::uuid, 
    '550e8400-e29b-41d4-a716-446655440002'::uuid, 
    '550e8400-e29b-41d4-a716-446655440003'::uuid
]) r_id 
CROSS JOIN unnest(ARRAY[1,2,3,4,5,6,7]) day;

-- 10 MENUS (Distributed across the 3 restaurants)
INSERT INTO public.menu (id, restaurant_id, name, short_desc, long_desc, is_active, available_from, available_until) VALUES
(1, '550e8400-e29b-41d4-a716-446655440001', 'Morning Breakfast', 'Classic Old Delhi morning breakfast', 'Heavy rich matching traditional breakfast available early hours.', true, '08:00:00', '12:00:00'),
(2, '550e8400-e29b-41d4-a716-446655440001', 'Lunch Thalis', 'Express lunch meals', 'Quick and filling meals for the afternoon rush.', true, '12:00:00', '16:00:00'),
(3, '550e8400-e29b-41d4-a716-446655440001', 'Evening Chaat', 'Chaat and street bites', 'Perfect spicy snacks for evening cravings.', true, '16:00:00', '20:00:00'),
(4, '550e8400-e29b-41d4-a716-446655440001', 'Late Night Bites', 'Midnight munchies', 'Parathas and rolls for the night owls.', true, '22:00:00', '02:00:00'),
(5, '550e8400-e29b-41d4-a716-446655440002', 'Royal Shahi Lunch', 'The premium royal daytime spread', 'Biryanis and rich cashew gravies engineered for fine dining.', true, '12:00:00', '16:00:00'),
(6, '550e8400-e29b-41d4-a716-446655440002', 'Nizami Dinner', 'Late night kebabs and curries', 'Rich dinner spread for the royal palate.', true, '19:00:00', '23:59:00'),
(7, '550e8400-e29b-41d4-a716-446655440002', 'Weekend Specials', 'Exotic weekend only items', 'Haleem and special biryanis available Saturday/Sunday.', true, '12:00:00', '23:59:00'),
(8, '550e8400-e29b-41d4-a716-446655440003', 'Aamchi Mumbai Breakfast', 'Quick transit bites', 'Classic fast-moving local breakfast favorites like Vada Pav.', true, '07:30:00', '11:30:00'),
(9, '550e8400-e29b-41d4-a716-446655440003', 'Coastal Lunch Fare', 'Malvani and Konkani curries', 'Spicy coconut based curries and fresh catch.', true, '12:30:00', '15:30:00'),
(10, '550e8400-e29b-41d4-a716-446655440003', 'Street Food Dinners', 'Pav bhaji and misal', 'Heavy street food dinners for the family.', true, '18:30:00', '23:00:00');

-- 15 CATEGORIES (Mapped to the 10 menus above)
INSERT INTO public.categories (id, menu_id, name, short_desc, display_order, is_active) VALUES
(1, 1, 'Stuffed Parathas', 'Heavy breads', 1, true),
(2, 1, 'Hot Beverages', 'Morning teas & coffees', 2, true),
(3, 2, 'Executive Thalis', 'Set lunch meals', 1, true),
(4, 3, 'Spicy Chaat', 'Tangy snacks', 1, true),
(5, 4, 'Midnight Rolls', 'Kathi rolls', 1, true),
(6, 5, 'Dum Biryani', 'Slow cooked rice', 1, true),
(7, 5, 'Rich Gravies', 'Cashew/Tomato bases', 2, true),
(8, 6, 'Charcoal Kebabs', 'Grilled starters', 1, true),
(9, 6, 'Breads', 'Naan & Roti', 2, true),
(10, 7, 'Haleem Specials', 'Slow cooked meat stew', 1, true),
(11, 8, 'Pav Items', 'Bread based snacks', 1, true),
(12, 8, 'Poha & Upma', 'Light breakfast', 2, true),
(13, 9, 'Fish Curries', 'Coastal seafood', 1, true),
(14, 9, 'Rice Plates', 'Curry and rice sets', 2, true),
(15, 10, 'Bhaji Variants', 'Mashed vegetable curries', 1, true);

-- 25 MENU ITEMS (Distributed across the 15 categories)
INSERT INTO public.menue_items (id, category_id, name, short_desc, long_desc, base_price, is_available, is_veg, spice_level, prep_time) VALUES
(1, 1, 'Aloo Paratha', 'Potato stuffed', 'Classic potato paratha served with butter.', 80, true, true, 'Mild', 15),
(2, 1, 'Paneer Paratha', 'Cottage cheese stuffed', 'Rich paneer stuffed paratha.', 100, true, true, 'Mild', 15),
(3, 2, 'Masala Chai', 'Spiced tea', 'Strong morning tea.', 30, true, true, 'None', 5),
(4, 3, 'Veg Deluxe Thali', 'Full meal', 'Dal, 2 sabzis, roti, rice, sweet.', 180, true, true, 'Medium', 10),
(5, 4, 'Aloo Tikki Chaat', 'Potato patties', 'Crispy patties with yogurt and chutney.', 90, true, true, 'Medium', 10),
(6, 4, 'Papdi Chaat', 'Crispy wafers', 'Wafers with potatoes, chickpeas, chutneys.', 80, true, true, 'Medium', 10),
(7, 5, 'Egg Chicken Roll', 'Heavy wrap', 'Flaky paratha with egg and chicken.', 120, true, false, 'Medium', 15),
(8, 6, 'Chicken Dum Biryani', 'Classic chicken rice', 'Aged basmati cooked with tender chicken.', 250, true, false, 'Medium', 20),
(9, 6, 'Mutton Dum Biryani', 'Classic mutton rice', 'Rich mutton biryani slow cooked for hours.', 350, true, false, 'High', 25),
(10, 7, 'Butter Chicken', 'Tomato gravy', 'Creamy rich tomato based chicken curry.', 280, true, false, 'Mild', 20),
(11, 8, 'Chicken Tikka', 'Grilled chicken', 'Boneless chicken marinated and grilled.', 220, true, false, 'Medium', 20),
(12, 8, 'Mutton Seekh Kebab', 'Minced meat skewer', 'Spiced minced mutton grilled on skewers.', 290, true, false, 'High', 20),
(13, 9, 'Garlic Naan', 'Garlic flatbread', 'Refined flour bread with garlic and butter.', 50, true, true, 'None', 10),
(14, 10, 'Mutton Haleem', 'Meat and wheat stew', 'Pounded meat cooked overnight with spices.', 300, true, false, 'Medium', 30),
(15, 11, 'Vada Pav', 'Potato slider', 'Classic Mumbai street food.', 40, true, true, 'High', 5),
(16, 11, 'Misal Pav', 'Spicy sprout curry', 'Sprouts curry served with pav.', 70, true, true, 'Very High', 10),
(17, 12, 'Kanda Poha', 'Onion flattened rice', 'Light and healthy beaten rice snack.', 50, true, true, 'Mild', 10),
(18, 13, 'Surmai Curry', 'Kingfish curry', 'Spicy coconut and tamarind fish curry.', 380, true, false, 'High', 20),
(19, 13, 'Prawns Koliwada', 'Fried prawns', 'Spicy deep fried prawns.', 420, true, false, 'Medium', 15),
(20, 14, 'Fish Thali', 'Complete seafood meal', 'Fish fry, curry, rice, sol kadhi.', 450, true, false, 'High', 15),
(21, 15, 'Pav Bhaji', 'Mashed veg curry', 'Mixed vegetables mashed on a hot tawa.', 120, true, true, 'Medium', 15),
(22, 15, 'Cheese Pav Bhaji', 'Cheesy mashed veg', 'Classic pav bhaji loaded with processed cheese.', 150, true, true, 'Medium', 15),
(23, 1, 'Gobi Paratha', 'Cauliflower stuffed', 'Spiced cauliflower paratha.', 90, true, true, 'Medium', 15),
(24, 6, 'Veg Biryani', 'Spiced vegetable rice', 'Basmati rice cooked with mixed vegetables.', 200, true, true, 'Medium', 20),
(25, 2, 'Filter Coffee', 'South Indian coffee', 'Strong milk coffee.', 40, true, true, 'None', 5);

-- 25 ITEM AVAILABILITY (1-to-1 matching with items)
INSERT INTO public.item_availability (id, item_id, available_from, available_until, is_active) VALUES
(1, 1, '08:00:00', '12:00:00', true),
(2, 2, '08:00:00', '12:00:00', true),
(3, 3, '08:00:00', '12:00:00', true),
(4, 4, '12:00:00', '16:00:00', true),
(5, 5, '16:00:00', '20:00:00', true),
(6, 6, '16:00:00', '20:00:00', true),
(7, 7, '22:00:00', '02:00:00', true),
(8, 8, '12:00:00', '16:00:00', true),
(9, 9, '12:00:00', '16:00:00', true),
(10, 10, '12:00:00', '16:00:00', true),
(11, 11, '19:00:00', '23:59:00', true),
(12, 12, '19:00:00', '23:59:00', true),
(13, 13, '19:00:00', '23:59:00', true),
(14, 14, '12:00:00', '23:59:00', true),
(15, 15, '07:30:00', '11:30:00', true),
(16, 16, '07:30:00', '11:30:00', true),
(17, 17, '07:30:00', '11:30:00', true),
(18, 18, '12:30:00', '15:30:00', true),
(19, 19, '12:30:00', '15:30:00', true),
(20, 20, '12:30:00', '15:30:00', true),
(21, 21, '18:30:00', '23:00:00', true),
(22, 22, '18:30:00', '23:00:00', true),
(23, 23, '08:00:00', '12:00:00', true),
(24, 24, '12:00:00', '16:00:00', true),
(25, 25, '08:00:00', '12:00:00', true);

-- 10 VARIANTS
INSERT INTO public.variants (id, name, description, is_active) VALUES
(1, 'Portion Size', 'Size of the serving', true),
(2, 'Spice Level', 'How hot do you want it', true),
(3, 'Bread Choice', 'Type of bread', true),
(4, 'Preparation', 'Cooking style', true),
(5, 'Egg Choice', 'Number of eggs', true),
(6, 'Meat Cut', 'Boneless or Bone-in', true),
(7, 'Sweetness', 'Sugar level', true),
(8, 'Butter Level', 'Amount of butter', true),
(9, 'Cheese Type', 'Type of cheese', true),
(10, 'Cooking Oil', 'Type of oil used', true);

-- 20 VARIANT OPTIONS
INSERT INTO public.variant_options (id, variant_id, name, price_modifier, display_order) VALUES
(1, 1, 'Half', 0, 1),
(2, 1, 'Full', 100, 2),
(3, 1, 'Family Pack', 250, 3),
(4, 2, 'Mild', 0, 1),
(5, 2, 'Medium', 0, 2),
(6, 2, 'Extra Spicy', 10, 3),
(7, 3, 'Whole Wheat', 0, 1),
(8, 3, 'Refined Flour', 0, 2),
(9, 4, 'Tawa Fry', 0, 1),
(10, 4, 'Deep Fry', 15, 2),
(11, 5, 'Single Egg', 15, 1),
(12, 5, 'Double Egg', 30, 2),
(13, 6, 'Bone-in', 0, 1),
(14, 6, 'Boneless', 40, 2),
(15, 7, 'Less Sugar', 0, 1),
(16, 7, 'Normal Sugar', 0, 2),
(17, 8, 'Regular Butter', 0, 1),
(18, 8, 'Extra Amul Butter', 20, 2),
(19, 9, 'Processed Cheese', 30, 1),
(20, 9, 'Mozzarella', 50, 2);

-- 20 ITEM VARIANTS
INSERT INTO public.item_variants (id, item_id, variant_id, is_required) VALUES
(1, 8, 1, true),
(2, 9, 1, true),
(3, 10, 2, false),
(4, 11, 2, true),
(5, 7, 5, true),
(6, 12, 6, true),
(7, 18, 4, true),
(8, 19, 4, true),
(9, 3, 7, true),
(10, 25, 7, true),
(11, 1, 8, false),
(12, 2, 8, false),
(13, 21, 8, false),
(14, 22, 9, false),
(15, 15, 2, true),
(16, 16, 2, true),
(17, 24, 1, true),
(18, 14, 1, true),
(19, 13, 8, false),
(20, 4, 3, true);

-- 12 ADDONS
INSERT INTO public.addons (id, name, description, is_active) VALUES
(1, 'Extra Chutney', 'Mint and coriander dip', true),
(2, 'Extra Raita', 'Yogurt side', true),
(3, 'Extra Pav', 'Pair of bread rolls', true),
(4, 'Salad Plate', 'Onion and cucumber', true),
(5, 'Roasted Papad', 'Roasted lentil wafer', true),
(6, 'Fried Papad', 'Fried lentil wafer', true),
(7, 'Extra Sambhar', 'Lentil stew', true),
(8, 'Extra Cheese', 'Grated cheese', true),
(9, 'Boiled Egg', 'Single boiled egg', true),
(10, 'Mirchi Ka Salan', 'Peanut and chili gravy', true),
(11, 'Sweet Pan', 'Mouth freshener', true),
(12, 'Extra Butter', 'Dollop of butter', true);

-- 25 ITEM ADDONS
INSERT INTO public.item_addons (id, item_id, addon_id, price, is_required, max_quantity, min_quantity) VALUES
(1, 1, 1, 10, 0, 2, 0),
(2, 2, 1, 10, 0, 2, 0),
(3, 5, 1, 10, 0, 2, 0),
(4, 6, 1, 10, 0, 2, 0),
(5, 8, 2, 30, 0, 3, 0),
(6, 9, 2, 30, 0, 3, 0),
(7, 24, 2, 30, 0, 3, 0),
(8, 8, 10, 40, 0, 2, 0),
(9, 9, 10, 40, 0, 2, 0),
(10, 15, 3, 15, 0, 4, 0),
(11, 16, 3, 15, 0, 4, 0),
(12, 21, 3, 15, 0, 4, 0),
(13, 22, 3, 15, 0, 4, 0),
(14, 21, 8, 30, 0, 1, 0),
(15, 1, 12, 15, 0, 2, 0),
(16, 2, 12, 15, 0, 2, 0),
(17, 4, 5, 10, 0, 2, 0),
(18, 4, 6, 15, 0, 2, 0),
(19, 20, 4, 20, 0, 1, 0),
(20, 11, 4, 20, 0, 1, 0),
(21, 12, 4, 20, 0, 1, 0),
(22, 8, 11, 25, 0, 1, 0),
(23, 9, 11, 25, 0, 1, 0),
(24, 7, 9, 20, 0, 2, 0),
(25, 14, 4, 20, 0, 1, 0);

COMMIT;

-- -----------------------------------------------------------------------------
-- 5. DYNAMIC SEQUENCE RESETS
-- -----------------------------------------------------------------------------

SELECT pg_catalog.setval('public.restaurant_addresses_id_seq', (SELECT MAX(id) FROM public.restaurant_addresses), true);
SELECT pg_catalog.setval('public.restaurant_hours_id_seq', (SELECT MAX(id) FROM public.restaurant_hours), true);
SELECT pg_catalog.setval('public.menu_id_seq', (SELECT MAX(id) FROM public.menu), true);
SELECT pg_catalog.setval('public.categories_id_seq', (SELECT MAX(id) FROM public.categories), true);
SELECT pg_catalog.setval('public.menue_items_id_seq', (SELECT MAX(id) FROM public.menue_items), true);
SELECT pg_catalog.setval('public.item_availability_id_seq', (SELECT MAX(id) FROM public.item_availability), true);
SELECT pg_catalog.setval('public.variants_id_seq', (SELECT MAX(id) FROM public.variants), true);
SELECT pg_catalog.setval('public.variant_options_id_seq', (SELECT MAX(id) FROM public.variant_options), true);
SELECT pg_catalog.setval('public.item_variants_id_seq', (SELECT MAX(id) FROM public.item_variants), true);
SELECT pg_catalog.setval('public.addons_id_seq', (SELECT MAX(id) FROM public.addons), true);
SELECT pg_catalog.setval('public.item_addons_id_seq', (SELECT MAX(id) FROM public.item_addons), true);