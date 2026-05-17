import React, { useEffect, useState } from "react";
import { StepCountHeading, ModalHeading } from "./StepModal";
import StepModal from "./StepModal";
import "./StepOne.css";
import { Input } from "../Components/Input/Input";
import Btn from "../Components/Buttons/Button";
import { useNavigate } from "react-router-dom";
import type { StepOneProps } from "../Types/PreLoginSteps";
import { useCallback } from "react";
import type { PreloginDataInterface } from "../Types/PreLoginSteps";

const StepOne: React.FC<StepOneProps> = ({
  setNextSteps,
  changeRestaurantDetails,
  restaurantInfo,
}) => {
  const navigate = useNavigate();
  const [errors, setError] = useState({ name: "", description: "" });
  const validation = useCallback((info: PreloginDataInterface) => {
    const newErrors = {
      name: "",
      description: "",
    };

    if (!info.name.trim()) {
      newErrors.name = "Name is empty";
    }

    if (!info.description.trim()) {
      newErrors.description = "Description is empty";
    }

    setError(newErrors);
    return newErrors;
  }, []);
  // console.log(errors)
  useEffect(() => {
    validation(restaurantInfo);
  }, [restaurantInfo]);

  return (
    <>
      <StepModal>
        <StepCountHeading>Step 2 of 5</StepCountHeading>
        <ModalHeading>Tell Us About Your Restaurant</ModalHeading>
        <div className="Infmtn-cntr">
          <Input>
            <Input.Label>Name</Input.Label>
            <Input.Field
              type="Search"
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
              value={restaurantInfo.name}
              placeholder="e.g. The Golden Spoon"
              name="name"
            ></Input.Field>
          </Input>
          <Input>
            <Input.Label>Description</Input.Label>
            <Input.Field
              type="Search"
              placeholder="e.g. A Cozy Cafe serving hot italian...."
              name="description"
              value={restaurantInfo.description}
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
            ></Input.Field>
          </Input>
          <div className="Btn-cntr">
            <Btn variant="Secondary" onClick={() => navigate("/login")}>
              Back
            </Btn>
            <Btn
              onClick={() => {
                setNextSteps();
              }}
              disabled={errors.description !== "" || errors.name !== ""}
            >
              Next
            </Btn>
          </div>
        </div>
      </StepModal>
    </>
  );
};

export default StepOne;
