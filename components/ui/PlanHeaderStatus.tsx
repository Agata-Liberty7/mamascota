import { useRouter, type Href } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import i18n from "../../i18n";
import { isPaid } from "../../utils/access";

const PLUS_COLOR = "#14B8A6";

export default function PlanHeaderStatus() {
  const router = useRouter();
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const value = await isPaid();
      if (mounted) {
        setPaid(value);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const goToFree = () => {
    router.push("/free" as Href);
  };

  const goToPlus = () => {
    router.push("/plus" as Href);
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[styles.pill, !paid && styles.freeActive]}
        onPress={goToFree}
        accessibilityRole="button"
        accessibilityLabel={String(i18n.t("free_page.title"))}
      >
        <Text style={[styles.text, !paid && styles.freeText]}>
          {paid ? i18n.t("plus.free_label") : `✓ ${i18n.t("plus.free_label")}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, paid ? styles.plusActive : styles.plusInactive]}
        onPress={goToPlus}
        accessibilityRole="button"
        accessibilityLabel={String(i18n.t("plus.open_plus"))}
      >
        <Text style={[styles.text, paid ? styles.plusTextActive : styles.plusText]}>
          {paid ? `✓ ${i18n.t("plus.plus_label")}` : `+ ${i18n.t("plus.plus_label")}`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  pill: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  freeActive: {
    backgroundColor: "#EEF7FF",
  },

  plusInactive: {
    borderWidth: 1,
    borderColor: PLUS_COLOR,
    backgroundColor: "#FFFFFF",
  },

  plusActive: {
    backgroundColor: "#E6FFFA",
    borderWidth: 1,
    borderColor: PLUS_COLOR,
  },

  text: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  freeText: {
    color: "#42A5F5",
  },

  plusText: {
    color: PLUS_COLOR,
  },

  plusTextActive: {
    color: PLUS_COLOR,
  },
});