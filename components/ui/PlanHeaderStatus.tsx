import { Feather } from "@expo/vector-icons";
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
        <View style={styles.pillContent}>
          {!paid && (
            <Feather
              name="check"
              size={13}
              color="#42A5F5"
            />
          )}
          <Text style={[styles.text, !paid && styles.freeText]}>
            {i18n.t("plus.free_label")}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, paid ? styles.plusActive : styles.plusInactive]}
        onPress={goToPlus}
        accessibilityRole="button"
        accessibilityLabel={String(i18n.t("plus.open_plus"))}
      >
        <View style={styles.pillContent}>
          <Feather
            name={paid ? "check" : "plus"}
            size={13}
            color={PLUS_COLOR}
          />
          <Text
            style={[
              styles.text,
              paid ? styles.plusTextActive : styles.plusText,
            ]}
          >
            {i18n.t("plus.plus_label")}
          </Text>
        </View>
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
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },

  pillContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
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