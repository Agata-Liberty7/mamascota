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
const UI_VARIANT_KEY = "mamascota.ui_variant";

export type UiVariant = "v1" | "v2";

export function getUiVariant(): UiVariant {
  if (typeof window === "undefined") {
    return "v1";
  }

  const stored = window.localStorage.getItem(UI_VARIANT_KEY);

  if (stored === "v1" || stored === "v2") {
    return stored;
  }

  const randomValue =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
      : Math.random();

  const variant: UiVariant = randomValue < 0.5 ? "v1" : "v2";

  window.localStorage.setItem(UI_VARIANT_KEY, variant);

  return variant;
}

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
    ui_variant: getUiVariant(),
    app_mode: getAppMode(),
    interface_locale: normalizeLocale(interfaceLocale),
  });
}
