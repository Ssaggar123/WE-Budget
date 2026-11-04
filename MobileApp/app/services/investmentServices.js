import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.100:3000/api";

const apiCall = async (method, endpoint) => {
  const token = await AsyncStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const response = await fetch(`${BASE_URL}${endpoint}`, { method, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const getRecommendedInvestments = async (riskProfile = "Low") =>
  await apiCall("GET", `/investments/recommend?riskProfile=${riskProfile}`);

export const getAllInvestments = async (category = "") =>
  await apiCall("GET", `/investments/all${category ? `?category=${category}` : ""}`);
export const getCatalogue = async () => await apiCall("GET", "/investments/catalogue");