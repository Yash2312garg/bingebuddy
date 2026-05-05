import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const publicApi = axios.create({
    baseURL:BASE_URL,
    withCredentials: true,
})
export const privateApi = axios.create({
    baseURL:BASE_URL,
    withCredentials: true,
})

