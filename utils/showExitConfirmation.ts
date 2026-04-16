import { Alert, Platform } from "react-native";
import i18n from "../i18n";

export async function showExitConfirmation(): Promise<string> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      (window as any).__MAMASCOTA_EXIT_RESOLVE__ = resolve;
      window.dispatchEvent(new Event("mamascota:exit"));
    });
  }

  return new Promise((resolve) => {
    Alert.alert(
      i18n.t("exit_title"),
      i18n.t("exit_message"),
      [
        {
          text: i18n.t("cancel"),
          style: "cancel",
          onPress: () => resolve("cancel"),
        },
        {
          text: i18n.t("exit_delete"),
          style: "destructive",
          onPress: () => resolve("delete"),
        },
        {
          text: i18n.t("exit_save"),
          onPress: () => resolve("save"),
        },
      ],
      { cancelable: true }
    );
  });
}
