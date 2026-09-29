import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initTheme } from "@/theme/theme-store";
import App from "./App";
import { reloadForNewBuild } from "@/lib/lazy-retry";
import "./index.css";

initTheme();

// Old tab + new deploy: Vite cannot preload a removed chunk — reload to fetch the new build.
window.addEventListener("vite:preloadError", (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
