import { publicApi } from "../../utils/api";

// const base_api_url = import.meta.env.VITE_BASE_URL;

export const verifyOTPUtils = async (otp: string) => {
  const response = await publicApi.post(
    "auth/verifyOtp",
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
    const res = await publicApi.get("auth/otp/status", { withCredentials: true });
    if (res.status === 200){
      return res.data
    }
  };

export const resendOTPUtils = async () => {
  const response = await publicApi.post("auth/resendOtp",
    { check: "hello" },
    { withCredentials: true },
  );
  if (response.status === 200) {
    return response.data;
  }
};

