
import {S3} from "../../database/awsS3";
import { PutObjectCommand,GetObjectCommand,DeleteObjectCommand,HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PreSignedUploadParams,PreSignedUploadResponse } from "./S3.types";


export class S3_Service {
    // static async uploadFile(file:MulterFile,key: string,BUCKET_NAME:string,metadata={}){
    //     const params = {
    //         Bucket: BUCKET_NAME,
    //         Key: key,
    //         Body: file.buffer,
    //         ContentType: file.mimetype,
    //         Metadata: metadata,
    //     }
    //     const command = new PutObjectCommand(params)
    //     return S3.send(command)

    // }   
    
    
    static async getSignedURL(key: string,BUCKET_NAME:string, expires =  3600,){
        const command = new GetObjectCommand({
             Bucket: BUCKET_NAME,
             Key: key,
        })
        const url = await getSignedUrl(S3,command,{expiresIn:expires})
        return url
    }

    static async generatePreSignedURL(params:PreSignedUploadParams):Promise<PreSignedUploadResponse>{
        const {
            key,
            bucketName,
            contentType,
            expiresIn = 3600,
            metadata = {},
            max_file_size = 10*1024*1024
        } = params
        console.log(max_file_size)
        const putObjectParams = {
            Bucket: bucketName,
            Key: key,
            ContentType: contentType,
            Metadata: metadata,
        }
        
        const command = new PutObjectCommand(putObjectParams)
        const uploadURL  = await getSignedUrl(S3,command,{expiresIn})
        return {uploadURL,key}

    }
    static async deleteFile(key: string,BUCKET_NAME:string){
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        })
        return await S3.send(command)
    }

    static async getFileMetadata(key: string, BUCKET_NAME:string){
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
        }
        try{    
            const command = new HeadObjectCommand(params);
            const response = await S3.send(command);
            return response
            
        }catch(err){
            console.log("error occured")
            return null
        }   
    }

    static async verifyUploadFileSync(key: string, BUCKET_NAME: string):Promise<boolean>{
        try{
            const metadata = await this.getFileMetadata(key,BUCKET_NAME)
            return metadata !== null
        }catch(e){
            console.log(e)
            return false
        }
    }
}