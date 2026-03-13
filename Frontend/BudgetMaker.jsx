
const [form, setForm] = useState(initFormState);import { useState, useEffect, useCallback, useRef } from "react";

// ─── PDF Export (uses browser print with print-specific CSS) ───────────────
function exportToPDF(data, summary) {
  const win = window.open("", "_blank");
  const rows = (obj, label) =>
    Object.entries(obj)
      .map(([k, v]) => `<tr><td>${k.replace(/([A-Z])/g, " $1")}</td><td>₹${Number(v || 0).toLocaleString("en-IN")}</td></tr>`)
      .join("");

  win.document.write(`
    <html><head><title>Budget Plan</title><style>
      body{font-family:Georgia,serif;padding:32px;color:#111}
      h1{font-size:28px;margin-bottom:4px}
      h2{font-size:14px;color:#555;border-bottom:2px solid #111;padding-bottom:6px;margin-top:28px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      td{padding:7px 10px;border-bottom:1px solid #eee;font-size:13px}
      td:last-child{text-align:right;font-weight:600}
      .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0;background:#f9f9f7;padding:16px;border-radius:8px}
      .s-item label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#777}
      .s-item span{display:block;font-size:22px;font-weight:700}
      .green{color:#1a7a4a}.red{color:#c0392b}.amber{color:#d97706}
      .pitfall{background:#fff8e1;border-left:4px solid #f59e0b;padding:10px 14px;margin:6px 0;font-size:12px}
      .checklist li{font-size:12px;margin:4px 0;list-style:none;padding-left:20px;position:relative}
      .checklist li::before{content:'✓';position:absolute;left:0;color:#1a7a4a}
      @media print{button{display:none}}
    </style></head><body>
    <h1>WeBudget — Budget Plan</h1>
    <p style="font-size:12px;color:#888">Generated: ${new Date().toLocaleString("en-IN")} &nbsp;|&nbsp; Period: ${data.period} month(s)</p>
    <div class="summary">
      <div class="s-item"><label>Net Income</label><span class="amber">₹${Math.round(summary.netIncome).toLocaleString("en-IN")}</span></div>
      <div class="s-item"><label>Total Expenses</label><span>₹${Math.round(summary.totalExpenses).toLocaleString("en-IN")}</span></div>
      <div class="s-item"><label>Remaining</label><span class="${summary.remaining >= 0 ? "green" : "red"}">₹${Math.round(summary.remaining).toLocaleString("en-IN")}</span></div>
      <div class="s-item"><label>Health Score</label><span class="${summary.score >= 70 ? "green" : summary.score >= 40 ? "amber" : "red"}">${summary.score}/100</span></div>
    </div>
    <h2>Fixed Expenses</h2><table>${rows(data.fixedExpenses)}</table>
    <h2>Variable Expenses</h2><table>${rows(data.variableExpenses)}</table>
    <h2>Debt Repayment</h2><table>${rows(data.debtRepayment)}</table>
    <h2>Goals & Investment</h2><table>${rows(data.goalsAndPriorities)}</table>
    <h2>Risk & Assumptions</h2>
    <table>
      <tr><td>Income Certainty</td><td>${data.uncertainty.incomeCertaintyPct}%</td></tr>
      <tr><td>Inflation Estimate</td><td>${data.uncertainty.inflationPct}%</td></tr>
      <tr><td>Scope Creep Buffer</td><td>${data.uncertainty.scopeCreepPct}%</td></tr>
      <tr><td>Contingency Reserve</td><td>₹${Number(data.uncertainty.contingencyReserve || 0).toLocaleString("en-IN")}</td></tr>
      <tr><td>Hidden Costs</td><td>₹${Number(data.uncertainty.hiddenCosts || 0).toLocaleString("en-IN")}</td></tr>
    </table>
    ${data.uncertainty.assumptions ? `<h2>Assumptions</h2><p style="font-size:13px;line-height:1.7">${data.uncertainty.assumptions}</p>` : ""}
    <h2>Active Pitfall Warnings</h2>
    ${summary.activePitfalls.map(p => `<div class="pitfall"><strong>${p.title}</strong> — ${p.body}</div>`).join("") || "<p style='color:#777;font-size:13px'>No active warnings</p>"}
    <h2>Self-Audit Checklist</h2>
    <ul class="checklist">
      ${data.auditChecklist.filter(c => c.checked).map(c => `<li>${c.label}</li>`).join("")}
    </ul>
    <button onclick="window.print()" style="margin-top:24px;padding:10px 24px;background:#111;color:#fff;border:none;cursor:pointer;font-size:14px">Print / Save PDF</button>
    </body></html>`);
  win.document.close();
}

// ─── Pitfall definitions ───────────────────────────────────────────────────
const PITFALLS = {
  hiddenCosts:      { title: "Overlooked Hidden Costs",       color: "#f59e0b", emoji: "👁",  body: "Hidden costs field is ₹0. Bank charges, AMC fees, maintenance, late fines are easy to forget — budget experts find they add 5–8% to actual spending." },
  underRisk:        { title: "Underestimated Risk",           color: "#ef4444", emoji: "🎲",  body: "Scope creep buffer is under 5%. History shows 70%+ of budgets overrun. Set at least 10–15% for any plan longer than 1 month." },
  optimism:         { title: "Optimistic Income Projection",  color: "#f59e0b", emoji: "🌈",  body: "Income certainty is 100%. Even salaried income can face delays, deductions, or loss of job. A 10–15% uncertainty margin is prudent." },
  scopeCreep:       { title: "Scope Creep Not Budgeted",      color: "#f59e0b", emoji: "📈",  body: "No scope creep buffer. Unplanned additions — a new subscription, an event, a repair — will eat into savings without a buffer line." },
  deficit:          { title: "Budget is in Deficit",          color: "#ef4444", emoji: "🚨",  body: "Expenses exceed net income. This plan is not viable. You must cut variable costs, defer goals, or increase income before proceeding." },
  lowSavings:       { title: "Savings Rate Below 10%",        color: "#f59e0b", emoji: "💸",  body: "A savings rate under 10% leaves no margin for wealth building. The 50/30/20 rule recommends 20% minimum. Financial emergencies will hit harder." },
  noEmergencyFund:  { title: "No Emergency Fund Targeted",    color: "#ef4444", emoji: "🏚",  body: "Emergency fund months is set to 0. Without a 3–6 month expense buffer, any shock event (job loss, medical) becomes a debt spiral." },
  inflationIgnored: { title: "Inflation Not Modelled",        color: "#6366f1", emoji: "📉",  body: "Inflation is 0%. At India's 5–6% average, ₹10,000 of expenses today costs ₹10,500–₹10,600 next year. Plan for it." },
  poorData:         { title: "Relying on Estimates",          color: "#6366f1", emoji: "📋",  body: "Verify all figures against actual bank statements before saving. Memory-based budgets are typically off by 20–30%." },
  fixedAssumptions: { title: "Fixed Assumptions Risk",        color: "#6366f1", emoji: "📌",  body: "No review date set. Budgets with no scheduled review date are treated as static — but income, expenses, and goals all change over time." },
  debtToIncome:     { title: "High Debt-to-Income Ratio",     color: "#ef4444", emoji: "⚖️",  body: "Debt repayments exceed 40% of net income. RBI and lending guidelines flag this as high credit risk. Try to keep debt payments under 35%." },
  noGoals:          { title: "No Financial Goals Set",        color: "#6366f1", emoji: "🎯",  body: "No priority goals selected. Budgets without clear goals drift. Select at least one savings goal to give your plan direction and motivation." },
  taxNotPlanned:    { title: "Tax Not Planned",               color: "#f59e0b", emoji: "🏛",  body: "Tax deducted is ₹0. Even if TDS is handled by your employer, including it shows the real take-home picture. Verify with your payslip." },
  concentrationRisk:{ title: "Single Income Source",         color: "#6366f1", emoji: "🥚",  body: "All income comes from one source. A single income stream is a concentration risk. Diversify with freelancing, investments, or rental income." },
};

