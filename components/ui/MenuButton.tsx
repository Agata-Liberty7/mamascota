import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import i18n from "../../i18n";
import BurgerMenu from "./BurgerMenu";

export default function MenuButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={disabled ? undefined : () => setMenuVisible(true)}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel={String(i18n.t("menu.open"))}
        disabled={disabled}
      >
        <Text style={[styles.icon, disabled && styles.disabledText]}>☰</Text>
        <Text style={[styles.label, disabled && styles.disabledText]}>
          {i18n.t("menu.open")}
        </Text>
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
  disabled: {
    opacity: 0.55,
  },
  disabledText: {
    color: "#9E9E9E",
  },
});
