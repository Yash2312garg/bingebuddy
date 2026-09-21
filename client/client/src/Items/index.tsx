import React, { useEffect, useState } from "react";
import "./index.css";
import { Input } from "../Components/Input/Input";
import Btn from "../Components/Buttons/Button";
import ItemCard from "../Components/ItemCard";
import ItemFilterModal from "../Components/ItemFilterModal";
import { changeItemsStatusUtils, deleteItemUtils } from "./utils";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { useNavigate } from "react-router-dom";
import { fetchMenu } from "../slices/menuSlice";
import { fetchCategories } from "../slices/categorySlice";
import {
  fetchItems,
  searchQuery,
  setFilters,
  resetFilters,
  type ItemsState,
  type SelectedCategoryFilterInterface,
} from "../slices/itemSlice";
import { useConfirm } from "../hooks/useConfirm";

const Items: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Redux States
  const { query, foodType, selectedCategory, isAvailable, sortBy, sortOrder, items } =
    useAppSelector((state) => state.items);
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  const categories = useAppSelector((state) => state.category.categories);

  const { confirm, ConfirmDialog } = useConfirm();

  const [categoryDropDownItems, setCategoriesDropDownItems] = useState<
    SelectedCategoryFilterInterface[]
  >([{ name: "All Categories", id: -1 }]);

  // Modal Visibility State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Sync Categories
  useEffect(() => {
    if (restaurant?.id && menus.length === 0) dispatch(fetchMenu(restaurant.id));
    if (restaurant?.id && categories.length === 0) dispatch(fetchCategories(restaurant.id));

    setCategoriesDropDownItems([{ name: "All Categories", id: -1 }, ...categories]);
  }, [restaurant?.id, menus.length, categories.length, dispatch]);

  // Fetch Items when APPLIED Redux filters update
  useEffect(() => {
    if (restaurant?.id) {
      dispatch(
        fetchItems({
          restaurant_id: restaurant.id,
          page: 1,
          limit: 6,
          query,
          foodType,
          selectedCategory,
          isAvailable,
          sortBy,
          sortOrder,
        })
      );
    }
  }, [restaurant?.id, query, selectedCategory, foodType, isAvailable, sortBy, sortOrder, dispatch]);

  // Check if any filter is active
  const isFiltered =
    selectedCategory.id !== -1 ||
    foodType !== "all" ||
    isAvailable !== undefined ||
    sortBy !== "updated_at" ||
    sortOrder !== "DESC";

  // Quick Dismiss Handlers for Active Filter Chips
  const removeCategoryFilter = () => {
    dispatch(setFilters({ selectedCategory: { name: "All Categories", id: -1 }, foodType, isAvailable, sortBy, sortOrder }));
  };

  const removeFoodTypeFilter = () => {
    dispatch(setFilters({ selectedCategory, foodType: "all", isAvailable, sortBy, sortOrder }));
  };

  const removeAvailabilityFilter = () => {
    dispatch(setFilters({ selectedCategory, foodType, isAvailable: undefined, sortBy, sortOrder }));
  };

  // Card Handlers
  const onToggleStatus = async (item: ItemsState) => {
    const ok = await confirm({
      heading: `${item.is_available ? "Deactivate" : "Activate"} Menu`,
      content: `Are you sure you want to ${item.is_available ? "deactivate" : "activate"} "${item.item_name}"?`,
      confirmLabel: item.is_available ? "Deactivate" : "Activate",
    });
    if (ok) changeItemsStatusUtils(item.item_id, !item.is_available, dispatch);
  };

  const onDeleteItem = async (item: ItemsState) => {
    try {
      const ok = await confirm({
        heading: "Delete Item",
        content: `Are you sure you want to delete "${item.item_name}"?`,
        confirmLabel: "Delete",
      });
      if (ok) await deleteItemUtils(item.item_id, dispatch);
    } catch (err) {
      console.log("Deletion cancelled:", err);
    }
  };

  const handleEdit = (item: ItemsState) => {
    navigate(`/items/${item.item_id}`);
  };

  return (
    <>
      <div className="ItemsPage-wrapper">
        <div className="ItemsPage-option-wrapper">
          {/* Search Input */}
          <Input>
            <Input.Field
              type="search"
              placeholder="Search Items...."
              value={query}
              name="query"
              onChange={(e) => dispatch(searchQuery(e.target.value))}
            />
          </Input>

          {/* Minimal Filter Button */}
          <Btn
            variant={isFiltered ? "Primary" : "Secondary"}
            size="Medium"
            onClick={() => setIsFilterModalOpen(true)}
            className="Filter-trigger-btn"
          >
            Filters
            {isFiltered && <span className="Filter-badge" />}
          </Btn>
        </div>

        {/* Removable Active Filters Bar */}
        {isFiltered && (
          <div className="ActiveFilters-bar">
            {selectedCategory.id !== -1 && (
              <span className="ActiveFilter-tag">
                {selectedCategory.name}
                <button className="ActiveFilter-tag-remove" onClick={removeCategoryFilter}>✕</button>
              </span>
            )}

            {foodType !== "all" && (
              <span className="ActiveFilter-tag">
                {foodType === "veg" ? "Veg Only" : "Non-Veg Only"}
                <button className="ActiveFilter-tag-remove" onClick={removeFoodTypeFilter}>✕</button>
              </span>
            )}

            {isAvailable !== undefined && (
              <span className="ActiveFilter-tag">
                {isAvailable ? "Available" : "Sold Out"}
                <button className="ActiveFilter-tag-remove" onClick={removeAvailabilityFilter}>✕</button>
              </span>
            )}

            <button className="ActiveFilter-clear-all" onClick={() => dispatch(resetFilters())}>
              Clear all
            </button>
          </div>
        )}

        {/* Items Grid Container */}
        <div className="ItemsPage-content-cntr">
          {items && items.length > 0 ? (
            <div className="items-grid">
              {items.map((item: ItemsState) => (
                <ItemCard
                  key={item.item_id}
                  item={item}
                  onToggleStatus={onToggleStatus}
                  onDeleteItem={onDeleteItem}
                  handleEdit={handleEdit}
                />
              ))}
            </div>
          ) : (
            <div className="NoItemFound">
              No items yet. Create your first menu item!
            </div>
          )}
        </div>
      </div>

      {/* Standalone Filter Modal */}
      <ItemFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        categories={categoryDropDownItems}
        selectedCategory={selectedCategory}
        foodType={foodType}
        isAvailable={isAvailable}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onApply={(appliedFilters) => {
          dispatch(setFilters(appliedFilters));
          setIsFilterModalOpen(false);
        }}
        onReset={() => {
          dispatch(resetFilters());
          setIsFilterModalOpen(false);
        }}
      />

      <ConfirmDialog />
    </>
  );
};

export default Items;