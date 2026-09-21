import React, { useState } from "react";
import { StepCountHeading, ModalHeading, ModalDescription } from "./StepModal";
import StepModal from "./StepModal";
import "./StepThree.css";
import Btn from "../Components/Buttons/Button";
import type { StepOneProps } from "../Types/PreLoginSteps";
import DragAndDrop from "../Components/DragAndDrop/DragAndDrop";
import type { FileWithPreview } from "../Types/DragAndDrop";
import { create_reference_id, upload_full_data } from "./utils";
import { useNavigate } from "react-router-dom";
import { publicApi } from "../utils/api";
const base_api_url = import.meta.env.VITE_BASE_URL;

const StepFour: React.FC<StepOneProps> = ({
  setNextSteps,
  setPrevSteps,
  changeRestaurantDetails,
  restaurantInfo,
}) => {
  const navigate = useNavigate();
  const [logo, setLogo] = useState<FileWithPreview[] | null>(null);
  const [restaurantImage, setRestaurantImage] = useState<
    FileWithPreview[] | null
  >(null);
  const [loading, setLoading] = useState(false);

  const uploadToS3 = async (
    state: string,
    city: string,
    reference_id: String,
    file: File,
    type: string,
  ) => {
    const presignRes = await publicApi.post(
      base_api_url + "restaurant/prelogin/upload_pre_login_images",
      {
        state: state,
        city: city,
        reference_id: reference_id,
        contentType: file.type,
        type: type,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { uploadURL, key } = presignRes.data;

    await publicApi.put(uploadURL, file, {
      headers: {
        "Content-Type": file.type,
      },
      maxBodyLength: Infinity,
    });

    await publicApi.post(
      base_api_url + "restaurant/prelogin/confirm_upload",
      { key },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    return key;
  };
  const handleFinish = async () => {
    try {
      setLoading(true);

      let logoKey = null;
      let imageKey = null;
      let reference_id;
      try {
        reference_id = await create_reference_id(
          restaurantInfo.name,
          restaurantInfo.gst,
        );
        if (reference_id && changeRestaurantDetails) {
          // changeRestaurantDetails(reference_id, "reference_id")
        }
      } catch (err) {
        console.log(err);
      }
      if (logo?.[0]) {
        const type = "Restaurant_Logo_Image";
        logoKey = await uploadToS3(
          restaurantInfo.address.state,
          restaurantInfo.address.city,
          reference_id.reference_id,
          logo[0],
          type,
        );
      }

      if (restaurantImage?.[0]) {
        const type = "Restaurant_Full_Image";
        imageKey = await uploadToS3(
          restaurantInfo.address.state,
          restaurantInfo.address.city,
          reference_id.reference_id,
          restaurantImage[0],
          type,
        );
      }

      const all_details = Object.assign(restaurantInfo, {
        full_img: imageKey,
        reference_id: reference_id.reference_id,
        logo_url: logoKey,
      });
      const response = await upload_full_data(all_details);
      if (response.data) {
        navigate("/login/status=pending");
      }
      setNextSteps();
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <StepModal additionalClass="step-modal-new-width">
        <StepCountHeading>Step 5 of 5</StepCountHeading>
        <ModalHeading>
          Photos & Branding
          <ModalDescription>
            Great photos attract more customers! Upload your restaurant's logo
            and a primary hero image.
          </ModalDescription>
        </ModalHeading>

        <div className="Infmtn-cntr-step3">
          <DragAndDrop
            accept={{ "image/*": [".png", ".jpg", ".jpeg"] }}
            maxFiles={1}
            maxSize={5242880} // 5MB
            onChange={(files) => setLogo(files)}
            dragInactiveText="Upload Logo"
          />
          <DragAndDrop
            accept={{ "image/*": [".png", ".jpg", ".jpeg", ".svg"] }}
            maxFiles={1}
            maxSize={5242880} // 5MB
            onChange={(files) => setRestaurantImage(files)}
            dragInactiveText="Upload Restaurant image"
          />
        </div>

        <div className="Btn-cntr">
          <Btn
            variant="Secondary"
            onClick={() => {
              if (setPrevSteps) setPrevSteps();
            }}
          >
            Back
          </Btn>
          <Btn onClick={() => handleFinish()}>
            {" "}
            {loading ? "Uploading..." : "Finish"}
          </Btn>
        </div>
      </StepModal>
    </>
  );
};

export default StepFour;
