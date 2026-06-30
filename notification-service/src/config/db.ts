const {Pool} = require('pg');
require('dotenv').config();

const config = {
    user: process.env.POSTGRES_USER,
    host: process.env.DB_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.DB_PORT,
}
export const pool = new Pool(config);





