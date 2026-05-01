import { pool } from "../../database/db"
import { PreLoginRestaurantDetails } from "../../controllers/restaurant/Types"
export const addRestaurantdata = async (id: string, data: PreLoginRestaurantDetails): Promise<string | null> => {
    const query = `INSERT INTO restaurant_details (user_id, name, description,pan, fassai, adhaar_card, gst) VALUES(
    $1,$2,$3,$4,$5,$6,$7 
) RETURNING *`
    const values = [id, data.name, data.description, data.pan, data.fassai, data.adhaar_card, data.gst]
    const result = await pool.query(query, values)
    if (result.rows && result.rows.length > 0) {
        return result.rows[0].id
    }
    return null
}