import { redisClient } from "../database/redis";

export class RestaurantDao{

    private static getRestaurantKey = (referenceId:string)=>{
        return `restaurant:${referenceId}`
    }
    static async saveRestaurantData(referenceId:string, restaurant_data: any){
        const key:string = this.getRestaurantKey(referenceId);
       return await redisClient.set(key,JSON.stringify(restaurant_data))

    }
    static async deleteRestaurantData(referenceId:string,){
        const key:string = this.getRestaurantKey(referenceId);
        return await redisClient.del(key)
    }
    static async getRestaurantData(referenceId:string){
        const key:string = this.getRestaurantKey(referenceId)
        const data = await redisClient.get(key);
        return JSON.parse(data)
    }
}