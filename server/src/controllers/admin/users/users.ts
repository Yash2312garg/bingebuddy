import { Request,Response } from "express"

export const createUser = (req:Request,res:Response)=>{
    try{
        console.log(req,res)
        return res.status(200).json({message: "under development"})
    }catch(e){
        console.log(e)
        return res.status(400).json({"msg":"internal server Error"})
    }   
}