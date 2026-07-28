import { Platform } from "react-native";

export type AnalyticsEventName =
  | "home_view"
  | "consultation_start_click"
  | "animal_selection_view"
  | "animal_selected"
  | "observation_selection_view"
  | "observations_selected"
  | "chat_view"
  | "first_message_sent"
  | "consultation_completed"
  | "pdf_generation_started"
  | "pdf_opened";

type AnalyticsValue = string | number | boolean;

type AnalyticsParams = Record<
  string,
  AnalyticsValue | null | undefined
>;

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

const PRODUCT_VERSION = "v1_0";

function getAppMode(): "browser" | "standalone" {
  if (typeof window === "undefined") {
    return "browser";
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;

  return displayModeStandalone || navigatorWithStandalone.standalone === true
    ? "standalone"
    : "browser";
}

function normalizeLocale(locale: string): string {
  const normalized = String(locale || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

  return normalized || "unknown";
}

export function trackAnalyticsEvent(
  event: AnalyticsEventName,
  interfaceLocale: string,
  params: AnalyticsParams = {}
): void {
  if (Platform.OS !== "web" || typeof window === "undefined") {
    return;
  }

  const safeParams: Record<string, AnalyticsValue> = {};

  for (const [key, value] of Object.entries(params)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safeParams[key] = value;
    }
  }

  const analyticsWindow = window as AnalyticsWindow;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];

  analyticsWindow.dataLayer.push({
    ...safeParams,
    event,
    product_version: PRODUCT_VERSION,
    app_mode: getAppMode(),
    interface_locale: normalizeLocale(interfaceLocale),
  });
}
