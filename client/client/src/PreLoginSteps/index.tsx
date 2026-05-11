import "./index.css";
import React, { useState,useEffect } from "react";
import Navbar from "../Navbar/Navbar";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import type { PreloginDataInterface } from "../Types/PreLoginSteps";
import { checkpreloginSession } from "../api/publicApi/verifyotp.publicApi";
import { useNavigate } from "react-router-dom";
const PreLoginSteps: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [restaurantInfo, setResturantInfo] = useState<PreloginDataInterface>({
    name: "",
    description: "",
    pan: "",
    fassai: "",
    adhaar_card: "",
    gst: "",
    logo_url: "",
    full_img: "",
    address: {
      full_address: "",
      street: "",
      city: "",
      state: "",
      postal_code: "",
      country: "India",
      latitude: "0000000",
      longitude: "0000000",
    },
    reference_id: ""
  });

const navigate = useNavigate();

const changeRestaurantDetails = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  if (name.startsWith("address.")) {
    const field = name.split(".")[1];
    setResturantInfo({
      ...restaurantInfo,
      address: {
        ...restaurantInfo.address,
        [field]: value,
      },
    });
  } else {
    setResturantInfo({
      ...restaurantInfo,
      [name]: value,
    });
  }
};

const setLogoAndRefeInformation = (value: string, type:"logo_url"|"full_img"|"reference_id" )=>{
  setResturantInfo({
    ...restaurantInfo,
    [type]: value
  })

}

  useEffect(()=>{
    const checkSession = async()=>{
        try{
          const checkSession = await checkpreloginSession()
        if (!checkSession.isActive){
           navigate("/login")
        }
        }catch(e){
          navigate("/login")
        }     
    }
    checkSession()
  },[])




  function setNextStep() {
    console.log(step);
    setStep((prev) => prev + 1);
  }

  function setPrevStep() {
    setStep((prev) => prev - 1);
  }

  function GetStep() {
    switch (step) {
      case 1:
        return <StepOne setNextSteps={setNextStep} changeRestaurantDetails = {changeRestaurantDetails} restaurantInfo = {restaurantInfo}/>;
      case 2:
        return (
          <StepTwo setNextSteps={setNextStep} setPrevSteps={setPrevStep} changeRestaurantDetails = {changeRestaurantDetails}  restaurantInfo = {restaurantInfo}/>
        );

      case 3:
        return (
          <StepThree setNextSteps={setNextStep} setPrevSteps={setPrevStep} changeRestaurantDetails = {changeRestaurantDetails}  restaurantInfo = {restaurantInfo}/>
        );
      case 4:
        return (
          <StepFour setNextSteps={setNextStep} setPrevSteps={setPrevStep} changeRestaurantDetails = {setLogoAndRefeInformation}  restaurantInfo = {restaurantInfo}/>
        );
    }
  }
  return (
    <>
      <Navbar />
      <div className="PreLoginSteps-cntr">{GetStep()}</div>
    </>
  );
};

export default PreLoginSteps;
