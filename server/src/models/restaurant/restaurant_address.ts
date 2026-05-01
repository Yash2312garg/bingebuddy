import { pool } from "../../database/db";
import { RestaurantAddress } from "../../controllers/restaurant/Types";


export const addRestaurantAddress =async(id: string, address: RestaurantAddress)=>{
    try{
        const query = `INSERT INTO restaurant_addresses (
        user_id,full_address,street,city,state,postal_code,country,latitude, longitude) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id;`
        const values = [id, address.full_address,address.street,address.city,address.state,address.postal_code,address.country,address.latitude, address.longitude]
        const result = await pool.query(query,values)
        if(result.rows && result.rows.length>0){
            return result.rows[0].id
        }else{
            return null
        }

    }catch(err){
        console.log(err)
        throw new Error("database Error occured")
    }
}