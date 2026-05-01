export interface UploadMetaData{

}
export interface UploadMetadata {
    [key: string]: string;
}

export interface PreSignedUploadParams{
key: string
bucketName: string
contentType:string
expiresIn : number
metadata: UploadMetadata
max_file_size: number
}

export interface PreSignedUploadResponse{
    uploadURL: string
    key: string
}
