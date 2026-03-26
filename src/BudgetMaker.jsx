import React, { useState, useCallback, useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Slider from "@react-native-community/slider";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { apiFetch } from "./api";
// ----------------------------- Constants -----------------------------
const PITFALLS = {
  hiddenCosts:      { title: "Overlooked Hidden Costs",       color: "#f59e0b", emoji: "👁",  body: "Hidden costs field is ₹0. Bank charges, AMC fees, maintenance, late fines are easy to forget." },
  underRisk:        { title: "Underestimated Risk",           color: "#ef4444", emoji: "🎲",  body: "Scope creep buffer is under 5%. Set at least 10–15% for plans longer than 1 month." },
  optimism:         { title: "Optimistic Income Projection",  color: "#f59e0b", emoji: "🌈",  body: "Income certainty is 100%. Add a practical uncertainty margin." },
  scopeCreep:       { title: "Scope Creep Not Budgeted",      color: "#f59e0b", emoji: "📈",  body: "No scope creep buffer. Unplanned additions can hurt savings." },
  deficit:          { title: "Budget is in Deficit",          color: "#ef4444", emoji: "🚨",  body: "Expenses exceed net income. Plan is not viable as-is." },
  lowSavings:       { title: "Savings Rate Below 10%",        color: "#f59e0b", emoji: "💸",  body: "Savings rate under 10% leaves little margin for emergencies." },
  noEmergencyFund:  { title: "No Emergency Fund Targeted",    color: "#ef4444", emoji: "🏚",  body: "Emergency fund months is 0. Target at least 3–6 months." },
  inflationIgnored: { title: "Inflation Not Modelled",        color: "#6366f1", emoji: "📉",  body: "Inflation is 0%. Real costs rise over time." },
  poorData:         { title: "Relying on Estimates",          color: "#6366f1", emoji: "📋",  body: "Verify values using bank statements for better accuracy." },
  fixedAssumptions: { title: "Fixed Assumptions Risk",        color: "#6366f1", emoji: "📌",  body: "No review date set. Budgets need periodic review." },
  debtToIncome:     { title: "High Debt-to-Income Ratio",     color: "#ef4444", emoji: "⚖️",  body: "Debt repayments exceed healthy ratio thresholds." },
  noGoals:          { title: "No Financial Goals Set",        color: "#6366f1", emoji: "🎯",  body: "No priority goals selected." },
  taxNotPlanned:    { title: "Tax Not Planned",               color: "#f59e0b", emoji: "🏛",  body: "Tax deducted is ₹0. Verify take-home using payslip." },
  concentrationRisk:{ title: "Single Income Source",          color: "#6366f1", emoji: "🥚",  body: "Only one income source increases concentration risk." },
};
const CONSTRAINT_TAGS = {
  policy:  ["RERA Compliance","GST Filing","PF / ESI Deduction","Org Spending Cap","Travel Reimbursement","Gratuity Provision","FEMA Limits","80D Medical Deduction","NPS Contribution"],
  goals:   ["🏠 Buy Home","🎓 Education","✈️ Travel","👶 Child Fund","🧓 Retirement","🚗 Vehicle","💊 Medical Fund","💼 Business","🌍 Immigration"],
  resource:["Time-boxed Budget","Team Budget","Project Budget","Department Cap","Vendor Contract Lock","Seasonal Constraint","Grant-Funded","Board Approval Required"],
};
const AUDIT_ITEMS = [
  { id: "hidden",    label: "Hidden costs verified from statements" },
  { id: "risk",      label: "Worst-case risk modelled, buffer >= 10%" },
  { id: "optimism",  label: "Income certainty is realistic (not 100%)" },
  { id: "scope",     label: "Scope creep buffer and review date set" },
  { id: "poorData",  label: "Data verified against bank statements" },
  { id: "fixed",     label: "Assumptions documented and review date set" },
  { id: "goals",     label: "At least one priority goal selected" },
  { id: "legal",     label: "Policy/legal/tax fields validated" },
];
const rupee = (n) => "₹" + Math.round(Number(n || 0)).toLocaleString("en-IN");
const pct = (n) => `${Number(n || 0).toFixed(1)}%`;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function initFormState() {
  return {
    income: "", income2: "", incomeCertainty: 85,
    workHoursPerMonth: 160, contractType: "permanent", noticePeriodDays: 30,
    startDate: new Date().toISOString().split("T")[0], endDate: "", period: "1",
    rent: "", utilities: "", insurance: "", internet: "", subscriptions: "",
    schoolFees: "", houseHelp: "", otherFixed: "",
    groceries: "", transport: "", entertainment: "", healthcare: "",
    clothing: "", education: "", personalCare: "", misc: "",
    emi: "", creditCard: "", personalLoan: "", otherDebt: "",
    taxRegime: "new", taxDeducted: "", sec80c: "", sec80d: "",
    npsContribution: "", gstApplicable: false, activePolicies: [],
    savingsGoal: "", investment: "", sipAmount: "", emergencyMonths: 3,
    riskProfile: "Medium", goalHorizonYears: 5, activeGoals: [],
    teamSize: "", vendorCap: "", projectBudgetCap: "", activeResourceTags: [],
    inflationPct: 5.5, scopeCreepPct: 10,
    contingencyReserve: "", hiddenCosts: "", revenueGrowthPct: 0,
    assumptions: "", dataSource: "estimate",
    auditChecklist: AUDIT_ITEMS.map((a) => ({ ...a, checked: false })),
  };
}
// ----------------------------- PDF Export -----------------------------
async function exportToPDF(data, summary) {
  const rows = (obj, currency = true) =>
    Object.entries(obj || {})
      .map(([k, v]) => {
        const key = k.replace(/([A-Z])/g, " $1");
        const val = currency
          ? `₹${Number(v || 0).toLocaleString("en-IN")}`
          : `${v}`;
        return `<tr><td>${key}</td><td style="text-align:right">${val}</td></tr>`;
      })
      .join("");
  const html = `
  <html><head><meta charset="utf-8" />
  <style>
    body { font-family: Georgia, serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 6px; }
    h2 { margin-top: 24px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td { padding: 6px; border-bottom: 1px solid #eee; font-size: 12px; }
    .warn { margin: 8px 0; padding: 10px; border-left: 4px solid #f59e0b; background: #fff8e1; }
  </style></head><body>
    <h1>WeBudget — Budget Plan</h1>
    <p>Generated: ${new Date().toLocaleString("en-IN")} | Period: ${data.period} month(s)</p>
    <h2>Summary</h2>
    <table>
      <tr><td>Net Income</td><td style="text-align:right">${rupee(summary.netIncome)}</td></tr>
      <tr><td>Total Expenses</td><td style="text-align:right">${rupee(summary.totalExpenses)}</td></tr>
      <tr><td>Remaining</td><td style="text-align:right">${rupee(summary.remaining)}</td></tr>
      <tr><td>Health Score</td><td style="text-align:right">${summary.score}/100</td></tr>
    </table>
    <h2>Fixed Expenses</h2><table>${rows(data.fixedExpenses)}</table>
    <h2>Variable Expenses</h2><table>${rows(data.variableExpenses)}</table>
    <h2>Debt Repayment</h2><table>${rows(data.debtRepayment)}</table>
    <h2>Goals & Investment</h2><table>${rows(data.goalsAndPriorities)}</table>
    <h2>Warnings</h2>
    ${(summary.activePitfalls || []).map((p) => `<div class="warn"><b>${p.title}</b> — ${p.body}</div>`).join("") || "<p>No active warnings</p>"}
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Share Budget PDF" });
  } else {
    Alert.alert("PDF Created", `Saved at: ${uri}`);
  }
}
// ----------------------------- Main Component -----------------------------
export default function BudgetMakerForm() {
  const [form, setForm] = useState(initFormState);
  const [activeSection, setActiveSection] = useState("income");
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});
  const toastTimer = useRef(null);
  const set = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val })), []);
  const setNum = useCallback((key, val) => setForm((f) => ({ ...f, [key]: val === "" ? "" : val })), []);
  const toggleTag = useCallback((arrayKey, tag) => {
    setForm((f) => {
      const arr = f[arrayKey];
      return { ...f, [arrayKey]: arr.includes(tag) ? arr.filter((t) => t !== tag) : [...arr, tag] };
    });
  }, []);
  const toggleAudit = useCallback((id) => {
    setForm((f) => ({
      ...f,
      auditChecklist: f.auditChecklist.map((a) => (a.id === id ? { ...a, checked: !a.checked } : a)),
    }));
  }, []);
  const showToast = useCallback((msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  const n = (k) => parseFloat(form[k]) || 0;
  const summary = useCallback(() => {
    const p = parseInt(form.period, 10) || 1;
    const grossIncome = (n("income") + n("income2")) * (n("incomeCertainty") / 100) - n("taxDeducted");
    const netIncome = Math.max(0, grossIncome) * p;
    const fixed = (n("rent")+n("utilities")+n("insurance")+n("internet")+n("subscriptions")+n("schoolFees")+n("houseHelp")+n("otherFixed")) * p;
    const variable = (n("groceries")+n("transport")+n("entertainment")+n("healthcare")+n("clothing")+n("education")+n("personalCare")+n("misc")) * p;
    const debt = (n("emi")+n("creditCard")+n("personalLoan")+n("otherDebt")) * p;
    const goals = (n("savingsGoal")+n("investment")+n("sipAmount")) * p;
    const legal = (n("sec80c")/12 + n("sec80d")/12 + n("npsContribution")) * p;
    const baseExpenses = fixed + variable + debt;
    const inflated = baseExpenses * (1 + n("inflationPct") / 100);
    const scopeBuf = inflated * (n("scopeCreepPct") / 100);
    const hidden = n("hiddenCosts") * p;
    const contingency = n("contingencyReserve") * p;
    const totalExpenses = inflated + scopeBuf + hidden + contingency + goals + legal;
    const remaining = netIncome - totalExpenses;
    const savingsPct = netIncome > 0 ? Math.max(0, (remaining / netIncome) * 100) : 0;
    const spendPct = netIncome > 0 ? clamp((totalExpenses / netIncome) * 100, 0, 100) : 0;
    const debtRatio = netIncome > 0 ? (debt / (netIncome / p)) * 100 : 0;
    const emergencyTarget = (baseExpenses / p) * n("emergencyMonths");
    const activePitfalls = [];
    if (n("income") > 0) {
      if (n("hiddenCosts") === 0) activePitfalls.push(PITFALLS.hiddenCosts);
      if (n("scopeCreepPct") < 5) activePitfalls.push(PITFALLS.underRisk);
      if (n("incomeCertainty") >= 100) activePitfalls.push(PITFALLS.optimism);
      if (n("scopeCreepPct") === 0) activePitfalls.push(PITFALLS.scopeCreep);
      if (remaining < 0) activePitfalls.push(PITFALLS.deficit);
      if (savingsPct < 10 && netIncome > 0) activePitfalls.push(PITFALLS.lowSavings);
      if (n("emergencyMonths") === 0) activePitfalls.push(PITFALLS.noEmergencyFund);
      if (n("inflationPct") === 0) activePitfalls.push(PITFALLS.inflationIgnored);
      if (form.dataSource === "estimate") activePitfalls.push(PITFALLS.poorData);
      if (!form.endDate) activePitfalls.push(PITFALLS.fixedAssumptions);
      if (debtRatio > 40) activePitfalls.push(PITFALLS.debtToIncome);
      if (form.activeGoals.length === 0) activePitfalls.push(PITFALLS.noGoals);
      if (n("taxDeducted") === 0) activePitfalls.push(PITFALLS.taxNotPlanned);
      if (n("income2") === 0 && n("income") > 0) activePitfalls.push(PITFALLS.concentrationRisk);
    }
    let score = 100;
    if (remaining < 0) score -= 35;
    else if (savingsPct < 10) score -= 20;
    else if (savingsPct < 20) score -= 10;
    if (spendPct > 90) score -= 12;
    if (debtRatio > 40) score -= 10;
    const auditBonus = Math.round((form.auditChecklist.filter((a) => a.checked).length / AUDIT_ITEMS.length) * 25);
    score = clamp(score + auditBonus, 0, 100);
    return { netIncome, totalExpenses, remaining, savingsPct, spendPct, debtRatio, emergencyTarget, activePitfalls, score };
  }, [form]);
  const s = summary();
  const validate = () => {
    const errs = {};
    if (!form.income || parseFloat(form.income) <= 0) errs.income = "Primary income is required";
    if (parseFloat(form.sec80c) > 150000) errs.sec80c = "Exceeds ₹1.5L cap";
    if (form.startDate && form.endDate && form.endDate <= form.startDate) errs.endDate = "End date must be after start date";
    if (form.auditChecklist.some((a) => !a.checked)) errs.audit = "Complete the self-audit checklist";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const buildPayload = () => ({
    period: parseInt(form.period, 10),
    income: { primary: n("income"), secondary: n("income2"), certaintyPct: n("incomeCertainty"), contractType: form.contractType, noticePeriodDays: n("noticePeriodDays") },
    timeConstraints: { workHoursPerMonth: n("workHoursPerMonth"), startDate: form.startDate, endDate: form.endDate, periodMonths: parseInt(form.period, 10) },
    fixedExpenses: { rent: n("rent"), utilities: n("utilities"), insurance: n("insurance"), internet: n("internet"), subscriptions: n("subscriptions"), schoolFees: n("schoolFees"), houseHelp: n("houseHelp"), other: n("otherFixed") },
    variableExpenses: { groceries: n("groceries"), transport: n("transport"), entertainment: n("entertainment"), healthcare: n("healthcare"), clothing: n("clothing"), education: n("education"), personalCare: n("personalCare"), misc: n("misc") },
    debtRepayment: { emi: n("emi"), creditCard: n("creditCard"), personalLoan: n("personalLoan"), other: n("otherDebt") },
    legalPolicy: { taxRegime: form.taxRegime, taxDeducted: n("taxDeducted"), sec80c: n("sec80c"), sec80d: n("sec80d"), npsContribution: n("npsContribution"), gstApplicable: form.gstApplicable, activePolicies: form.activePolicies },
    goalsAndPriorities: { savingsGoal: n("savingsGoal"), investment: n("investment"), sipAmount: n("sipAmount"), emergencyFundMonths: n("emergencyMonths"), riskProfile: form.riskProfile, horizonYears: n("goalHorizonYears"), activeGoals: form.activeGoals },
    resourceConstraints: { teamSize: n("teamSize"), vendorCap: n("vendorCap"), projectBudgetCap: n("projectBudgetCap"), tags: form.activeResourceTags },
    uncertainty: { incomeCertaintyPct: n("incomeCertainty"), inflationPct: n("inflationPct"), scopeCreepPct: n("scopeCreepPct"), contingencyReserve: n("contingencyReserve"), hiddenCosts: n("hiddenCosts"), revenueGrowthPct: n("revenueGrowthPct"), assumptions: form.assumptions, dataSource: form.dataSource },
    auditChecklist: form.auditChecklist,
    summary: { netIncome: s.netIncome, totalExpenses: s.totalExpenses, remaining: s.remaining, score: s.score, pitfallCount: s.activePitfalls.length },
  });
  const handleSubmit = async () => {
    if (!validate()) {
      showToast("Please fix errors before submitting", "error");
      setActiveSection(errors.audit ? "audit" : "income");
      return;
    }
    const payload = buildPayload();
    try {
      const res = await apiFetch("/budgetmaker/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res) return;
      const data = await res.json();
      if (data.success) {
        showToast(`Budget saved! Score: ${data.summary.score}/100`);
        await exportToPDF(payload, s);
      } else {
        showToast(data.errors?.[0] || "Something went wrong", "error");
      }
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Could not connect to server", "error");
    }
  };
  const SECTIONS = [
    { id: "income", label: "Income" },
    { id: "fixed", label: "Fixed" },
    { id: "variable", label: "Variable" },
    { id: "debt", label: "Debt" },
    { id: "legal", label: "Legal" },
    { id: "goals", label: "Goals" },
    { id: "resource", label: "Resources" },
    { id: "risk", label: "Risk" },
    { id: "audit", label: "Audit" },
  ];
  const MoneyField = ({ id, label, required }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required ? " *" : ""}</Text>
      <TextInput
        value={String(form[id] ?? "")}
        onChangeText={(t) => setNum(id, t)}
        keyboardType="numeric"
        placeholder="0"
        style={[styles.input, errors[id] && styles.inputErr]}
      />
      {errors[id] ? <Text style={styles.err}>{errors[id]}</Text> : null}
    </View>
  );
  const TagGroup = ({ arrayKey, tags }) => (
    <View style={styles.tags}>
      {tags.map((tag) => {
        const active = form[arrayKey].includes(tag);
        return (
          <Pressable key={tag} onPress={() => toggleTag(arrayKey, tag)} style={[styles.tag, active && styles.tagActive]}>
            <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>WeBudget · Budget Maker (React Native)</Text>
        <View style={styles.summary}>
          <Text>Net: {rupee(s.netIncome)}</Text>
          <Text>Expenses: {rupee(s.totalExpenses)}</Text>
          <Text>Remaining: {rupee(s.remaining)}</Text>
          <Text>Score: {s.score}/100</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {SECTIONS.map((x) => (
            <Pressable
              key={x.id}
              onPress={() => setActiveSection(x.id)}
              style={[styles.secBtn, activeSection === x.id && styles.secBtnActive]}
            >
              <Text style={[styles.secBtnText, activeSection === x.id && styles.secBtnTextActive]}>{x.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {activeSection === "income" && (
          <View style={styles.card}>
            <MoneyField id="income" label="Primary Monthly Income" required />
            <MoneyField id="income2" label="Secondary Income" />
            <Text style={styles.label}>Contract Type</Text>
            <Picker selectedValue={form.contractType} onValueChange={(v) => set("contractType", v)} style={styles.picker}>
              <Picker.Item label="Permanent" value="permanent" />
              <Picker.Item label="Contract" value="contract" />
              <Picker.Item label="Freelance" value="freelance" />
            </Picker>
            <Text style={styles.label}>Income Certainty: {form.incomeCertainty}%</Text>
            <Slider minimumValue={10} maximumValue={100} step={5} value={form.incomeCertainty} onValueChange={(v) => set("incomeCertainty", v)} />
          </View>
        )}
        {activeSection === "fixed" && (
          <View style={styles.card}>
            {["rent","utilities","insurance","internet","subscriptions","schoolFees","houseHelp","otherFixed"].map((id) => (
              <MoneyField key={id} id={id} label={id} />
            ))}
          </View>
        )}
        {activeSection === "variable" && (
          <View style={styles.card}>
            {["groceries","transport","entertainment","healthcare","clothing","education","personalCare","misc"].map((id) => (
              <MoneyField key={id} id={id} label={id} />
            ))}
          </View>
        )}
        {activeSection === "debt" && (
          <View style={styles.card}>
            {["emi","creditCard","personalLoan","otherDebt"].map((id) => (
              <MoneyField key={id} id={id} label={id} />
            ))}
            <Text style={styles.meta}>Debt Ratio: {pct(s.debtRatio)}</Text>
          </View>
        )}
        {activeSection === "legal" && (
          <View style={styles.card}>
            <Text style={styles.label}>Tax Regime</Text>
            <Picker selectedValue={form.taxRegime} onValueChange={(v) => set("taxRegime", v)} style={styles.picker}>
              <Picker.Item label="New" value="new" />
              <Picker.Item label="Old" value="old" />
            </Picker>
            <MoneyField id="taxDeducted" label="Monthly TDS / Tax Deducted" />
            <MoneyField id="sec80c" label="Section 80C (Annual)" />
            <MoneyField id="sec80d" label="Section 80D (Annual)" />
            <MoneyField id="npsContribution" label="NPS Contribution / Month" />
            <View style={styles.switchRow}>
              <Text>GST Applicable</Text>
              <Switch value={form.gstApplicable} onValueChange={(v) => set("gstApplicable", v)} />
            </View>
            <Text style={styles.label}>Policies</Text>
            <TagGroup arrayKey="activePolicies" tags={CONSTRAINT_TAGS.policy} />
          </View>
        )}
        {activeSection === "goals" && (
          <View style={styles.card}>
            <MoneyField id="savingsGoal" label="Savings Goal" />
            <MoneyField id="investment" label="Investment" />
            <MoneyField id="sipAmount" label="SIP Amount" />
            <Text style={styles.label}>Priority Goals</Text>
            <TagGroup arrayKey="activeGoals" tags={CONSTRAINT_TAGS.goals} />
          </View>
        )}
        {activeSection === "resource" && (
          <View style={styles.card}>
            <MoneyField id="vendorCap" label="Vendor Cap" />
            <MoneyField id="projectBudgetCap" label="Project Budget Cap" />
            <Text style={styles.label}>Resource Tags</Text>
            <TagGroup arrayKey="activeResourceTags" tags={CONSTRAINT_TAGS.resource} />
          </View>
        )}
        {activeSection === "risk" && (
          <View style={styles.card}>
            <Text style={styles.label}>Inflation: {form.inflationPct}%</Text>
            <Slider minimumValue={0} maximumValue={20} step={0.5} value={form.inflationPct} onValueChange={(v) => set("inflationPct", v)} />
            <Text style={styles.label}>Scope Creep: {form.scopeCreepPct}%</Text>
            <Slider minimumValue={0} maximumValue={30} step={1} value={form.scopeCreepPct} onValueChange={(v) => set("scopeCreepPct", v)} />
            <MoneyField id="contingencyReserve" label="Contingency Reserve" />
            <MoneyField id="hiddenCosts" label="Hidden Costs" />
            <Text style={styles.label}>Assumptions</Text>
            <TextInput
              value={form.assumptions}
              onChangeText={(t) => set("assumptions", t)}
              multiline
              numberOfLines={4}
              style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
            />
          </View>
        )}
        {activeSection === "audit" && (
          <View style={styles.card}>
            {form.auditChecklist.map((item) => (
              <Pressable key={item.id} onPress={() => toggleAudit(item.id)} style={styles.auditRow}>
                <Text>{item.checked ? "☑" : "☐"}</Text>
                <Text style={{ flex: 1 }}>{item.label}</Text>
              </Pressable>
            ))}
            {errors.audit ? <Text style={styles.err}>{errors.audit}</Text> : null}
          </View>
        )}
        <View style={styles.warnings}>
          <Text style={styles.warningsTitle}>Live Warnings ({s.activePitfalls.length})</Text>
          {s.activePitfalls.map((p, i) => (
            <View key={`${p.title}-${i}`} style={[styles.warnCard, { borderLeftColor: p.color }]}>
              <Text style={{ fontWeight: "700" }}>{p.emoji} {p.title}</Text>
              <Text>{p.body}</Text>
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnLight]}
            onPress={() =>
              Alert.alert("Reset", "Reset all fields?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => { setForm(initFormState()); showToast("Form reset"); } },
              ])
            }
          >
            <Text>Reset</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGreen]} onPress={async () => { await exportToPDF(buildPayload(), s); showToast("PDF exported"); }}>
            <Text style={styles.btnText}>Export PDF</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnDark]} onPress={handleSubmit}>
            <Text style={styles.btnText}>Generate Budget Plan</Text>
          </Pressable>
        </View>
      </ScrollView>
      {toast && (
        <View style={[styles.toast, { backgroundColor: toast.type === "error" ? "#c0392b" : "#1a7a4a" }]}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}
// ----------------------------- Styles -----------------------------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#faf8f4" },
  content: { padding: 14, paddingBottom: 100 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  summary: { backgroundColor: "#fff", borderRadius: 10, padding: 12, gap: 4, marginBottom: 10 },
  secBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: "#ece8df", marginRight: 8 },
  secBtnActive: { backgroundColor: "#1a1a1a" },
  secBtnText: { color: "#444" },
  secBtnTextActive: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 12, marginBottom: 12, gap: 8 },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#555" },
  input: { borderWidth: 1, borderColor: "#d4d4d4", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#faf8f4" },
  inputErr: { borderColor: "#ef4444" },
  err: { color: "#ef4444", fontSize: 12 },
  picker: { backgroundColor: "#faf8f4", borderRadius: 8 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 6 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6 },
  tagActive: { borderColor: "#1a7a4a", backgroundColor: "#edf8f1" },
  tagText: { fontSize: 12, color: "#666" },
  tagTextActive: { color: "#1a7a4a", fontWeight: "700" },
  meta: { marginTop: 4, fontSize: 13, color: "#444" },
  warnings: { marginBottom: 10 },
  warningsTitle: { fontWeight: "700", marginBottom: 6 },
  warnCard: { borderLeftWidth: 4, backgroundColor: "#fff", padding: 10, borderRadius: 8, marginBottom: 8 },
  auditRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", paddingVertical: 8 },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  btn: { flex: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 8 },
  btnLight: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" },
  btnGreen: { backgroundColor: "#1a7a4a" },
  btnDark: { backgroundColor: "#1a1a1a" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 12, textAlign: "center" },
  toast: { position: "absolute", left: 16, right: 16, bottom: 18, borderRadius: 8, padding: 12, alignItems: "center" },
});
