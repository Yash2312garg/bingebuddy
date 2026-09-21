import React, { useState } from "react";
import "./index.css";
import Logo from "../../assets/Logo/Logo.svg";
import Accordian from "../Accordian";
import type { AccordianItem, NavigationItem } from "../../Types/Accordian";


const NAVIGATION: NavigationItem[] = [

  {
    id: "home",
    label: "Home",
    path: "/home",
  },


  /* =======================================================
     Orders
     ======================================================= */

  {
    id: "orders",
    label: "Orders",

    children: [

      {
        id: "overview",
        label: "Overview",
        path: "/orders/overview",
      },

      {
        id: "new-orders",
        label: "New Orders",
        path: "/orders/new",
      },

      {
        id: "active-orders",
        label: "Active Orders",
        path: "/orders/active",
      },

      {
        id: "order-history",
        label: "Order History",
        path: "/orders/history",
      },

    ],
  },


  /* =======================================================
     Analytics
     ======================================================= */

  {
    id: "analytics",
    label: "Analytics",
    path: "/analytics",
  },


  /* =======================================================
     Menus
     ======================================================= */

  {
    id: "menus",
    label: "Menus",

    children: [
     {
        id: "menu",
        label: "Menu",
        path: "/menu",
      },
     {
        id: "categories",
        label: "Categories",
        path: "/categories",
      }, 

      {
        id: "items",
        label: "Items",
        path: "/items",
      },

      {
        id: "add-ons",
        label: "Add-ons",
        path: "/add-ons",
      },

      {
        id: "variants",
        label: "Variants",
        path: "/variants",
      },

      {
        id: "combos",
        label: "Combos",
        path: "/combos",
      },

    ],
  },


  /* =======================================================
     Settings
     ======================================================= */

  {
    id: "settings",
    label: "Settings",

    children: [

      {
        id: "general",
        label: "General",
        path: "/settings/general",
      },

      {
        id: "users",
        label: "Users",
        path: "/settings/users",
      },

      {
        id: "permissions",
        label: "Permissions",
        path: "/settings/permissions",
      },

    ],
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


const Sidebar: React.FC = () => {
  return (
    <div className="Side-bar-wrapper">
      <Header />
      <Accordian options={NAVIGATION}/>
    </div>
  );
};

export default Sidebar;
