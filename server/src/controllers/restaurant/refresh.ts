import { Request, Response } from "express"
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens"
import { redisClient } from "../../database/redis"

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });
        try {
            const userData = Restaurant_JWT.verifyRefreshToken(refreshToken)
            const storedToken = await redisClient.get(`refresh:${userData.reference_id}:${userData.deviceId}`);

            if (!storedToken || storedToken != refreshToken) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }
            const newAccessToken = Restaurant_JWT.signAccessToken({ "reference_id": userData.reference_id, "email": userData.email, "phone": userData.phone }, "15m");
            const newRefreshToken = Restaurant_JWT.signRefreshToken({ "reference_id": userData.reference_id, "email": userData.email, "phone": userData.phone }, userData.deviceId);
            await redisClient.set(`refresh:${userData.reference_id}:${userData.deviceId}`, newRefreshToken, "EX", 60 * 60 * 24 * 7);
            res.cookie("accessToken", newAccessToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 1000 * 60 * 15,
            });

            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "strict",
                maxAge: 1000 * 60 * 60 * 24 * 7,
            });
            return res.json({ success: true });
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });

        }

    } catch (err) {
        return res.status(500).json({ msg: "Internal Server Error" })
    }
}