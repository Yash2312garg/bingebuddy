import React, { useState } from "react";
import Navbar from "../Navbar/Navbar";
import Icon from "../assets/User.svg";
import { useNavigate } from "react-router-dom";
import "./index.css";
import LoginCardLayout, {
  LoginCardLayoutHeading,
  LoginCardLayoutSubHeading,
} from "./LoginCardLayout";
import { sendOtpRequest } from "../api/publicApi/login.publicApi";
import Btn from "../Components/Buttons/Button";
import { Input } from "../Components/Input/Input";
import axios from "axios";

interface RequestOTPError {
  status: number;
  message: string|undefined;
}

const Login: React.FC = () => {
  const [emailOrRefID, setEmailOrRefID] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error,seterror] = useState<RequestOTPError|null>(null)
  const navigate = useNavigate();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailOrRefID(e.target.value);
  };

const handleContinue = async () => {
  try {
    seterror(null);
    setLoading(true);
    if (!emailOrRefID) {
      seterror({
        status: 400,
        message: "Email or Reference ID is required",
      });
      return;
    }
    const response = await sendOtpRequest({
      email: emailOrRefID,
    });

    if (response.status === 200) {
      navigate("/verify-otp");
    }

  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        seterror({
          status: error.response.status,
          message: error.response.data?.message ?? "Request failed",
        });
      } else {
        seterror({
          status: 0,
          message: "Network error. Please try again.",
        });
      }
    } else {
      seterror({
        status: 500,
        message: "Something went wrong",
      });
    }
  } finally {
    setLoading(false);
  }
};



  return (
    <div className="Login-Page-Main-Container">
      <Navbar />
      <div className="Login-Page-Container">
        <LoginCardLayout>
          <div className="Login-Card-Layout-Heading-Container">
            <LoginCardLayoutHeading>Welcome Back!</LoginCardLayoutHeading>
            <LoginCardLayoutSubHeading>
              Enter your restaurant's registered email or reference ID to begin.
            </LoginCardLayoutSubHeading>
          </div>
          <div className="Login-Card-Layout-Input-Container">
            <Input error={error ? error.message: null} >
              <Input.Label>
                Email/Reference ID <img src={Icon} alt="" />
              </Input.Label>
              <Input.Field
                inputType="Search"
                placeholder="Enter your email or reference ID"
                value={emailOrRefID}
                onChange={handleChange}
              />
              <Input.Description/>

            </Input>
            <Btn onClick={handleContinue} disabled={loading || !emailOrRefID}>
              {loading ? "Loading" : "Continue"}
            </Btn>
          </div>
        </LoginCardLayout>
        <></>
      </div>
    </div>
  );
};
export default Login;
