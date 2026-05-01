import React from "react";
import Logo from "../assets/Logo/Logo.svg";
import Btn from "../Components/Buttons/Button";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const handleRegisterClick = () => {
    navigate("/login");
  };
  return (
    <nav className="navbar">
      <img src={Logo} alt="" />
      <div className="nav-links">
        <a>Benefits</a>
        <a>How It Works</a>
        <a> Pricing</a>
      </div>
      <div className="nav-buttons">
        <Btn onClick={handleRegisterClick} variant="Secondary">
          Login
        </Btn>
        <Btn onClick={handleRegisterClick} variant="Primary">
          Signup
        </Btn>
      </div>
    </nav>
  );
};

export default Navbar;
