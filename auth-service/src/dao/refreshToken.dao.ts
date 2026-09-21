import { redisClient } from "../database/redis";


export class refreshTokenDao{
    static getRefreshTokenKey(referenceId: string,
        deviceId: string,){
        return `refresh:${referenceId}:${deviceId}`
    }
    static async storeToken (
        referenceId: string,
        deviceId: string,
        token: string,
    ){  
        await redisClient.set(this.getRefreshTokenKey(referenceId,deviceId),token, {
            EX: 60*60*24*7, //7 days
        })

    }

    static async getToken(referenceId: string, deviceId:string){
        return await redisClient.get(this.getRefreshTokenKey(referenceId,deviceId))

    }
    static async deleteToken(referenceId:string, deviceId: string){
        await redisClient.del(this.getRefreshTokenKey(referenceId,deviceId));
    } 
}