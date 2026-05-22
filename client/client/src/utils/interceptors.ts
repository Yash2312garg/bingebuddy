import { privateApi, publicApi } from "./api";
import type { AppStore } from "../store";
import { logoutUser } from "../slices/authSlice";

let isRefreshing = false;

let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];



const processQueue = (error: unknown) => {
  failedQueue.forEach((process) => {
    if (error) process.reject(error);
    else process.resolve(null);
  });
  failedQueue = [];
};

export const setupInterceptors = (store:AppStore) => {
  privateApi.interceptors.response.use(
    (response) => response,

    async (error) => {
      const originalRequest = error.config;

      if (originalRequest.skipAuthRefresh) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(() => privateApi(originalRequest))
            .catch((err) => Promise.reject(err));
        }
        originalRequest._retry = true;
        isRefreshing = true;
        try {
          await publicApi.post("auth/refresh");
          processQueue(null);
          return privateApi(originalRequest); // retry original
        } catch (refreshError) {
          processQueue(refreshError);
          store.dispatch(logoutUser());
          // window.location.href = "/login"; // session fully expired
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
};

// export const setupInterceptors = () => {
//   privateApi.interceptors.response.use(
//     (response) => {
//       console.log("response", response);
//       return response;
//     },
//     async (error) => {
//       console.log(error);
//       if (error.status === 401) {
//         publicApi.post("restaurant-token/refres");
//       }
//     },
//   );
// };
