import { Platform, useWindowDimensions } from "react-native";

type DeviceClass = {
  isWeb: boolean;
  isNative: boolean;
  isTabletLike: boolean;
  isPhoneLike: boolean;
  width: number;
};

export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const isNative = !isWeb;

  // 768 — безопасный базовый breakpoint для tablet-like layout
  const isTabletLike = isNative && width >= 768;
  const isPhoneLike = isNative && width < 768;

  return {
    isWeb,
    isNative,
    isTabletLike,
    isPhoneLike,
    width,
  };
}