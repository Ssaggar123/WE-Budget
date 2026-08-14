import React from "react";
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./app/context/AuthContext";
import AppHeader from "./components/AppHeader";
import AuthScreen from "./app/AuthScreen";
import BudgetMaker from "./app/budgetMaker";
import BudgetTracker from "./app/Budgettracker";
import InvestmentRecommendation from "./app/tabs/InvestmentRecommendation";
import AllInvestmentPlans from "./app/tabs/AllInvestmentPlans";
import OccasionPlanner from "./app/tabs/OccasionPlanner";

const C = { bg: "#0D0F14", card: "#161A23", border: "#2A3045", accent: "#6C63FF", textSub: "#8892A4" };

const Stack = createNativeStackNavigator();

function MainTabs() {
  const [activeTab, setActiveTab] = React.useState("tracker");

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AppHeader />

      <View style={{ flex: 1 }}>
        {activeTab === "maker" ? (
          <BudgetMaker onSaved={() => setActiveTab("tracker")} />
        ) : activeTab === "invest" ? (
          <InvestmentRecommendation />
        ) : activeTab === "occasion" ? (
          <OccasionPlanner />
        ) : (
          <BudgetTracker />
        )}
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab("tracker")}>
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabLabel, activeTab === "tracker" && styles.tabLabelActive]}>
            Tracker
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab("maker")}>
          <Text style={styles.tabIcon}>💼</Text>
          <Text style={[styles.tabLabel, activeTab === "maker" && styles.tabLabelActive]}>
            Budget Maker
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab("invest")}>
          <Text style={styles.tabIcon}>📈</Text>
          <Text style={[styles.tabLabel, activeTab === "invest" && styles.tabLabelActive]}>
            Invest
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab("occasion")}>
          <Text style={styles.tabIcon}>🎉</Text>
          <Text style={[styles.tabLabel, activeTab === "occasion" && styles.tabLabelActive]}>
            Occasions
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RootNavigator() {
  const { isLoggedIn, checking, refreshAuth } = useAuth();

  if (checking) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <AuthScreen onAuthSuccess={refreshAuth} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="AllInvestmentPlans"
          component={AllInvestmentPlans}
          options={{
            headerShown: true,
            headerTitle: "All Investment Plans",
            headerStyle: { backgroundColor: C.card },
            headerTintColor: "#fff",
            headerShadowVisible: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
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
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: 10, color: C.textSub, fontWeight: "600" },
  tabLabelActive: { color: C.accent },
});