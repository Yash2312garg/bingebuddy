import { pool } from "../config/db";
import { Notification_Templates_ENUM } from "../types/notificationTemplate.types";

export class notification_templates{

    static async getTemplate(template_code: Notification_Templates_ENUM){
        const query = `select template_code, channel, subject, body_content from  notification_templates where template_code = $1`;
        const values  = [template_code]
        const result = await pool.query(query,values)
        if (result.rows && result.rowCount>0){
            return result.rows[0];
        }
        throw new Error(`database error: not able to find aby data in the template table for the code:${template_code}`)
    }
}