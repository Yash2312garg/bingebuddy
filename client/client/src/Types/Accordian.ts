import type { ReactNode } from "react";

export type AccordianItem = {
  id: string;
  name: string;
  label: string;
  onClick: () => void;
  children: AccordianItem[];
};

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon?: ReactNode;
  children?: NavigationItem[];
}

export interface AccordianProps {
  options: AccordianItem[];
}
