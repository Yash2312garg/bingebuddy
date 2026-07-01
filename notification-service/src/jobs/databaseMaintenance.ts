import cron from "node-cron";
import { pool } from "../config/db";

export class DatabaseMaintainenceJobs{
    static start(){
        cron.schedule("0 3 * * *",async ()=>{
            try{
                const query = `
                DELETE FROM in_app_notifications 
          WHERE created_at < NOW() - INTERVAL '60 days';
                `
            const result = await pool.query(query);

            }catch(e){
                console.error("❌ [Cron] Failed to clean up in-app notifications:", e);
            }
        })
        cron.schedule("0 4 25 * *", async () => {
      console.log("🏗️  [Cron] Creating next month's delivery log partition...");
      try {
        // We use a PostgreSQL 'DO' block to calculate the next month dynamically
        // entirely inside the database engine.
        const query = `
          DO $$
          DECLARE
              next_month DATE := date_trunc('month', CURRENT_DATE + INTERVAL '1 month');
              month_after DATE := next_month + INTERVAL '1 month';
              table_name TEXT := 'logs_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
          BEGIN
              EXECUTE format(
                  'CREATE TABLE IF NOT EXISTS %I PARTITION OF notification_delivery_logs FOR VALUES FROM (%L) TO (%L)',
                  table_name, next_month, month_after
              );
          END $$;
        `;
        await pool.query(query);
        console.log(`✅ [Cron] Partition creation check complete.`);
      } catch (error) {
        console.error("❌ [Cron] Failed to create partition:", error);
      }
    });
    }
}