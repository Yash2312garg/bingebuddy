import { privateApi } from "../../utils/api";


export const getRestaurantInfo = async()=>{
    try{
    const response = await privateApi.get("restaurant/info/getInfo",{withCredentials: true});
    if (response.status===200){
        return response.data.restaurantData;
    }else{
        return null
    }
}
catch(e){
    throw new Error("error while fetching restaurant information")
}
    
}