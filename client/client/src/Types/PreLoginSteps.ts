import type React from "react";

export interface StepOneProps {
  setNextSteps: () => void;
  setPrevSteps?: () => void;
  // Unified signature: covers both (e: ChangeEvent) and (value: string, type: ...)
  // Using a union caused TS2554 because TypeScript requires satisfying all overloads simultaneously.
  changeRestaurantDetails?: (
    eOrValue: React.ChangeEvent<HTMLInputElement> | string,
    type?: "logo_url" | "full_img" | "reference_id"
  ) => void;
  restaurantInfo: PreloginDataInterface;
}


export interface PreloginDataInterface{
    name: string
    description: string
    pan: string
    fassai: string
    adhaar_card:string
    gst: string
    logo_url: string
    full_img: string
    address: RestaurantAddress
    reference_id: string
}
export interface PreLoginRestaurantDetails{
    name: string
    description: string
    pan: string
    fassai: string
    adhaar_card:string
    gst: string
    logo_url: string
    full_img: string
}
export interface RestaurantAddress{
    full_address: string
    street: string
    city: string
    state: string
    postal_code:string
    country: string
    latitude:string
    longitude: string
}
