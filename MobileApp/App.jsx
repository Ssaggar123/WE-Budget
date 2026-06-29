// WeBudget Mobile — App.js
// Place this file at: WE-Budget/MobileApp/App.js
//
// SETUP STEPS:
// 1. cd "C:\Users\SUMIT\Documents\GitHub\WE-Budget"
// 2. npx create-expo-app MobileApp --template blank
// 3. cd MobileApp
// 4. npx expo install @react-navigation/native @react-navigation/stack
// 5. npx expo install react-native-screens react-native-safe-area-context
// 6. npx expo install react-native-gesture-handler
// 7. Replace App.js with this file
// 8. Change YOUR_IP below to your PC's IP (run ipconfig in CMD)
// 9. npx expo start → scan QR with Expo Go

import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  Animated, Dimensions
} from "react-native";
import { View, Image } from 'react-native';
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// ── CHANGE THIS TO YOUR PC's IP ADDRESS ──────────────────────────
// Open CMD → type ipconfig → find IPv4 Address
// Example: http://192.168.1.5:5000/api
const BASE_URL = "http://YOUR_IP:5000/api";
// ─────────────────────────────────────────────────────────────────

const Stack = createStackNavigator();

// ── Colors ───────────────────────────────────────────────────────
const C = {
  bg:     "#0d0d0d",
  card:   "#1c1c1e",
  border: "#2c2c2e",
  input:  "#2c2c2e",
  accent: "#f0c040",
  green:  "#30d158",
  red:    "#ff453a",
  text:   "#ffffff",
  label:  "#8e8e93",
  muted:  "#48484a",
};

// ── API Helper ───────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(BASE_URL + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { message: "Cannot reach server. Check IP and backend." } };
  }
}

