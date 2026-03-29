import { Platform, useWindowDimensions } from "react-native";

type DeviceClass = {
  isWeb: boolean;
  isNative: boolean;
  isTabletLike: boolean;
  isPhoneLike: boolean;
  isDesktopLike: boolean;
  width: number;
};

export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const isNative = !isWeb;

  const isDesktopLike = isWeb && width >= 1024;
  const isTabletLike = width >= 768 && width < 1024;
  const isPhoneLike = width < 768;

  return {
    isWeb,
    isNative,
    isTabletLike,
    isPhoneLike,
    isDesktopLike,
    width,
  };
}