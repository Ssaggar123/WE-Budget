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
import { getCatalogue } from "../services/investmentServices";

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

const SECTIONS = [
  { key: "assured", label: "Assured Returns" },
  { key: "mutual", label: "Mutual Funds" },
  { key: "stocks", label: "Stocks" },
];

export default function AllInvestmentPlans() {
  const [activeSection, setActiveSection] = useState("assured");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchCatalogue = useCallback(async () => {
    try {
      setError("");
      const res = await getCatalogue();
      setData(res.data);
    } catch (err) {
      setError(err.message || "Failed to load catalogue");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchCatalogue().finally(() => setLoading(false));
  }, [fetchCatalogue]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCatalogue();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Section selector */}
      <View style={styles.sectionSelector}>
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sectionBtn, activeSection === s.key && styles.sectionBtnActive]}
            onPress={() => setActiveSection(s.key)}
          >
            <Text
              style={[styles.sectionBtnText, activeSection === s.key && styles.sectionBtnTextActive]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.accent} />
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchCatalogue}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <>
            {data.lastUpdated && (
              <Text style={styles.updatedText}>
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString("en-IN")}
              </Text>
            )}

            {activeSection === "assured" && (
              <AssuredSection plans={data.assuredReturns} />
            )}
            {activeSection === "mutual" && (
              <MutualFundSection
                curated={data.mutualFunds.curated}
                live={data.mutualFunds.live}
              />
            )}
            {activeSection === "stocks" && (
              <StockSection stocks={data.stocks.live} stale={data.stocks.stale} />
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function AssuredSection({ plans }) {
  if (!plans?.length) return <Text style={styles.emptyText}>No assured-return plans found.</Text>;
  return (
    <>
      <Text style={styles.sectionIntro}>
        Government-backed schemes and bank FDs/RDs — capital protected, fixed returns.
      </Text>
      {plans.map((p) => (
        <View key={p._id} style={styles.planCard}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planName}>{p.schemeName}</Text>
            <View style={[styles.badge, { borderColor: C.green }]}>
              <Text style={[styles.badgeText, { color: C.green }]}>{p.riskLevel}</Text>
            </View>
          </View>
          <Text style={styles.planOrg}>{p.organization}</Text>
          <View style={styles.planStatsRow}>
            <Stat label="Rate" value={`${p.interestRate}%`} highlight />
            <Stat label="Min" value={`₹${p.minInvestment?.toLocaleString("en-IN")}`} />
            <Stat label="Lock-in" value={p.lockInYears ? `${p.lockInYears} yr` : "None"} />
          </View>
          <Text style={styles.planLiquidity}>{p.liquidity}</Text>
        </View>
      ))}
    </>
  );
}

function MutualFundSection({ curated, live }) {
  return (
    <>
      <Text style={styles.sectionIntro}>
        Market-linked funds from public AMCs — moderate risk, live NAVs below.
      </Text>

      <Text style={styles.subHeading}>Live NAVs</Text>
      {live?.length ? (
        live.map((f) => (
          <View key={f.code} style={styles.planCard}>
            <View style={styles.planHeaderRow}>
              <Text style={styles.planName}>{f.name}</Text>
              <View style={[styles.badge, { borderColor: C.amber }]}>
                <Text style={[styles.badgeText, { color: C.amber }]}>{f.riskLevel}</Text>
              </View>
            </View>
            <View style={styles.planStatsRow}>
              <Stat
                label="NAV"
                value={f.nav != null ? `₹${f.nav.toFixed(2)}` : "N/A"}
                highlight
              />
              <Stat label="As of" value={f.navDate || "—"} />
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>Live NAV data unavailable right now.</Text>
      )}

      {curated?.length > 0 && (
        <>
          <Text style={styles.subHeading}>Fund Details</Text>
          {curated.map((p) => (
            <View key={p._id} style={styles.planCard}>
              <View style={styles.planHeaderRow}>
                <Text style={styles.planName}>{p.schemeName}</Text>
                <View style={[styles.badge, { borderColor: C.amber }]}>
                  <Text style={[styles.badgeText, { color: C.amber }]}>{p.riskLevel}</Text>
                </View>
              </View>
              <Text style={styles.planOrg}>{p.organization}</Text>
              <View style={styles.planStatsRow}>
                <Stat label="Avg. Return" value={`${p.interestRate}%`} highlight />
                <Stat label="Min" value={`₹${p.minInvestment?.toLocaleString("en-IN")}`} />
                <Stat label="Lock-in" value={p.lockInYears ? `${p.lockInYears} yr` : "None"} />
              </View>
              <Text style={styles.planLiquidity}>{p.liquidity}</Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

function StockSection({ stocks, stale }) {
  return (
    <>
      <Text style={styles.sectionIntro}>
        Direct equity — highest risk, highest potential return. No capital protection.
      </Text>
      {stale && (
        <View style={styles.staleWarning}>
          <Text style={styles.staleWarningText}>
            ⚠️ Showing last cached prices — live quote refresh unavailable (rate limit reached).
          </Text>
        </View>
      )}
      {stocks?.length ? (
        stocks.map((s) => {
          const isUp = s.change >= 0;
          return (
            <View key={s.symbol} style={styles.planCard}>
              <View style={styles.planHeaderRow}>
                <Text style={styles.planName}>{s.name}</Text>
                <View style={[styles.badge, { borderColor: C.red }]}>
                  <Text style={[styles.badgeText, { color: C.red }]}>High</Text>
                </View>
              </View>
              <Text style={styles.planOrg}>{s.symbol}</Text>
              <View style={styles.planStatsRow}>
                <Stat label="Price" value={`₹${s.price?.toFixed(2)}`} highlight />
                <Stat
                  label="Change"
                  value={`${isUp ? "+" : ""}${s.change?.toFixed(2)} (${s.changePercent})`}
                  color={isUp ? C.green : C.red}
                />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.emptyText}>Live stock data unavailable right now.</Text>
      )}
    </>
  );
}

function Stat({ label, value, highlight, color }) {
  return (
    <View style={{ alignItems: "flex-start" }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && { color: C.accent }, color && { color }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  sectionSelector: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sectionBtn: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  sectionBtnText: { color: C.textSub, fontSize: 12, fontWeight: "600" },
  sectionBtnTextActive: { color: "#fff" },

  centerBox: { paddingVertical: 60, alignItems: "center" },
  updatedText: { color: C.textSub, fontSize: 11, marginBottom: 10, textAlign: "right" },
  sectionIntro: { color: C.textSub, fontSize: 13, marginBottom: 14, lineHeight: 18 },
  subHeading: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 10, marginBottom: 8 },
  emptyText: { color: C.textSub, fontSize: 13, marginBottom: 16 },

  errorCard: {
    backgroundColor: C.card,
    borderColor: C.red,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  errorText: { color: C.red, marginBottom: 10, textAlign: "center" },
  retryBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },

  staleWarning: {
    backgroundColor: "#2A2210",
    borderWidth: 1,
    borderColor: C.amber,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  staleWarningText: { color: C.amber, fontSize: 12 },

  planCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  planHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planName: { color: C.text, fontSize: 15, fontWeight: "700", flex: 1, marginRight: 8 },
  planOrg: { color: C.textSub, fontSize: 12, marginTop: 2, marginBottom: 10 },

  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  planStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  statLabel: { color: C.textSub, fontSize: 11 },
  statValue: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  planLiquidity: { color: C.textSub, fontSize: 12, fontStyle: "italic" },
});