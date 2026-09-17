import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { getRestaurantItemsData } from "../api/privateApi/getRestaurantItems.privateApi";

export interface ItemsState {
  item_id: number;
  item_name: string;
  item_short_desc: string;
  item_long_desc: string;
  base_price: number;
  is_available: boolean;
  is_veg: boolean;
  spice_level: string;
  prep_time: number;
  category_id: number;
  menu_id: number;
  item_created_at: string;
  item_updated_at: string;
}

export interface SelectedCategoryFilterInterface {
  name: string;
  id: number;
}

export interface ItemsSliceState {
  foodType: "all" | "veg" | "nonveg";
  selectedCategory: SelectedCategoryFilterInterface;
  isAvailable: boolean | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  sortBy: "price" | "updated_at";
  sortOrder: "ASC" | "DESC";
  query: string;
  items: ItemsState[];
  loading: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  error: string | null;
}

export interface ItemThunkInterface {
  restaurant_id: string;
  page?: number;
  limit?: number;
  query?: string;
  foodType?: "all" | "veg" | "nonveg";
  selectedCategory?: SelectedCategoryFilterInterface;
  isAvailable?: boolean | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sortBy?: "price" | "updated_at";
  sortOrder?: "ASC" | "DESC";
}

const initialState: ItemsSliceState = {
  foodType: "all",
  query: "",
  selectedCategory: { name: "All Categories", id: -1 },
  isAvailable: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  sortBy: "updated_at",
  sortOrder: "DESC",
  items: [],
  page: 1,
  limit: 6,
  total: 0,
  totalPages: 1,
  loading: false,
  error: null,
};

export const fetchItems = createAsyncThunk(
  "items/fetchItems",
  async (payload: ItemThunkInterface) => {
    const response = await getRestaurantItemsData(
      payload.restaurant_id,
      payload.page ?? 1,
      payload.limit ?? 6,
      payload.query,
      payload.selectedCategory,
      payload.isAvailable,
      payload.minPrice,
      payload.maxPrice,
      payload.sortBy ?? "updated_at",
      payload.sortOrder ?? "DESC"
    );
    return response;
  }
);

export const itemSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    searchQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setSelectedCatrgory: (
      state,
      action: PayloadAction<SelectedCategoryFilterInterface>
    ) => {
      state.selectedCategory = action.payload;
    },
    setFilters: (
      state,
      action: PayloadAction<{
        selectedCategory: SelectedCategoryFilterInterface;
        foodType: "all" | "veg" | "nonveg";
        isAvailable?: boolean | undefined;
        sortBy: "price" | "updated_at";
        sortOrder: "ASC" | "DESC";
        minPrice?: number | undefined;
        maxPrice?: number | undefined;
      }>
    ) => {
      state.selectedCategory = action.payload.selectedCategory;
      state.foodType = action.payload.foodType;
      state.isAvailable = action.payload.isAvailable;
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
      state.minPrice = action.payload.minPrice;
      state.maxPrice = action.payload.maxPrice;
    },
    resetFilters: (state) => {
      state.selectedCategory = { name: "All Categories", id: -1 };
      state.foodType = "all";
      state.isAvailable = undefined;
      state.minPrice = undefined;
      state.maxPrice = undefined;
      state.sortBy = "updated_at";
      state.sortOrder = "DESC";
    },
    addItem: (state, action: PayloadAction<ItemsState>) => {
      state.items.push(action.payload);
    },
    deleteItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        (item) => item.item_id !== action.payload
      );
    },
    changeItemStatusReducer: (state, action: PayloadAction<number>) => {
      state.items = state.items.map((item) =>
        item.item_id === action.payload
          ? { ...item, is_available: !item.is_available }
          : item
      );
    },
    editItemState: (state, action: PayloadAction<ItemsState>) => {
      state.items = state.items.map((item) =>
        item.item_id === action.payload.item_id ? action.payload : item
      );
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchItems.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchItems.fulfilled, (state, action) => {
      state.loading = false;
      if (action.payload) {
        state.items = action.payload.data || [];
        state.page = action.payload.pagination?.page || 1;
        state.limit = action.payload.pagination?.limit || 6;
        state.total = action.payload.pagination?.total || 0;
        state.totalPages = action.payload.pagination?.totalPages || 1;
      }
    });
    builder.addCase(fetchItems.rejected, (state) => {
      state.loading = false;
      state.error = "failed to fetch Items";
    });
  },
});

export const {
  searchQuery,
  setSelectedCatrgory,
  setFilters,
  resetFilters,
  addItem,
  changeItemStatusReducer,
  deleteItem: deleteItemReducer,
  editItemState,
} = itemSlice.actions;

export default itemSlice.reducer;