import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");

  const refreshAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const storedUsername = await AsyncStorage.getItem("username");
      setIsLoggedIn(!!token);
      setUsername(storedUsername || "");
    } catch {
      setIsLoggedIn(false);
      setUsername("");
    }
  };

  useEffect(() => {
    refreshAuth().finally(() => setChecking(false));
  }, []);

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("username");
    setUsername("");
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, checking, username, refreshAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}