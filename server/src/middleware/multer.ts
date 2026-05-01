import multer from 'multer';
import { Request } from 'express';

const storage = multer.diskStorage({
    destination:(req:Request,file,cb)=>{
        console.log("Request", req)
        console.log(".........................")
        console.log("file", file)

        cb(null,'uploads/')
    },
    filename: (req,file,cb)=>{
        console.log("Req in ",req)
        cb(null,Date.now()+ "_"+file.originalname)      
    },
})

export const upload = multer({storage})