// ─── Constraint definitions ────────────────────────────────────────────────
const CONSTRAINT_TAGS = {
  policy:  ["RERA Compliance","GST Filing","PF / ESI Deduction","Org Spending Cap","Travel Reimbursement","Gratuity Provision","FEMA Limits","80D Medical Deduction","NPS Contribution"],
  goals:   ["🏠 Buy Home","🎓 Education","✈️ Travel","👶 Child Fund","🧓 Retirement","🚗 Vehicle","💊 Medical Fund","💼 Business","🌍 Immigration"],
  resource:["Time-boxed Budget","Team Budget","Project Budget","Department Cap","Vendor Contract Lock","Seasonal Constraint","Grant-Funded","Board Approval Required"],
};

// ─── Helpers ───────────────────────────────────────────────────────────────
const rupee  = n => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const pct    = n => (n || 0).toFixed(1) + "%";
const clamp  = (n, min, max) => Math.min(max, Math.max(min, n));

const AUDIT_ITEMS = [
  { id: "hidden",    label: "Hidden Costs — checked bank statements for annual fees, maintenance, AMC, renewal charges" },
  { id: "risk",      label: "Risk — worst-case income scenario modelled; scope creep buffer is at least 10%" },
  { id: "optimism",  label: "Optimistic Projections — income certainty is not 100%; conservative estimates used" },
  { id: "scope",     label: "Scope Creep — a buffer % is set; review date is specified in the plan" },
  { id: "poorData",  label: "Data Quality — figures verified against actual bank statements, not memory" },
  { id: "fixed",     label: "Fixed Assumptions — assumptions are documented and a review date is scheduled" },
  { id: "goals",     label: "Goals Aligned — at least one priority goal is selected and funded in this budget" },
  { id: "legal",     label: "Legal/Tax — applicable policies ticked; 80C limit not exceeded; TDS accounted for" },
];

