import { NextFunction, Request, Response } from "express";
import { AuthCookies } from "../cookies/auth.cookies";
import { Restaurant_JWT } from "../serivces/restaurant/createwebtokens";

export const isRestaurantAutheticated = (req:Request,res:Response,next:NextFunction)=>{
    const token =  AuthCookies.getAccessTokenCookies(req)
    console.log("token",token)
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

