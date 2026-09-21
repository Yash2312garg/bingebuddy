import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_S3_REGION || process.env.AWS_S3_REGIEON || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "dummy-access-key";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "dummy-secret-key";

export const S3 = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});
