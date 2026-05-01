import React from "react";
import Navbar from "../Navbar/Navbar";
import Btn from "../Components/Buttons/Button";
import HeroSectionCard from "./HeroSectionCard";
import { useNavigate } from "react-router-dom";
import "./index.css";
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const handleRegisterClick = () => {
    navigate("/login");
  };
  return (
    <div>
      <Navbar />
      <div className="Landing-Page-Hero-Section-Container">
        <div className="Landing-Page-Content">
          <div className="Hero-Section-Content-container">
            <span className="Hero-Section-Primary-Content">
              Grow Your Restaurants with Binge Buddy
            </span>
            <span className="Hero-Section-Secondary-Content">
              Partner With us
            </span>
          </div>
          <div className="Hero-Section-Btns-cntr">
            <Btn onClick={handleRegisterClick}>Register</Btn>
            <Btn variant="Secondary">Learn More</Btn>
          </div>
        </div>
        <div className="Landing-Page-Hero-Section-Card-Cntr">
          <HeroSectionCard />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
