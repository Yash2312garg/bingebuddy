import { redisClient } from "../database/redis";

export class OtpDao{
    static getOTPKey = (identifier: string): string => `otp:${identifier}`;

    static getAttemptsKey = (identifier: string): string => `otp:attempts:${identifier}`;

    static getCooldownKey = (identifier: string): string => `otp:cooldown:${identifier}`;


    static async checkCoolDown(identifier:string){
        return await redisClient.exists(this.getCooldownKey(identifier))
    }

    static async getCoolDownTTL(identifier:string){
        return await redisClient.ttl(this.getCooldownKey(identifier))
    }

    static async storeOTP(hashed_otp:string, identifier:string, ttl: number, max_attempts:number, cooldown: number){
        const multi = redisClient.multi();
        multi.setEx(this.getOTPKey(identifier), ttl, hashed_otp)
        multi.setEx(this.getAttemptsKey(identifier), ttl, max_attempts.toString())
        multi.setEx(this.getCooldownKey(identifier), cooldown,"1");

        await multi.exec();
    }

    static async getOtpTTL(identifier: string){
        return await redisClient.ttl(this.getOTPKey(identifier))
    }
    static async getOTP(identifier: string){
        return await redisClient.get(this.getOTPKey(identifier))
    }

    static async getRemainingAttempts(identifier:string){
        return await redisClient.get(this.getAttemptsKey(identifier))
    }

    static async decrement_attempt(identifier:string){
        return await redisClient.decr(this.getAttemptsKey(identifier))
    }
    static async deleteCooldown(identifier:string){
        await redisClient.del(this.getCooldownKey(identifier));
         
    }
    static async deleteHashedOtp(identifier:string){
        await redisClient.del(this.getOTPKey(identifier))
    }
    static async deleteAttempts(identifier:string){
        await redisClient.del(this.getAttemptsKey(identifier))
    }
    static async clearAll(identifier: string): Promise<void> {
        Promise.all([
            redisClient.del(this.getOTPKey(identifier)),
            redisClient.del(this.getAttemptsKey(identifier)),
            redisClient.del(this.getCooldownKey(identifier)),
        ])
    }
}
