import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { getAllMenu } from "../api/privateApi/restaurantMenu.privateApi";

export interface MenuState {
  id: number;
  available_from: string;
  available_until: string;
  is_active: boolean;
  short_desc: string;
  long_desc: string;
  rules: null | {};
  name: string;
}
interface MenuSliceState {
  menus: MenuState[];
  loading: boolean;
  error: string | null;
}

const initialState: MenuSliceState = {
  menus: [],
  loading: false,
  error: null,
};
// const restaurantData =useAppSelector((state)=>state.auth.restaurant);
export const fetchMenu = createAsyncThunk(
  "menu/fetchMenu",
  async (restaurant_id: number) => {
    const data = await getAllMenu(restaurant_id);

    return data;
  },
);

export const menuSlice = createSlice({
  name: "menu",
  initialState: initialState,
  reducers: {
    addMenu: (state, action: PayloadAction<MenuState>) => {
      state.menus.push(action.payload);
    },
    setMenu: (state, action: PayloadAction<MenuState[]>) => {
      state.menus = action.payload;
    },
    changeStatus: (state, action: PayloadAction<number>) => {
      state.menus = state.menus.map((menu) =>
        menu.id === action.payload
          ? { ...menu, is_active: !menu.is_active }
          : menu,
      );
    },
    deleteMenuState: (state, action: PayloadAction<number>) => {
      state.menus = state.menus.filter((menu)=> menu.id != action.payload)
    },
    editMenuState:(state,action:PayloadAction<MenuState>)=>{
        state.menus = state.menus.map((menu)=>(
            menu.id === action.payload.id ?action.payload
            :menu
        ));
    }

  },
  extraReducers: (builder) => {
    builder.addCase(fetchMenu.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchMenu.fulfilled, (state, action) => {
      state.loading = false;
      state.menus = action.payload;
    });
    builder.addCase(fetchMenu.rejected, (state) => {
      state.loading = false;
      state.error = "failed to fetch menu";
    });
  },
});

export const { setMenu, addMenu,changeStatus,deleteMenuState,editMenuState} = menuSlice.actions;
export default menuSlice.reducer;
