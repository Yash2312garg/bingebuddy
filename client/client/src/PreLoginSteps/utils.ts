import type { PreloginDataInterface } from "../Types/PreLoginSteps";
import { publicApi } from "../utils/api";
export const create_reference_id = async(name: string, gst:string)=>{
    const response = await publicApi.post("/restaurant/prelogin/createReferenceID",{name, gst },{withCredentials:true})

    if(response.status ===200){
        return response.data
    
    }else {
        throw new Error("Cannot create a reference ID")
    }
}


export const upload_full_data = async(restaurant_info:PreloginDataInterface)=>{

    const response = await publicApi.post("/restaurant/prelogin/addPreloginInfo",restaurant_info,{withCredentials:true})
    if(response.status ===200){
        return response.data
    }else if (response.status === 404){

    }
    else {
        throw new Error("Cannot create a reference ID")
    }


}