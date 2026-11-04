import AsyncStorage from "@react-native-async-storage/async-storage";
const BASE_URL = "http://192.168.1.100:3000/api";

const apiCall = async (method, endpoint, body = null) => {
  const token = await AsyncStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const config = { method, headers };
  if (body) config.body = JSON.stringify(body);
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  console.log("BUDGET API STATUS:", response.status, "BODY:", data);
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const saveBudgetPlan = async (formData) => await apiCall("POST", "/budget-maker", formData);
export const getBudgetPlans = async (params = {}) => { const q = new URLSearchParams(params).toString(); return await apiCall("GET", `/budget-maker?${q}`); };
export const getActiveBudgetPlan = async () => await apiCall("GET", "/budget-maker/active");
export const getBudgetPlanById = async (id) => await apiCall("GET", `/budget-maker/${id}`);
export const updateBudgetPlan = async (id, formData) => await apiCall("PUT", `/budget-maker/${id}`, formData);
export const deleteBudgetPlan = async (id) => await apiCall("DELETE", `/budget-maker/${id}`);
export const setActiveBudgetPlan = async (id) => await apiCall("PATCH", `/budget-maker/${id}/activate`);