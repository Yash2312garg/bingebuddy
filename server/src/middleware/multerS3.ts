
import multer from "multer";
import multerS3 from "multer-s3"
import { S3 } from "../database/awsS3";




export const uploadS3 = multer({
    storage: multerS3({
        s3: S3,
        bucket: process.env.AWS_BUCKET_NAME || "asda",
        metadata: function (req, file, cb) {
            console.log(req)
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            console.log(req,file)
            cb(null, Date.now().toString())
        }
    })
})


