import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  getOccasions,
  createOccasion,
  updateOccasion,
  deleteOccasion,
} from "../services/occasionServices";

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

const OCCASION_TYPES = [
  { key: "Birthday Party", icon: "🎂" },
  { key: "Family Gathering", icon: "👨‍👩‍👧‍👦" },
  { key: "Wedding", icon: "💍" },
  { key: "Engagement", icon: "💐" },
  { key: "Family Trip", icon: "🧳" },
  { key: "Official Trip", icon: "💼" },
  { key: "Festival", icon: "🎆" },
  { key: "Other", icon: "📌" },
];

const iconFor = (type) => OCCASION_TYPES.find((t) => t.key === type)?.icon || "📌";

export default function OccasionPlanner() {
  const [view, setView] = useState("list"); // "list" | "form"
  const [editingId, setEditingId] = useState(null);
  const [occasions, setOccasions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOccasions = useCallback(async () => {
    try {
      setError("");
      const res = await getOccasions();
      setOccasions(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load occasions");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOccasions().finally(() => setLoading(false));
  }, [fetchOccasions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOccasions();
    setRefreshing(false);
  };

  const openNewForm = () => {
    setEditingId(null);
    setView("form");
  };

  const openEditForm = (id) => {
    setEditingId(id);
    setView("form");
  };

  const handleDelete = (id, title) => {
    Alert.alert("Delete Plan", `Delete "${title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteOccasion(id);
            fetchOccasions();
          } catch (err) {
            Alert.alert("Error", err.message);
          }
        },
      },
    ]);
  };

  const handleSaved = () => {
    setView("list");
    fetchOccasions();
  };

  if (view === "form") {
    return (
      <OccasionForm
        occasion={editingId ? occasions.find((o) => o._id === editingId) : null}
        onSaved={handleSaved}
        onCancel={() => setView("list")}
      />
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Occasion Plans</Text>
          <Text style={styles.subHeader}>Budget for events, trips & celebrations</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={openNewForm}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchOccasions}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : occasions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No occasion plans yet</Text>
          <Text style={styles.emptyText}>
            Plan a budget for a birthday, wedding, trip, or festival — tap "+ New" to start.
          </Text>
        </View>
      ) : (
        occasions.map((o) => (
          <View key={o._id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardIcon}>{iconFor(o.occasionType)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <Text style={styles.cardType}>{o.occasionType}</Text>
              </View>
            </View>

            {o.date && (
              <Text style={styles.cardDate}>
                📅 {new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            )}

            <View style={styles.cardStatsRow}>
              <Stat label="Total Budget" value={`₹${(o.totalBudget || 0).toLocaleString("en-IN")}`} highlight />
              <Stat label="Guests" value={o.guestCount || 0} />
              <Stat
                label="Per Head"
                value={`₹${Math.round(o.perHeadCost || 0).toLocaleString("en-IN")}`}
              />
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.editBtn} onPress={() => openEditForm(o._id)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(o._id, o.title)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function OccasionForm({ occasion, onSaved, onCancel }) {
  const isEdit = !!occasion;
  const [title, setTitle] = useState(occasion?.title || "");
  const [occasionType, setOccasionType] = useState(occasion?.occasionType || "Birthday Party");
  const [date, setDate] = useState(
    occasion?.date ? new Date(occasion.date).toISOString().split("T")[0] : ""
  );
  const [guestCount, setGuestCount] = useState(occasion?.guestCount?.toString() || "");
  const [categories, setCategories] = useState(
    occasion?.categories?.length ? occasion.categories : [{ name: "", amount: "" }]
  );
  const [notes, setNotes] = useState(occasion?.notes || "");
  const [saving, setSaving] = useState(false);

  const totalBudget = categories.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
  const guests = parseInt(guestCount) || 0;
  const perHead = guests > 0 ? totalBudget / guests : 0;

  const updateCategory = (index, field, value) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const addCategory = () => setCategories([...categories, { name: "", amount: "" }]);

  const removeCategory = (index) => {
    if (categories.length === 1) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing info", "Please enter a title for this plan.");
      return;
    }
    const validCategories = categories
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), amount: parseFloat(c.amount) || 0 }));

    const payload = {
      title: title.trim(),
      occasionType,
      date: date || undefined,
      guestCount: guests,
      categories: validCategories,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateOccasion(occasion._id, payload);
      } else {
        await createOccasion(payload);
      }
      onSaved();
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>{isEdit ? "Edit Plan" : "New Occasion Plan"}</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Priya's Wedding, Goa Trip 2026"
        placeholderTextColor={C.textSub}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Occasion Type</Text>
      <View style={styles.typeGrid}>
        {OCCASION_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeChip, occasionType === t.key && styles.typeChipActive]}
            onPress={() => setOccasionType(t.key)}
          >
            <Text style={styles.typeChipIcon}>{t.icon}</Text>
            <Text
              style={[styles.typeChipText, occasionType === t.key && styles.typeChipTextActive]}
            >
              {t.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={C.textSub}
        value={date}
        onChangeText={setDate}
      />

      <Text style={styles.label}>Guest Count</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 50"
        placeholderTextColor={C.textSub}
        keyboardType="numeric"
        value={guestCount}
        onChangeText={setGuestCount}
      />

      <Text style={styles.label}>Budget Categories</Text>
      {categories.map((c, i) => (
        <View key={i} style={styles.categoryRow}>
          <TextInput
            style={[styles.input, styles.categoryNameInput]}
            placeholder="e.g. Venue, Catering"
            placeholderTextColor={C.textSub}
            value={c.name}
            onChangeText={(v) => updateCategory(i, "name", v)}
          />
          <TextInput
            style={[styles.input, styles.categoryAmountInput]}
            placeholder="₹0"
            placeholderTextColor={C.textSub}
            keyboardType="numeric"
            value={c.amount?.toString()}
            onChangeText={(v) => updateCategory(i, "amount", v)}
          />
          <TouchableOpacity onPress={() => removeCategory(i)} style={styles.removeCatBtn}>
            <Text style={styles.removeCatBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={styles.addCatBtn} onPress={addCategory}>
        <Text style={styles.addCatBtnText}>+ Add Category</Text>
      </TouchableOpacity>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Total Budget</Text>
            <Text style={styles.summaryValue}>₹{totalBudget.toLocaleString("en-IN")}</Text>
          </View>
          <View>
            <Text style={styles.summaryLabel}>Per Head</Text>
            <Text style={styles.summaryValue}>
              ₹{guests > 0 ? Math.round(perHead).toLocaleString("en-IN") : "—"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Any extra details..."
        placeholderTextColor={C.textSub}
        multiline
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>{isEdit ? "Update Plan" : "Save Plan"}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  header: { fontSize: 22, fontWeight: "700", color: C.text },
  subHeader: { fontSize: 13, color: C.textSub, marginTop: 2 },
  cancelText: { color: C.textSub, fontSize: 14 },

  newBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  newBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

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
  retryBtn: { backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  retryBtnText: { color: "#fff", fontWeight: "600" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: C.textSub, fontSize: 13, textAlign: "center", paddingHorizontal: 30 },

  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 14,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cardIcon: { fontSize: 28, marginRight: 10 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "700" },
  cardType: { color: C.textSub, fontSize: 12, marginTop: 2 },
  cardDate: { color: C.textSub, fontSize: 12, marginBottom: 10 },

  cardStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statLabel: { color: C.textSub, fontSize: 11 },
  statValue: { color: C.text, fontSize: 14, fontWeight: "700", marginTop: 2 },

  cardActions: { flexDirection: "row", gap: 10 },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  editBtnText: { color: C.accent, fontSize: 13, fontWeight: "700" },
  deleteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  deleteBtnText: { color: C.red, fontSize: 13, fontWeight: "700" },

  label: { color: C.text, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 14,
  },
  notesInput: { minHeight: 80, textAlignVertical: "top" },

  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  typeChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  typeChipIcon: { fontSize: 14 },
  typeChipText: { color: C.textSub, fontSize: 12, fontWeight: "600" },
  typeChipTextActive: { color: "#fff" },

  categoryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  categoryNameInput: { flex: 2 },
  categoryAmountInput: { flex: 1 },
  removeCatBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.red,
    alignItems: "center",
    justifyContent: "center",
  },
  removeCatBtnText: { color: C.red, fontWeight: "700" },

  addCatBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  addCatBtnText: { color: C.accent, fontSize: 12, fontWeight: "700" },

  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginTop: 16,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { color: C.textSub, fontSize: 12, marginBottom: 4 },
  summaryValue: { color: C.text, fontSize: 18, fontWeight: "700" },

  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});