import React, {  useState } from "react";
import type { AccordianItem,AccordianProps } from "../../Types/Accordian";
import "./index.css"
// const DUMMY_DATA:AccordianItem[] = [
//     {
//         id: "1",
//         name: "dashbaoard",
//         label:"Dashboard",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//         {
//         id: "2",
//         name: "orders",
//         label:"Orders",
//         onClick: ()=>{console.log("clicked")},
//         children:[
//     {
//         id: "3",
//         name: "overview",
//         label:"Overview",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//         {
//         id: "4",
//         name: "new_orders",
//         label:"New Orders",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },

//         {
//         id: "5",
//         name: "active_orders",
//         label:"Active Orders",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//         {
//         id: "6",
//         name: "order_history",
//         label:"Order History",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//         ]
//     },
//         {
//         id: "7",
//         name: "analytics",
//         label:"Analytics",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//             {
//         id: "8",
//         name: "menus",
//         label:"Menus",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//             {
//         id: "9",
//         name: "categories",
//         label:"Categories",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//     {
//         id: "10",
//         name: "items",
//         label:"Items",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//             {
//         id: "11",
//         name: "add_ons",
//         label:"Add-ons",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//     {
//         id: "12",
//         name: "variants",
//         label:"Variants",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//     {
//         id: "13",
//         name: "combos",
//         label:"Combos",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },
//     {
//         id: "14",
//         name: "settings",
//         label:"Settings",
//         onClick: ()=>{console.log("clicked")},
//         children:[]
//     },

// ]

const Accordian: React.FC<AccordianProps> = ({ options }) => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  return (
    <div className="accordian-cntr">
      {options.map((item) => (
        <div key={item.id}  className="according-item-wrpr">
          <div
            className="according-item-cntr"
            onClick={() => {
              toggleItem(item.id)
              item.onClick()
            }}
          >
            {item.label}
          </div>

          {item.children.length > 0 && openItems[item.id] && (
            <Accordian options={item.children} />
          )}

        </div>
      ))}
    </div>
  )
}


export default Accordian