import { Request, Response } from "express"
import { Restaurant_JWT } from "../../services/restaurant/createwebtokens"
import { refreshTokenDao } from "../../dao/refreshToken.dao"
import { AuthCookies } from "../../cookies/auth.cookies"

export const refreshToken = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });
        try {
            const userData = Restaurant_JWT.verifyRefreshToken(refreshToken)
            const storedToken = await refreshTokenDao.getToken(userData.reference_id,userData.deviceId);

            if (!storedToken || storedToken != refreshToken) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }
            //extract device id data from cookies

            const newAccessToken = Restaurant_JWT.signAccessToken({ "reference_id": userData.reference_id, "email": userData.email, "phone": userData.phone }, "15m");
            const newRefreshToken = Restaurant_JWT.signRefreshToken({ "reference_id": userData.reference_id, "email": userData.email, "phone": userData.phone,"deviceId":userData.deviceId },userData.deviceId);
            await refreshTokenDao.storeToken(userData.reference_id,userData.deviceId,newRefreshToken);
            AuthCookies.setAccessTokenCookies(res, newAccessToken)
            AuthCookies.setRefreshTokenCookies(res, newRefreshToken)
            return res.json({ success: true });
        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired refresh token" })
        }

    } catch (err) {
        return res.status(500).json({ msg: "Internal Server Error" })
    }
}