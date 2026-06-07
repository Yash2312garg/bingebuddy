
export interface CreateCategoryPayload {
    name: string;
    short_desc: string;
    long_desc: string;
    display_order: number;
    is_active: boolean;
    rules: JSON | null;
}
export interface Category {
    id: number;
    menu_id: number;
    name: string;
    short_desc: string;
    long_desc: string;
    display_order: number;
    is_active: boolean;
    rules: JSON | null;
}

export interface CategoriesState {
    categories: Category[];
    loading: boolean;
    error: string | null;
}
export interface ChangeOrderPayload {
  menu_id: number;
  category_id: number;
  initial_pos: number;
  final_pos: number;
}