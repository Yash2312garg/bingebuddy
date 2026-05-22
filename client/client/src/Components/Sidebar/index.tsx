import React, { useState } from "react";
import "./index.css";
import Logo from "../../assets/Logo/Logo.svg";
import Accordian from "../Accordian";
import type { AccordianItem } from "../../Types/Accordian";


const DUMMY_DATA:AccordianItem[] = [
    {
        id: "1",
        name: "home",
        label:"Home",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
    {
        id: "2",
        name: "orders",
        label:"Orders",
        onClick: ()=>{console.log("clicked")},
        children:[
    {
        id: "3",
        name: "overview",
        label:"Overview",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
        {
        id: "4",
        name: "new_orders",
        label:"New Orders",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },

        {
        id: "5",
        name: "active_orders",
        label:"Active Orders",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
        {
        id: "6",
        name: "order_history",
        label:"Order History",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
        ]
    },
        {
        id: "7",
        name: "analytics",
        label:"Analytics",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
            {
        id: "8",
        name: "menu",
        label:"Menus",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
            {
        id: "9",
        name: "categories",
        label:"Categories",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
    {
        id: "10",
        name: "items",
        label:"Items",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
            {
        id: "11",
        name: "add_ons",
        label:"Add-ons",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
    {
        id: "12",
        name: "variants",
        label:"Variants",
        onClick: ()=>{},
        children:[]
    },
    {
        id: "13",
        name: "combos",
        label:"Combos",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },
    {
        id: "14",
        name: "settings",
        label:"Settings",
        onClick: ()=>{console.log("clicked")},
        children:[]
    },

]
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
      <Accordian options={DUMMY_DATA}/>
    </div>
  );
};

export default Sidebar;
