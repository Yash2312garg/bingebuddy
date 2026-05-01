import { redisClient } from "../database/redis";


export class refreshTokenDao{
    static async storeToken (
        referenceId: string,
        deviceId: string,
        token: string,
    ){
        const key = `referesh:${referenceId}:${deviceId}`;
        await redisClient.set(key,token, {
            EX: 60*60*24*7, //7 days
        })

    }

    static async getToken(referenceId: string, deviceId:string){
        const key = `referesh:${referenceId}:${deviceId}`;
        return await redisClient.get(key)

    }
    static async deleteToken(referenceId:string, deviceId: string){
        const key = `referesh:${referenceId}:${deviceId}`;
        await redisClient.del(key);
    } 
}