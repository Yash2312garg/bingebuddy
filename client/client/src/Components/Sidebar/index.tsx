import React, { useState } from "react";
import Btn from "../Buttons/Button";
import "./index.css";
import Logo from "../../assets/Logo/Logo.svg";

const OPTIONS = [
  {
    id: 0,
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    id: 1,
    name: "Menu",
    path: "/menu",
  },
  {
    id: 2,
    name: "Order History",
    path: "/order-history",
  },
  {
    id: 3,
    name: "current Order",
    path: "/current-order",
  },
];

const Header: React.FC = () => {
  return (
    <div className="Sidebar-header">
      <img src={Logo} alt="" />
      <p>Partner Dashboard</p>
    </div>
  );
};

const MenuOptions: React.FC = () => {
  return (
    <div className="Side-bar-Menu-options">
      {OPTIONS.map((option) => {
        return <span className="Side-bar-menu-option">{option.name}</span>;
      })}
    </div>
  );
};
const Sidebar: React.FC = () => {
  return (
    <div className="Side-bar-wrapper">
      <Header />
      <MenuOptions />
    </div>
  );
};

export default Sidebar;
