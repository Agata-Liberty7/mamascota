import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";

import { setPaid } from "../utils/access";

export default function PaymentSuccessScreen() {
  useEffect(() => {
    const applyAccess = async () => {
      try {
        await setPaid(true);
      } catch {}

      router.replace("/");
    };

    applyAccess();

    const timeout = setTimeout(() => {
      router.replace("/");
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator />
    </View>
  );
}