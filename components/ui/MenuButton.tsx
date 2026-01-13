import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import i18n from "../../i18n";
import BurgerMenu from "./BurgerMenu";

export default function MenuButton() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setMenuVisible(true)}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={String(i18n.t("menu.open"))}
      >
        <Text style={styles.icon}>☰</Text>
        <Text style={styles.label}>{i18n.t("menu.open")}</Text>
      </TouchableOpacity>

      <BurgerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  icon: {
    fontSize: 18,
  },
  label: {
    marginLeft: 6,
    fontSize: 14,
    color: "#333",
  },
});
