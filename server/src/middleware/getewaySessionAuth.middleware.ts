import { Request,Response,NextFunction } from "express";


export const requireGatewaySessionAuth = (req:Request,res:Response, next:NextFunction)=>{

    const identifier = req.headers['x-session-identifier'] as string;
    const type = req.headers['x-session-type'] as string;
    const generatedAt = req.headers['x-session-generated-at'] as string;

    if (!identifier || !type ){
        return res.status(401).json({"msg":"Unauthorized: Missing session headers from Gateway"})
    }
    req.gatewaySession = {
    identifier: identifier,
    type: type,
    ...(generatedAt && { generatedAt: parseInt(generatedAt, 10) })
  };
  return next();

}