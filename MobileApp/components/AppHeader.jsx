import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { useAuth } from "../app/context/AuthContext";

const C = {
  bg: "#0D0F14",
  card: "#161A23",
  border: "#2A3045",
  accent: "#6C63FF",
  textSub: "#8892A4",
  text: "#FFFFFF",
  red: "#FF6161",
};

export default function AppHeader() {
  const { username, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);

  const initial = username ? username.trim().charAt(0).toUpperCase() : "?";

  const handleLogout = () => {
    setMenuVisible(false);
    logout();
  };

  return (
    <View style={styles.header}>
      <Image
        source={require("../assets/WE-Budget logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <TouchableOpacity style={styles.avatar} onPress={() => setMenuVisible(true)}>
        <Text style={styles.avatarText}>{initial}</Text>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuBox}>
            <View style={styles.menuAvatar}>
              <Text style={styles.menuAvatarText}>{initial}</Text>
            </View>
            <Text style={styles.menuUsername}>{username || "User"}</Text>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutBtnText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  logo: { width: 36, height: 36, borderRadius: 8 },

  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  menuBox: {
    position: "absolute",
    top: 70,
    right: 16,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    alignItems: "center",
    width: 180,
  },
  menuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  menuAvatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  menuUsername: { color: C.text, fontSize: 14, fontWeight: "700", marginBottom: 14 },

  logoutBtn: {
    width: "100%",
    borderWidth: 1,
    borderColor: C.red,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  logoutBtnText: { color: C.red, fontSize: 14, fontWeight: "700" },
});