// ══════════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════════
function Toast({ message, type }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [message]);

  if (!message) return null;
  return (
    <Animated.View style={[
      s.toast,
      { opacity, backgroundColor: type === "error" ? C.red : C.green }
    ]}>
      <Text style={s.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ══════════════════════════════════════════════════════════════════
// INPUT FIELD
// ══════════════════════════════════════════════════════════════════
function Field({ label, error, right, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View>
        <TextInput
          style={[s.input, focused && s.inputFocus, error && s.inputErr]}
          placeholderTextColor={C.muted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {right && <View style={s.inputRight}>{right}</View>}
      </View>
      {error ? <Text style={s.errText}>{error}</Text> : null}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════════
function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});
  const [toast, setToast]       = useState(null);

  const fade  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  function doShake() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 8,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -8,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function validate() {
    const e = {};
    if (!email.includes("@")) e.email    = "Enter a valid email";
    if (password.length < 6)  e.password = "At least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) { doShake(); return; }
    setLoading(true);
    const { ok, data } = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (ok) {
      showToast("✅ Welcome back!");
      setTimeout(() => navigation.replace("Dashboard"), 1200);
    } else {
      doShake();
      showToast(data.message || "Login failed", "error");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <Animated.View style={[s.logoArea, { opacity: fade, transform:[{translateY: slideY}] }]}>
          <View style={s.logoBox}><Image 
        source={require('./assets/logo.png')}  // Local image
        style={s.logo}
  /></View>
          <Text style={s.appName}>WeBudget</Text>
          <Text style={s.appTag}>Smart money. Clear goals.</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View style={[s.card, {
          opacity: fade,
          transform: [{ translateY: slideY }, { translateX: shakeX }]
        }]}>
          <Text style={s.cardHead}>Sign In</Text>

          <Field label="EMAIL" value={email}
            onChangeText={v => { setEmail(v); setErrors(e=>({...e,email:null})); }}
            placeholder="you@example.com" keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} error={errors.email} />

          <Field label="PASSWORD" value={password}
            onChangeText={v => { setPassword(v); setErrors(e=>({...e,password:null})); }}
            placeholder="••••••••" secureTextEntry={!showPass} error={errors.password}
            right={
              <TouchableOpacity onPress={() => setShowPass(v => !v)}>
                <Text style={{ fontSize:18 }}>{showPass ? "🙈" : "👁️"}</Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity style={s.forgotRow}>
            <Text style={s.forgotTxt}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.btnPrimary, loading && s.btnDim]}
            onPress={handleLogin} disabled={loading} activeOpacity={0.82}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={s.btnPrimaryTxt}>Sign In →</Text>}
          </TouchableOpacity>

          <View style={s.divRow}>
            <View style={s.divLine}/><Text style={s.divTxt}>or</Text><View style={s.divLine}/>
          </View>

          <TouchableOpacity style={s.btnOutline} activeOpacity={0.82}>
            <Text style={s.btnOutlineTxt}>🔵  Continue with Google</Text>
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchTxt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={s.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={s.serverHint}>{BASE_URL}</Text>
      </ScrollView>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════════
// REGISTER SCREEN
// ══════════════════════════════════════════════════════════════════
function RegisterScreen({ navigation }) {
  const [form, setForm]       = useState({ name:"", email:"", password:"", confirm:"" });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const fade   = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: null }));
  };

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  function validate() {
    const e = {};
    if (!form.name.trim())            e.name     = "Full name is required";
    if (!form.email.includes("@"))    e.email    = "Enter a valid email";
    if (form.password.length < 6)     e.password = "At least 6 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    const { ok, data } = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });
    setLoading(false);
    if (ok) {
      showToast("✅ Account created! Please sign in.");
      setTimeout(() => navigation.navigate("Login"), 1500);
    } else {
      showToast(data.message || data.error || "Registration failed", "error");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Animated.View style={[s.logoArea, { opacity: fade, transform:[{translateY: slideY}] }]}>
          <View style={s.logoBox}><Text style={s.logoChar}>₿</Text></View>
          <Text style={s.appName}>WeBudget</Text>
          <Text style={s.appTag}>Create your account</Text>
        </Animated.View>

        <Animated.View style={[s.card, { opacity: fade, transform:[{translateY: slideY}] }]}>
          <Text style={s.cardHead}>Sign Up</Text>

          <Field label="FULL NAME" value={form.name}
            onChangeText={v => setF("name", v)} placeholder="Sumit Sharma"
            autoCapitalize="words" error={errors.name} />

          <Field label="EMAIL" value={form.email}
            onChangeText={v => setF("email", v)} placeholder="you@example.com"
            keyboardType="email-address" autoCapitalize="none"
            autoCorrect={false} error={errors.email} />

          <Field label="PASSWORD" value={form.password}
            onChangeText={v => setF("password", v)} placeholder="Min. 6 characters"
            secureTextEntry error={errors.password} />

          <Field label="CONFIRM PASSWORD" value={form.confirm}
            onChangeText={v => setF("confirm", v)} placeholder="Repeat password"
            secureTextEntry error={errors.confirm} />

          <TouchableOpacity style={[s.btnPrimary, loading && s.btnDim]}
            onPress={handleRegister} disabled={loading} activeOpacity={0.82}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={s.btnPrimaryTxt}>Create Account →</Text>}
          </TouchableOpacity>

          <View style={s.switchRow}>
            <Text style={s.switchTxt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={s.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={s.serverHint}>{BASE_URL}</Text>
      </ScrollView>
      {toast && <Toast message={toast.msg} type={toast.type} />}
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD (placeholder)
// ══════════════════════════════════════════════════════════════════
function DashboardScreen({ navigation }) {
  return (
    <View style={s.dash}>
      <Text style={{ fontSize: 52, marginBottom: 16 }}>🎉</Text>
      <Text style={[s.appName, { marginBottom: 8 }]}>You're in!</Text>
      <Text style={[s.appTag, { marginBottom: 32 }]}>Dashboard coming soon</Text>
      <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.replace("Login")}>
        <Text style={s.btnPrimaryTxt}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: C.bg } }}
      >
        <Stack.Screen name="Login"     component={LoginScreen} />
        <Stack.Screen name="Register"  component={RegisterScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ══════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════
const s = StyleSheet.create({
  scroll: {
    flexGrow: 1, backgroundColor: C.bg,
    paddingHorizontal: 20, paddingBottom: 48,
  },
  logoArea: {
    alignItems: "center", paddingTop: 80, paddingBottom: 28,
  },
  logoBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: C.accent, alignItems: "center", justifyContent: "center",
    marginBottom: 14,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 16, elevation: 12,
  },
  logoChar:  { fontSize: 32, fontWeight: "900", color: C.bg },
  appName:   { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5, marginBottom: 4 },
  appTag:    { fontSize: 13, color: C.label },
  card: {
    backgroundColor: C.card, borderRadius: 20,
    padding: 22, borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  cardHead: { fontSize: 22, fontWeight: "800", color: C.text, marginBottom: 20, letterSpacing: -0.3 },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: C.label, letterSpacing: 1, marginBottom: 7 },
  input: {
    backgroundColor: C.input, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    color: C.text, fontSize: 15, paddingRight: 44,
  },
  inputFocus: { borderColor: C.accent },
  inputErr:   { borderColor: C.red },
  errText:    { fontSize: 11, color: C.red, marginTop: 4 },
  inputRight: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  forgotRow:  { alignSelf: "flex-end", marginTop: -4, marginBottom: 18 },
  forgotTxt:  { fontSize: 12, color: C.accent },
  btnPrimary: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 15, alignItems: "center",
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  btnDim:       { opacity: 0.6 },
  btnPrimaryTxt:{ fontSize: 16, fontWeight: "800", color: C.bg, letterSpacing: 0.3 },
  divRow:       { flexDirection: "row", alignItems: "center", marginVertical: 18 },
  divLine:      { flex: 1, height: 1, backgroundColor: C.border },
  divTxt:       { fontSize: 12, color: C.label, marginHorizontal: 10 },
  btnOutline: {
    borderWidth: 1.5, borderColor: C.border,
    borderRadius: 12, paddingVertical: 13, alignItems: "center",
  },
  btnOutlineTxt:{ fontSize: 14, fontWeight: "600", color: C.text },
  switchRow:    { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchTxt:    { fontSize: 13, color: C.label },
  switchLink:   { fontSize: 13, fontWeight: "700", color: C.accent },
  serverHint:   {
    textAlign: "center", fontSize: 10, color: C.muted, marginTop: 16,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  toast: {
    position: "absolute", bottom: 40, left: 20, right: 20,
    borderRadius: 12, padding: 14, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  toastText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  dash: {
    flex: 1, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center", padding: 24,
  },
});