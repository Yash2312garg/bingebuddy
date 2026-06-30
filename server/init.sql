--
-- PostgreSQL database dump
--

\restrict U6sd983feYUhwsbAYnxJSGDhaLs4odOhBfusAvTAiMMa64RQNAa6fh8wqGCt2H7

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth_status_enum; Type: TYPE; Schema: public; Owner: yash
--

CREATE TYPE public.auth_status_enum AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.auth_status_enum OWNER TO yash;

--
-- Name: update_updat4edatcolumn(); Type: FUNCTION; Schema: public; Owner: yash
--

CREATE FUNCTION public.update_updat4edatcolumn() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN 
NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updat4edatcolumn() OWNER TO yash;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: yash
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO yash;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addons; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.addons (
    id integer NOT NULL,
    name character varying(256),
    description character varying(500),
    is_active boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.addons OWNER TO yash;

--
-- Name: addons_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.addons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.addons_id_seq OWNER TO yash;

--
-- Name: addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.addons_id_seq OWNED BY public.addons.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    menu_id integer NOT NULL,
    name character varying(256) NOT NULL,
    short_desc character varying(500),
    long_desc text,
    display_order integer,
    is_active boolean,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO yash;

--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.categories_id_seq OWNER TO yash;

--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: combo_addons; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.combo_addons (
    id integer NOT NULL,
    combo_id integer,
    addon_id integer,
    price integer,
    is_required boolean,
    max_quantity integer,
    min_quantity integer,
    display_order integer,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.combo_addons OWNER TO yash;

--
-- Name: combo_addons_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.combo_addons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.combo_addons_id_seq OWNER TO yash;

--
-- Name: combo_addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.combo_addons_id_seq OWNED BY public.combo_addons.id;


--
-- Name: combo_items; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.combo_items (
    id integer NOT NULL,
    combo_id integer,
    item_id integer,
    is_required boolean,
    max_quantity boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.combo_items OWNER TO yash;

--
-- Name: combo_items_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.combo_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.combo_items_id_seq OWNER TO yash;

--
-- Name: combo_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.combo_items_id_seq OWNED BY public.combo_items.id;


--
-- Name: combo_variants; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.combo_variants (
    id integer NOT NULL,
    combo_id integer,
    variant_id integer,
    is_required boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.combo_variants OWNER TO yash;

--
-- Name: combo_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.combo_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.combo_variants_id_seq OWNER TO yash;

--
-- Name: combo_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.combo_variants_id_seq OWNED BY public.combo_variants.id;


--
-- Name: combos; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.combos (
    id integer NOT NULL,
    category_id integer,
    name character varying(256),
    short_desc character varying(500),
    long_desc text,
    base_price integer,
    is_available boolean DEFAULT false,
    max_items integer,
    min_items integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.combos OWNER TO yash;

--
-- Name: combos_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.combos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.combos_id_seq OWNER TO yash;

--
-- Name: combos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.combos_id_seq OWNED BY public.combos.id;


--
-- Name: item_addons; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.item_addons (
    id integer NOT NULL,
    item_id integer,
    addon_id integer,
    price integer,
    is_required integer,
    max_quantity integer,
    min_quantity integer,
    display_order integer,
    rules json,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.item_addons OWNER TO yash;

--
-- Name: item_addons_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.item_addons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.item_addons_id_seq OWNER TO yash;

--
-- Name: item_addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.item_addons_id_seq OWNED BY public.item_addons.id;


--
-- Name: item_availability; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.item_availability (
    id integer NOT NULL,
    item_id integer NOT NULL,
    available_from time without time zone NOT NULL,
    available_until time without time zone NOT NULL,
    days_available json,
    is_active boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.item_availability OWNER TO yash;

--
-- Name: item_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.item_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.item_availability_id_seq OWNER TO yash;

--
-- Name: item_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.item_availability_id_seq OWNED BY public.item_availability.id;


--
-- Name: item_variants; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.item_variants (
    id integer NOT NULL,
    item_id integer,
    variant_id integer,
    is_required boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.item_variants OWNER TO yash;

--
-- Name: item_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.item_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.item_variants_id_seq OWNER TO yash;

--
-- Name: item_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.item_variants_id_seq OWNED BY public.item_variants.id;


--
-- Name: menu; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.menu (
    id integer NOT NULL,
    restaurant_id integer NOT NULL,
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


ALTER TABLE public.menu OWNER TO yash;

--
-- Name: menu_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.menu_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.menu_id_seq OWNER TO yash;

--
-- Name: menu_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.menu_id_seq OWNED BY public.menu.id;


--
-- Name: menue_items; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.menue_items (
    id integer NOT NULL,
    category_id integer NOT NULL,
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


ALTER TABLE public.menue_items OWNER TO yash;

--
-- Name: menue_items_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.menue_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.menue_items_id_seq OWNER TO yash;

--
-- Name: menue_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.menue_items_id_seq OWNED BY public.menue_items.id;


--
-- Name: restaurant_accounts; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.restaurant_accounts (
    id integer NOT NULL,
    email character varying(255),
    reference_id character varying(15),
    phone_number character varying(20),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    auth_status public.auth_status_enum DEFAULT 'PENDING'::public.auth_status_enum
);


ALTER TABLE public.restaurant_accounts OWNER TO yash;

--
-- Name: restaurant_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.restaurant_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.restaurant_accounts_id_seq OWNER TO yash;

--
-- Name: restaurant_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.restaurant_accounts_id_seq OWNED BY public.restaurant_accounts.id;


--
-- Name: restaurant_addresses; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.restaurant_addresses (
    id integer NOT NULL,
    user_id integer,
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


ALTER TABLE public.restaurant_addresses OWNER TO yash;

--
-- Name: restaurant_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.restaurant_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.restaurant_addresses_id_seq OWNER TO yash;

--
-- Name: restaurant_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.restaurant_addresses_id_seq OWNED BY public.restaurant_addresses.id;


--
-- Name: restaurant_details; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.restaurant_details (
    id integer NOT NULL,
    user_id integer,
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


ALTER TABLE public.restaurant_details OWNER TO yash;

--
-- Name: restaurant_details_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.restaurant_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.restaurant_details_id_seq OWNER TO yash;

--
-- Name: restaurant_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.restaurant_details_id_seq OWNED BY public.restaurant_details.id;


--
-- Name: restaurant_hours; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.restaurant_hours (
    id integer NOT NULL,
    restaurant_id integer,
    day_of_week integer,
    open_time time without time zone,
    close_time time without time zone,
    is_closed time without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.restaurant_hours OWNER TO yash;

--
-- Name: restaurant_hours_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.restaurant_hours_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.restaurant_hours_id_seq OWNER TO yash;

--
-- Name: restaurant_hours_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.restaurant_hours_id_seq OWNED BY public.restaurant_hours.id;


--
-- Name: variant_options; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.variant_options (
    id integer NOT NULL,
    variant_id integer,
    name character varying(265),
    description text,
    price_modifier integer,
    display_order integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.variant_options OWNER TO yash;

--
-- Name: variant_options_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.variant_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.variant_options_id_seq OWNER TO yash;

--
-- Name: variant_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.variant_options_id_seq OWNED BY public.variant_options.id;


--
-- Name: variants; Type: TABLE; Schema: public; Owner: yash
--

CREATE TABLE public.variants (
    id integer NOT NULL,
    name character varying(256),
    description text,
    is_active boolean,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.variants OWNER TO yash;

--
-- Name: variants_id_seq; Type: SEQUENCE; Schema: public; Owner: yash
--

CREATE SEQUENCE public.variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.variants_id_seq OWNER TO yash;

--
-- Name: variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: yash
--

ALTER SEQUENCE public.variants_id_seq OWNED BY public.variants.id;


--
-- Name: addons id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.addons ALTER COLUMN id SET DEFAULT nextval('public.addons_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: combo_addons id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_addons ALTER COLUMN id SET DEFAULT nextval('public.combo_addons_id_seq'::regclass);


--
-- Name: combo_items id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_items ALTER COLUMN id SET DEFAULT nextval('public.combo_items_id_seq'::regclass);


--
-- Name: combo_variants id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_variants ALTER COLUMN id SET DEFAULT nextval('public.combo_variants_id_seq'::regclass);


--
-- Name: combos id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combos ALTER COLUMN id SET DEFAULT nextval('public.combos_id_seq'::regclass);


--
-- Name: item_addons id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_addons ALTER COLUMN id SET DEFAULT nextval('public.item_addons_id_seq'::regclass);


--
-- Name: item_availability id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_availability ALTER COLUMN id SET DEFAULT nextval('public.item_availability_id_seq'::regclass);


--
-- Name: item_variants id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_variants ALTER COLUMN id SET DEFAULT nextval('public.item_variants_id_seq'::regclass);


--
-- Name: menu id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menu ALTER COLUMN id SET DEFAULT nextval('public.menu_id_seq'::regclass);


--
-- Name: menue_items id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menue_items ALTER COLUMN id SET DEFAULT nextval('public.menue_items_id_seq'::regclass);


--
-- Name: restaurant_accounts id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_accounts ALTER COLUMN id SET DEFAULT nextval('public.restaurant_accounts_id_seq'::regclass);


--
-- Name: restaurant_addresses id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_addresses ALTER COLUMN id SET DEFAULT nextval('public.restaurant_addresses_id_seq'::regclass);


--
-- Name: restaurant_details id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_details ALTER COLUMN id SET DEFAULT nextval('public.restaurant_details_id_seq'::regclass);


--
-- Name: restaurant_hours id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_hours ALTER COLUMN id SET DEFAULT nextval('public.restaurant_hours_id_seq'::regclass);


--
-- Name: variant_options id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.variant_options ALTER COLUMN id SET DEFAULT nextval('public.variant_options_id_seq'::regclass);


--
-- Name: variants id; Type: DEFAULT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.variants ALTER COLUMN id SET DEFAULT nextval('public.variants_id_seq'::regclass);


--
-- Data for Name: addons; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.addons (id, name, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.categories (id, menu_id, name, short_desc, long_desc, display_order, is_active, rules, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: combo_addons; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.combo_addons (id, combo_id, addon_id, price, is_required, max_quantity, min_quantity, display_order, rules, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: combo_items; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.combo_items (id, combo_id, item_id, is_required, max_quantity, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: combo_variants; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.combo_variants (id, combo_id, variant_id, is_required, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: combos; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.combos (id, category_id, name, short_desc, long_desc, base_price, is_available, max_items, min_items, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: item_addons; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.item_addons (id, item_id, addon_id, price, is_required, max_quantity, min_quantity, display_order, rules, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: item_availability; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.item_availability (id, item_id, available_from, available_until, days_available, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: item_variants; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.item_variants (id, item_id, variant_id, is_required, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: menu; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.menu (id, restaurant_id, name, short_desc, long_desc, is_active, available_from, available_until, rules, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: menue_items; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.menue_items (id, category_id, name, short_desc, long_desc, base_price, is_available, is_veg, spice_level, prep_time, tags, img_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: restaurant_accounts; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.restaurant_accounts (id, email, reference_id, phone_number, created_at, updated_at, auth_status) FROM stdin;
25	check@123.com	THEG-NSAD	\N	2026-01-05 13:52:48.612904	2026-01-05 13:52:48.612904	PENDING
\.


--
-- Data for Name: restaurant_addresses; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.restaurant_addresses (id, user_id, full_address, street, city, state, postal_code, country, latitude, longitude, created_at, updated_at) FROM stdin;
6	25	asads	asdasd	asdasda	dasdasd	asdasdasd	India	0.000000	0.000000	2026-01-05 13:52:48.633298	2026-01-05 13:52:48.633298
\.


--
-- Data for Name: restaurant_details; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.restaurant_details (id, user_id, name, description, pan, fassai, adhaar_card, gst, logo_url, full_img, created_at, updated_at) FROM stdin;
11	25	T?he golden spoon 	asdlasdmsad	asdlkansd	asdlkasd	asdlkmasd	asdlkansad	\N	\N	2026-01-05 13:52:48.624838	2026-01-05 13:52:48.624838
\.


--
-- Data for Name: restaurant_hours; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.restaurant_hours (id, restaurant_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: variant_options; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.variant_options (id, variant_id, name, description, price_modifier, display_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: variants; Type: TABLE DATA; Schema: public; Owner: yash
--

COPY public.variants (id, name, description, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Name: addons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.addons_id_seq', 1, false);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.categories_id_seq', 1, true);


--
-- Name: combo_addons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.combo_addons_id_seq', 1, false);


--
-- Name: combo_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.combo_items_id_seq', 1, false);


--
-- Name: combo_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.combo_variants_id_seq', 1, false);


--
-- Name: combos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.combos_id_seq', 1, false);


--
-- Name: item_addons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.item_addons_id_seq', 1, false);


--
-- Name: item_availability_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.item_availability_id_seq', 1, false);


--
-- Name: item_variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.item_variants_id_seq', 1, false);


--
-- Name: menu_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.menu_id_seq', 9, true);


--
-- Name: menue_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.menue_items_id_seq', 1, false);


--
-- Name: restaurant_accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.restaurant_accounts_id_seq', 25, true);


--
-- Name: restaurant_addresses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.restaurant_addresses_id_seq', 6, true);


--
-- Name: restaurant_details_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.restaurant_details_id_seq', 11, true);


--
-- Name: restaurant_hours_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.restaurant_hours_id_seq', 1, false);


--
-- Name: variant_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.variant_options_id_seq', 1, false);


--
-- Name: variants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: yash
--

SELECT pg_catalog.setval('public.variants_id_seq', 1, false);


--
-- Name: addons addons_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: combo_addons combo_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_addons
    ADD CONSTRAINT combo_addons_pkey PRIMARY KEY (id);


--
-- Name: combo_items combo_items_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_items
    ADD CONSTRAINT combo_items_pkey PRIMARY KEY (id);


--
-- Name: combo_variants combo_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combo_variants
    ADD CONSTRAINT combo_variants_pkey PRIMARY KEY (id);


--
-- Name: combos combos_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.combos
    ADD CONSTRAINT combos_pkey PRIMARY KEY (id);


--
-- Name: item_addons item_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_addons
    ADD CONSTRAINT item_addons_pkey PRIMARY KEY (id);


--
-- Name: item_availability item_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_availability
    ADD CONSTRAINT item_availability_pkey PRIMARY KEY (id);


--
-- Name: item_variants item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_variants
    ADD CONSTRAINT item_variants_pkey PRIMARY KEY (id);


--
-- Name: menu menu_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT menu_pkey PRIMARY KEY (id);


--
-- Name: menue_items menue_items_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menue_items
    ADD CONSTRAINT menue_items_pkey PRIMARY KEY (id);


--
-- Name: restaurant_accounts restaurant_accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_accounts
    ADD CONSTRAINT restaurant_accounts_email_key UNIQUE (email);


--
-- Name: restaurant_accounts restaurant_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_accounts
    ADD CONSTRAINT restaurant_accounts_pkey PRIMARY KEY (id);


--
-- Name: restaurant_addresses restaurant_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_addresses
    ADD CONSTRAINT restaurant_addresses_pkey PRIMARY KEY (id);


--
-- Name: restaurant_addresses restaurant_addresses_user_id_key; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_addresses
    ADD CONSTRAINT restaurant_addresses_user_id_key UNIQUE (user_id);


--
-- Name: restaurant_details restaurant_details_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_details
    ADD CONSTRAINT restaurant_details_pkey PRIMARY KEY (id);


--
-- Name: restaurant_details restaurant_details_user_id_key; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_details
    ADD CONSTRAINT restaurant_details_user_id_key UNIQUE (user_id);


--
-- Name: restaurant_hours restaurant_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_hours
    ADD CONSTRAINT restaurant_hours_pkey PRIMARY KEY (id);


--
-- Name: variant_options variant_options_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.variant_options
    ADD CONSTRAINT variant_options_pkey PRIMARY KEY (id);


--
-- Name: variants variants_pkey; Type: CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.variants
    ADD CONSTRAINT variants_pkey PRIMARY KEY (id);


--
-- Name: addons set_updated_add_ons; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_add_ons BEFORE UPDATE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: restaurant_accounts set_updated_at; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: restaurant_details set_updated_at; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories set_updated_at_categories; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: menu set_updated_at_mennu; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_at_mennu BEFORE UPDATE ON public.menu FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: restaurant_hours set_updated_at_restaurant_hours; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_at_restaurant_hours BEFORE UPDATE ON public.restaurant_hours FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: combo_addons set_updated_combo_addons; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_combo_addons BEFORE UPDATE ON public.combo_addons FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: combo_variants set_updated_combo_variants; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_combo_variants BEFORE UPDATE ON public.combo_variants FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: combos set_updated_combos; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_combos BEFORE UPDATE ON public.combos FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: combo_items set_updated_combos_items; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_combos_items BEFORE UPDATE ON public.combo_items FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: item_addons set_updated_item_addons; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_item_addons BEFORE UPDATE ON public.item_addons FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: item_availability set_updated_item_availability; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_item_availability BEFORE UPDATE ON public.item_availability FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: item_variants set_updated_items_variants; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_items_variants BEFORE UPDATE ON public.item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: menue_items set_updated_menue_items; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_menue_items BEFORE UPDATE ON public.menue_items FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: variant_options set_updated_variant_options; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_variant_options BEFORE UPDATE ON public.variant_options FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: variants set_updated_variants; Type: TRIGGER; Schema: public; Owner: yash
--

CREATE TRIGGER set_updated_variants BEFORE UPDATE ON public.variants FOR EACH ROW EXECUTE FUNCTION public.update_updat4edatcolumn();


--
-- Name: categories fk_categories_menu; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT fk_categories_menu FOREIGN KEY (menu_id) REFERENCES public.menu(id) ON DELETE CASCADE;


--
-- Name: menue_items fk_categories_menu; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menue_items
    ADD CONSTRAINT fk_categories_menu FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: item_availability fk_item_availabiltiy_item; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.item_availability
    ADD CONSTRAINT fk_item_availabiltiy_item FOREIGN KEY (item_id) REFERENCES public.menue_items(id) ON DELETE CASCADE;


--
-- Name: menu fk_menu_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.menu
    ADD CONSTRAINT fk_menu_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurant_accounts(id) ON DELETE CASCADE;


--
-- Name: restaurant_hours fk_restaurant_hours_restaurant; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_hours
    ADD CONSTRAINT fk_restaurant_hours_restaurant FOREIGN KEY (restaurant_id) REFERENCES public.restaurant_accounts(id) ON DELETE CASCADE;


--
-- Name: restaurant_addresses restaurant_addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_addresses
    ADD CONSTRAINT restaurant_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.restaurant_accounts(id) ON DELETE CASCADE;


--
-- Name: restaurant_details restaurant_details_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: yash
--

ALTER TABLE ONLY public.restaurant_details
    ADD CONSTRAINT restaurant_details_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.restaurant_accounts(id) ON DELETE CASCADE;

-- =============================================================================
-- BINGEBUDDY INDIAN RESTAURANTS COMPATIBLE DATA INSERTS
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. RESTAURANT ACCOUNTS (Picking up right after ID 25)
-- -----------------------------------------------------------------------------
INSERT INTO public.restaurant_accounts (id, email, reference_id, phone_number, auth_status) VALUES
(26, 'namaste@delhichat.com', 'DEL-CH101', '+919811223344', 'APPROVED'),
(27, 'order@hyderabadisun.com', 'HYD-BD202', '+919440123456', 'APPROVED'),
(28, 'veggie@mumbaitiffin.com', 'MUM-TF303', '+919220556677', 'APPROVED');

-- -----------------------------------------------------------------------------
-- 2. RESTAURANT DETAILS 
-- -----------------------------------------------------------------------------
INSERT INTO public.restaurant_details (id, user_id, name, description, pan, fassai, adhaar_card, gst) VALUES
(12, 26, 'Delhi Chaat Express', 'Authentic Chandni Chowk street food treats brought straight to your doorstep.', 'ABCDE1111A', '10022011000123', '200030004000', '07AAAAA1111A1Z1'),
(13, 27, 'The Hyderabadi Sun', 'Premium long-grain slow dum biryanis and authentic nizami charcoal kebabs.', 'BCDEF2222B', '10022044000456', '300040005000', '36BBBBB2222B1Z2'),
(14, 28, 'Mumbai Tiffin Co.', 'Pure vegetarian coastal maharashtrian delicacies and standard local street bites.', 'CDEFG3333C', '10022022000789', '400050006000', '27CCCCC3333C1Z3');

-- -----------------------------------------------------------------------------
-- 3. RESTAURANT ADDRESSES
-- -----------------------------------------------------------------------------
INSERT INTO public.restaurant_addresses (id, user_id, full_address, street, city, state, postal_code, country, latitude, longitude) VALUES
(7, 26, 'Shop 4, Connaught Place Block E, New Delhi, 110001', 'Connaught Place', 'New Delhi', 'Delhi', '110001', 'India', 28.6304, 77.2177),
(8, 27, 'Plot 88, Gachibowli IT Corridor, Hyderabad, Telangana, 500032', 'Gachibowli', 'Hyderabad', 'Telangana', '500032', 'India', 17.4401, 78.3489),
(9, 28, 'Building 12, Linking Road, Santacruz West, Mumbai, Maharashtra, 400054', 'Linking Road', 'Mumbai', 'Maharashtra', '400054', 'India', 19.0843, 72.8360);

-- -----------------------------------------------------------------------------
-- 4. RESTAURANT HOURS
-- -----------------------------------------------------------------------------
INSERT INTO public.restaurant_hours (restaurant_id, day_of_week, open_time, close_time) 
SELECT r_id, day, '09:00:00', '23:00:00'
FROM unnest(ARRAY[26, 27, 28]) r_id CROSS JOIN unnest(ARRAY[1,2,3,4,5,6,7]) day;

-- -----------------------------------------------------------------------------
-- 5. MENUS (3 distinct menus per restaurant -> 9 total)
-- -----------------------------------------------------------------------------
INSERT INTO public.menu (id, restaurant_id, name, short_desc, long_desc, is_active, available_from, available_until) VALUES
-- Delhi Chaat Express (26)
(10, 26, 'Subah Ka Nashta', 'Classic Old Delhi morning breakfast', 'Heavy rich matching traditional breakfast available early hours.', true, '08:00:00', '12:00:00'),
(11, 26, 'All-Day Street Grub', 'Our signature sweet & spicy street food items', 'Full curated lists of fresh chaat, golgappas, and light tiffin combos.', true, '12:00:00', '22:00:00'),
(12, 26, 'Late Night Mithei', 'Sweet tooth cravers matching midnight cravings.', 'Authentic pure ghee warm desserts.', true, '22:00:00', '02:00:00'),

-- The Hyderabadi Sun (27)
(13, 27, 'Royal Shahi Lunch', 'The premium royal daytime spread', 'Biryanis and rich cashew gravies engineered for fine dining.', true, '12:00:00', '16:00:00'),
(14, 27, 'Irani Chai & Evening Snacks', 'Perfect afternoon conversation matches', 'Authentic osmania biscuits paired with highly brewed milk chai.', true, '16:00:00', '19:30:00'),
(15, 27, 'Nizami Midnight Feast', 'Late-night long grain rich provisions', 'Biryani plates optimized for late hour party dynamic hunger.', true, '21:00:00', '03:00:00'),

-- Mumbai Tiffin Co. (28)
(16, 28, 'Aamchi Mumbai Breakfast', 'Quick, high-energy transit bites', 'Classic fast-moving local breakfast favorites.', true, '07:30:00', '11:30:00'),
(17, 28, 'Traditional Maharashtrian Thali', 'Full standard home-style dining profiles', 'Authentic flatbread variations with coastal regional vegetable pairings.', true, '12:00:00', '16:00:00'),
(18, 28, 'Chowpatty Sunset Bites', 'Evening beachside comfort items', 'Crisp savory puffed-rice mixtures and tangy hot snacks.', true, '16:30:00', '23:00:00');

-- -----------------------------------------------------------------------------
-- 6. CATEGORIES (Exactly 5 distinct categories mapped to each of the 9 menus)
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (id, menu_id, name, short_desc, display_order, is_active) VALUES
-- Menu 10 (Delhi Chaat Express - Breakfast)
(10, 10, 'Bedmi Poori Special', 'Crispy lentil flatbreads', 1, true),
(11, 10, 'Hot Halwas', 'Winter morning traditional sweet dishes', 2, true),
(12, 10, 'Cultured Curds', 'Spiced seasoned yogurt blends', 3, true),
(13, 10, 'Morning Brewers', 'Chai variations and thick lassi', 4, true),
(14, 10, 'Sides & Pickles', 'Tangy pairings', 5, true),

-- Menu 11 (Delhi Chaat Express - All Day)
(15, 11, 'Golgappa Junction', 'Water-filled crisp hollow shells', 1, true),
(16, 11, 'Tawa Tikki Corner', 'Shallow fried potato patties', 2, true),
(17, 11, 'Bhalla Papdi Mixes', 'Soft lentil dumplings with crisps', 3, true),
(18, 11, 'Samosa Integrations', 'Stuffed pastry treats', 4, true),
(19, 11, 'Fruity Spiced Salads', 'Fresh cut fruits with spice mixes', 5, true),

-- Menu 12 (Delhi Chaat Express - Late Night)
(20, 12, 'Warm Ghee Desserts', 'Hot syrup dripping plates', 1, true),
(21, 12, 'Chilled Dairy Rabris', 'Condensed rich reductions', 2, true),
(22, 12, 'Dry Fruit Mithai', 'Nut-loaded bites', 3, true),
(23, 12, 'Kulfi Sticks', 'Traditional sub-zero ice-creams', 4, true),
(24, 12, 'Warm Digestif Milks', 'Saffron-infused nightcaps', 5, true),

-- Menu 13 (The Hyderabadi Sun - Lunch)
(25, 13, 'Kachchi Basmati Dum', 'Raw layered slow-cooked biryanis', 1, true),
(26, 13, 'Nut-Paste Rich Curries', 'Cashew and almond based gravies', 2, true),
(27, 13, 'Tandoori Starters', 'Charcoal fires skewed proteins', 3, true),
(28, 13, 'Mirchi Ka Salan Hub', 'Spicy peanut green chilli sides', 4, true),
(29, 13, 'Shahi Table Sweets', 'Apricot and bread custards', 5, true),

-- Menu 14 (The Hyderabadi Sun - Evening)
(30, 14, 'Irani Brewers', 'Thick long-boiled special tea infusions', 1, true),
(31, 14, 'Malty Bakery Treats', 'Osmania sweet-salty cookies', 2, true),
(32, 14, 'Crispy Onion Samosas', 'Triangular mini strip-pastry crisp wraps', 3, true),
(33, 14, 'Baked Puffs', 'Flaky savory turnover pastry treats', 4, true),
(34, 14, 'Sweet Fruit Cream Bowls', 'Rich mixed heavy seasonal cream reductions', 5, true),

-- Menu 15 (The Hyderabadi Sun - Midnight)
(35, 15, 'Midnight Special Platters', 'Large format portion boxes', 1, true),
(36, 15, 'Spiced Minced Kebabs', 'Quick pan fried soft patties', 2, true),
(37, 15, 'Tawa Parantha Wraps', 'Flaky roll setups', 3, true),
(38, 15, 'Thirst Finishers', 'Aerated standard sweet items', 4, true),
(39, 15, 'Late Night Curds', 'Cooling plain raita items', 5, true),

-- Menu 16 (Mumbai Tiffin Co. - Breakfast)
(40, 16, 'Vada Pav Central', 'Spicy potato fritter slider bun pairs', 1, true),
(41, 16, 'Steamed Poha Tiffins', 'Flattened yellow savory rice flakes', 2, true),
(42, 16, 'Misal Pav Spiced Hub', 'Fiery sprouted bean broth with local farsan', 3, true),
(43, 16, 'South Bombay Toasties', 'Triple layered local street sandwiches', 4, true),
(44, 16, 'Hot Filter Coffee Churns', 'Frothy southern styled pick-me-ups', 5, true),

-- Menu 17 (Mumbai Tiffin Co. - Lunch)
(45, 17, 'Konkan Special Curries', 'Coconut and kokum based gravies', 1, true),
(46, 17, 'Lentil Amti Comforts', 'Tangy sweet-sour split pigeon peas', 2, true),
(47, 17, 'Tawa Wheat Flatbreads', 'Soft rotis smeared with handmade ghee', 3, true),
(48, 17, 'Basmati Steamed Vault', 'Long aromatic unpolished plain rice options', 4, true),
(49, 17, 'Traditional Cool Yogurt Sol', 'Pink digestif kokum-coconut extract washes', 5, true),

-- Menu 18 (Mumbai Tiffin Co. - Evening)
(50, 18, 'Chowpatty Bhel Platters', 'Puffed rice crisps with raw mango hints', 1, true),
(51, 18, 'Sev Puri Assemblies', 'Flat flour crisps with potato towers', 2, true),
(52, 18, 'Pav Bhaji Griddles', 'Mashed spiced mix vegetables with butter rolls', 3, true),
(53, 18, 'Crisp Ragda Pattice', 'White pea thick hot stew with potato cakes', 4, true),
(54, 18, 'Seasonal Mango Creams', ' Alphonso extract pulp infusions', 5, true);

-- -----------------------------------------------------------------------------
-- 7. MENUE ITEMS (Representative Items matching Indian food configurations)
-- -----------------------------------------------------------------------------
INSERT INTO public.menue_items (id, category_id, name, short_desc, base_price, is_available, is_veg, spice_level, prep_time) VALUES
-- Delhi Chaat Express Items
(11, 10, 'Asli Bedmi Poori Sabzi', 'Two crisp wheat pooris stuffed with coarse dal, served with hot spicy potato curry.', 140, true, true, 'HIGH', 12),
(12, 15, 'Classic Suji Golgappa Platter', 'Six pieces with crisp mint water, sweet tamarind pulp, and potato-chickpea fillings.', 80, true, true, 'MEDIUM', 5),
(13, 16, 'Special Desi Ghee Aloo Tikki', 'Two crispy potato cutlets slow grilled on huge iron griddles, topped with sweet yogurt.', 110, true, true, 'MEDIUM', 10),

-- The Hyderabadi Sun Items
(14, 25, 'Nizami Mutton Dum Biryani', 'Fragrant basmati rice slow-cooked with tender, spiced baby goat pieces on charcoal.', 480, true, false, 'HIGH', 25),
(15, 27, 'Smoked Chicken Reshmi Tikka', 'Boneless chicken cubes marinated in cashew paste and cream, grilled in a traditional clay pot.', 360, true, false, 'LOW', 20),
(16, 30, 'Premium Irani Chai Double Meetha', 'Rich, thick milk reduction tea brewed over hours to give an intensely sweet malty finish.', 45, true, true, 'NONE', 5),

-- Mumbai Tiffin Co. Items
(17, 40, 'Classic Goti Vada Pav', 'Golden-fried spiced potato ball placed inside a fresh bun layered with dry garlic red chutney.', 50, true, true, 'HIGH', 5),
(18, 42, 'Kolhapuri Zatka Misal Pav', 'Sprouted moth bean curry layered with spicy savory farsan mix, chopped raw onions and hot oil.', 130, true, true, 'HIGH', 10),
(19, 52, 'Amul Butter Pav Bhaji Supreme', 'Thick mashed spiced mixed vegetable curry served with a pool of hot melting butter and 2 pavs.', 190, true, true, 'MEDIUM', 15);

-- -----------------------------------------------------------------------------
-- 8. VARIANTS & VARIANT OPTIONS
-- -----------------------------------------------------------------------------
INSERT INTO public.variants (id, name, description, is_active) VALUES
(3, 'Spice Customizer', 'Select target hotness output', true),
(4, 'Sweets Add-on Profile', 'Portion size modification for sweets', true);

INSERT INTO public.variant_options (id, variant_id, name, price_modifier, display_order) VALUES
-- Spice Level Variations
(5, 3, 'Regular Desi Style', 0, 1),
(6, 3, 'Extra Fiery (Teekha)', 10, 2),
-- Dessert Customizers
(7, 4, 'Standard Serving', 0, 1),
(8, 4, 'Jumbo / Sharing Portion', 80, 2);

-- Map Variants to Created Items
INSERT INTO public.item_variants (item_id, variant_id, is_required) VALUES
(14, 3, true),  -- Mutton Biryani asks for spice variant
(18, 3, true),  -- Misal Pav asks for spice variant
(19, 3, false); -- Pav Bhaji allows custom spice variant

-- -----------------------------------------------------------------------------
-- 9. ADDONS
-- -----------------------------------------------------------------------------
INSERT INTO public.addons (id, name, description, is_active) VALUES
(5, 'Extra Soft Bun (Pav)', 'Single piece of fresh baker bun toasted lightly on hot iron griddle.', true),
(6, 'Sweet Date Tamarind Chutney', 'Extra side container filled with rich sugary matching date pulp sauce.', true),
(7, 'Creamy Whipped Raita', 'Cooling plain beaten yogurt blend seasoned with salt and roasted cumin.', true);

-- Connect Addons to Items
INSERT INTO public.item_addons (item_id, addon_id, price, is_required, max_quantity, min_quantity, display_order) VALUES
(17, 5, 15, 0, 4, 0, 1), -- Vada Pav + Extra Bun
(19, 5, 20, 0, 4, 0, 1), -- Pav Bhaji + Extra Bun
(12, 6, 10, 0, 2, 0, 1), -- Golgappa + Sweet chutney
(14, 7, 40, 0, 1, 0, 1); -- Biryani + Raita

-- -----------------------------------------------------------------------------
-- 10. SEQUENCES ADJUSTMENT (Sync values to prevent primary key conflicts)
-- -----------------------------------------------------------------------------
SELECT pg_catalog.setval('public.restaurant_accounts_id_seq', 28, true);
SELECT pg_catalog.setval('public.restaurant_details_id_seq', 14, true);
SELECT pg_catalog.setval('public.restaurant_addresses_id_seq', 9, true);
SELECT pg_catalog.setval('public.menu_id_seq', 18, true);
SELECT pg_catalog.setval('public.categories_id_seq', 54, true);
SELECT pg_catalog.setval('public.menue_items_id_seq', 19, true);
SELECT pg_catalog.setval('public.variants_id_seq', 4, true);
SELECT pg_catalog.setval('public.variant_options_id_seq', 8, true);
SELECT pg_catalog.setval('public.addons_id_seq', 7, true);

COMMIT;
-- =============================================================================