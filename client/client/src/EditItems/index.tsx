import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ItemForm from "../Components/ItemForm";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchMenu } from "../slices/menuSlice";
import { fetchCategories } from "../slices/categorySlice";
import "./index.css";

const EditItems: React.FC = () => {
  const dispatch = useAppDispatch();
  const { itemId } = useParams<{ itemId: string }>();

  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  const categories = useAppSelector((state) => state.category.categories);
  const items = useAppSelector((state) => state.items.items);

  const [loading, setLoading] = useState<boolean>(true);

  // Find the target item to edit from Redux
  const itemToEdit = items.find((item) => item.item_id === Number(itemId));

  const spiceLevel = [
    { name: "Mild", id: 1 },
    { name: "Medium", id: 2 },
    { name: "Hot", id: 3 },
  ];

  useEffect(() => {
    if (!restaurant?.id) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const requests: Promise<any>[] = [];

        if (menus.length === 0) {
          requests.push(dispatch(fetchMenu(restaurant.id)).unwrap());
        }
        if (categories.length === 0) {
          requests.push(dispatch(fetchCategories(restaurant.id)).unwrap());
        }

        await Promise.all(requests);
      } catch (error) {
        console.error("Failed to load Edit Items data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [restaurant?.id, dispatch, menus.length, categories.length]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="CreateItems-cntr">
      <h2>Edit Item</h2>
      <ItemForm
        initialData={{ spiceLevel, categories }}
        mode="edit"
        item_id={itemId ? Number(itemId) : undefined}
        editData={
          itemToEdit
            ? {
                category_id: itemToEdit.category_id,
                name: itemToEdit.item_name,
                short_desc: itemToEdit.item_short_desc,
                long_desc: itemToEdit.item_long_desc || "",
                base_price: itemToEdit.base_price,
                is_available: itemToEdit.is_available,
                is_veg: itemToEdit.is_veg,
                spice_level: itemToEdit.spice_level,
                prep_time: itemToEdit.prep_time,
                tags: null,
                img_url: null,
              }
            : undefined
        }
      />
    </div>
  );
};

export default EditItems;