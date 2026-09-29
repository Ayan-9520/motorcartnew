import { useEffect } from "react";
import { Link, isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isChunkLoadError, reloadForNewBuild } from "@/lib/lazy-retry";

/** Router-level error screen: auto-recovers from stale deploy chunks, otherwise offers Back / Home / Reload. */
export function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (chunkError) reloadForNewBuild();
    else console.error("[motorcart:route-error]", error);
  }, [chunkError, error]);

  const title = chunkError
    ? "Loading the latest version…"
    : isRouteErrorResponse(error) && error.status === 404
      ? "Page not found"
      : "Something went wrong";

  const detail = chunkError
    ? "Motorcart was just updated. If this page does not refresh by itself, tap Reload."
    : error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.statusText
        : "Please go back or reload the page.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" asChild>
            <Link to="/">Home</Link>
          </Button>
          <Button type="button" className="rounded-xl" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    </div>
  );
}
