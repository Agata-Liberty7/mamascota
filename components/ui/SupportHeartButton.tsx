import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

export default function SupportHeartButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={disabled ? undefined : () => router.push("/paywall" as Href)}
      style={styles.button}
      hitSlop={10}
      disabled={disabled}
    >
      <MaterialIcons
        name="favorite"
        size={24}
        color={disabled ? "#9E9E9E" : "#42A5F5"}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabled: {
    opacity: 0.55,
  },
});