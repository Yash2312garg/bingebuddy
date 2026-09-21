import ChangeOrderButton from "../ChangeOrderButton";
import "./index.css";
import Badge from "../MenuCard/Badge";
import Btn from "../Buttons/Button";
import Deactivate from "../../assets/Edit/Hide.svg";
import Edit from "../../assets/File/Note_Edit.svg";
import Activate from "../../assets/Edit/Show.svg";
import Delete from "../../assets/delete.svg";
import type { Category } from "../../Types/Category";


interface CategoryRibbonProps {
  category: Category;

  onMoveUp: (category: Category) => void;
  onMoveDown: (category: Category) => void;

  onToggleStatus: (category: Category) => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  disableUp: boolean;
  disableDown: boolean;
}
const CategoryRibbon: React.FC<CategoryRibbonProps> = ({ category,
  onMoveUp,
  onMoveDown,
  onToggleStatus,
  onDelete,
  onEdit,disableUp,disableDown}) => {


  return (
    <div className="CategoryRibbon-cntr">
      <ChangeOrderButton
       onClickup={() => onMoveUp(category)}
        onClickdown={() => onMoveDown(category)}
        disableUp={disableUp}
        disableDown = {disableDown}
/>
      <div className="CategoryRibbon-content-cntr">
        <div className="CategoryRibbon-heading">
          <span className="CategoryRibbon-ordr">#{category.display_order}</span>
          <span className="CategoryRibbon-title">{category.name}</span>
          <Badge state={category.is_active} />
        </div>
        <span className="CategoryRibbon-desc">{category.short_desc}</span>
      </div>
      <div className="CategoryRibbon-actnbtn-wrapper">
        <Btn
          size="Small"
          className={`Category-actn-btn-deactivate`}
           onClick={() => onToggleStatus(category)}
        >
          <img width = "16px" height= "16px" src={category.is_active ? Deactivate : Activate} />{" "}
        </Btn>
        <Btn
          size="Small"
          className={`MenuCard-actn-btn-edit ${category.is_active ? "active" : "deactive"}`}
          disabled={!category.is_active}
           onClick={() => onEdit(category)}
        >
          <img width = "16px" height= "16px" src={Edit} alt="" />
        </Btn>
        <Btn
          size="Small"
          className={`MenuCard-actn-btn-delete`}
          disabled={!category.is_active}
         onClick={() => onDelete(category)}
        >
          <img width = "16px" height= "16px" src={Delete} alt="" />
        </Btn>
      </div>
    </div>
  );
};

export default CategoryRibbon;
