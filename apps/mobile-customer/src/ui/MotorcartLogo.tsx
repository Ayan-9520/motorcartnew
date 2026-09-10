import React from "react";
import { Image, type StyleProp, type ImageStyle, type ViewStyle } from "react-native";
import { useTheme } from "../ThemeContext";

const FULL = require("../../assets/motorcart-logo.png");
const FULL_DARK = require("../../assets/motorcart-logo-dark.png");
const ICON = require("../../assets/motorcart-icon.png");

type Props = {
  /** full = icon + wordmark; icon = circular emblem only */
  variant?: "full" | "icon";
  height?: number;
  /**
   * auto = theme-aware (navy wordmark in light, white wordmark in dark — website parity, no plate).
   * light = official navy lockup.
   * dark = white wordmark for dark backgrounds.
   */
  tone?: "dark" | "light" | "auto";
  style?: StyleProp<ViewStyle | ImageStyle>;
};

export function MotorcartLogo({ variant = "full", height = 40, tone = "auto", style }: Props) {
  const { resolved } = useTheme();
  const logoTone = tone === "auto" ? (resolved === "dark" ? "dark" : "light") : tone;

  if (variant === "icon") {
    return (
      <Image
        source={ICON}
        accessibilityLabel="Motorcart"
        resizeMode="contain"
        style={[{ height, width: height }, style as object]}
      />
    );
  }

  const aspect = 393 / 113;
  const source = logoTone === "dark" ? FULL_DARK : FULL;

  return (
    <Image
      source={source}
      accessibilityLabel="Motorcart"
      resizeMode="contain"
      style={[{ height, width: height * aspect }, style as object]}
    />
  );
}
