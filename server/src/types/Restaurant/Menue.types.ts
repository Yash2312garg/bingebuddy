export interface MenueRequestBody{
    restaurant_id: string;
    name: string;
    short_desc: string;
    long_desc: string;
    is_active: boolean;
    available_from: string;
    available_until: string;
    rules: null|JSON;
}

export interface EditMenuBody {
    id: string;
    name: string;
    short_desc: string;
    long_desc: string;
    is_active: boolean;
    available_from: string;
    available_until: string;
    rules: null|JSON;
}

export interface CategoryRequestData{
    menu_id: string;
    name:string;
    short_desc: string;
    long_desc: string;
    display_order: string;
    is_active: boolean;
    rules:JSON;
}
export interface CategoryEditData{
    name:string;
    short_desc: string;
    long_desc: string;
    display_order: string;
    is_active: boolean;
    rules:JSON;
}
export interface MenueItemsRequestData{
    category_id: string;
    name: string;
    short_desc: string;
    long_desc: string;
    base_price: number;
    is_available: boolean;
    is_veg: boolean;
    spice_level: string;
    prep_time: number;
    tags: JSON;
    img_url: string;
}

export interface ComboRequestData{
    category_id: string;
    name: string;
    short_desc: string;
    long_desc: string;
    base_price:string;
    is_available:boolean;
    max_items: number;
    min_items: number;
}

export interface ComboItemsRequestData{
    combo_id: string; 
    item_id: string; 
    is_required: string;
    max_quantity: boolean; 
}