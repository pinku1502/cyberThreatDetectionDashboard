import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_ROOT_URL || "http://localhost:5000/api";

const createClient = (prefix = "") => {
  const client = axios.create({ baseURL: API_ROOT + prefix });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("cyberAuthToken");
    if (token) config.headers.Authorization = "Bearer " + token;
    return config;
  });
  return client;
};

const API = createClient("/predict");
export const ROOT_API = createClient();
export default API;
