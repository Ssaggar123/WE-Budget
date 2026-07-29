import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.102:3000/api";

const apiCall = async (method, endpoint, body = null) => {
  const config = { method, headers: { "Content-Type": "application/json" } };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const loginUser = async (email, password) => {
  const data = await apiCall("POST", "/auth/login", { email, password });
  if (!data.token) throw new Error("No token received from server");
  await AsyncStorage.setItem("token", data.token);
  await AsyncStorage.setItem("refreshToken", data.refreshToken || "");
  await AsyncStorage.setItem("user", JSON.stringify(data.user));
  return data;
};


export const registerUser = async (name, email, password) => {
  const data = await apiCall("POST", "/auth/register", { name, email, password });
  if (!data.token) throw new Error("No token received from server");
  await AsyncStorage.setItem("token", data.token);
  await AsyncStorage.setItem("refreshToken", data.refreshToken || "");
  await AsyncStorage.setItem("user", JSON.stringify(data.user));
  return data;
};

export const logoutUser = async () => {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  try {
    const token = await AsyncStorage.getItem("token");
    await fetch(`${BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refreshToken }),
    });
  } catch (_) {}
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("refreshToken");
  await AsyncStorage.removeItem("user");
};

export const getStoredUser = async () => {
  const user = await AsyncStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

export const getToken = async () => await AsyncStorage.getItem("token");

