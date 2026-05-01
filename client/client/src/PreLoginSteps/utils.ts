import axios from "axios";
import type { PreloginDataInterface } from "../Types/PreLoginSteps";
const base_api_url = import.meta.env.VITE_BASE_URL;


export const create_reference_id = async(name: string, gst:string)=>{
    const response = await axios.post(base_api_url+ "restaurant/createReferenceID",{name, gst },{withCredentials:true})

    if(response.status ===200){
        return response.data
    
    }else {
        throw new Error("Cannot create a reference ID")
    }
}


export const upload_full_data = async(restaurant_info:PreloginDataInterface)=>{

    const response = await axios.post(base_api_url+ "restaurant/preloginInfo",restaurant_info,{withCredentials:true})
    if(response.status ===200){
        return response.data
    }else if (response.status === 404){

    }
    else {
        throw new Error("Cannot create a reference ID")
    }


}