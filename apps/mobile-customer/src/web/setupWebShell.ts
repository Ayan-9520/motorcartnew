import { Platform } from "react-native";

/** One-time web shell: full viewport height, typography, scroll polish. */
export function setupWebShell() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  if (!document.getElementById("motorcart-web-font")) {
    const link = document.createElement("link");
    link.id = "motorcart-web-font";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap";
    document.head.appendChild(link);
  }

  const css = `
    html, body {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0b141a;
    }
    #root {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      min-height: 0;
      overflow: hidden;
      font-family: inherit;
    }
    input, textarea, button {
      font-family: inherit;
      font-size: 16px !important;
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(37, 211, 102, 0.35);
      border-radius: 999px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::selection {
      background: rgba(37, 211, 102, 0.25);
    }
  `;

  if (!document.getElementById("motorcart-web-shell")) {
    const tag = document.createElement("style");
    tag.id = "motorcart-web-shell";
    tag.textContent = css;
    document.head.appendChild(tag);
  }
}
