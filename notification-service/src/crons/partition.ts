import cron from 'node-cron';
import { pool } from '../config/db';

// Run at 00:00 on the 25th of every month
cron.schedule('0 0 25 * *', async () => {
    try {
        await pool.query('SELECT create_next_month_partition();');
        console.log('✅ Next month\'s partition is ready.');
    } catch (error) {
        console.error('❌ Failed to create partition:', error);
    }
});