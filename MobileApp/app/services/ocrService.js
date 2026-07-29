const BASE_URL = "http://192.168.1.102:3000/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const scanReceipt = async (base64Image) => {
  const token = await AsyncStorage.getItem("token");
  const response = await fetch(`${BASE_URL}/ocr/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ base64Image }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to scan receipt");
  return data;
};