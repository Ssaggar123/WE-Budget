import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.100:3000/api"; // keep this in sync with your other service files

const apiCall = async (method, endpoint, body) => {
  const token = await AsyncStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getOccasions = async () => await apiCall("GET", "/occasions");
export const getOccasionById = async (id) => await apiCall("GET", `/occasions/${id}`);
export const createOccasion = async (payload) => await apiCall("POST", "/occasions", payload);
export const updateOccasion = async (id, payload) => await apiCall("PUT", `/occasions/${id}`, payload);
export const deleteOccasion = async (id) => await apiCall("DELETE", `/occasions/${id}`);