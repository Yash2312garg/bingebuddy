import { publicApi } from "../../utils/api";

interface OtpRequestPayload {
  email?: string;
  referenceId?: string;
  phone_number?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

export async function sendOtpRequest(payload: OtpRequestPayload) {
  const response = await publicApi.post<ApiResponse>(
    "/auth/v1/restaurant/login",
    payload
  );

  return response; 
}
