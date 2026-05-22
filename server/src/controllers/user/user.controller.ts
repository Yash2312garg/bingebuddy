import { Request,Response } from "express";
import { getRestaurantinfo } from "../../models/auth/auth.model";
import { RestaurantDao } from "../../dao/restaurant.dao";


export const getRestaurantInformation = async(req:Request, res: Response)=>{
    try{
        const user= req.user;
         if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const data_from_redis = await RestaurantDao.getRestaurantData(user.reference_id);
        console.log("data_from_redis",data_from_redis)
        if(data_from_redis){
            return res.status(200).json({message: "sucessfull", restaurantData: data_from_redis})

        }
        const userCompleteData = await getRestaurantinfo(user.reference_id);
        await RestaurantDao.saveRestaurantData(user.reference_id, userCompleteData)
        if(!userCompleteData){
            return res.status(503).json({ message: "Error fetching restaurant details" });
        }else{
            return res.status(200).json({message: "sucessfull", restaurantData: userCompleteData})
        }
    }catch(err){
        return res.status(500).json({ message: "Internal Server Error" });

    }
}

