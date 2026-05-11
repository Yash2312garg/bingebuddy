import { Request,Response } from "express";
import { getRestaurantinfo } from "../../models/auth/auth.model";


export const getRestaurantInformation = async(req:Request, res: Response)=>{
    try{
        const user= req.user;
         if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const userCompleteData = await getRestaurantinfo(user.reference_id);
        if(!userCompleteData){
            return res.status(503).json({ message: "Error fetching restaurant details" });
        }else{
            return res.status(200).json({message: "sucessfull", restaurantData: userCompleteData})
        }


    }catch(err){
        return res.status(500).json({ message: "Internal Server Error" });

    }
}