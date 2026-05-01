import axios from "axios";

const base_api_url = import.meta.env.VITE_BASE_URL;

export const verifyOTPUtils = async (otp: string) => {
  const response = await axios.post(
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

export const resendOTPUtils = async () => {
  const response = await axios.post(
    base_api_url + "restaurant/resendOtp",
    { check: "hello" },
    { withCredentials: true },
  );
  if (response.status === 200) {
    return response.data;
  }
};

export const checkpreloginSession = async () => {
  const response = await axios.get(base_api_url + "restaurant/checkSession", {
    withCredentials: true,
  });
  console.log(response)
  if (response.status === 200) {
    return response.data;
  }
};
