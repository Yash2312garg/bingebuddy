import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.AWS_S3_REGIEON) {
  throw new Error("AWS_S3_REGION is missing");
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials are missing");
}

export const S3 = new S3Client({
  region: process.env.AWS_S3_REGIEON, // ✅ FIXED
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
