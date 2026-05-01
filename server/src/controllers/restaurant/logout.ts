import { Request, Response } from "express";
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens";
import { redisClient } from "../../database/redis";

export const logout = async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.json({ success: true });
    try {
        const userData = Restaurant_JWT.verifyRefreshToken(refreshToken);
        await redisClient.del(`refresh:${userData.reference_id}:${userData.deviceId}`);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.json({ success: true, message: "Logged out" });
    } catch (err) {
        return res.json({ success: true });
    }

}