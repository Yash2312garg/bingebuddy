import React, { useCallback, useState, useEffect } from "react";
import { StepCountHeading, ModalHeading, ModalDescription } from "./StepModal";
import StepModal from "./StepModal";
import "./StepTwo.css";
import { Input } from "../Components/Input/Input";
import Btn from "../Components/Buttons/Button";
import type { StepOneProps } from "../Types/PreLoginSteps";
import InfoIcon from "../assets/Info.svg";
import type { PreloginDataInterface } from "../Types/PreLoginSteps";
const StepTwo: React.FC<StepOneProps> = ({
  setNextSteps,
  setPrevSteps,
  changeRestaurantDetails,
  restaurantInfo,
}) => {
  
  const [errors, setError] = useState({ pan: "", fassai: "", adhaar_card:"",gst:""});
  
const validation = useCallback((info: PreloginDataInterface) => {
  const newErrors = {
    pan: "",
    fassai: "",
    adhaar_card: "",
    gst: "",
  };

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const fssaiRegex = /^[0-9]{14}$/;
  const aadhaarRegex = /^[0-9]{12}$/;
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

  if (!info.pan.trim()) {
    newErrors.pan = "PAN number is required";
  } 
  else if (!panRegex.test(info.pan.toUpperCase())) {
    newErrors.pan = "Invalid PAN format";
  }

  if (!info.fassai.trim()) {
    newErrors.fassai = "FSSAI license number is required";
  } 
  else if (!fssaiRegex.test(info.fassai)) {
    newErrors.fassai = "FSSAI must be 14 digits";
  }

  if (!info.adhaar_card.trim()) {
    newErrors.adhaar_card = "Aadhaar number is required";
  } 
  else if (!aadhaarRegex.test(info.adhaar_card)) {
    newErrors.adhaar_card = "Aadhaar must be 12 digits";
  }

  if (!info.gst.trim()) {
    newErrors.gst = "GST number is required";
  } else if (!gstRegex.test(info.gst.toUpperCase())) {
    newErrors.gst = "Invalid GST number";
  }

  setError(newErrors);
}, []);

  
  useEffect(() => {
    validation(restaurantInfo);
  }, [restaurantInfo]);
  console.log(errors)

  return (
    <>
      <StepModal>
        <StepCountHeading>Step 3 of 5</StepCountHeading>
        <ModalHeading>
          Business and Legal Information
          <ModalDescription>
            We require this information to verify your business and set up
            secure payments. Your data is encrypted and will be kept
            confidential.
          </ModalDescription>
        </ModalHeading>

        <div className="Infmtn-cntr">
          <Input>
            <Input.Label>
              Pan Number <img src={InfoIcon} alt="" />
            </Input.Label>
            <Input.Field
              type="Search"
              name="pan"
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
              value={restaurantInfo.pan}
            ></Input.Field>
          </Input>
          <Input>
            <Input.Label>
              Fassai License Number <img src={InfoIcon} alt="" />
            </Input.Label>
            <Input.Field
              type="Search"
              name="fassai"
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
              value={restaurantInfo.fassai}
            ></Input.Field>
          </Input>
          <Input>
            <Input.Label>
              Aadhar Card Number <img src={InfoIcon} alt="" />
            </Input.Label>
            <Input.Field
              type="Search"
              name="adhaar_card"
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
              value={restaurantInfo.adhaar_card}
            ></Input.Field>
          </Input>
          <Input>
            <Input.Label>
              GST Number <img src={InfoIcon} alt="" />
            </Input.Label>
            <Input.Field
              type="Search"
              name="gst"
              onChange={(e) => {
                changeRestaurantDetails && changeRestaurantDetails(e);
              }}
              value={restaurantInfo.gst}
            ></Input.Field>
          </Input>
          <div className="Btn-cntr">
            <Btn
              variant="Secondary"
              onClick={() => {
                if (setPrevSteps) setPrevSteps();
              }}
            >
              Back
            </Btn>
            <Btn
              disabled = {errors.fassai!=="" || errors.adhaar_card!=="" || errors.gst!=="" || errors.pan!==""}
              onClick={() => {
                setNextSteps();
              }}
            >
              Next
            </Btn>
          </div>
        </div>
      </StepModal>
    </>
  );
};

export default StepTwo;
