import { NextFunction, Request, Response } from "express";
import { Restaurant_JWT } from "../services/restaurant/createwebtokens";
import { AuthCookies } from "../cookies/auth.cookies";


export const isRestaurantAutheticated = (req:Request,res:Response,next:NextFunction)=>{
    const token =  AuthCookies.getAccessTokenCookies(req)
    if(!token)return res.status(401).json({ msg: "Unauthorized" });
    try{
        const payload = Restaurant_JWT.verifyAccessToken(token)
        req.user  = payload;
        return next()
    }catch(err){
        console.log(err)
        return res.status(401).json({ message: "Token expired or invalid" });
    }
}

