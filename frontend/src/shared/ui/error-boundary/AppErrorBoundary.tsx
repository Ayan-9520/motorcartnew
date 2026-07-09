import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isChunkLoadError } from "@/lib/lazy-retry";

type Props = { children: ReactNode };

type State = { hasError: boolean; message?: string; resetKey: number };

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[motorcart:error-boundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const chunkError = this.state.message && isChunkLoadError(new Error(this.state.message));
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <Card className="w-full max-w-md border-border/80 shadow-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
              </div>
              <CardTitle className="text-xl">
                {chunkError ? "App updated — reload required" : "Something went wrong"}
              </CardTitle>
              <CardDescription className="text-pretty">
                {chunkError
                  ? "A new version was deployed. Please reload to load the latest pages."
                  : this.state.message
                    ? `Technical detail: ${this.state.message}`
                    : "An unexpected error occurred. Please refresh the page or return home."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              {chunkError ? (
                <Button
                  type="button"
                  variant="default"
                  className="rounded-xl"
                  onClick={() => window.location.reload()}
                >
                  Reload app
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  className="rounded-xl"
                  onClick={() =>
                    this.setState((s) => ({
                      hasError: false,
                      message: undefined,
                      resetKey: s.resetKey + 1,
                    }))
                  }
                >
                  Try again
                </Button>
              )}
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/">Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return <div key={this.state.resetKey}>{this.props.children}</div>;
  }
}