function initFormState() {
  return {
    // Income & Resources
    income:           "", income2:       "", incomeCertainty: 85,
    workHoursPerMonth: 160, contractType: "permanent", noticePeriodDays: 30,
    startDate: new Date().toISOString().split("T")[0], endDate: "", period: "1",

    // Fixed
    rent: "", utilities: "", insurance: "", internet: "", subscriptions: "",
    schoolFees: "", houseHelp: "", otherFixed: "",

    // Variable
    groceries: "", transport: "", entertainment: "", healthcare: "",
    clothing: "", education: "", personalCare: "", misc: "",

    // Debt
    emi: "", creditCard: "", personalLoan: "", otherDebt: "",

    // Legal / Regulatory
    taxRegime: "new", taxDeducted: "", sec80c: "", sec80d: "",
    npsContribution: "", gstApplicable: false, activePolicies: [],

    // Goals
    savingsGoal: "", investment: "", sipAmount: "", emergencyMonths: 3,
    riskProfile: "Medium", goalHorizonYears: 5, activeGoals: [],

    // Resource constraints
    teamSize: "", vendorCap: "", projectBudgetCap: "", activeResourceTags: [],

    // Uncertainty / Risk
    incomeCertainty: 85, inflationPct: 5.5, scopeCreepPct: 10,
    contingencyReserve: "", hiddenCosts: "", revenueGrowthPct: 0,
    assumptions: "", dataSource: "estimate",

    // Audit
    auditChecklist: AUDIT_ITEMS.map(a => ({ ...a, checked: false })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function BudgetMakerForm() {
  const [form, setForm]           = useState(initFormState);
  const [activeSection, setActiveSection] = useState("income");
  const [toast, setToast]         = useState(null);
  const [errors, setErrors]       = useState({});
  const [submitted, setSubmitted] = useState(false);
  const toastTimer                = useRef(null);

  // ── Field updater ──────────────────────────────────────────────────────
  const set = useCallback((key, val) =>
    setForm(f => ({ ...f, [key]: val })), []);

  const setNum = useCallback((key, val) =>
    setForm(f => ({ ...f, [key]: val === "" ? "" : val })), []);

  const toggleTag = useCallback((arrayKey, tag) =>
    setForm(f => {
      const arr = f[arrayKey];
      return { ...f, [arrayKey]: arr.includes(tag) ? arr.filter(t => t !== tag) : [...arr, tag] };
    }), []);

  const toggleAudit = useCallback((id) =>
    setForm(f => ({
      ...f,
      auditChecklist: f.auditChecklist.map(a => a.id === id ? { ...a, checked: !a.checked } : a)
    })), []);

  // ── Summary calculation ────────────────────────────────────────────────
  const summary = useCallback(() => {
    const p = parseInt(form.period) || 1;
    const n = k => parseFloat(form[k]) || 0;

    const grossIncome = (n("income") + n("income2")) * (n("incomeCertainty") / 100) - n("taxDeducted");
    const netIncome   = Math.max(0, grossIncome) * p;

    const fixed = (n("rent")+n("utilities")+n("insurance")+n("internet")+
                   n("subscriptions")+n("schoolFees")+n("houseHelp")+n("otherFixed")) * p;
    const variable = (n("groceries")+n("transport")+n("entertainment")+n("healthcare")+
                      n("clothing")+n("education")+n("personalCare")+n("misc")) * p;
    const debt   = (n("emi")+n("creditCard")+n("personalLoan")+n("otherDebt")) * p;
    const goals  = (n("savingsGoal")+n("investment")+n("sipAmount")) * p;
    const legal  = (n("sec80c")/12 + n("sec80d")/12 + n("npsContribution")) * p;

    const baseExpenses = fixed + variable + debt;
    const inflated     = baseExpenses * (1 + n("inflationPct") / 100);
    const scopeBuf     = inflated * (n("scopeCreepPct") / 100);
    const hidden       = n("hiddenCosts") * p;
    const contingency  = n("contingencyReserve") * p;

    const totalExpenses = inflated + scopeBuf + hidden + contingency + goals + legal;
    const remaining     = netIncome - totalExpenses;
    const savingsPct    = netIncome > 0 ? Math.max(0, (remaining / netIncome) * 100) : 0;
    const spendPct      = netIncome > 0 ? clamp((totalExpenses / netIncome) * 100, 0, 100) : 0;
    const debtRatio     = netIncome > 0 ? (debt / (netIncome / p)) * 100 : 0;
    const emergencyTarget = (baseExpenses / p) * n("emergencyMonths");

    // Active pitfalls
    const activePitfalls = [];
    if (n("income") > 0) {
      if (n("hiddenCosts") === 0)                       activePitfalls.push(PITFALLS.hiddenCosts);
      if (n("scopeCreepPct") < 5)                       activePitfalls.push(PITFALLS.underRisk);
      if (n("incomeCertainty") >= 100)                  activePitfalls.push(PITFALLS.optimism);
      if (n("scopeCreepPct") === 0)                     activePitfalls.push(PITFALLS.scopeCreep);
      if (remaining < 0)                                activePitfalls.push(PITFALLS.deficit);
      if (savingsPct < 10 && netIncome > 0)             activePitfalls.push(PITFALLS.lowSavings);
      if (n("emergencyMonths") === 0)                   activePitfalls.push(PITFALLS.noEmergencyFund);
      if (n("inflationPct") === 0)                      activePitfalls.push(PITFALLS.inflationIgnored);
      if (form.dataSource === "estimate")               activePitfalls.push(PITFALLS.poorData);
      if (!form.endDate)                                activePitfalls.push(PITFALLS.fixedAssumptions);
      if (debtRatio > 40)                               activePitfalls.push(PITFALLS.debtToIncome);
      if (form.activeGoals.length === 0)                activePitfalls.push(PITFALLS.noGoals);
      if (n("taxDeducted") === 0)                       activePitfalls.push(PITFALLS.taxNotPlanned);
      if (n("income2") === 0 && n("income") > 0)        activePitfalls.push(PITFALLS.concentrationRisk);
    }

    // Score
    let score = 100;
    if (remaining < 0)         score -= 35;
    else if (savingsPct < 10)  score -= 20;
    else if (savingsPct < 20)  score -= 10;
    if (spendPct > 90)         score -= 12;
    if (debtRatio > 40)        score -= 10;
    const auditBonus = Math.round((form.auditChecklist.filter(a => a.checked).length / AUDIT_ITEMS.length) * 25);
    score = clamp(score + auditBonus, 0, 100);

    return { netIncome, fixed, variable, debt, goals, totalExpenses,
             remaining, savingsPct, spendPct, debtRatio, emergencyTarget,
             activePitfalls, score };
  }, [form]);

  const s = summary();

  // ── Toast ──────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = "success") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.income || parseFloat(form.income) <= 0) errs.income = "Primary income is required";
    if (parseFloat(form.sec80c) > 150000) errs.sec80c = "Exceeds ₹1.5L statutory cap";
    if (form.startDate && form.endDate && form.endDate <= form.startDate)
      errs.endDate = "End date must be after start date";
    if (form.auditChecklist.some(a => !a.checked)) errs.audit = "Complete the self-audit checklist";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validate()) {
      showToast("Please fix errors before submitting", "error");
      setActiveSection(errors.audit ? "audit" : "income");
      return;
    }
    const payload = buildPayload();
    exportToPDF(payload, s);
    showToast("✅ Budget created! PDF opened in new tab.");
    setSubmitted(true);
    // apiFetch('/api/budgetmaker/create', { method:'POST', body: JSON.stringify(payload) })
  }

  function buildPayload() {
    const n = k => parseFloat(form[k]) || 0;
    return {
      period: parseInt(form.period),
      income: { primary: n("income"), secondary: n("income2"), certaintyPct: n("incomeCertainty"), contractType: form.contractType, noticePeriodDays: n("noticePeriodDays") },
      timeConstraints: { workHoursPerMonth: n("workHoursPerMonth"), startDate: form.startDate, endDate: form.endDate, periodMonths: parseInt(form.period) },
      fixedExpenses: { rent: n("rent"), utilities: n("utilities"), insurance: n("insurance"), internet: n("internet"), subscriptions: n("subscriptions"), schoolFees: n("schoolFees"), houseHelp: n("houseHelp"), other: n("otherFixed") },
      variableExpenses: { groceries: n("groceries"), transport: n("transport"), entertainment: n("entertainment"), healthcare: n("healthcare"), clothing: n("clothing"), education: n("education"), personalCare: n("personalCare"), misc: n("misc") },
      debtRepayment: { emi: n("emi"), creditCard: n("creditCard"), personalLoan: n("personalLoan"), other: n("otherDebt") },
      legalPolicy: { taxRegime: form.taxRegime, taxDeducted: n("taxDeducted"), sec80c: n("sec80c"), sec80d: n("sec80d"), npsContribution: n("npsContribution"), gstApplicable: form.gstApplicable, activePolicies: form.activePolicies },
      goalsAndPriorities: { savingsGoal: n("savingsGoal"), investment: n("investment"), sipAmount: n("sipAmount"), emergencyFundMonths: n("emergencyMonths"), riskProfile: form.riskProfile, horizonYears: n("goalHorizonYears"), activeGoals: form.activeGoals },
      resourceConstraints: { teamSize: n("teamSize"), vendorCap: n("vendorCap"), projectBudgetCap: n("projectBudgetCap"), tags: form.activeResourceTags },
      uncertainty: { incomeCertaintyPct: n("incomeCertainty"), inflationPct: n("inflationPct"), scopeCreepPct: n("scopeCreepPct"), contingencyReserve: n("contingencyReserve"), hiddenCosts: n("hiddenCosts"), revenueGrowthPct: n("revenueGrowthPct"), assumptions: form.assumptions, dataSource: form.dataSource },
      auditChecklist: form.auditChecklist,
      summary: { netIncome: s.netIncome, totalExpenses: s.totalExpenses, remaining: s.remaining, score: s.score, pitfallCount: s.activePitfalls.length },
    };
  }

  // ── Section nav items ──────────────────────────────────────────────────
  const SECTIONS = [
    { id: "income",    label: "Income",      icon: "💰" },
    { id: "fixed",     label: "Fixed",       icon: "🏛" },
    { id: "variable",  label: "Variable",    icon: "📊" },
    { id: "debt",      label: "Debt",        icon: "⚖️" },
    { id: "legal",     label: "Legal",       icon: "📜" },
    { id: "goals",     label: "Goals",       icon: "🎯" },
    { id: "resource",  label: "Resources",   icon: "🔧" },
    { id: "risk",      label: "Risk",        icon: "🎲" },
    { id: "audit",     label: "Audit",       icon: "✅" },
  ];

  const n = k => parseFloat(form[k]) || 0;

  // ─────────────────────────────────────────────────────────────────────────
  // STYLES (inline for portability — no Tailwind compiler quirks)
  // ─────────────────────────────────────────────────────────────────────────
  const css = {
    wrap: { minHeight:"100vh", background:"#faf8f4", fontFamily:"'Georgia', serif", color:"#1a1a1a", padding:"0 0 80px" },
    topbar: { background:"#1a1a1a", color:"#faf8f4", padding:"14px 32px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 },
    topbarBrand: { fontSize:17, fontWeight:700, letterSpacing:"-.02em", display:"flex", alignItems:"center", gap:10 },
    scoreChip: (score) => ({
      background: score >= 70 ? "#1a7a4a" : score >= 40 ? "#d97706" : "#c0392b",
      color:"#fff", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:700,
    }),
    container: { maxWidth:1060, margin:"0 auto", padding:"0 24px" },
    // Summary strip
    summaryStrip: { background:"#1a1a1a", borderBottom:"3px solid #e8c84a", padding:"20px 32px", display:"flex", gap:32, overflowX:"auto" },
    sumItem: { textAlign:"center", flex:"0 0 auto" },
    sumLabel: { fontSize:9, textTransform:"uppercase", letterSpacing:".12em", color:"#888", marginBottom:4 },
    sumVal: (color) => ({ fontSize:22, fontWeight:700, color: color || "#faf8f4", letterSpacing:"-.03em" }),
    // Bar
    barWrap: { background:"#111", borderBottom:"1px solid #2a2a2a", padding:"10px 32px" },
    barTrack: { height:6, background:"#333", borderRadius:3, overflow:"hidden" },
    barFill: (pct, over) => ({ height:"100%", width:pct+"%", borderRadius:3, background: over ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#1a7a4a,#e8c84a)", transition:"width .6s cubic-bezier(.4,0,.2,1)" }),
    barLabels: { display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10, color:"#555" },
    // Nav
    navRow: { display:"flex", gap:4, padding:"16px 32px 0", borderBottom:"2px solid #e8e0d4", overflowX:"auto", background:"#faf8f4" },
    navBtn: (active) => ({ padding:"10px 16px", fontSize:12, fontWeight:700, letterSpacing:".04em", textTransform:"uppercase", background:"none", border:"none", borderBottom: active ? "3px solid #1a1a1a" : "3px solid transparent", color: active ? "#1a1a1a" : "#999", cursor:"pointer", whiteSpace:"nowrap", transition:"all .2s" }),
    // Cards
    sectionCard: { background:"#fff", border:"1px solid #e8e0d4", borderRadius:12, marginBottom:20, overflow:"hidden" },
    cardHeader: { background:"#faf8f4", borderBottom:"1px solid #e8e0d4", padding:"16px 24px", display:"flex", alignItems:"center", gap:12 },
    cardTitle: { fontSize:15, fontWeight:700, letterSpacing:"-.01em" },
    cardSub: { fontSize:11, color:"#999", marginTop:2, fontStyle:"italic" },
    cardBody: { padding:"24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 },
    fullCol: { gridColumn:"1/-1" },
    // Fields
    fieldWrap: { display:"flex", flexDirection:"column", gap:6 },
    label: { fontSize:10, textTransform:"uppercase", letterSpacing:".1em", color:"#888", display:"flex", alignItems:"center", justifyContent:"space-between" },
    badge: (color, bg) => ({ fontSize:9, padding:"2px 8px", borderRadius:20, background:bg||"#fff8e1", color:color||"#d97706", fontWeight:600 }),
    input: (err) => ({ background: err?"#fff5f5":"#faf8f4", border:`1.5px solid ${err?"#ef4444":"#ddd"}`, borderRadius:8, color:"#1a1a1a", fontFamily:"'Courier New', monospace", fontSize:14, padding:"10px 14px", width:"100%", outline:"none", boxSizing:"border-box", transition:"border .2s" }),
    inputPrefix: { position:"relative" },
    prefixSpan: { position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontFamily:"monospace", fontSize:13, color:"#999", pointerEvents:"none" },
    inputPfx: (err) => ({ background: err?"#fff5f5":"#faf8f4", border:`1.5px solid ${err?"#ef4444":"#ddd"}`, borderRadius:8, color:"#1a1a1a", fontFamily:"'Courier New', monospace", fontSize:14, padding:"10px 14px 10px 26px", width:"100%", outline:"none", boxSizing:"border-box" }),
    hint: { fontSize:10, color:"#aaa", fontStyle:"italic", lineHeight:1.5 },
    errMsg: { fontSize:10, color:"#ef4444" },
    // Range
    rangeRow: { display:"flex", alignItems:"center", gap:12 },
    rangeVal: { fontFamily:"monospace", fontSize:13, color:"#d97706", minWidth:52, textAlign:"right", fontWeight:600 },
    // Tags
    tagsWrap: { display:"flex", flexWrap:"wrap", gap:8, marginTop:4 },
    tag: (active, color) => ({ padding:"5px 12px", borderRadius:20, border:`1.5px solid ${active?(color||"#1a1a1a"):"#ddd"}`, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .2s", background:active?(color?color+"22":"#f5f5f5"):"#fff", color:active?(color||"#1a1a1a"):"#999", userSelect:"none" }),
    // Pitfall
    pitfallCard: (color) => ({ borderLeft:`4px solid ${color}`, background: color+"11", borderRadius:"0 8px 8px 0", padding:"12px 16px", marginBottom:8 }),
    pitfallTitle: { fontSize:12, fontWeight:700, marginBottom:3 },
    pitfallBody: { fontSize:11, color:"#555", lineHeight:1.6 },
    // Audit
    auditItem: (checked) => ({ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", borderRadius:8, background: checked?"#f0faf5":"#fafafa", border:`1px solid ${checked?"#1a7a4a33":"#eee"}`, cursor:"pointer", transition:"all .2s", marginBottom:8 }),
    auditCheck: { width:18, height:18, accentColor:"#1a7a4a", marginTop:1, cursor:"pointer", flexShrink:0 },
    auditLabel: (checked) => ({ fontSize:12, lineHeight:1.6, color: checked?"#1a1a1a":"#777", textDecoration:checked?"none":"none" }),
    // Submit
    submitRow: { display:"flex", gap:12, marginTop:8 },
    btnPrimary: { flex:1, background:"#1a1a1a", color:"#faf8f4", fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, letterSpacing:".04em", border:"none", borderRadius:8, padding:"14px 28px", cursor:"pointer", transition:"all .2s" },
    btnSecondary: { background:"#fff", border:"1.5px solid #ddd", color:"#666", fontFamily:"monospace", fontSize:11, borderRadius:8, padding:"14px 18px", cursor:"pointer", transition:"all .2s" },
    btnPDF: { background:"#1a7a4a", color:"#fff", fontFamily:"Georgia,serif", fontSize:13, fontWeight:700, border:"none", borderRadius:8, padding:"14px 20px", cursor:"pointer" },
    // Toast
    toastStyle: (type) => ({ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)", background: type==="error"?"#c0392b":"#1a7a4a", color:"#fff", fontFamily:"Georgia,serif", fontSize:14, fontWeight:700, padding:"14px 28px", borderRadius:8, zIndex:999, whiteSpace:"nowrap", boxShadow:"0 8px 32px rgba(0,0,0,.2)", animation:"slideUp .4s cubic-bezier(.34,1.56,.64,1)" }),
  };

  // ─── Input helpers ────────────────────────────────────────────────────
  const MoneyField = ({ id, label, badge, hint, required }) => (
    <div style={css.fieldWrap}>
      <label style={css.label}>
        {label} {required && <span style={{color:"#ef4444"}}>*</span>}
        {badge && <span style={css.badge(badge.color, badge.bg)}>{badge.text}</span>}
      </label>
      <div style={css.inputPrefix}>
        <span style={css.prefixSpan}>₹</span>
        <input type="number" min="0" value={form[id]} onChange={e => setNum(id, e.target.value)}
               style={css.inputPfx(errors[id])} />
      </div>
      {hint && <div style={css.hint}>{hint}</div>}
      {errors[id] && <div style={css.errMsg}>{errors[id]}</div>}
    </div>
  );

  const SliderField = ({ id, label, min, max, step, unit, hint, badge }) => (
    <div style={css.fieldWrap}>
      <label style={css.label}>
        {label}
        {badge && <span style={css.badge(badge.color, badge.bg)}>{badge.text}</span>}
      </label>
      <div style={css.rangeRow}>
        <input type="range" min={min} max={max} step={step}
               value={form[id]} onChange={e => set(id, parseFloat(e.target.value))}
               style={{ flex:1, accentColor:"#d97706" }} />
        <span style={css.rangeVal}>{form[id]}{unit}</span>
      </div>
      {hint && <div style={css.hint}>{hint}</div>}
    </div>
  );

  const SelectField = ({ id, label, options, badge, hint }) => (
    <div style={css.fieldWrap}>
      <label style={css.label}>
        {label}
        {badge && <span style={css.badge(badge.color, badge.bg)}>{badge.text}</span>}
      </label>
      <select value={form[id]} onChange={e => set(id, e.target.value)} style={css.input(false)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <div style={css.hint}>{hint}</div>}
    </div>
  );

  const TagGroup = ({ arrayKey, tags, color }) => (
    <div style={css.tagsWrap}>
      {tags.map(tag => (
        <div key={tag} style={css.tag(form[arrayKey].includes(tag), color)}
             onClick={() => toggleTag(arrayKey, tag)}>{tag}</div>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={css.wrap}>
      <style>{`
        @keyframes slideUp { from { transform:translateX(-50%) translateY(30px); opacity:0 } to { transform:translateX(-50%) translateY(0); opacity:1 } }
        input[type=range] { cursor:pointer; }
        input:focus, select:focus, textarea:focus { outline:2px solid #d97706; outline-offset:1px; }
        button:hover { opacity:.88; }
        ::-webkit-scrollbar { height:4px; } ::-webkit-scrollbar-track { background:#f0ebe2 } ::-webkit-scrollbar-thumb { background:#ccc; border-radius:2px }
      `}</style>

      {/* ── Topbar ────────────────────────────────────────────── */}
      <div style={css.topbar}>
        <div style={css.topbarBrand}>
          <span style={{fontSize:22}}>₿</span> WeBudget · Budget Maker
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:12,color:"#888"}}>Health Score</span>
          <span style={css.scoreChip(s.score)}>{n("income") > 0 ? s.score : "—"}/100</span>
        </div>
      </div>

      {/* ── Summary Strip ─────────────────────────────────────── */}
      <div style={css.summaryStrip}>
        {[
          { label:"Net Income",     val: rupee(s.netIncome),    color:"#e8c84a" },
          { label:"Total Expenses", val: rupee(s.totalExpenses),color:"#faf8f4" },
          { label:"Remaining",      val: rupee(s.remaining),    color: s.remaining < 0 ? "#ef4444" : s.remaining < s.netIncome*.1 ? "#f59e0b" : "#4ade80" },
          { label:"Savings Rate",   val: pct(s.savingsPct),     color: s.savingsPct < 10 ? "#ef4444" : s.savingsPct < 20 ? "#f59e0b" : "#4ade80" },
          { label:"Debt Ratio",     val: pct(s.debtRatio),      color: s.debtRatio > 40 ? "#ef4444" : s.debtRatio > 30 ? "#f59e0b" : "#4ade80" },
          { label:"Emerg. Target",  val: rupee(s.emergencyTarget), color:"#e8c84a" },
          { label:"Warnings",       val: s.activePitfalls.length, color: s.activePitfalls.length > 3 ? "#ef4444" : s.activePitfalls.length > 1 ? "#f59e0b" : "#4ade80" },
        ].map(({ label, val, color }) => (
          <div key={label} style={css.sumItem}>
            <div style={css.sumLabel}>{label}</div>
            <div style={css.sumVal(color)}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ──────────────────────────────────────── */}
      <div style={css.barWrap}>
        <div style={css.barTrack}><div style={css.barFill(s.spendPct, s.spendPct >= 100)} /></div>
        <div style={css.barLabels}><span>₹0</span><span>Expense/Income ratio: {pct(s.spendPct)}</span><span>{rupee(s.netIncome)}</span></div>
      </div>

      {/* ── Section Nav ───────────────────────────────────────── */}
      <div style={css.navRow}>
        {SECTIONS.map(({ id, label, icon }) => (
          <button key={id} style={css.navBtn(activeSection === id)} onClick={() => setActiveSection(id)}>
            {icon} {label}
            {id === "audit" && form.auditChecklist.some(a => !a.checked) && <span style={{marginLeft:4,color:"#ef4444"}}>●</span>}
          </button>
        ))}
      </div>

      <div style={{...css.container, marginTop:24}}>
        <div style={{display:"grid", gridTemplateColumns:"1fr 300px", gap:24}}>

          {/* ── Main Panel ────────────────────────────────────── */}
          <div>

            {/* ═══ INCOME & TIME CONSTRAINTS ═════════════════════ */}
            {activeSection === "income" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>💰</span>
                  <div><div style={css.cardTitle}>Income & Time Constraints</div>
                  <div style={css.cardSub}>Resource limits · period · contract type</div></div>
                </div>
                <div style={css.cardBody}>
                  <MoneyField id="income" label="Primary Monthly Income" required
                    badge={{text:"REQUIRED",color:"#ef4444",bg:"#fff5f5"}}
                    hint="Net take-home after all deductions" />
                  <MoneyField id="income2" label="Secondary Income"
                    badge={{text:"FLEXIBLE",color:"#1a7a4a",bg:"#f0faf5"}}
                    hint="Freelance, rental, dividends, side hustle" />
                  <SelectField id="contractType" label="Employment Type"
                    badge={{text:"RESOURCE CONSTRAINT"}}
                    options={[{value:"permanent",label:"Permanent / Salaried"},{value:"contract",label:"Fixed-Term Contract"},{value:"freelance",label:"Freelance / Self-Employed"},{value:"part-time",label:"Part-Time"},{value:"business",label:"Business Owner"}]}
                    hint="Affects income certainty and leave/notice constraints" />
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Notice Period (days) <span style={css.badge()}>TIME LIMIT</span></label>
                    <input type="number" min="0" value={form.noticePeriodDays} onChange={e => set("noticePeriodDays", e.target.value)} style={css.input(false)} />
                    <div style={css.hint}>Affects how quickly income can change — risk factor</div>
                  </div>
                  <SliderField id="workHoursPerMonth" label="Capacity: Working Hours/Month"
                    min={40} max={280} step={8} unit=" hrs"
                    badge={{text:"TIME LIMIT"}}
                    hint="Caps achievable overtime/freelance income" />
                  <SelectField id="period" label="Budget Period"
                    badge={{text:"TIME CONSTRAINT"}}
                    options={[{value:"1",label:"Monthly"},{value:"3",label:"Quarterly (3 mo)"},{value:"6",label:"Semi-Annual (6 mo)"},{value:"12",label:"Annual (12 mo)"}]}
                    hint="All figures projected to this period" />
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Start Date <span style={css.badge()}>TIME CONSTRAINT</span></label>
                    <input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} style={css.input(false)} />
                  </div>
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Review / End Date <span style={css.badge()}>TIME CONSTRAINT</span></label>
                    <input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} style={css.input(errors.endDate)} />
                    {errors.endDate && <div style={css.errMsg}>{errors.endDate}</div>}
                    <div style={css.hint}>Budget with no review date becomes a fixed assumption — a common pitfall</div>
                  </div>
                  <SliderField id="incomeCertainty" label="Income Certainty"
                    min={10} max={100} step={5} unit="%"
                    badge={{text:"ASSUMPTION",color:"#c0392b",bg:"#fff5f5"}}
                    hint="100% is almost never realistic. Adjust for job security / contract risk" />
                </div>
              </div>
            )}

            {/* ═══ FIXED EXPENSES ════════════════════════════════ */}
            {activeSection === "fixed" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>🏛</span>
                  <div><div style={css.cardTitle}>Fixed Costs</div>
                  <div style={css.cardSub}>Non-negotiable · legal obligations · recurring</div></div>
                </div>
                <div style={{...css.cardBody, gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {[
                    {id:"rent",label:"Rent / Mortgage"},{id:"utilities",label:"Electricity & Water"},
                    {id:"insurance",label:"Insurance Premiums"},{id:"internet",label:"Internet & Phone"},
                    {id:"subscriptions",label:"Subscriptions"},{id:"schoolFees",label:"School / Tuition Fees"},
                    {id:"houseHelp",label:"House Help / Staff"},{id:"otherFixed",label:"Other Fixed"},
                  ].map(f => <MoneyField key={f.id} {...f} badge={{text:"FIXED",color:"#d97706",bg:"#fff8e1"}} />)}
                </div>
              </div>
            )}

            {/* ═══ VARIABLE EXPENSES ═════════════════════════════ */}
            {activeSection === "variable" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>📊</span>
                  <div><div style={css.cardTitle}>Variable Costs</div>
                  <div style={css.cardSub}>Controllable · scope-creep prone · data-dependent</div></div>
                </div>
                <div style={{...css.cardBody, gridTemplateColumns:"1fr 1fr 1fr"}}>
                  {[
                    {id:"groceries",label:"Groceries"},{id:"transport",label:"Transport / Fuel"},
                    {id:"entertainment",label:"Dining & Entertainment"},{id:"healthcare",label:"Healthcare / OTC"},
                    {id:"clothing",label:"Clothing"},{id:"education",label:"Self Education"},
                    {id:"personalCare",label:"Personal Care"},{id:"misc",label:"Miscellaneous"},
                  ].map(f => <MoneyField key={f.id} {...f} badge={{text:"VARIABLE",color:"#6366f1",bg:"#f0f0ff"}} />)}
                </div>
              </div>
            )}

            {/* ═══ DEBT REPAYMENT ════════════════════════════════ */}
            {activeSection === "debt" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>⚖️</span>
                  <div><div style={css.cardTitle}>Debt Repayment</div>
                  <div style={css.cardSub}>Legal obligations · CIBIL impact · regulatory minimum</div></div>
                </div>
                <div style={css.cardBody}>
                  {[
                    {id:"emi",label:"EMI (Home / Car / Personal)",hint:"Missing EMIs affects CIBIL score — treat as non-negotiable fixed"},
                    {id:"creditCard",label:"Credit Card Minimum",hint:"Regulatory minimum payment — late fees compound rapidly"},
                    {id:"personalLoan",label:"Personal Loan EMI",hint:""},
                    {id:"otherDebt",label:"Other Debt Payments",hint:""},
                  ].map(f => <MoneyField key={f.id} {...f} badge={{text:"LEGAL OBLIGATION",color:"#ef4444",bg:"#fff5f5"}} />)}
                  <div style={{...css.fieldWrap, gridColumn:"1/-1", background:"#fff8e1", borderRadius:8, padding:"12px 16px", border:"1px solid #f59e0b33"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#d97706",marginBottom:4}}>⚖️ Debt-to-Income Ratio</div>
                    <div style={{fontSize:22,fontWeight:700,color: s.debtRatio > 40 ? "#ef4444" : "#1a1a1a"}}>{pct(s.debtRatio)}</div>
                    <div style={css.hint}>RBI guidelines: keep under 35–40% of net income. Above 40% is high-risk territory.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ LEGAL / REGULATORY ════════════════════════════ */}
            {activeSection === "legal" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>📜</span>
                  <div><div style={css.cardTitle}>Legal, Regulatory & Policy Rules</div>
                  <div style={css.cardSub}>Tax regime · statutory caps · compliance policies</div></div>
                </div>
                <div style={css.cardBody}>
                  <SelectField id="taxRegime" label="Income Tax Regime"
                    badge={{text:"REGULATORY",color:"#d97706"}}
                    options={[{value:"new",label:"New Regime (default slabs)"},{value:"old",label:"Old Regime (with deductions)"}]}
                    hint="Old regime allows 80C/80D. New regime has lower slabs but no deductions." />
                  <MoneyField id="taxDeducted" label="Monthly TDS / Tax Deducted"
                    badge={{text:"REGULATORY",color:"#d97706",bg:"#fff8e1"}}
                    hint="TDS already deducted by employer. Include to show real take-home." />
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Section 80C (Annual) <span style={css.badge("#ef4444","#fff5f5")}>STATUTORY CAP ₹1.5L</span></label>
                    <div style={css.inputPrefix}>
                      <span style={css.prefixSpan}>₹</span>
                      <input type="number" min="0" max="150000" value={form.sec80c}
                             onChange={e => { set("sec80c", e.target.value); }}
                             style={css.inputPfx(errors.sec80c)} />
                    </div>
                    {errors.sec80c && <div style={css.errMsg}>{errors.sec80c}</div>}
                    <div style={css.hint}>PPF, ELSS, LIC, NSC — legally capped at ₹1,50,000/year</div>
                  </div>
                  <MoneyField id="sec80d" label="Section 80D Medical (Annual)"
                    badge={{text:"POLICY CAP",color:"#6366f1",bg:"#f0f0ff"}}
                    hint="Health insurance premiums — up to ₹25,000 (₹50,000 for senior citizens)" />
                  <MoneyField id="npsContribution" label="NPS Contribution / Month"
                    badge={{text:"POLICY",color:"#1a7a4a",bg:"#f0faf5"}}
                    hint="Additional 80CCD(1B) deduction up to ₹50,000/year" />
                  <div style={css.fieldWrap}>
                    <label style={css.label}>GST Applicable <span style={css.badge()}>REGULATORY</span></label>
                    <div onClick={() => set("gstApplicable", !form.gstApplicable)}
                         style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",background:"#faf8f4",border:"1.5px solid #ddd",borderRadius:8,padding:"10px 14px"}}>
                      <div style={{width:36,height:20,background:form.gstApplicable?"#1a7a4a":"#ddd",borderRadius:10,position:"relative",transition:"background .3s",flexShrink:0}}>
                        <div style={{position:"absolute",top:2,left:form.gstApplicable?18:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .3s"}}/>
                      </div>
                      <span style={{fontSize:12,color:"#666"}}>Business is GST registered — include GST in expense estimates</span>
                    </div>
                  </div>
                  <div style={{...css.fieldWrap, gridColumn:"1/-1"}}>
                    <label style={css.label}>Applicable Policies / Regulatory Rules</label>
                    <TagGroup arrayKey="activePolicies" tags={CONSTRAINT_TAGS.policy} color="#d97706" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ GOALS & PRIORITIES ════════════════════════════ */}
            {activeSection === "goals" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>🎯</span>
                  <div><div style={css.cardTitle}>Goals & Priorities</div>
                  <div style={css.cardSub}>Savings targets · investment allocation · time horizon</div></div>
                </div>
                <div style={css.cardBody}>
                  <MoneyField id="savingsGoal" label="Monthly Savings Target"
                    badge={{text:"GOAL",color:"#1a7a4a",bg:"#f0faf5"}} />
                  <MoneyField id="investment" label="Monthly Investment (Lump Sum)"
                    badge={{text:"GOAL",color:"#1a7a4a",bg:"#f0faf5"}}
                    hint="Stocks, real estate, FD — treat as an expense line" />
                  <MoneyField id="sipAmount" label="Monthly SIP Amount"
                    badge={{text:"GOAL",color:"#1a7a4a",bg:"#f0faf5"}}
                    hint="Mutual fund SIP — auto-deducted, treat as fixed" />
                  <SelectField id="riskProfile" label="Risk Tolerance"
                    badge={{text:"CONSTRAINT"}}
                    options={[{value:"Low",label:"Low — Capital preservation"},{value:"Medium",label:"Medium — Balanced growth"},{value:"High",label:"High — Aggressive growth"}]} />
                  <SliderField id="emergencyMonths" label="Emergency Fund (months)"
                    min={0} max={12} step={1} unit=" mo"
                    badge={{text:"RISK CONSTRAINT",color:"#ef4444",bg:"#fff5f5"}}
                    hint="Target: 3–6 months of total monthly expenses" />
                  <SliderField id="goalHorizonYears" label="Investment Horizon"
                    min={1} max={30} step={1} unit=" yrs"
                    badge={{text:"TIME CONSTRAINT"}}
                    hint="Affects suitable investment vehicles and lock-in periods" />
                  <div style={{...css.fieldWrap, gridColumn:"1/-1"}}>
                    <label style={css.label}>Priority Goals</label>
                    <TagGroup arrayKey="activeGoals" tags={CONSTRAINT_TAGS.goals} color="#1a7a4a" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ RESOURCE CONSTRAINTS ══════════════════════════ */}
            {activeSection === "resource" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>🔧</span>
                  <div><div style={css.cardTitle}>Resource & Operational Constraints</div>
                  <div style={css.cardSub}>Team size · vendor caps · project limits · seasonal factors</div></div>
                </div>
                <div style={css.cardBody}>
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Team / Dependents Size <span style={css.badge()}>RESOURCE LIMIT</span></label>
                    <input type="number" min="0" value={form.teamSize} onChange={e => set("teamSize", e.target.value)} style={css.input(false)} />
                    <div style={css.hint}>Number of people this budget must cover (family / team)</div>
                  </div>
                  <MoneyField id="vendorCap" label="Max Vendor / Contractor Spend"
                    badge={{text:"RESOURCE LIMIT"}}
                    hint="Hard cap for outsourcing / vendor payments per period" />
                  <MoneyField id="projectBudgetCap" label="Project / Dept. Budget Cap"
                    badge={{text:"POLICY CAP",color:"#d97706",bg:"#fff8e1"}}
                    hint="Board-approved or org-policy spending ceiling" />
                  <div style={css.fieldWrap}>
                    <label style={css.label}>Revenue Growth Assumption <span style={css.badge("#c0392b","#fff5f5")}>ASSUMPTION</span></label>
                    <div style={css.rangeRow}>
                      <input type="range" min={-20} max={50} step={1} value={form.revenueGrowthPct}
                             onChange={e => set("revenueGrowthPct", parseFloat(e.target.value))}
                             style={{flex:1,accentColor:"#d97706"}} />
                      <span style={css.rangeVal}>{form.revenueGrowthPct > 0 ? "+" : ""}{form.revenueGrowthPct}%</span>
                    </div>
                    <div style={css.hint}>Optimistic projections are a top pitfall. Negative values model downside scenarios.</div>
                  </div>
                  <div style={{...css.fieldWrap, gridColumn:"1/-1"}}>
                    <label style={css.label}>Resource & Operational Constraint Tags</label>
                    <TagGroup arrayKey="activeResourceTags" tags={CONSTRAINT_TAGS.resource} color="#6366f1" />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ RISK, UNCERTAINTY & ASSUMPTIONS ══════════════ */}
            {activeSection === "risk" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>🎲</span>
                  <div><div style={css.cardTitle}>Risk, Uncertainty & Assumptions</div>
                  <div style={css.cardSub}>Scope creep · hidden costs · inflation · data quality</div></div>
                </div>
                <div style={css.cardBody}>
                  <SliderField id="inflationPct" label="Inflation / Cost Rise Estimate"
                    min={0} max={20} step={0.5} unit="%"
                    badge={{text:"ASSUMPTION",color:"#c0392b",bg:"#fff5f5"}}
                    hint="India CPI avg ~5.5%. Medical inflation 8–12%. Fuel 6–8%. Applied to all expenses." />
                  <SliderField id="scopeCreepPct" label="Scope Creep Buffer"
                    min={0} max={30} step={1} unit="%"
                    badge={{text:"PITFALL GUARD",color:"#ef4444",bg:"#fff5f5"}}
                    hint="Unplanned additions are inevitable. Budget experts recommend 10–15% minimum." />
                  <MoneyField id="contingencyReserve" label="Monthly Contingency Reserve"
                    badge={{text:"RISK BUFFER",color:"#ef4444",bg:"#fff5f5"}}
                    hint="Explicit rainy-day reserve separate from emergency fund" />
                  <MoneyField id="hiddenCosts" label="Monthly Hidden / Overlooked Costs"
                    badge={{text:"PITFALL GUARD",color:"#ef4444",bg:"#fff5f5"}}
                    hint="Bank charges, AMC, annual fees, fines — easy to forget. Estimate ₹500–2000/month." />
                  <SelectField id="dataSource" label="Data Quality / Source"
                    badge={{text:"POOR DATA PITFALL",color:"#6366f1",bg:"#f0f0ff"}}
                    options={[{value:"statement",label:"Verified — from bank statements"},{value:"app",label:"Finance app / categorised data"},{value:"estimate",label:"Estimate / memory"}]}
                    hint="'Estimate' triggers a Poor Data warning. Verify against statements before finalising." />
                  <div style={{...css.fieldWrap, gridColumn:"1/-1"}}>
                    <label style={css.label}>Key Assumptions & Notes <span style={css.badge()}>DOCUMENT THESE</span></label>
                    <textarea value={form.assumptions}
                      onChange={e => set("assumptions", e.target.value)}
                      rows={4} placeholder="e.g. Assuming no major medical events. Bonus expected in Q3. Rent contract fixed until March 2026. Secondary income assumes 20 hrs freelance/week at current rate..."
                      style={{...css.input(false), fontFamily:"Georgia,serif", fontSize:12, lineHeight:1.7, resize:"vertical"}} />
                    <div style={css.hint}>Documenting assumptions is the antidote to Fixed Assumptions pitfall. These become your review checklist.</div>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SELF-AUDIT CHECKLIST ══════════════════════════ */}
            {activeSection === "audit" && (
              <div style={css.sectionCard}>
                <div style={css.cardHeader}>
                  <span style={{fontSize:22}}>✅</span>
                  <div><div style={css.cardTitle}>Pitfall Self-Audit Checklist</div>
                  <div style={css.cardSub}>Confirm all pitfalls addressed before generating plan</div></div>
                </div>
                <div style={{padding:24}}>
                  <div style={{background:"#fff8e1",border:"1px solid #f59e0b33",borderRadius:8,padding:"12px 16px",marginBottom:20,fontSize:12,color:"#92400e"}}>
                    ⚠️ Submission is blocked until all items are checked. This is intentional — a budget without a completed audit is more likely to fail.
                  </div>
                  {form.auditChecklist.map(item => (
                    <div key={item.id} style={css.auditItem(item.checked)} onClick={() => toggleAudit(item.id)}>
                      <input type="checkbox" checked={item.checked} readOnly style={css.auditCheck} />
                      <span style={css.auditLabel(item.checked)}>{item.label}</span>
                    </div>
                  ))}
                  <div style={{marginTop:16, background:"#faf8f4", borderRadius:8, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:"#666"}}>Audit Progress</span>
                    <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700}}>
                      {form.auditChecklist.filter(a=>a.checked).length}/{AUDIT_ITEMS.length} completed
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Submit Row ─────────────────────────────────────── */}
            <div style={css.submitRow}>
              <button style={css.btnSecondary} onClick={() => { if(confirm("Reset all fields?")) { setForm(initFormState()); showToast("Form reset"); }}}>Reset</button>
              <button style={css.btnPDF} onClick={() => { const p = buildPayload(); exportToPDF(p, s); showToast("PDF opened in new tab"); }}>📄 Export PDF</button>
              <button style={css.btnPrimary} onClick={handleSubmit}>Generate Budget Plan →</button>
            </div>

          </div>

          {/* ── Side Panel: Pitfall Warnings ────────────────────── */}
          <div style={{position:"sticky",top:80,height:"fit-content"}}>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".12em",color:"#aaa",marginBottom:12}}>
              Live Warnings ({s.activePitfalls.length})
            </div>
            {s.activePitfalls.length === 0 && n("income") > 0 && (
              <div style={{background:"#f0faf5",border:"1px solid #1a7a4a33",borderRadius:8,padding:"16px",fontSize:12,color:"#1a7a4a",textAlign:"center"}}>
                ✅ No active warnings.<br/><span style={{color:"#999",fontSize:11}}>Your budget looks well-structured.</span>
              </div>
            )}
            {s.activePitfalls.slice(0,8).map((p, i) => (
              <div key={i} style={css.pitfallCard(p.color)}>
                <div style={{...css.pitfallTitle,color:p.color}}>{p.emoji} {p.title}</div>
                <div style={css.pitfallBody}>{p.body}</div>
              </div>
            ))}
            {n("income") === 0 && (
              <div style={{fontSize:11,color:"#ccc",fontStyle:"italic",padding:"16px 0"}}>
                Enter income to see live warnings
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && <div style={css.toastStyle(toast.type)}>{toast.msg}</div>}
    </div>
  );
}