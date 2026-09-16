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
  foodType: string;
  selectedCategory: SelectedCategoryFilterInterface;
  query: string;
  items: ItemsState[];
  loading: boolean;
  page: number;
  limit: number;
  error: string | null;
}

export interface ItemThunkInterface {
  foodType: string;
  restaurant_id: string;
  selectedCategory: SelectedCategoryFilterInterface;
  page: number;
  limit: number;
  query: string;
}

const initialState: ItemsSliceState = {
  foodType: "all",
  query: "",
  selectedCategory: { name: "All Categories", id: -1 },
  items: [],
  page: 0,
  limit: 3,
  loading: false,
  error: null,
};
export const fetchItems = createAsyncThunk(
  "items/fetchItems",
  async (payload: ItemThunkInterface) => {
    const data = await getRestaurantItemsData(
      payload.restaurant_id,
      payload.page,
      payload.limit,
      payload.query,
      payload.selectedCategory,
    );
    return data;
  },
);

export const itemSlice = createSlice({
  name: "items",
  initialState: initialState,
  reducers: {
    searchQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setSelectedCatrgory: (state, action: PayloadAction<any>) => {
      state.selectedCategory = action.payload;
    },
    addItem: (state, action: PayloadAction<ItemsState>) => {
          state.items.push(action.payload);
        },
    deleteItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(
        (item) => item.item_id !== action.payload,
      );
    },
    changeItemStatusReducer: (state, action: PayloadAction<number>) => {
      state.items = state.items.map((item) =>
        item.item_id === action.payload
          ? { ...item, is_available: !item.is_available }
          : item,
      );
    },
    editItemState:(state,action:PayloadAction<ItemsState>)=>{
        state.items = state.items.map((item)=>(
            item.item_id === action.payload.item_id ?action.payload
            :item
        ));
    }
  },
  extraReducers: (builder) => {
    builder.addCase(fetchItems.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchItems.fulfilled, (state, action) => {
      state.loading = false;
      state.items = action.payload.data;
    });
    builder.addCase(fetchItems.rejected, (state) => {
      state.loading = false;
      state.error = "failed to fetch Items";
    });
  },
});

export const { searchQuery, setSelectedCatrgory,addItem,changeItemStatusReducer ,deleteItem: deleteItemReducer,} = itemSlice.actions;
export default itemSlice.reducer;
