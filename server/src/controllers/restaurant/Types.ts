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
