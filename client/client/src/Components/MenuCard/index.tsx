import Btn from "../Buttons/Button";
import Badge from "./Badge";
import "./index.css";
import Clock from "../../assets/Calendar/Clock.svg";
import Deactivate from "../../assets/Edit/Hide.svg";
import Edit from "../../assets/File/Note_Edit.svg";
import Activate from "../../assets/Edit/Show.svg";
import Delete from "../../assets/delete.svg";
import type { MenuState } from "../../slices/menuSlice";
import { useNavigate } from "react-router-dom";

const MenuCard: React.FC<{
  menu: MenuState;
  onDelete: () => void;      
  onDeactivate:()=>void
}> = ({ menu, onDelete,onDeactivate }) => {
  
  const navigate = useNavigate()

  return (
    <>
      <div className="MenuCard-cntr">
        <span className={`MenuCard-name ${menu.is_active ? "active" : "deactive"}`}>
          {menu.name}
        </span>
        <Badge state={menu.is_active} />
        <span className="MenuCard-cntr-desc">{menu.short_desc}</span>
        <span className="MenuCard-cntr-time">
          {" "}
          <img src={Clock} /> {menu.available_from} -{" "}
          {menu.available_until}{" "}
        </span>
        <div className="MenuCard-actn-btn-cntr">
          <Btn
            size="Medium"
            className={`MenuCard-actn-btn-deactivate ${menu.is_active ? "active" : "deactive"}`}
            onClick={onDeactivate}
          >
            <img src={menu.is_active ? Deactivate : Activate} />{" "}
            {menu.is_active ? "deactivate" : "activate"}
          </Btn>
          <Btn
            size="Medium"
            className={`MenuCard-actn-btn-edit ${menu.is_active ? "active" : "deactive"}`}
            disabled={!menu.is_active}
            onClick={() =>
              navigate(`/menu/edit/${menu.id}`)
            }
          >
            <img src={Edit} alt="" />
          </Btn>
          <Btn
            size="Medium"
            className={`MenuCard-actn-btn-delete ${menu.is_active ? "active" : "deactive"}`}
            disabled={!menu.is_active}
            onClick={onDelete}
          >
            <img src={Delete} alt="" />
          </Btn>
        </div>
      </div>
    </>
  );
};

export default MenuCard;
