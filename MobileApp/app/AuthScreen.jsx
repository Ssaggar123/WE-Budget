import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Animated, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser, registerUser } from "./services/authService";

const C = {
  bg:"#0D0F14", surface:"#161A23", card:"#1E2330", border:"#2A3045",
  accent:"#6C63FF", accentSoft:"#2D2B55", red:"#E74C3C", redSoft:"#3D1A1A",
  text:"#FFFFFF", textSub:"#8892A4", textMuted:"#4A5568",
};

function AuthField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }) {
  const focused = useRef(new Animated.Value(0)).current;
  const onFocus = () => Animated.spring(focused, { toValue:1, useNativeDriver:false, tension:120, friction:8 }).start();
  const onBlur  = () => Animated.spring(focused, { toValue:0, useNativeDriver:false, tension:120, friction:8 }).start();
  const borderColor = focused.interpolate({ inputRange:[0,1], outputRange:[C.border, C.accent] });
  const bgColor     = focused.interpolate({ inputRange:[0,1], outputRange:[C.card, "#1A1E2E"] });
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.inputWrap, { borderColor, backgroundColor: bgColor }]}>
        <TextInput
          style={styles.input} value={value} onChangeText={onChangeText}
          placeholder={placeholder} placeholderTextColor={C.textMuted}
          secureTextEntry={secureTextEntry} keyboardType={keyboardType || "default"}
          autoCapitalize="none" onFocus={onFocus} onBlur={onBlur}
        />
      </Animated.View>
    </View>
  );
}

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode]                = useState("login");
  const [name, setName]                = useState("");
  const [email, setEmail]              = useState("");
  const [password, setPassword]        = useState("");
  const [confirmPassword, setConfirm]  = useState("");
  const [loading, setLoading]          = useState(false);
  const [error, setError]              = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const logoAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue:1, tension:60, friction:10, useNativeDriver:true }),
      Animated.timing(slideAnim, { toValue:1, duration:400, useNativeDriver:true }),
    ]).start();
  }, []);

  const switchMode = (newMode) => {
    Animated.timing(slideAnim, { toValue:0, duration:150, useNativeDriver:true }).start(() => {
      setMode(newMode); setError(null); setName(""); setEmail(""); setPassword(""); setConfirm("");
      Animated.spring(slideAnim, { toValue:1, tension:80, friction:12, useNativeDriver:true }).start();
    });
  };

  const validate = () => {
    if (!email || !password)               { setError("Email and password are required."); return false; }
    if (!/^\S+@\S+\.\S+$/.test(email))    { setError("Please enter a valid email."); return false; }
    if (password.length < 6)              { setError("Password must be at least 6 characters."); return false; }
    if (mode === "register") {
      if (!name.trim())                   { setError("Name is required."); return false; }
      if (password !== confirmPassword)   { setError("Passwords do not match."); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
  setError(null);
  if (!validate()) return;
  setLoading(true);
  try {
    const authData =
      mode === "login"
        ? await loginUser(email.trim(), password)
        : await registerUser(name.trim(), email.trim(), password);

    const savedToken = await AsyncStorage.getItem("token");
    console.log("TOKEN RIGHT AFTER AUTH:", savedToken);

    // Resolve username from whatever shape the API returns, with safe fallbacks
    const resolvedUsername =
      authData?.user?.username || authData?.username || name.trim() || email.trim();
    await AsyncStorage.setItem("username", resolvedUsername);

    onAuthSuccess();
  } catch (err) {
    setError(err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex:1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.logoWrap, { opacity:logoAnim, transform:[{ scale: logoAnim.interpolate({ inputRange:[0,1], outputRange:[0.8,1] }) }] }]}>
            <View style={styles.logoCircle}><Text style={styles.logoIcon}>💰</Text></View>
            <Text style={styles.logoTitle}>WE-Budget</Text>
            <Text style={styles.logoSub}>Smart budgeting for everyone</Text>
          </Animated.View>
          <Animated.View style={[styles.card, { opacity:slideAnim, transform:[{ translateY: slideAnim.interpolate({ inputRange:[0,1], outputRange:[30,0] }) }] }]}>
            <View style={styles.tabRow}>
              <TouchableOpacity style={[styles.tab, mode==="login" && styles.tabActive]} onPress={() => switchMode("login")}>
                <Text style={[styles.tabText, mode==="login" && styles.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.tab, mode==="register" && styles.tabActive]} onPress={() => switchMode("register")}>
                <Text style={[styles.tabText, mode==="register" && styles.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>{mode==="login" ? "Welcome back 👋" : "Create account ✨"}</Text>
            <Text style={styles.cardSub}>{mode==="login" ? "Sign in to track your budget" : "Start your budgeting journey"}</Text>
            {mode==="register" && <AuthField label="Full name" value={name} onChangeText={setName} placeholder="Sumit Sharma" />}
            <AuthField label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
            <AuthField label="Password" value={password} onChangeText={setPassword} placeholder="Min. 6 characters" secureTextEntry />
            {mode==="register" && <AuthField label="Confirm password" value={confirmPassword} onChangeText={setConfirm} placeholder="Re-enter password" secureTextEntry />}
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>⚠ {error}</Text></View> : null}
            <TouchableOpacity style={[styles.submitBtn, loading && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
              {loading
                ? <View style={styles.submitRow}><ActivityIndicator color="#fff" size="small" /><Text style={[styles.submitText,{marginLeft:10}]}>{mode==="login" ? "Signing in..." : "Creating account..."}</Text></View>
                : <Text style={styles.submitText}>{mode==="login" ? "Sign In" : "Create Account"}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity onPress={() => switchMode(mode==="login" ? "register" : "login")} style={styles.switchWrap}>
              <Text style={styles.switchText}>
                {mode==="login" ? "Don't have an account? " : "Already have an account? "}
                <Text style={styles.switchLink}>{mode==="login" ? "Register" : "Sign in"}</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{ flex:1, backgroundColor:C.bg },
  scrollContent:{ flexGrow:1, padding:24, paddingTop: Platform.OS==="android" ? 60 : 70 },
  logoWrap:{ alignItems:"center", marginBottom:36 },
  logoCircle:{ width:72, height:72, borderRadius:24, backgroundColor:C.accentSoft, alignItems:"center", justifyContent:"center", marginBottom:14, borderWidth:1.5, borderColor:C.accent+"60" },
  logoIcon:{ fontSize:36 },
  logoTitle:{ fontSize:28, fontWeight:"900", color:C.text, letterSpacing:-0.5 },
  logoSub:{ fontSize:14, color:C.textSub, marginTop:4 },
  card:{ backgroundColor:C.surface, borderRadius:24, padding:24, borderWidth:1, borderColor:C.border },
  tabRow:{ flexDirection:"row", backgroundColor:C.card, borderRadius:14, padding:4, marginBottom:24 },
  tab:{ flex:1, paddingVertical:10, alignItems:"center", borderRadius:11 },
  tabActive:{ backgroundColor:C.accent },
  tabText:{ fontSize:14, fontWeight:"700", color:C.textSub },
  tabTextActive:{ color:"#fff" },
  cardTitle:{ fontSize:22, fontWeight:"800", color:C.text, marginBottom:4 },
  cardSub:{ fontSize:14, color:C.textSub, marginBottom:24 },
  fieldWrap:{ marginBottom:16 },
  fieldLabel:{ fontSize:11, fontWeight:"700", color:C.textSub, marginBottom:8, textTransform:"uppercase", letterSpacing:0.6 },
  inputWrap:{ borderWidth:1.5, borderRadius:12, paddingHorizontal:14, height:52, justifyContent:"center" },
  input:{ fontSize:15, color:C.text, fontWeight:"600" },
  errorBox:{ backgroundColor:C.redSoft, borderRadius:10, padding:12, marginBottom:16, borderWidth:1, borderColor:C.red+"50" },
  errorText:{ color:C.red, fontSize:13, fontWeight:"600" },
  submitBtn:{ backgroundColor:C.accent, borderRadius:14, paddingVertical:16, alignItems:"center", marginTop:4, marginBottom:16 },
  submitBtnDisabled:{ opacity:0.6 },
  submitRow:{ flexDirection:"row", alignItems:"center" },
  submitText:{ fontSize:16, fontWeight:"800", color:"#fff" },
  switchWrap:{ alignItems:"center", paddingVertical:4 },
  switchText:{ fontSize:14, color:C.textSub },
  switchLink:{ color:C.accent, fontWeight:"700" },
});
