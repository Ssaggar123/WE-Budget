import { scanReceipt } from "./services/ocrService";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Animated, Dimensions, StatusBar, Alert, ActivityIndicator,
  Modal, TextInput, Platform, RefreshControl,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import { getMonthSummary, addExpense } from "./services/expenseService";

const { width } = Dimensions.get("window");

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:         "#0D0F14",
  surface:    "#161A23",
  card:       "#1E2330",
  border:     "#2A3045",
  accent:     "#6C63FF",
  accentSoft: "#2D2B55",
  green:      "#2ECC71",
  greenSoft:  "#1A3D2B",
  amber:      "#F39C12",
  amberSoft:  "#3D2E0A",
  red:        "#E74C3C",
  redSoft:    "#3D1A1A",
  text:       "#FFFFFF",
  textSub:    "#8892A4",
  textMuted:  "#4A5568",
};

const CATEGORY_META = {
  Housing:       { icon: "🏠", color: "#6C63FF" },
  Transport:     { icon: "🚗", color: "#3498DB" },
  Food:          { icon: "🍽️", color: "#E67E22" },
  Health:        { icon: "❤️",  color: "#E74C3C" },
  Savings:       { icon: "🏦", color: "#2ECC71" },
  Investments:   { icon: "📈", color: "#9B59B6" },
  Entertainment: { icon: "🎬", color: "#F1C40F" },
  Misc:          { icon: "🔖", color: "#8892A4" },
};

const CATEGORIES = Object.keys(CATEGORY_META);

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ── Notification setup ────────────────────────────────────────────
const sendLocalNotification = async (title, body) => {
  Alert.alert(title, body);
};

// ── Animated progress bar ─────────────────────────────────────────
function ProgressBar({ pct, color, height = 6 }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: Math.min(pct / 100, 1),
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [pct]);

  const barWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.progressBg, { height }]}>
      <Animated.View
        style={[styles.progressFill, { width: barWidth, backgroundColor: color, height }]}
      />
    </View>
  );
}

// ── Category card ─────────────────────────────────────────────────
function CategoryCard({ data, onAddPress }) {
  const meta = CATEGORY_META[data.category];
  const statusColor =
    data.status === "exceeded" ? C.red :
    data.status === "warning"  ? C.amber : C.green;
  const statusBg =
    data.status === "exceeded" ? C.redSoft :
    data.status === "warning"  ? C.amberSoft : C.greenSoft;

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start(() => onAddPress(data.category));
  };

  return (
    <Animated.View style={[styles.catCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.catHeader}>
        <View style={styles.catLeft}>
          <View style={[styles.catIconWrap, { backgroundColor: meta.color + "20" }]}>
            <Text style={styles.catIcon}>{meta.icon}</Text>
          </View>
          <View>
            <Text style={styles.catName}>{data.category}</Text>
            <Text style={styles.catCount}>{data.count} expense{data.count !== 1 ? "s" : ""}</Text>
          </View>
        </View>
        <View style={styles.catRight}>
          <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {data.status === "exceeded" ? "Exceeded" :
               data.status === "warning"  ? "Warning"  :
               data.status === "moderate" ? "Moderate" : "Safe"}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={onPress}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ProgressBar pct={data.pct} color={meta.color} height={5} />

      <View style={styles.catFooter}>
        <View>
          <Text style={styles.catSpentLabel}>Spent</Text>
          <Text style={[styles.catSpentAmt, { color: meta.color }]}>
            ₹{data.spent.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.catPctLabel}>{data.pct}%</Text>
          <Text style={styles.catPctSub}>used</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.catSpentLabel}>Limit</Text>
          <Text style={styles.catLimitAmt}>
            ₹{data.limit.toLocaleString("en-IN")}
          </Text>
        </View>
      </View>

      {data.remaining > 0 && (
        <Text style={styles.catRemain}>
          ₹{data.remaining.toLocaleString("en-IN")} remaining
        </Text>
      )}
      {data.status === "exceeded" && (
        <Text style={[styles.catRemain, { color: C.red }]}>
          ₹{Math.abs(data.limit - data.spent).toLocaleString("en-IN")} over limit
        </Text>
      )}
    </Animated.View>
  );
}

