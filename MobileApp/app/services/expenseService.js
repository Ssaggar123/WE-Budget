import AsyncStorage from "@react-native-async-storage/async-storage";
const BASE_URL = "http://192.168.1.103:3000/api";
const apiCall = async (method, endpoint, body = null) => {
  const token = await AsyncStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};
export const addExpense = async (expenseData) => await apiCall("POST", "/expenses", expenseData);
export const getExpenses = async (params = {}) => { const q = new URLSearchParams(params).toString(); return await apiCall("GET", `/expenses?${q}`); };
export const getMonthSummary = async (params = {}) => { const q = new URLSearchParams(params).toString(); return await apiCall("GET", `/expenses/summary?${q}`); };
export const deleteExpense = async (id) => await apiCall("DELETE", `/expenses/${id}`);
