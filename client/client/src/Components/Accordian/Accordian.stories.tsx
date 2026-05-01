import type { Meta, StoryObj } from "@storybook/react"
import Accordian from ".";
import type { AccordianItem } from "../../Types/Accordian";

const sampleData: AccordianItem[] = [
  {
    id: "1",
    name: "dashboard",
    label: "Dashboard",
    onClick: () => console.log("Dashboard clicked"),
    children: []
  },
  {
    id: "2",
    name: "orders",
    label: "Orders",
    onClick: () => console.log("Orders clicked"),
    children: [
      {
        id: "3",
        name: "overview",
        label: "Overview",
        onClick: () => console.log("Overview clicked"),
        children: []
      },
      {
        id: "4",
        name: "nested",
        label: "Nested Level",
        onClick: () => console.log("Nested clicked"),
        children: [
          {
            id: "5",
            name: "deep",
            label: "Deep Child",
            onClick: () => console.log("Deep clicked"),
            children: []
          }
        ]
      }
    ]
  }
];

const meta:Meta<typeof Accordian> ={
    title: "Component/Accordian",
    component: Accordian
}

export default meta

type Story= StoryObj<typeof Accordian>

export const Default :Story={
args:{
    options:sampleData
}
}