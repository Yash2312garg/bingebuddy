import { pool } from "../../database/db";
import { RestaurantAccountsInterface } from "../../types/Restaurant/RestaurantAccounts";

export const checkReferenceID = async (reference_id: string) => {
    const query = `
        SELECT email, reference_id, phone_number 
        FROM restaurant_accounts 
        WHERE reference_id = $1
    `;
    const values = [reference_id];

    try {
        const { rows } = await pool.query(query, values);

        if (rows.length > 0) {
            // console.log("Account found:", rows[0]);
            return rows[0]; 
        } else {
            // console.log("No account found with that reference ID.");
            return null; 
        }
    } catch (error) {
        console.error("Error executing query in checkReferenceID:", error);
    
        throw error;
    }
};

export const getAccountInformation = async(email: string):Promise<RestaurantAccountsInterface|null>=>{
    try{
        const query = `select email, reference_id, phone_number, auth_status from restaurant_accounts where email = $1`
        const values = [email]

        const {rows} = await pool.query(query,values)
        if(rows.length>0){
            return rows[0]
        }else{
            return null
        }
    }catch(err){
        console.log(err)
        throw new Error("database error")
    }

}

export const createNewRetaurantAccount = async(email:string|null, phone_number: number|null, auth_status: string|null,reference_id: string|null):Promise<string|null>=>{
    try{
        const query = `INSERT INTO restaurant_accounts (email, phone_number,reference_id, auth_status) VALUES ($1, $2, $3, $4) returning id`
        const values = [email,phone_number, reference_id,auth_status]
        console.log("createNewRetaurantAccount",values)

        const result = await pool.query(query,values)
        console.log(result)
        if(result.rows.length>0)
            return result.rows[0].id
        else{
            return null
        }
        
    }catch(err){
        console.log(err)
        throw new Error("database error")
    }   
}

