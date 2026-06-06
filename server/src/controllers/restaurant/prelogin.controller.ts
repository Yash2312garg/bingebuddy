import { Request, Response } from "express";
// import { PreloginDataInterface } from "./Types";
import { createNewRetaurantAccount } from "../../models/restaurant/restaurant_accounts.model";
import { addRestaurantdata } from "../../models/restaurant/restaurant_details.model";
import { addRestaurantAddress } from "../../models/restaurant/restaurant_address.model";
import { S3_Service } from "../../services/S3/s3";
import { RestaurantFileKey } from "../../services/S3/restaurantFileKeyGenerator";
import { create_reference_id } from "../../utils/generateRefernceId";

const BUCKET_NAME = process.env.AWS_BUCKET_NAME!;

export const preLoginInfo = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    let email: string | null = null;
    let phone_number: string | null = null;
    if (!req.session.otpIdentifier || !req.session.identifierType) {
      return res.status(404).json({ msg: "session expired" });
    }
    const identifierType = req.session.identifierType;

    if (identifierType === "email") {
      email = req.session.otpIdentifier;
    } else if (identifierType === "phone") {
      phone_number = req.session.otpIdentifier;
    } else if (identifierType ==="referene_id"){

    }
    const phone = phone_number ? parseInt(phone_number) : null;
    const restaurant_id = await createNewRetaurantAccount(
      email,
      phone || null,
      "PENDING",
      data.reference_id
    );
    const { address, ...datawithoutaddress } = data;

    if (restaurant_id) {
      const restaurant_data_id = await addRestaurantdata(
        restaurant_id,
        datawithoutaddress
      );
      const restaurant_address_id = await addRestaurantAddress(
        restaurant_id,
        address
      );
      // const
      console.log(restaurant_data_id, restaurant_address_id);
    }
    return res.status(200).json({ msg: "user Restaurant Created" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ msg: "internal server Error" });
  }
};

export const prelogin_presignedUploadURL = async (
  req: Request,
  res: Response
) => {
  try {
    const { state, city, reference_id, contentType, type } = req.body;
    console.log({ state, city, reference_id, contentType, type })
    if (!state || !city || !reference_id || !contentType || !type) {
      return res.status(400).json({ message: "Invalid Payload" });
    }
    let key;
    if (type === "Restaurant_Full_Image") {
      key = RestaurantFileKey.createFullImageKey(state, city, reference_id);
    } else if (type === "Restaurant_Logo_Image") {
      key = RestaurantFileKey.createLogoKey(state, city, reference_id);
    } else {
      return res.status(404).json({ message: "Type not correct" });
    }
    const fulldata = await S3_Service.generatePreSignedURL({
      key: key,
      bucketName: BUCKET_NAME,
      contentType,
      expiresIn: 300,
      metadata: {
        uploadedBy: "user",
      },
      max_file_size: 10 * 1024 * 1024,
    });
    const { uploadURL } = fulldata;
    return res.status(200).json({ uploadURL, key });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const confirm_upload = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ message: "Key required" });
    }

    const exists = await S3_Service.verifyUploadFileSync(key, BUCKET_NAME);

    if (!exists) {
      return res.status(400).json({ message: "Upload not found in S3" });
    }

    // Save key in DB here
    // await FileModel.create({ key, userId })

    return res.status(200).json({ message: "Upload verified", key });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Verification failed" });
  }
};
export const generatedownloadURL = async (req: Request, res: Response) => {
  try {
    const { key } = req.query as { key: string };

    const url = await S3_Service.getSignedURL(key, BUCKET_NAME, 300);

    return res.status(200).json({ url });
  } catch (err) {
    return res.status(500).json({ message: "Failed to generate download URL" });
  }
};

export const createReferenceID = async( req:Request,res:Response) => {
  const {name, gst} = req.body;
  if (!name || !gst){
    return res.status(404).json({message: "invalid Payload"})
  }
  const reference_id = await  create_reference_id({name, gst});
  //modify this function to check in db if the reference_id exists or not ?
  return res.status(200).json({reference_id: reference_id})
};
