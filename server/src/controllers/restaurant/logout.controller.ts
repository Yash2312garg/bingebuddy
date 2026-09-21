import { Request, Response } from "express";
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens";
import { AuthCookies } from "../../cookies/auth.cookies";
import { refreshTokenDao } from "../../dao/refreshToken.dao";

export const logout = async (req: Request, res: Response) => {
    const refreshToken = AuthCookies.getRefreshTokenCookies(req)
    if (!refreshToken) return res.json({ success: true });
    try {
        const userData = Restaurant_JWT.verifyRefreshToken(refreshToken);
        await refreshTokenDao.deleteToken(userData.reference_id,userData.deviceId);
        AuthCookies.clearAccessTokenCookies(res)
        AuthCookies.clearRefreshTokenCookies(res)
        return res.json({ success: true, message: "Logged out" });
    } catch (err) {
        return res.json({ success: true });
    }

}