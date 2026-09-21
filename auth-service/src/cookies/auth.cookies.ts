import type { Response,Request } from "express";

export class AuthCookies {
    static setAccessTokenCookies(res:Response,token:string){
        res.cookie("accessToken", token, {
              httpOnly: true,
              secure: false,
              sameSite: "strict",
              maxAge: 1000 * 60 * 15,
        });
    }
    static setRefreshTokenCookies(res: Response, token: string) {
        res.cookie("refreshToken", token, {
              httpOnly: true,
              sameSite: "strict",
              maxAge: 1000 * 60 * 60 * 24 * 7,
        });
    }
    static getRefreshTokenCookies=(req:Request)=> req.cookies.refreshToken;
    static getAccessTokenCookies = (req:Request)=>req.cookies.accessToken
    static clearAccessTokenCookies(res:Response){
        res.clearCookie("accessToken");
    }
    static clearRefreshTokenCookies(res:Response){
        res.clearCookie("refreshToken");
    } 
}