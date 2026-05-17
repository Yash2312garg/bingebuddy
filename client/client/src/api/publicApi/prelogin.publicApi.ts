import { publicApi } from "../../utils/api";

export const checkpreloginSession = async () => {
  const response = await publicApi.get("auth/checkSession", {
    withCredentials: true,
  });
  if (response.status === 200) {
    return response.data;
  }
};
