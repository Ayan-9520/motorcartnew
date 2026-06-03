import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/theme/theme-provider";
import { AuthProvider } from "@/auth/AuthProvider";
import { router } from "@/router";
import { AppErrorBoundary } from "@/shared/ui/error-boundary/AppErrorBoundary";
import { AppModalHost } from "@/shared/ui/modal/AppModalHost";
import { parsePublicEnv } from "@/app/config/env";
import { getApiBaseUrl } from "@/lib/api/base-url";
import { api } from "@/lib/api/axios";
import { queryClient } from "@/lib/api/query-client";

void parsePublicEnv();
const apiBase = getApiBaseUrl();
if (apiBase) api.defaults.baseURL = apiBase;

/**
 * Root composition — theme, auth session, global error boundary, modal host, router, toasts.
 * Keeps `App.tsx` thin and gives a single place to add query clients, i18n, etc. later.
 */
export function AppProviders() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <AppModalHost />
            <RouterProvider router={router} />
          </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className:
              "!bg-card !text-card-foreground !border !border-border !shadow-card !rounded-xl !text-sm",
            duration: 4000,
          }}
        />
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
