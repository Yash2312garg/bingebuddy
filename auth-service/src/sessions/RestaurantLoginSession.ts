import session  from "express-session";
import { redisClient } from "../database/redis";
import { RedisStore } from "connect-redis";


export const RestaurantLoginSession = session({
    store: new RedisStore({client : redisClient}),
    secret : process.env.SESSION_SECRET || "your-super-secret-session-key-change-this-in-production",
    resave: false,
    saveUninitialized: false,
    name: 'otp.sid', 
    cookie: {
    secure: false, 
    httpOnly: true, 
    maxAge: 1000 * 60 * 15, 
    sameSite: 'lax' 
  }
})
