export interface RestaurantItem {
  item_id: number;
  item_name: string;
  item_short_desc: string | null;
  item_long_desc: string | null;
  base_price: number;
  is_available: boolean;
  is_veg: boolean;
  spice_level: string | null;
  prep_time: number | null;
  item_created_at: string;
  item_updated_at: string;
  category_id: number;
  menu_id: number;

}


export interface AddRestaurantItems {
  category_id: number;
  name: string;
  short_desc: string | null;
  long_desc: string | null;
  base_price: number;
  is_available?: boolean;
  is_veg: boolean;
  spice_level: string | null;
  prep_time: number | null;
  tags: Record<string, any> | null;
  img_url: Record<string, any> | null;
}
