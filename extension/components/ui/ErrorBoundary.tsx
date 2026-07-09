import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-950/20 border border-red-900/35 rounded-lg text-center m-4">
          <h2 className="text-red-400 font-bold text-sm">Something went wrong</h2>
          <p className="text-zinc-500 text-xs mt-1 font-mono break-all">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}