// ── Add Expense Modal ─────────────────────────────────────────────
function AddExpenseModal({ visible, onClose, onSave, defaultCategory, scanning, prefill }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(defaultCategory || "Food");
  const [description, setDescription] = useState("");
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setAmount(prefill?.amount || "");
      setDescription(prefill?.description || "");
      setCategory(prefill?.category || defaultCategory || "Food");
      Animated.spring(slideAnim, {
        toValue: 0, tension: 80, friction: 12, useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300, duration: 200, useNativeDriver: true,
      }).start();
    }
  }, [visible, defaultCategory, prefill]);

  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }
    onSave({ amount, category, description });
    setAmount("");
    setDescription("");
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>
            {scanning ? "📷 Receipt Scanned" : "Add Expense"}
          </Text>

          {/* Amount */}
          <View style={styles.modalFieldWrap}>
            <Text style={styles.modalLabel}>AMOUNT</Text>
            <View style={styles.modalInputWrap}>
              <Text style={styles.modalPrefix}>₹</Text>
              <TextInput
                style={styles.modalInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={C.textMuted}
                keyboardType="numeric"
                autoFocus={!scanning}
              />
            </View>
           
          </View>

          {/* Category selector */}
          <Text style={styles.modalLabel}>CATEGORY</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.catScroll}
          >
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const selected = category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catPill,
                    selected && { backgroundColor: meta.color + "30", borderColor: meta.color },
                  ]}
                >
                  <Text style={styles.catPillIcon}>{meta.icon}</Text>
                  <Text style={[styles.catPillText, selected && { color: meta.color }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Description */}
          <View style={styles.modalFieldWrap}>
            <Text style={styles.modalLabel}>DESCRIPTION (optional)</Text>
            <View style={styles.modalInputWrap}>
              <TextInput
                style={[styles.modalInput, { fontSize: 15 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Grocery run, Petrol"
                placeholderTextColor={C.textMuted}
                keyboardType="default"
              />
            </View>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSave} onPress={handleSave}>
              <Text style={styles.modalSaveText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Main BudgetTracker ────────────────────────────────────────────

export default function BudgetTracker() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState("Food");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [prefill, setPrefill] = useState(null);

  // ── Load summary ──────────────────────────────────────────────
  const loadSummary = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await getMonthSummary({ month, year });
      setSummary(res.data);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load budget summary.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, year]);

  useEffect(() => { loadSummary(); }, [month]);

  // ── Open add modal ────────────────────────────────────────────
  const openModal = (cat = "Food") => {
    setDefaultCategory(cat);
    setScanning(false);
    setModalVisible(true);
  };
  const processReceiptImage = async (base64) => {
  setOcrLoading(true);
  try {
    const res = await scanReceipt(base64);
    setPrefill({
      amount: res.data.amount ? String(res.data.amount) : "",
      description: res.data.description || "",
      category: res.data.category || "Food",
    });
    setDefaultCategory(res.data.category || "Food");
    setScanning(true);
    setModalVisible(true);
  } catch (err) {
    Alert.alert(
      "Couldn't read receipt",
      err.message || "Please enter the expense manually.",
      [{ text: "Enter Manually", onPress: () => { setPrefill(null); setScanning(false); openModal(); } }]
    );
  } finally {
    setOcrLoading(false);
  }
};

  // ── Camera scan ───────────────────────────────────────────────
 
  const handleScan = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Camera access is required to scan receipts.");
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return;

  await processReceiptImage(result.assets[0].base64);
};
  // ── Gallery pick ──────────────────────────────────────────────
 const handleGallery = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    Alert.alert("Permission needed", "Gallery access is required.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return;

  await processReceiptImage(result.assets[0].base64);
};

  // ── Save expense ──────────────────────────────────────────────
  const handleSaveExpense = async ({ amount, category, description }) => {
    setSaving(true);
    setModalVisible(false);
    try {
      const res = await addExpense({
        amount,
        category,
        description,
        source: scanning ? "scan" : "manual",
        date: new Date().toISOString(),
      });

      // Trigger local notifications from server response
      if (res.notifications && res.notifications.length > 0) {
        for (const notif of res.notifications) {
          if (notif.type === "exceeded" || notif.type === "overall_exceeded") {
            await sendLocalNotification(
              "🚨 Budget Exceeded!",
              notif.message
            );
          } else if (notif.type === "warning" || notif.type === "overall_warning") {
            await sendLocalNotification(
              "⚠️ Budget Warning",
              notif.message
            );
          }
        }
      }

      await loadSummary(false);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save expense.");
    } finally {
      setSaving(false);
      setScanning(false);
    }
  };

  // ── Overall status color ──────────────────────────────────────
  const overallColor =
    summary?.overall?.status === "exceeded" ? C.red :
    summary?.overall?.status === "warning"  ? C.amber : C.green;

  // ── Render ────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Budget Tracker</Text>
          <Text style={styles.headerSub}>
            {MONTHS[month - 1]} {year}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() =>
            Alert.alert("Add Expense", "How do you want to add?", [
              { text: "📷 Scan Receipt", onPress: handleScan },
              { text: "🖼 From Gallery", onPress: handleGallery },
              { text: "✏️ Manual Entry", onPress: () => openModal() },
              { text: "Cancel", style: "cancel" },
            ])
          }
        >
          <Text style={styles.scanBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Month selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monthRow}
      >
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMonth(i + 1)}
            style={[
              styles.monthPill,
              month === i + 1 && styles.monthPillActive,
            ]}
          >
            <Text
              style={[
                styles.monthPillText,
                month === i + 1 && styles.monthPillTextActive,
              ]}
            >
              {m.slice(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={styles.loaderText}>Loading your budget...</Text>
        </View>
      ) : !summary ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No budget plan found</Text>
          <Text style={styles.emptyDesc}>
            Create a budget plan in Budget Maker first, then come back to track your spending.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadSummary(false); }}
              tintColor={C.accent}
            />
          }
        >
          {/* Overall card */}
          <View
            style={[
              styles.overallCard,
              { borderColor: overallColor + "60" },
            ]}
          >
            <View style={styles.overallTop}>
              <View>
                <Text style={styles.overallLabel}>Total spent this month</Text>
                <Text style={[styles.overallAmt, { color: overallColor }]}>
                  ₹{summary.overall.totalSpent.toLocaleString("en-IN")}
                </Text>
                <Text style={styles.overallSub}>
                  of ₹{summary.overall.totalIncome.toLocaleString("en-IN")} income
                </Text>
              </View>
              <View style={styles.overallPctWrap}>
                <Text style={[styles.overallPct, { color: overallColor }]}>
                  {summary.overall.pct}%
                </Text>
                <Text style={styles.overallPctSub}>used</Text>
              </View>
            </View>

            <ProgressBar pct={summary.overall.pct} color={overallColor} height={8} />

            <View style={styles.overallFooter}>
              <Text style={styles.overallRemLabel}>Remaining</Text>
              <Text style={[styles.overallRemAmt, { color: overallColor }]}>
                ₹{summary.overall.remaining.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Status summary pills */}
          <View style={styles.statusRow}>
            {["exceeded", "warning", "safe"].map((s) => {
              const count = summary.categories.filter((c) => c.status === s || (s === "safe" && (c.status === "safe" || c.status === "moderate"))).length;
              const color = s === "exceeded" ? C.red : s === "warning" ? C.amber : C.green;
              const bg = s === "exceeded" ? C.redSoft : s === "warning" ? C.amberSoft : C.greenSoft;
              const label = s === "exceeded" ? "Exceeded" : s === "warning" ? "Warning" : "On track";
              return (
                <View key={s} style={[styles.statusSummaryPill, { backgroundColor: bg, borderColor: color + "40" }]}>
                  <Text style={[styles.statusSummaryCount, { color }]}>{count}</Text>
                  <Text style={[styles.statusSummaryLabel, { color }]}>{label}</Text>
                </View>
              );
            })}
          </View>

          {/* Category cards */}
          <Text style={styles.sectionTitle}>Category breakdown</Text>
          {summary.categories
            .sort((a, b) => b.pct - a.pct)
            .map((cat) => (
              <CategoryCard
                key={cat.category}
                data={cat}
                onAddPress={openModal}
              />
            ))}

          {saving && (
            <View style={styles.savingBanner}>
              <ActivityIndicator color={C.accent} size="small" />
              <Text style={styles.savingText}>Saving expense...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add expense modal */}
      <AddExpenseModal
      visible={modalVisible}
      onClose={() => { setModalVisible(false); setScanning(false); setPrefill(null); }}
      onSave={handleSaveExpense}
      defaultCategory={defaultCategory}
      scanning={scanning}
      prefill={prefill}
    />
    {ocrLoading && (
          <View style={styles.ocrOverlay}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={styles.ocrOverlayText}>Reading receipt...</Text>
          </View>
        )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    paddingTop: Platform.OS === "android" ? 48 : 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  headerTitle: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: C.textSub, marginTop: 2 },
  scanBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scanBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Month pills
  monthRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  monthPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthPillActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  monthPillText: { fontSize: 12, color: C.textSub, fontWeight: "600" },
  monthPillTextActive: { color: C.accent },

  // Loader & empty
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { color: C.textSub, fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: C.textSub, textAlign: "center", lineHeight: 22 },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Overall card
  overallCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  overallTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  overallLabel: { fontSize: 13, color: C.textSub, fontWeight: "600", marginBottom: 4 },
  overallAmt: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  overallSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  overallPctWrap: { alignItems: "flex-end", justifyContent: "center" },
  overallPct: { fontSize: 28, fontWeight: "900" },
  overallPctSub: { fontSize: 11, color: C.textMuted },
  overallFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  overallRemLabel: { fontSize: 13, color: C.textSub },
  overallRemAmt: { fontSize: 14, fontWeight: "800" },

  // Progress bar
  progressBg: {
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  progressFill: { borderRadius: 4 },

  // Status row
  statusRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statusSummaryPill: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statusSummaryCount: { fontSize: 22, fontWeight: "900" },
  statusSummaryLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },

  // Section title
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  // Category card
  catCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  catHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  catLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  catIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catIcon: { fontSize: 20 },
  catName: { fontSize: 15, fontWeight: "700", color: C.text },
  catCount: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  catRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.accent,
  },
  addBtnText: { fontSize: 18, color: C.accent, fontWeight: "700", lineHeight: 22 },
  catFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  catSpentLabel: { fontSize: 11, color: C.textMuted, marginBottom: 2 },
  catSpentAmt: { fontSize: 16, fontWeight: "800" },
  catPctLabel: { fontSize: 15, fontWeight: "800", color: C.text },
  catPctSub: { fontSize: 10, color: C.textMuted },
  catLimitAmt: { fontSize: 14, fontWeight: "600", color: C.textSub },
  catRemain: {
    fontSize: 11,
    color: C.green,
    marginTop: 6,
    fontWeight: "600",
  },

  // Saving banner
  savingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.accentSoft,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.accent,
  },
  savingText: { color: C.accent, fontSize: 14, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    marginBottom: 20,
  },
  modalFieldWrap: { marginBottom: 16 },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    height: 52,
  },
  modalPrefix: { fontSize: 18, color: C.textSub, marginRight: 6, fontWeight: "700" },
  modalInput: { flex: 1, fontSize: 20, color: C.text, fontWeight: "700" },
  catScroll: { marginBottom: 16 },
  catPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  catPillIcon: { fontSize: 14 },
  catPillText: { fontSize: 13, color: C.textSub, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCancelText: { fontSize: 15, fontWeight: "700", color: C.textSub },
  modalSave: {
    flex: 2,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  modalSaveText: { fontSize: 15, fontWeight: "800", color: "#fff" },
  ocrOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(13,15,20,0.85)",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
},
ocrOverlayText: { color: C.text, fontSize: 14, fontWeight: "600" },
});
