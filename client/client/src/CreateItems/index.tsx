import { useEffect, useState } from "react";
import ItemForm from "../Components/ItemForm";
import "./index.css";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { fetchMenu } from "../slices/menuSlice";
import { fetchCategories } from "../slices/categorySlice";
import { createRestaurantItems } from "../api/privateApi/getRestaurantItems.privateApi";
const CreateItems: React.FC = () => {
  const dispatch = useAppDispatch();
  const restaurant = useAppSelector((state) => state.auth.restaurant);
  const menus = useAppSelector((state) => state.menu.menus);
  const categories = useAppSelector((state) => state.category.categories);
  const [loading, setLoading] = useState<boolean>(true);

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
        console.error("Failed to load Create Items data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [restaurant?.id, dispatch, menus.length, categories.length]);
  const initialData = { spiceLevel, categories };
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {loading === false && (
        <div className="CreateItems-cntr">
          <h2>Create Items</h2>
          <ItemForm
            initialData={initialData}
            mode="create"
            item_id={undefined}
          />
        </div>
      )}
    </>
  );
};

export default CreateItems;
