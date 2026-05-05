import axios from "axios";
import { publicApi } from "../utils/api";
const base_api_url = import.meta.env.VITE_BASE_URL;

export interface OtpRequestPayload {
  email?: string;
  referenceId?: string;
  phone_number?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
}


export const api = publicApi.create({
  baseURL: base_api_url,
  withCredentials: true,
});
export async function sendOtpRequest(payload: OtpRequestPayload) {
  const response = await api.post<ApiResponse>(
    "/restaurant/login",
    payload
  );

  return response; 
}