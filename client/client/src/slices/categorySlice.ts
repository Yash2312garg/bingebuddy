import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  CategoriesState,
  Category,
  ChangeOrderPayload,
} from "../Types/Category";
import { getAllCategories } from "../api/privateApi/restaurantCategories.privateApi";

const initialState: CategoriesState = {
  categories: [],
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk(
  "category/fetchCategory",
  async (restaurant_id: number) => {
    const data = await getAllCategories(restaurant_id);
    return data.data;
  },
);

export const categorySlice = createSlice({
  name: "category",
  initialState: initialState,
  reducers: {
    addCategory: (state: CategoriesState, action: PayloadAction<Category>) => {
      const newCategory = action.payload;

      if (newCategory.display_order === state.categories.length + 1) {
        state.categories.push(newCategory);
        return;
      }

      state.categories = state.categories.map((category) => {
        if (
          category.menu_id === newCategory.menu_id &&
          category.display_order >= newCategory.display_order
        ) {
          return {
            ...category,
            display_order: category.display_order + 1,
          };
        }

        return category;
      });

      state.categories.push(newCategory);

      state.categories.sort((a, b) => a.display_order - b.display_order);
    },

    setCategories: (
      state: CategoriesState,
      action: PayloadAction<Category[]>,
    ) => {
      state.categories = action.payload;
    },
    changeCategoryStatusReducer: (
      state: CategoriesState,
      action: PayloadAction<number>,
    ) => {
      state.categories = state.categories.map((category: Category) =>
        category.id === action.payload
          ? { ...category, is_active: !category.is_active }
          : category,
      );
    },
    deleteCategoryReducer: (
      state: CategoriesState,
      action: PayloadAction<{
        category_id: number;
        menu_id: number;
        display_order: number;
      }>,
    ) => {
      const { category_id, menu_id, display_order } = action.payload;
      state.categories = state.categories
        .filter((category) => category.id !== category_id)
        .map((category) => {
          if (
            category.menu_id === menu_id &&
            Number(category.display_order) > display_order
          ) {
            return {
              ...category,
              display_order: category.display_order - 1,
            };
          }

          return category;
        });
    },
    editCategoryState: (
      state: CategoriesState,
      action: PayloadAction<Category>,
    ) => {
      state.categories = state.categories.map((category: Category) =>
        category.id === action.payload.id ? action.payload : category,
      );
    },
    changeCategoryOrderReducer: (
      state,
      action: PayloadAction<ChangeOrderPayload>,
    ) => {
      const { menu_id, category_id, initial_pos, final_pos } = action.payload;

      const movedCategory = state.categories.find(
        (category) =>
          category.id === category_id && category.menu_id === menu_id,
      );

      if (!movedCategory) return;

      if (final_pos > initial_pos) {
        moveDown(state.categories, menu_id, initial_pos, final_pos);
      } else {
        moveUp(state.categories, menu_id, initial_pos, final_pos);
      }

      movedCategory.display_order = final_pos;

      sortCategories(state.categories);
    },
    editCategoryReducer: (
      state: CategoriesState,
      action: PayloadAction<{
        updatedCategory: Category;
        initial_order: number;
				// category_id: number
      }>,
    ) => {
      const { updatedCategory, initial_order } = action.payload;

      const final_order = updatedCategory.display_order;

      if (initial_order !== final_order) {
        if (final_order > initial_order) {
          moveDown(
            state.categories,
            updatedCategory.menu_id,
            initial_order,
            final_order,
          );
        } else {
          moveUp(
            state.categories,
            updatedCategory.menu_id,
            initial_order,
            final_order,
          );
        }
      }

      // Replace category data
      state.categories = state.categories.map((category) =>
        category.id === updatedCategory.id ? updatedCategory : category,
      );

      sortCategories(state.categories);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCategories.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(fetchCategories.fulfilled, (state, action) => {
      state.loading = false;
      state.categories = action.payload;
    });
    builder.addCase(fetchCategories.rejected, (state) => {
      state.loading = false;
      state.error = "failed to fetch menu";
    });
  },
});

const moveDown = (
  categories: Category[],
  menu_id: number,
  initial_pos: number,
  final_pos: number,
) => {
  categories.forEach((category) => {
    if (
      category.menu_id === menu_id &&
      Number(category.display_order) > initial_pos &&
      Number(category.display_order) <= final_pos
    ) {
      category.display_order = Number(category.display_order) - 1;
    }
  });
};
const moveUp = (
  categories: Category[],
  menu_id: number,
  initial_pos: number,
  final_pos: number,
) => {
  categories.forEach((category) => {
    if (
      category.menu_id === menu_id &&
      Number(category.display_order) >= final_pos &&
      Number(category.display_order) < initial_pos
    ) {
      category.display_order = Number(category.display_order) + 1;
    }
  });
};
const sortCategories = (categories: Category[]) => {
  categories.sort((a, b) => Number(a.display_order) - Number(b.display_order));
};
export const {
  addCategory,
  changeCategoryStatusReducer,
  deleteCategoryReducer,
  changeCategoryOrderReducer,
	editCategoryReducer
} = categorySlice.actions;

export default categorySlice.reducer;
