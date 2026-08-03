import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";

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

// Simple compound-interest estimate for fixed/assured-return plans.
// A = P(1 + r/100)^t — illustrative only, not a guaranteed projection.
function estimateMaturity(minInvestment, rate, years) {
  if (!minInvestment || !rate) return null;
  const t = years && years > 0 ? years : 1;
  const amount = minInvestment * Math.pow(1 + rate / 100, t);
  return { principal: minInvestment, years: t, maturity: Math.round(amount) };
}

function riskColor(level) {
  if (level === "Low") return C.green;
  if (level === "Medium") return C.amber;
  return C.red;
}

export default function PlanDetailModal({ visible, onClose, plan }) {
  if (!plan) return null;

  const isStock = plan.price !== undefined;
  const isLiveFund = plan.nav !== undefined;
  const isFixedReturn = !isStock && !isLiveFund && plan.interestRate !== undefined;

  const estimate = isFixedReturn
    ? estimateMaturity(plan.minInvestment, plan.interestRate, plan.lockInYears)
    : null;
  const [selectedPlan, setSelectedPlan] = useState(null);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{plan.schemeName || plan.name}</Text>
              <View style={[styles.badge, { borderColor: riskColor(plan.riskLevel) }]}>
                <Text style={[styles.badgeText, { color: riskColor(plan.riskLevel) }]}>
                  {plan.riskLevel}
                </Text>
              </View>
            </View>

            {(plan.organization || plan.symbol) && (
              <Text style={styles.subtitle}>{plan.organization || plan.symbol}</Text>
            )}

            {/* ── Stock-specific ── */}
            {isStock && (
              <>
                <DetailRow label="Current Price" value={`₹${plan.price?.toFixed(2)}`} big />
                <DetailRow
                  label="Change"
                  value={`${plan.change >= 0 ? "+" : ""}${plan.change?.toFixed(2)} (${plan.changePercent})`}
                  color={plan.change >= 0 ? C.green : C.red}
                />
                <DetailRow label="Symbol" value={plan.symbol} />
                <Note text="Direct equity has no capital protection — price reflects live market movement and can go up or down significantly." />
              </>
            )}

            {/* ── Live mutual fund ── */}
            {isLiveFund && (
              <>
                <DetailRow label="Latest NAV" value={plan.nav != null ? `₹${plan.nav.toFixed(2)}` : "N/A"} big />
                <DetailRow label="NAV as of" value={plan.navDate || "—"} />
                <DetailRow label="Fund Code" value={plan.code} />
                <Note text="NAV changes daily based on the fund's underlying holdings. Past performance doesn't guarantee future returns." />
              </>
            )}

            {/* ── Fixed/assured return schemes (Govt, Bank, curated MF) ── */}
            {isFixedReturn && (
              <>
                <DetailRow label="Interest / Return Rate" value={`${plan.interestRate}% p.a.`} big />
                <DetailRow
                  label="Minimum Investment"
                  value={`₹${plan.minInvestment?.toLocaleString("en-IN")}`}
                />
                {plan.maxInvestment && (
                  <DetailRow
                    label="Maximum Investment"
                    value={`₹${plan.maxInvestment?.toLocaleString("en-IN")}`}
                  />
                )}
                <DetailRow
                  label="Lock-in Period"
                  value={plan.lockInYears ? `${plan.lockInYears} years` : "None"}
                />
                <DetailRow label="Liquidity" value={plan.liquidity} multiline />
                <DetailRow label="Category" value={plan.category} />

                {estimate && (
                  <View style={styles.estimateBox}>
                    <Text style={styles.estimateTitle}>Illustrative Maturity Estimate</Text>
                    <Text style={styles.estimateText}>
                      ₹{estimate.principal.toLocaleString("en-IN")} invested for {estimate.years}{" "}
                      {estimate.years === 1 ? "year" : "years"} at {plan.interestRate}% p.a.
                      (compounded annually) grows to approximately:
                    </Text>
                    <Text style={styles.estimateValue}>
                      ₹{estimate.maturity.toLocaleString("en-IN")}
                    </Text>
                    <Text style={styles.estimateDisclaimer}>
                      Illustrative only — actual returns depend on compounding frequency, taxes, and
                      scheme-specific rules.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, big, color, multiline }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={[styles.detailRow, multiline && { flexDirection: "column", alignItems: "flex-start" }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          big && styles.detailValueBig,
          color && { color },
          multiline && { marginTop: 4 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Note({ text }) {
  return (
    <View style={styles.noteBox}>
      <Text style={styles.noteText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { color: C.text, fontSize: 19, fontWeight: "700", flex: 1, marginRight: 10 },
  subtitle: { color: C.textSub, fontSize: 13, marginTop: 4, marginBottom: 16 },

  badge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailLabel: { color: C.textSub, fontSize: 13 },
  detailValue: { color: C.text, fontSize: 14, fontWeight: "600" },
  detailValueBig: { fontSize: 20, fontWeight: "800", color: C.accent },

  noteBox: {
    backgroundColor: "#1D2130",
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
  },
  noteText: { color: C.textSub, fontSize: 12, lineHeight: 18 },

  estimateBox: {
    backgroundColor: "#1D2130",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  estimateTitle: { color: C.text, fontSize: 13, fontWeight: "700", marginBottom: 6 },
  estimateText: { color: C.textSub, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  estimateValue: { color: C.green, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  estimateDisclaimer: { color: C.textSub, fontSize: 10, fontStyle: "italic" },

  closeBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  closeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});