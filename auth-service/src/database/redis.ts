
const {createClient} = require('redis');
require('dotenv').config();
export const redisClient = createClient({
    url: process.env.REDIS_URL
})

redisClient.on('error', (err:Error) => console.log('Redis Client Error', err));



// module.exports = redisClient