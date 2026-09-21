import { pool } from "../../database/db"


export const getRestaurantinfo = async(referenceId:string)=>{
    try{
        const query = `select * from restaurant_accounts where reference_id = $1`
        const values = [referenceId]

        const {rows} = await pool.query(query,values);
        if (rows.length>0){
            return rows[0]
        }else{return null}
    }catch(err){
        console.error("Error executing query in checkReferenceID:", err);
        throw err;
    }
}