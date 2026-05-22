import express from 'express';
import type { Response, Request } from 'express';
import { pool } from './database/db';
import { redisClient } from './database/redis';
import { RestaurantLoginSession } from './sessions/RestaurantLoginSession';
import restaurantPreLoginRoutes from "./routes/restaurant/prelogin.routes"; 
import restaurantMenuRoutes from "./routes/restaurant/menu.routes";
import restaurantAuthRoutes from "./routes/auth/auth.routes";
import restaurantInfoRoutes from "./routes/restaurant/restaurant.routes"
import cookieParser from 'cookie-parser';
import 'dotenv/config'; 
import "./types/express-session"
import helmet from 'helmet';
import cors from "cors"

const app = express();


app.use(RestaurantLoginSession)
app.use(express.json())
app.use(cookieParser())
app.use(helmet())
app.use( cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
)

app.use("/restaurant/prelogin",restaurantPreLoginRoutes);
app.use("/restaurant/menu",restaurantMenuRoutes);
app.use("/auth", restaurantAuthRoutes)
app.use("/restaurant/info",restaurantInfoRoutes) 


app.get('/', (_req: Request, res:Response) => {
    res.status(200).json('Hello World!');
});



const startServer = async ()=>{
    try{
    await redisClient.connect()
    console.log('Connected to Redis successfully.');
    const Client = await pool.connect();
    console.log('Connected to pg, succesfully')
    Client.release()
    app.listen(process.env.PORT||3000,()=>{
    console.log('Server is running on port ',process.env.PORT||3000);
})

    }catch(e){
        console.error('Failed to start the server:', e);
        process.exit(1);
    }

}


startServer()