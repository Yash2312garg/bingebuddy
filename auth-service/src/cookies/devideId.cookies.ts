import type { Response,Request } from "express";

export class DeviceIdCookies{
    
    private static COOKIE_NAME = "deviceId";
    private static MAX_AGE = 1000 * 60 * 60 * 24 * 365 * 10; // 10 years
    
    static setDeviceIdCookie(res:Response,id:string){
        res.cookie(this.COOKIE_NAME, id, {
        maxAge: this.MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        secure: false, 
        });
    }
    static getDeviceIdCookie(req:Request){
        return req.cookies?.[this.COOKIE_NAME]
    }
    static clearDeviceIdCookie(res: Response) {
        res.clearCookie(this.COOKIE_NAME);
    }

}