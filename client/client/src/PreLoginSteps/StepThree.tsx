import React from "react";
import { StepCountHeading, ModalHeading } from "./StepModal";
import StepModal from "./StepModal";
import "./StepThree.css";
import { Input } from "../Components/Input/Input";
import Btn from "../Components/Buttons/Button";
import type { StepOneProps } from "../Types/PreLoginSteps";
import InfoIcon from "../assets/Info.svg";
import MapImage from "../assets/map.png";
import { useState,useCallback,useEffect } from "react";
import type { RestaurantAddress } from "../Types/PreLoginSteps";
const StepThree: React.FC<StepOneProps> = ({
  setNextSteps,
  setPrevSteps,
  changeRestaurantDetails,
  restaurantInfo,
}) => {


  const [errors, setError] = useState({ full_address: "", street: "", city:"",state:"",postal_code :"", country:"",latitude:"",longitude:""});
    
  const validation = useCallback((info: RestaurantAddress) => {
    const newErrors = { full_address: "", street: "", city:"",state:"",postal_code:"",country:"",latitude:"",longitude:""}
  
      if (!info.full_address.trim()) {
        newErrors.full_address = "Full Address is Empty";
      }
      if (!info.street.trim()) {
        newErrors.street = "Street is empty";
      }
      if (!info.city.trim()) {
        newErrors.city = "City is empty";
      }
      if (!info.state.trim()) {
        newErrors.state = "State is empty";
      }
      if (!info.postal_code.trim()) {
        newErrors.postal_code = "postal code is empty";
      }
      if (!info.latitude.trim()) {
        newErrors.latitude = "Latitude is empty";
      }
      if (!info.longitude.trim()) {
        newErrors.longitude = "longitude is empty";
      }
      setError(newErrors);
    }, []);
    
    useEffect(() => {
      validation(restaurantInfo.address);
    }, [restaurantInfo]);

    
  return (
    <>
      <StepModal additionalClass="step-modal-new-width">
        <StepCountHeading>Step 4 of 5</StepCountHeading>
        <ModalHeading>Restaurant Address and Location</ModalHeading>

        <div className="Infmtn-cntr-step3">
          <div className="Infmtn-cntr-step3-left">
            <Input>
              <Input.Label>
                Address <img src={InfoIcon} alt="" />
              </Input.Label>
              <Input.Field
                type="Search"
                placeholder="Find on Map?"
                name="address.full_address"
                onChange={(e) => {
                  changeRestaurantDetails && changeRestaurantDetails(e);
                }}
                value={restaurantInfo.address.full_address}
              ></Input.Field>
            </Input>
            <div>
              <img src={MapImage} alt="" />
            </div>
          </div>
          <div className="Infmtn-cntr-step3-right">
            <Input>
              <Input.Label>
                Street <img src={InfoIcon} alt="" />
              </Input.Label>
              <Input.Field
                type="Search"
                name="address.street"
                onChange={(e) => {
                  changeRestaurantDetails && changeRestaurantDetails(e);
                }}
                value={restaurantInfo.address.street}
              ></Input.Field>
            </Input>
            <div className="Infmtn-cntr-step3-right-new">
              <Input>
                <Input.Label>
                  City <img src={InfoIcon} alt="" />
                </Input.Label>
                <Input.Field type="Search"
                name="address.city"
                onChange={(e) => {
                  changeRestaurantDetails && changeRestaurantDetails(e);
                }}
                value={restaurantInfo.address.city}
                ></Input.Field>
              </Input>
              <Input>
                <Input.Label>
                  State <img src={InfoIcon} alt="" />
                </Input.Label>
                <Input.Field type="Search"
                name="address.state"
                onChange={(e) => {
                  changeRestaurantDetails && changeRestaurantDetails(e);
                }}
                value={restaurantInfo.address.state}
                ></Input.Field>
              </Input>
            </div>
            <Input>
              <Input.Label>
                Postal Code <img src={InfoIcon} alt="" />
              </Input.Label>
              <Input.Field type="Search"
              name="address.postal_code"
                onChange={(e) => {
                  changeRestaurantDetails && changeRestaurantDetails(e);
                }}
                value={restaurantInfo.address.postal_code}
              ></Input.Field>
            </Input>
          </div>
        </div>

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
          disabled = {errors.state!=="" || errors.street!=="" || errors.full_address!=="" || errors.postal_code!=="" || errors.country!=="" || errors.city !== "" || errors.latitude!=="" ||errors.longitude!=="" }
          onClick={() => setNextSteps()}>Next</Btn>
        </div>
      </StepModal>
    </>
  );
};

export default StepThree;
