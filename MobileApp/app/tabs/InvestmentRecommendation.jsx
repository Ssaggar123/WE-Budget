import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";

import { getRecommendedInvestments } from "../services/investmentServices";
import PlanDetailModal from "../../components/PlanDetailModal";
import { useNavigation } from "@react-navigation/native";
const C = {
  bg: "#0D0F14",
  card: "#161A23",
  border: "#2A3045",
  accent: "#6C63FF",
  textSub: "#8892A4",
  text: "#FFFFFF",
  green: "#3DDC97",
  amber: "#F5A623",
  red: "#FF6161",
};

const RISK_LEVELS = ["Low", "Medium", "High"];

const riskColor = (level) => {
  if (level === "Low") return C.green;
  if (level === "Medium") return C.amber;
  return C.red;
};

export default function InvestmentRecommendation() {
  const [riskProfile, setRiskProfile] = useState("Low");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const fetchRecommendations = useCallback(async (profile) => {
  try {
    setError("");
    console.log("Fetching investments for risk:", profile);
    const res = await getRecommendedInvestments(profile);
    console.log("Investment API response:", JSON.stringify(res));
    setData(res.data);
  } catch (err) {
    console.log("Investment fetch error:", err.message);
    setError(err.message || "Failed to load recommendations");
    setData(null);
  }
}, []);

  useEffect(() => {
    setLoading(true);
    fetchRecommendations(riskProfile).finally(() => setLoading(false));
  }, [riskProfile, fetchRecommendations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecommendations(riskProfile);
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
    >
      <Text style={styles.header}>Investment Recommendations</Text>
      <Text style={styles.subHeader}>
        Personalized picks based on your monthly investable amount
      </Text>
      <TouchableOpacity
  style={styles.viewAllBtn}
  onPress={() => navigation.navigate("AllInvestmentPlans")}
>
  <Text style={styles.viewAllBtnText}>🗂️ View All Plans</Text>
</TouchableOpacity>
      {/* Risk profile selector */}
      <View style={styles.riskSelector}>
        {RISK_LEVELS.map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.riskBtn,
              riskProfile === level && { backgroundColor: C.accent, borderColor: C.accent },
            ]}
            onPress={() => setRiskProfile(level)}
          >

            <Text
              style={[
                styles.riskBtnText,
                riskProfile === level && { color: "#fff", fontWeight: "700" },
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchRecommendations(riskProfile)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <>
          {/* Summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Monthly Investable</Text>
                <Text style={styles.summaryValue}>
                  ₹{data.monthlyInvestable?.toLocaleString("en-IN")}
                </Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Annual Investable</Text>
                <Text style={styles.summaryValue}>
                  ₹{data.annualInvestable?.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* Recommended plans */}
          <Text style={styles.sectionTitle}>Recommended for You</Text>
          {data.recommended?.length ? (
            data.recommended.map((plan) => <PlanCard key={plan._id} plan={plan} onViewDetails={setSelectedPlan}/>)
          ) : (
            <Text style={styles.emptyText}>No plans match your current budget yet.</Text>
          )}

          {/* Aspirational plans */}
          {data.aspirational?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Worth Growing Toward</Text>
              <Text style={styles.sectionSubtitle}>
                Higher minimums — save up to unlock these
              </Text>
              {data.aspirational.map((plan) => (
                <PlanCard key={plan._id} plan={plan} locked onViewDetails={setSelectedPlan}/>
              ))}
            </>
          )}
        </>
      ) : null}
      <PlanDetailModal
        visible={!!selectedPlan}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </ScrollView>
  );
}

function PlanCard({ plan, locked , onViewDetails  }) {
  return (
    <View style={[styles.planCard, locked && styles.planCardLocked]}>
      <View style={styles.planHeaderRow}>
        <Text style={styles.planName} numberOfLines={2}>
          {plan.schemeName}
        </Text>
        <View style={[styles.riskBadge, { borderColor: riskColor(plan.riskLevel) }]}>
          <Text style={[styles.riskBadgeText, { color: riskColor(plan.riskLevel) }]}>
            {plan.riskLevel}
          </Text>
        </View>
        
      </View>
      <Text style={styles.planOrg}>{plan.organization}</Text>

      <View style={styles.planStatsRow}>
        <Stat label="Rate" value={`${plan.interestRate}%`} highlight />
        <Stat label="Min Invest" value={`₹${plan.minInvestment?.toLocaleString("en-IN")}`} />
        <Stat label="Lock-in" value={plan.lockInYears ? `${plan.lockInYears} yr` : "None"} />
      </View>

      <Text style={styles.planLiquidity}>{plan.liquidity}</Text>

      {locked && (
        <View style={styles.lockedTag}>
          <Text style={styles.lockedTagText}>Needs bigger lump sum</Text>
        </View>
      )}
       <TouchableOpacity style={styles.detailsBtn} onPress={() => onViewDetails(plan)}>
        <Text style={styles.detailsBtnText}>View Details →</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: C.accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { fontSize: 22, fontWeight: "700", color: C.text, marginTop: 8 },
  subHeader: { fontSize: 13, color: C.textSub, marginTop: 4, marginBottom: 16 },

  riskSelector: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    marginBottom: 20,
  },
  riskBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  riskBtnText: { color: C.textSub, fontSize: 13, fontWeight: "600" },

  centerBox: { paddingVertical: 60, alignItems: "center" },

  errorCard: {
    backgroundColor: C.card,
    borderColor: C.red,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  errorText: { color: C.red, marginBottom: 10, textAlign: "center" },
  retryBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontWeight: "600" },

  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: C.textSub, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: C.text, fontSize: 18, fontWeight: "700" },

  sectionTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginTop: 8, marginBottom: 2 },
  sectionSubtitle: { color: C.textSub, fontSize: 12, marginBottom: 10 },
  emptyText: { color: C.textSub, fontSize: 13, marginTop: 6, marginBottom: 16 },

  planCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  planCardLocked: { opacity: 0.85 },
  planHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planName: { color: C.text, fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  planOrg: { color: C.textSub, fontSize: 12, marginTop: 2, marginBottom: 10 },

  riskBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riskBadgeText: { fontSize: 11, fontWeight: "700" },

  planStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statLabel: { color: C.textSub, fontSize: 11 },
  statValue: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 2 },

  planLiquidity: { color: C.textSub, fontSize: 12, fontStyle: "italic" },

  lockedTag: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#2A3045",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockedTagText: { color: C.amber, fontSize: 11, fontWeight: "600" },
  viewAllBtn: {
  alignSelf: "flex-start",
  backgroundColor: C.card,
  borderWidth: 1,
  borderColor: C.accent,
  borderRadius: 10,
  paddingVertical: 8,
  paddingHorizontal: 14,
  marginBottom: 16,
},
viewAllBtnText: { color: C.accent, fontSize: 13, fontWeight: "700" },
});