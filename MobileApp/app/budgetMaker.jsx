import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
} from "react-native";
import { saveBudgetPlan } from "./services/budgetMakerService";

const { width } = Dimensions.get("window");

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  bg: "#0D0F14",
  surface: "#161A23",
  card: "#1E2330",
  border: "#2A3045",
  accent: "#6C63FF",
  accentSoft: "#2D2B55",
  green: "#2ECC71",
  greenSoft: "#1A3D2B",
  red: "#E74C3C",
  redSoft: "#3D1A1A",
  amber: "#F39C12",
  amberSoft: "#3D2E0A",
  text: "#FFFFFF",
  textSub: "#8892A4",
  textMuted: "#4A5568",
};

const STEPS = [
  { id: 0, label: "Income",    icon: "💼" },
  { id: 1, label: "Housing",   icon: "🏠" },
  { id: 2, label: "Transport", icon: "🚗" },
  { id: 3, label: "Food",      icon: "🍽️" },
  { id: 4, label: "Health",    icon: "❤️" },
  { id: 5, label: "Savings",   icon: "🏦" },
  { id: 6, label: "Summary",   icon: "📊" },
];

// ─── Animated Input Field ─────────────────────────────────────────
function AnimatedField({
  label,
  value,
  onChangeText,
  placeholder,
  prefix = "₹",
  keyboardType = "numeric",
  hint,
}) {
  const focused = useRef(new Animated.Value(0)).current;

  const onFocus = () =>
    Animated.spring(focused, {
      toValue: 1,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();

  const onBlur = () =>
    Animated.spring(focused, {
      toValue: 0,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();

  const borderColor = focused.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.accent],
  });
  const bgColor = focused.interpolate({
    inputRange: [0, 1],
    outputRange: [C.card, "#1A1E2E"],
  });

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View
        style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}
      >
        <Text style={styles.prefix}>{prefix}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          keyboardType={keyboardType}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </Animated.View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Percentage Field with animated bar ──────────────────────────
function PercentField({ label, value, onChangeText, hint }) {
  const pct = parseFloat(value) || 0;
  const barAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(barAnim, {
      toValue: Math.min(pct / 100, 1),
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [pct]);

  const barColor = pct > 80 ? C.red : pct > 50 ? C.amber : C.green;
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.rowBetween}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.pctBadge, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={styles.pctBarBg}>
        <Animated.View
          style={[styles.pctBarFill, { width: barWidth, backgroundColor: barColor }]}
        />
      </View>
      <View
        style={[
          styles.inputWrap,
          { borderColor: C.border, backgroundColor: C.card, marginTop: 8 },
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={C.textMuted}
          keyboardType="numeric"
        />
        <Text style={styles.prefix}>%</Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Step Card wrapper ────────────────────────────────────────────
function StepCard({ children, title, subtitle, slideAnim }) {
  return (
    <Animated.View
      style={[
        styles.stepCard,
        {
          opacity: slideAnim,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle ? <Text style={styles.stepSub}>{subtitle}</Text> : null}
      {children}
    </Animated.View>
  );
}

// ─── Summary Row with animated bar ───────────────────────────────
function SummaryRow({ label, amount, total, color, icon }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const barAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(barAnim, {
      toValue: Math.min(pct / 100, 1),
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [pct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.summaryRow}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <Text style={styles.rowIcon}>{icon}</Text>
          <Text style={styles.summaryLabel}>{label}</Text>
        </View>
        <View style={styles.rowCenter}>
          <Text style={[styles.summaryAmount, { color }]}>
            ₹{Number(amount).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.summaryPct}> · {pct.toFixed(0)}%</Text>
        </View>
      </View>
      <View style={styles.summaryBarBg}>
        <Animated.View
          style={[styles.summaryBarFill, { width: barWidth, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// ─── Plan Name Modal ──────────────────────────────────────────────
function PlanNameInput({ value, onChange }) {
  const focused = useRef(new Animated.Value(0)).current;

  const borderColor = focused.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.accent],
  });

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>Plan Name</Text>
      <Animated.View
        style={[
          styles.inputWrap,
          { borderColor, backgroundColor: C.card },
        ]}
      >
        <TextInput
          style={[styles.input, { fontSize: 15 }]}
          value={value}
          onChangeText={onChange}
          placeholder="e.g. July 2026 Budget"
          placeholderTextColor={C.textMuted}
          keyboardType="default"
          onFocus={() =>
            Animated.spring(focused, { toValue: 1, useNativeDriver: false }).start()
          }
          onBlur={() =>
            Animated.spring(focused, { toValue: 0, useNativeDriver: false }).start()
          }
        />
      </Animated.View>
    </View>
  );
}

// ─── Main BudgetMaker Component ───────────────────────────────────
export default function BudgetMaker({ onSaved }) {
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [planName, setPlanName] = useState("My Budget Plan");

  // Form state
  const [form, setForm] = useState({
    salary: "",
    otherIncome: "",
    rent: "",
    utilities: "",
    emi: "",
    fuelTransport: "",
    vehicleEmi: "",
    groceries: "",
    diningOut: "",
    healthInsurance: "",
    medicalExpenses: "",
    savingsPct: "20",
    investmentPct: "10",
    entertainmentBudget: "",
    miscBudget: "",
  });

  const set = useCallback(
    (key) => (val) => setForm((f) => ({ ...f, [key]: val })),
    []
  );

  // ── Computed values ─────────────────────────────────────────────
  const totalIncome =
    (parseFloat(form.salary) || 0) + (parseFloat(form.otherIncome) || 0);

  const expenses = {
    Housing:
      (parseFloat(form.rent) || 0) +
      (parseFloat(form.utilities) || 0) +
      (parseFloat(form.emi) || 0),
    Transport:
      (parseFloat(form.fuelTransport) || 0) +
      (parseFloat(form.vehicleEmi) || 0),
    Food:
      (parseFloat(form.groceries) || 0) + (parseFloat(form.diningOut) || 0),
    Health:
      (parseFloat(form.healthInsurance) || 0) +
      (parseFloat(form.medicalExpenses) || 0),
    Savings: Math.round(
      totalIncome * ((parseFloat(form.savingsPct) || 0) / 100)
    ),
    Investments: Math.round(
      totalIncome * ((parseFloat(form.investmentPct) || 0) / 100)
    ),
    Entertainment: parseFloat(form.entertainmentBudget) || 0,
    Misc: parseFloat(form.miscBudget) || 0,
  };

  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const remaining = totalIncome - totalExpenses;
  const remainingPct =
    totalIncome > 0 ? ((remaining / totalIncome) * 100).toFixed(1) : 0;

  // ── Step animation ──────────────────────────────────────────────
  const animateTo = (next) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: next / (STEPS.length - 1),
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(0);
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 100,
        friction: 12,
        useNativeDriver: false,
      }).start();
    });
  };

  const next = () => {
    if (step === 0 && !form.salary) {
      Alert.alert("Required", "Please enter your monthly salary to continue.");
      return;
    }
    if (step < STEPS.length - 1) animateTo(step + 1);
  };
  const prev = () => {
    if (step > 0) animateTo(step - 1);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ── Save handler ────────────────────────────────────────────────
  const handleSave = async () => {
    if (totalIncome <= 0) {
      Alert.alert("Error", "Please enter your income before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await saveBudgetPlan({
        name: planName,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        salary: form.salary,
        otherIncome: form.otherIncome,
        rent: form.rent,
        utilities: form.utilities,
        emi: form.emi,
        fuelTransport: form.fuelTransport,
        vehicleEmi: form.vehicleEmi,
        groceries: form.groceries,
        diningOut: form.diningOut,
        healthInsurance: form.healthInsurance,
        medicalExpenses: form.medicalExpenses,
        savingsPct: form.savingsPct,
        investmentPct: form.investmentPct,
        entertainmentBudget: form.entertainmentBudget,
        miscBudget: form.miscBudget,
      });
      setSaveSuccess(true);
      Alert.alert("Saved!", "Your budget plan has been saved successfully."[
  { text: "View Tracker", onPress: () => onSaved && onSaved() }
]);
    } catch (err) {
      setSaveError(err.message || "Failed to save. Please try again.");
      Alert.alert("Error", err.message || "Failed to save budget plan.");
    } finally {
      setSaving(false);
    }
  };

  // ── Reset handler ───────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert("Reset", "Clear all fields and start over?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          setForm({
            salary: "",
            otherIncome: "",
            rent: "",
            utilities: "",
            emi: "",
            fuelTransport: "",
            vehicleEmi: "",
            groceries: "",
            diningOut: "",
            healthInsurance: "",
            medicalExpenses: "",
            savingsPct: "20",
            investmentPct: "10",
            entertainmentBudget: "",
            miscBudget: "",
          });
          setPlanName("My Budget Plan");
          setSaveSuccess(false);
          setSaveError(null);
          animateTo(0);
        },
      },
    ]);
  };

  // ── Step renderer ───────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 0: Income ─────────────────────────────────────────
      case 0:
        return (
          <StepCard
            title="What's your income?"
            subtitle="We'll use this as the foundation of your budget."
            slideAnim={slideAnim}
          >
            <AnimatedField
              label="Monthly salary (take-home)"
              value={form.salary}
              onChangeText={set("salary")}
              placeholder="50,000"
              hint="Enter your net salary after tax deductions"
            />
            <AnimatedField
              label="Other monthly income"
              value={form.otherIncome}
              onChangeText={set("otherIncome")}
              placeholder="0"
              hint="Freelance, rent, dividends, side business, etc."
            />
            {totalIncome > 0 && (
              <View style={styles.incomeBadge}>
                <Text style={styles.incomeBadgeLabel}>
                  Total monthly income
                </Text>
                <Text style={styles.incomeBadgeAmount}>
                  ₹{totalIncome.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </StepCard>
        );

      // ── Step 1: Housing ────────────────────────────────────────
      case 1:
        return (
          <StepCard
            title="Housing costs"
            subtitle="Your biggest fixed expense — let's pin it down."
            slideAnim={slideAnim}
          >
            <AnimatedField
              label="Monthly rent / home loan EMI"
              value={form.rent}
              onChangeText={set("rent")}
              placeholder="15,000"
            />
            <AnimatedField
              label="Utilities (electricity, water, internet)"
              value={form.utilities}
              onChangeText={set("utilities")}
              placeholder="3,000"
            />
            <AnimatedField
              label="Other home EMIs / maintenance"
              value={form.emi}
              onChangeText={set("emi")}
              placeholder="0"
            />
            {expenses.Housing > 0 && (
              <View style={styles.categoryTotal}>
                <Text style={styles.categoryTotalLabel}>Housing total</Text>
                <Text style={[styles.categoryTotalAmt, { color: C.accent }]}>
                  ₹{expenses.Housing.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </StepCard>
        );

      // ── Step 2: Transport ──────────────────────────────────────
      case 2:
        return (
          <StepCard
            title="Transport"
            subtitle="Daily commute and vehicle costs."
            slideAnim={slideAnim}
          >
            <AnimatedField
              label="Fuel / public transport / cab"
              value={form.fuelTransport}
              onChangeText={set("fuelTransport")}
              placeholder="3,000"
            />
            <AnimatedField
              label="Vehicle loan EMI / insurance"
              value={form.vehicleEmi}
              onChangeText={set("vehicleEmi")}
              placeholder="0"
            />
            {expenses.Transport > 0 && (
              <View style={styles.categoryTotal}>
                <Text style={styles.categoryTotalLabel}>Transport total</Text>
                <Text style={[styles.categoryTotalAmt, { color: "#3498DB" }]}>
                  ₹{expenses.Transport.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </StepCard>
        );

      // ── Step 3: Food ───────────────────────────────────────────
      case 3:
        return (
          <StepCard
            title="Food & dining"
            subtitle="Home cooking and eating out budgets."
            slideAnim={slideAnim}
          >
            <AnimatedField
              label="Groceries & home cooking"
              value={form.groceries}
              onChangeText={set("groceries")}
              placeholder="6,000"
            />
            <AnimatedField
              label="Dining out & food delivery"
              value={form.diningOut}
              onChangeText={set("diningOut")}
              placeholder="2,000"
            />
            {expenses.Food > 0 && (
              <View style={styles.categoryTotal}>
                <Text style={styles.categoryTotalLabel}>Food total</Text>
                <Text style={[styles.categoryTotalAmt, { color: "#E67E22" }]}>
                  ₹{expenses.Food.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </StepCard>
        );

      // ── Step 4: Health ─────────────────────────────────────────
      case 4:
        return (
          <StepCard
            title="Health"
            subtitle="Insurance and medical expenses."
            slideAnim={slideAnim}
          >
            <AnimatedField
              label="Health insurance premium"
              value={form.healthInsurance}
              onChangeText={set("healthInsurance")}
              placeholder="1,500"
            />
            <AnimatedField
              label="Monthly medical / pharmacy"
              value={form.medicalExpenses}
              onChangeText={set("medicalExpenses")}
              placeholder="500"
            />
            {expenses.Health > 0 && (
              <View style={styles.categoryTotal}>
                <Text style={styles.categoryTotalLabel}>Health total</Text>
                <Text style={[styles.categoryTotalAmt, { color: C.red }]}>
                  ₹{expenses.Health.toLocaleString("en-IN")}
                </Text>
              </View>
            )}
          </StepCard>
        );

      // ── Step 5: Savings ────────────────────────────────────────
      case 5:
        return (
          <StepCard
            title="Savings & investments"
            subtitle="Pay yourself first — set your target percentages."
            slideAnim={slideAnim}
          >
            <PercentField
              label="Emergency fund / savings"
              value={form.savingsPct}
              onChangeText={set("savingsPct")}
              hint={`₹${expenses.Savings.toLocaleString("en-IN")} / month at current income`}
            />
            <PercentField
              label="Investments (MF, SIP, stocks)"
              value={form.investmentPct}
              onChangeText={set("investmentPct")}
              hint={`₹${expenses.Investments.toLocaleString("en-IN")} / month at current income`}
            />
            <AnimatedField
              label="Entertainment budget"
              value={form.entertainmentBudget}
              onChangeText={set("entertainmentBudget")}
              placeholder="2,000"
              hint="OTT, movies, hobbies, eating out with friends"
            />
            <AnimatedField
              label="Miscellaneous / personal care"
              value={form.miscBudget}
              onChangeText={set("miscBudget")}
              placeholder="1,500"
              hint="Clothing, salon, gifts, subscriptions, etc."
            />
          </StepCard>
        );

      // ── Step 6: Summary ────────────────────────────────────────
      case 6:
        return (
          <Animated.View
            style={{
              opacity: slideAnim,
              transform: [
                {
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
            }}
          >
            <Text style={styles.stepTitle}>Your budget plan</Text>
            <Text style={styles.stepSub}>
              Here's where every rupee goes each month.
            </Text>

            {/* Plan name input */}
            <PlanNameInput value={planName} onChange={setPlanName} />

            {/* Income card */}
            <View style={styles.incomeCard}>
              <View>
                <Text style={styles.incomeCardLabel}>Monthly income</Text>
                <Text style={styles.incomeCardSub}>
                  Salary + other sources
                </Text>
              </View>
              <Text style={styles.incomeCardAmount}>
                ₹{totalIncome.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Category breakdown */}
            <View style={styles.summaryBlock}>
              {[
                { label: "Housing",       amount: expenses.Housing,       color: C.accent,   icon: "🏠" },
                { label: "Transport",     amount: expenses.Transport,     color: "#3498DB",  icon: "🚗" },
                { label: "Food",          amount: expenses.Food,          color: "#E67E22",  icon: "🍽️" },
                { label: "Health",        amount: expenses.Health,        color: C.red,      icon: "❤️" },
                { label: "Savings",       amount: expenses.Savings,       color: C.green,    icon: "🏦" },
                { label: "Investments",   amount: expenses.Investments,   color: "#9B59B6",  icon: "📈" },
                { label: "Entertainment", amount: expenses.Entertainment, color: "#F1C40F",  icon: "🎬" },
                { label: "Misc",          amount: expenses.Misc,          color: C.textSub,  icon: "🔖" },
              ]
                .filter((r) => r.amount > 0)
                .map((r) => (
                  <SummaryRow key={r.label} {...r} total={totalIncome} />
                ))}
            </View>

            {/* Total expenses row */}
            <View style={styles.totalExpRow}>
              <Text style={styles.totalExpLabel}>Total allocated</Text>
              <Text style={styles.totalExpAmt}>
                ₹{totalExpenses.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Remaining / over budget card */}
            <View
              style={[
                styles.remainCard,
                {
                  borderColor: remaining >= 0 ? C.green : C.red,
                  backgroundColor: remaining >= 0 ? C.greenSoft : C.redSoft,
                },
              ]}
            >
              <View>
                <Text style={styles.remainLabel}>
                  {remaining >= 0 ? "Unallocated" : "Over budget"}
                </Text>
                <Text style={styles.remainHint}>
                  {remaining >= 0
                    ? "You can allocate this further"
                    : "Reduce some expenses"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    styles.remainAmount,
                    { color: remaining >= 0 ? C.green : C.red },
                  ]}
                >
                  {remaining < 0 ? "-" : "+"}₹
                  {Math.abs(remaining).toLocaleString("en-IN")}
                </Text>
                <Text
                  style={[
                    styles.remainPct,
                    { color: remaining >= 0 ? C.green : C.red },
                  ]}
                >
                  {remainingPct}% of income
                </Text>
              </View>
            </View>

            {/* Error message */}
            {saveError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>⚠ {saveError}</Text>
              </View>
            ) : null}

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                saving && styles.saveBtnDisabled,
                saveSuccess && styles.saveBtnSuccess,
              ]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <View style={styles.saveBtnRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.saveBtnText, { marginLeft: 10 }]}>
                    Saving...
                  </Text>
                </View>
              ) : (
                <Text style={styles.saveBtnText}>
                  {saveSuccess ? "✓ Budget Saved!" : "Save Budget Plan"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Reset button */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetBtnText}>Start Over</Text>
            </TouchableOpacity>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Budget Maker</Text>
          <Text style={styles.headerSub}>
            {STEPS[step].icon} {STEPS[step].label}
          </Text>
        </View>
        {step > 0 && (
          <TouchableOpacity onPress={handleReset} style={styles.resetIcon}>
            <Text style={styles.resetIconText}>↺</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>

      {/* Step counter */}
      <View style={styles.stepCounter}>
        <Text style={styles.stepCountText}>
          Step {step + 1} of {STEPS.length}
        </Text>
      </View>

      {/* Step pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {STEPS.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => animateTo(s.id)}
            style={[
              styles.pill,
              step === s.id && styles.pillActive,
              s.id < step && styles.pillDone,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                step === s.id && styles.pillTextActive,
                s.id < step && styles.pillTextDone,
              ]}
            >
              {s.id < step ? "✓" : s.icon} {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Form content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}

          {/* Navigation buttons */}
          <View style={styles.navRow}>
            {step > 0 && (
              <TouchableOpacity
                style={styles.navBack}
                onPress={prev}
                activeOpacity={0.8}
              >
                <Text style={styles.navBackText}>← Back</Text>
              </TouchableOpacity>
            )}
            {step < STEPS.length - 1 && (
              <TouchableOpacity
                style={[styles.navNext, step === 0 && { flex: 1 }]}
                onPress={next}
                activeOpacity={0.85}
              >
                <Text style={styles.navNextText}>
                  {step === STEPS.length - 2 ? "See Summary →" : "Next →"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
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
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, color: C.textSub, marginTop: 2 },
  resetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  resetIconText: { fontSize: 18, color: C.textSub },

  // Progress
  progressBg: {
    height: 3,
    backgroundColor: C.border,
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressFill: { height: 3, backgroundColor: C.accent, borderRadius: 2 },

  // Step counter
  stepCounter: { paddingHorizontal: 20, paddingTop: 6 },
  stepCountText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },

  // Pills
  pillRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: C.accentSoft, borderColor: C.accent },
  pillDone: { backgroundColor: C.greenSoft, borderColor: C.green },
  pillText: { fontSize: 12, color: C.textSub, fontWeight: "600" },
  pillTextActive: { color: C.accent },
  pillTextDone: { color: C.green },

  // Scroll
  scrollContent: { padding: 20, paddingBottom: 60 },

  // Step card
  stepCard: { marginBottom: 8 },
  stepTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  stepSub: {
    fontSize: 14,
    color: C.textSub,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Fields
  fieldWrap: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSub,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  prefix: {
    fontSize: 16,
    color: C.textSub,
    marginRight: 6,
    fontWeight: "600",
  },
  input: { flex: 1, fontSize: 18, color: C.text, fontWeight: "700" },
  hint: { fontSize: 12, color: C.textMuted, marginTop: 6 },

  // Row utils
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  // Percent field
  pctBadge: { fontSize: 15, fontWeight: "800" },
  pctBarBg: {
    height: 6,
    backgroundColor: C.border,
    borderRadius: 3,
    marginVertical: 10,
    overflow: "hidden",
  },
  pctBarFill: { height: 6, borderRadius: 3 },

  // Income badge (step 0)
  incomeBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accent + "50",
  },
  incomeBadgeLabel: { fontSize: 13, color: C.accent, fontWeight: "600" },
  incomeBadgeAmount: { fontSize: 20, color: C.accent, fontWeight: "800" },

  // Category total (steps 1-4)
  categoryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryTotalLabel: { fontSize: 13, color: C.textSub, fontWeight: "600" },
  categoryTotalAmt: { fontSize: 16, fontWeight: "800" },

  // Income card (summary)
  incomeCard: {
    backgroundColor: C.accentSoft,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.accent + "40",
  },
  incomeCardLabel: {
    fontSize: 14,
    color: C.accent,
    fontWeight: "700",
    marginBottom: 2,
  },
  incomeCardSub: { fontSize: 11, color: C.textMuted },
  incomeCardAmount: { fontSize: 24, color: C.accent, fontWeight: "900" },

  // Summary block
  summaryBlock: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryRow: { marginBottom: 16 },
  rowIcon: { fontSize: 16, marginRight: 8 },
  summaryLabel: { fontSize: 14, color: C.text, fontWeight: "600" },
  summaryAmount: { fontSize: 14, fontWeight: "800" },
  summaryPct: { fontSize: 12, color: C.textSub },
  summaryBarBg: {
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: "hidden",
  },
  summaryBarFill: { height: 4, borderRadius: 2 },

  // Total expenses row
  totalExpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  totalExpLabel: { fontSize: 13, color: C.textSub, fontWeight: "600" },
  totalExpAmt: { fontSize: 14, color: C.text, fontWeight: "800" },

  // Remaining card
  remainCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
  },
  remainLabel: { fontSize: 15, color: C.text, fontWeight: "800" },
  remainHint: { fontSize: 12, color: C.textSub, marginTop: 2 },
  remainAmount: { fontSize: 22, fontWeight: "900" },
  remainPct: { fontSize: 12, fontWeight: "600", marginTop: 2 },

  // Error box
  errorBox: {
    backgroundColor: C.redSoft,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.red + "50",
  },
  errorText: { color: C.red, fontSize: 13, fontWeight: "600" },

  // Save button
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnSuccess: { backgroundColor: C.green },
  saveBtnRow: { flexDirection: "row", alignItems: "center" },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },

  // Reset button
  resetBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  resetBtnText: { fontSize: 15, fontWeight: "700", color: C.textSub },

  // Nav buttons
  navRow: { flexDirection: "row", gap: 12, marginTop: 28 },
  navBack: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  navBackText: { fontSize: 15, fontWeight: "700", color: C.textSub },
  navNext: {
    flex: 2,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  navNextText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});