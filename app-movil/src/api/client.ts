import axios from "axios";
import { API_URL } from "../config/apiUrl";
import { tokenStorage } from "../utils/tokenStorage";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getItem();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const hasApiBaseUrl = Boolean(API_URL);
