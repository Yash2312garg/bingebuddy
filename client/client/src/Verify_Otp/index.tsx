import React, { useEffect, useRef, useState } from "react";
import "./index.css";
import Navbar from "../Navbar/Navbar";
import LoginCardLayout, {
  LoginCardLayoutHeading,
  LoginCardLayoutSubHeading,
  LoginCardLayoutSecondaryHeadiong,
} from "../Login/LoginCardLayout";
import { Input } from "../Components/Input/Input";
import OtpResendTimer from "./OtpResendTimer";
import Btn from "../Components/Buttons/Button";
import { useNavigate } from "react-router-dom";
import {
  verifyOTPUtils,
  resendOTPUtils,
  fetchOtpStatus,
} from "../api/publicApi/verifyotp.publicApi";

import axios from "axios";
import { useAppDispatch } from "../hooks/redux";
import { getRestaurantInfo } from "../api/privateApi/getRestaurantInfo.privateApi";
import { setUser } from "../slices/authSlice";
import { checkpreloginSession } from "../api/publicApi/prelogin.publicApi";

interface RequestOTPError {
  status: number;
  message: string | undefined;
}

const number_of_boxes = 6;
const VerifyOTP: React.FC = () => {
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otp, setOTP] = useState<string[]>(new Array(number_of_boxes).fill(""));
  const [otpError, setOtpError] = useState<RequestOTPError | null>(null);
  const [initialCooldown, setCooldown] = useState<number>(60);
  const otpBoxRef = useRef<(HTMLInputElement | null)[]>([]);
  const dispatch = useAppDispatch();

  const navigate = useNavigate();

  const handleOTPChange = (value: string, index: number) => {
    // setOTP(e.target.value);
    let newArr = [...otp];
    newArr[index] = value;
    setOTP(newArr);
    if (value && index < number_of_boxes - 1) {
      otpBoxRef.current[index + 1]?.focus();
    }
  };
  function handleBackspaceAndEnter(
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) {
    if (e.key === "Backspace" && e.currentTarget && index > 0) {
      otpBoxRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && e.currentTarget && index < number_of_boxes - 1) {
      otpBoxRef.current[index + 1]?.focus();
    }
  }
  const verifyOTP = async () => {
    try {
      setOtpLoading(true);
      setOtpError(null);
      const response = await verifyOTPUtils(otp.join(""));
      if (response.auth_status === null) {
        navigate("/login/info");
      }
      if (response.auth_status === "PENDING") {
        navigate("/login/status=pending");
      }
      if(response.auth_status==="APPROVED"){
        console.log("approved")
        const restaurantInfo = await getRestaurantInfo();
        dispatch(setUser(restaurantInfo));
        navigate("/home")
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // console.log(error.response);
        setOtpError({
          status: error.response?.status as number,
          message: error.response?.data?.message,
        });
      }
    } finally {
      setOtpLoading(false);
    }
  };
  const onResend = async () => {
    try {
      setOtpLoading(true);
      setOtpError(null);

      await resendOTPUtils();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log(error.response);
        setOtpError({
          status: error.response?.status as number,
          message: error.response?.data?.message,
        });
      }
    } finally {
      setOtpLoading(false);
    }
  };
  function ChangeEmailorReferenceId() {
    navigate("/login");
  }
  useEffect(() => {
    const checkSession = async () => {
      try {
        const checkSession = await checkpreloginSession();
        const OtpStatus = await fetchOtpStatus();
        if(OtpStatus){
          setCooldown(OtpStatus.cooldownRemaining)
        }
        if (!checkSession.isActive) {
          navigate("/login");
        }
      } catch (e) {
        navigate("/login");
      }
    };
    checkSession();
  }, []);
  return (
    <div className="Login-Page-Main-Container">
      <Navbar />
      <div className="Login-Page-Container">
        <LoginCardLayout>
          <div className="Login-Card-Layout-Heading-Container">
            <LoginCardLayoutHeading>
              Enter Verification Code!
            </LoginCardLayoutHeading>
            <LoginCardLayoutSubHeading>
              We have sent to you 6 digit code to the provided or registered
              email
            </LoginCardLayoutSubHeading>
            <LoginCardLayoutSecondaryHeadiong>
              <button
                onClick={ChangeEmailorReferenceId}
                className="Wrong-eml-btn"
              >
                Wrong email/reference-Id?
              </button>
            </LoginCardLayoutSecondaryHeadiong>
          </div>
          <div className="Login-Card-Layout-Input-Container">
            <Input error={otpError?.message}>
              <div className="OTP-Input-Container">
                {otp.map((value, index) => {
                  return (
                    <Input.Field
                      inputType="Text"
                      placeholder="X"
                      value={value}
                      id={`otp_${index}`}
                      maxLength={1}
                      onKeyUp={(e) => handleBackspaceAndEnter(e, index)}
                      ref={(reference: HTMLInputElement | null) => {
                        otpBoxRef.current[index] = reference;
                      }}
                      onChange={(e) => handleOTPChange(e.target.value, index)}
                    />
                  );
                })}
              </div>
              <Input.Description />
              <OtpResendTimer
                initialTime={initialCooldown}
                onResend={onResend}
              />
            </Input>
            <Btn
              variant="Primary"
              size="Large"
              onClick={verifyOTP}
              disabled={otpLoading || !otp}
            >
              {otpLoading ? "Loading" : "Verify"}
            </Btn>
          </div>
        </LoginCardLayout>

        <></>
      </div>
    </div>
  );
};

export default VerifyOTP;
