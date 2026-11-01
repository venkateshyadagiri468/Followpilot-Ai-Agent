'use client';

import { Component, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Graceful degradation when WebGL is unavailable or loses context
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// R3F bundles react-reconciler, which reads React internals (e.g.
// ReactCurrentBatchConfig) at import time. Next.js App Router prerenders 'use
// client' pages on the server, where that import resolves to `undefined` and
// crashes the build. Loading the Canvas lazily with ssr:false keeps the
// reconciler out of the server bundle entirely.
const CanvasOnly = dynamic(() => import('./AuthBackground3D.client'), {
  ssr: false,
  loading: () => null,
});

export function AuthBackground3D() {
  const fallback = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]"
    />
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Studio lighting base layers */}
      <div className="absolute inset-0 bg-[#0B0D12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(16,185,129,0.08),rgba(0,0,0,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />

      {/* 3D Canvas with error boundary — client-only, never prerendered */}
      <CanvasErrorBoundary fallback={fallback}>
        <CanvasOnly />
      </CanvasErrorBoundary>
    </div>
  );
}