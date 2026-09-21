import Btn from "../Buttons/Button";
import "./index.css";
import Up from "../../assets/Arrow/Arrow_Up_SM.svg";
import Down from "../../assets/Arrow/Arrow_Down_SM.svg";

const ChangeOrderButton: React.FC<{
  onClickup?: () => void;
  onClickdown?: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
}> = ({ onClickup, onClickdown,disableUp,disableDown }) => {
  return (
    <div className="ChangeOrderButton-wrpr">
      <Btn
        variant="Tertiary"
        onClick={onClickup}
        className="ChangeOrderButton-btn"
        size="Small"
        disabled = {disableUp}
      >
        <img src={Up} width="18px" alt="" />
      </Btn>
      <Btn
        variant="Tertiary"
        onClick={onClickdown}
        className="ChangeOrderButton-btn"
        size="Small"
        disabled = {disableDown}

      >
        <img src={Down} width="18px" alt="" />
      </Btn>
    </div>
  );
};

export default ChangeOrderButton;
