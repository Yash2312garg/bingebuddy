import axios from "axios";
import { publicApi } from "../utils/api";

const base_api_url = import.meta.env.VITE_BASE_URL;

export const verifyOTPUtils = async (otp: string) => {
  const response = await publicApi.post(
    base_api_url + "restaurant/verifyOtp",
    { otp },
    {
      withCredentials: true,
    },
  );
  if (response.status === 200) {
    return response.data;
  }
};


export const fetchOtpStatus = async()=>{
    const res = await publicApi.get(base_api_url + "restaurant/otp/status", { withCredentials: true });
    if (res.status === 200){
      return res.data
    }
  };

export const resendOTPUtils = async () => {
  const response = await publicApi.post(
    base_api_url + "restaurant/resendOtp",
    { check: "hello" },
    { withCredentials: true },
  );
  if (response.status === 200) {
    return response.data;
  }
};

export const checkpreloginSession = async () => {
  const response = await publicApi.get(base_api_url + "restaurant/checkSession", {
    withCredentials: true,
  });
  if (response.status === 200) {
    return response.data;
  }
};
