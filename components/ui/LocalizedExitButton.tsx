import { TouchableOpacity, Text } from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";
import { handleExitAction } from "@/utils/chatWithGPT";

export default function LocalizedExitButton() {
  const [_, setState] = useState(0);

  useEffect(() => {
    const check = setInterval(() => {
      // если язык изменился, обновляем компонент
      setState((prev) => prev + 1);
    }, 500);
    return () => clearInterval(check);
  }, [i18n.locale]);

  return (
    <TouchableOpacity
      onPress={async () => {
        const petRaw = await AsyncStorage.getItem("pet");
        const pet = petRaw ? JSON.parse(petRaw) : null;
        const petName = pet?.name || "Без имени";

        await handleExitAction(petName);
      }}
    >
      <Text style={{ color: "#42A5F5", fontSize: 16, marginRight: 16 }}>
        {i18n.t("exit_button")}
      </Text>
    </TouchableOpacity>
  );
}
