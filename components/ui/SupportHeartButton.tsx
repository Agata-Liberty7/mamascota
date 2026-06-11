import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import React from "react";
import { Pressable, StyleSheet } from "react-native";

export default function SupportHeartButton() {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/paywall" as Href)}
      style={styles.button}
      hitSlop={10}
    >
      <MaterialIcons name="favorite" size={24} color="#42A5F5" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});