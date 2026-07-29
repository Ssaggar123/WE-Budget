import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthScreen from "./app/AuthScreen";
import BudgetMaker from "./app/budgetMaker";
import BudgetTracker from "./app/Budgettracker";

const C = { bg: "#0D0F14", card: "#161A23", border: "#2A3045", accent: "#6C63FF", textSub: "#8892A4" };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState("tracker"); // "maker" | "tracker"

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        setIsLoggedIn(!!token);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1 }}>
        {activeTab === "maker" ? (
          <BudgetMaker onSaved={() => setActiveTab("tracker")} />
        ) : (
          <BudgetTracker />
        )}
      </View>

      {/* Bottom tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab("tracker")}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === "tracker" && styles.tabLabelActive]}>
            Tracker
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab("maker")}
        >
          <Text style={styles.tabIcon}>💼</Text>
          <Text style={[styles.tabLabel, activeTab === "maker" && styles.tabLabelActive]}>
            Budget Maker
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabBtn: { flex: 1, alignItems: "center", gap: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: C.textSub, fontWeight: "600" },
  tabLabelActive: { color: C.accent },
});