import "./index.css";
import Btn from "../Buttons/Button";
import type { ItemsState } from "../../slices/itemSlice";
import Deactivate from "../../assets/Edit/Hide.svg";
import Edit from "../../assets/File/Note_Edit.svg";
import Activate from "../../assets/Edit/Show.svg";
import Delete from "../../assets/delete.svg";
import { useAppSelector } from "../../hooks/redux";

const ItemCard: React.FC<{
  item: ItemsState;
  onToggleStatus: (item: ItemsState) => void;
  onDeleteItem: (item: ItemsState) => void;
  handleEdit: (item: ItemsState) => void;
}> = ({ item, onToggleStatus, onDeleteItem, handleEdit }) => {
  const categories = useAppSelector((state) => state.category.categories);
  const category_name = categories.filter(
    (category) => category.id === item.category_id,
  )[0];
  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const lastUpdated = formatLastUpdated(
    item.item_updated_at || item.item_created_at,
  );
  return (
    <div className="Item-container">
      {item.is_veg ? (
        <span className="Item-type-floater veg">Veg</span>
      ) : (
        <span className="Item-type-floater non-veg">Non-Veg</span>
      )}
      <div className="Item-Image-wrpr">
        <img src="" alt="" />
      </div>
      <div className="Item-info-wrpr">
        <div className="Item-info-heading">
          <span className="item-name">{item.item_name}</span>
          <span className="item-price">Rs. {item.base_price}</span>
        </div>
        <span className="Item-infor-category">{category_name.name}</span>
        <span className="Item-shrot-desc">{item.item_short_desc}</span>
        <div className="Item-desc-wrpr">
          <span className="Item-Spice">{item.spice_level}</span>
          <span className="Item-preptime">{item.prep_time} min</span>
        </div>

        <div className="Item-footer-wrpr">
          <div className="Item-btn-wrpr">
            <Btn
              size="Small"
              className="Category-actn-btn-deactivate"
              onClick={() => onToggleStatus(item)}
            >
              <img
                width="16px"
                height="16px"
                src={item.is_available ? Deactivate : Activate}
                alt={item.is_available ? "Deactivate" : "Activate"}
              />
            </Btn>

            <Btn
              size="Small"
              className={`MenuCard-actn-btn-edit ${
                item.is_available ? "active" : "deactive"
              }`}
              disabled={!item.is_available}
              onClick={() => handleEdit(item)}
            >
              <img width="16px" height="16px" src={Edit} alt="Edit" />
            </Btn>

            <Btn
              size="Small"
              className="MenuCard-actn-btn-delete"
              disabled={!item.is_available}
              onClick={() => onDeleteItem(item)}
            >
              <img width="16px" height="16px" src={Delete} alt="Delete" />
            </Btn>
          </div>

          {/* Timestamp on the far right */}
          <span className="Item-updated-time">{lastUpdated}</span>
        </div>
      </div>
    </div>
  );
};
export default ItemCard;
