import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[W2W-ErrorBoundary] Uncaught React exception:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void text-white flex items-center justify-center p-6 relative">
          <div className="absolute inset-0 bg-stipple-grid opacity-15 pointer-events-none" />
          <div className="dashed-container p-8 sm:p-10 rounded-2xl bg-[#141414] max-w-lg w-full text-center relative z-10 shadow-2xl space-y-6">
            <div className="w-12 h-12 rounded-full bg-carbon border border-[#242424] flex items-center justify-center mx-auto text-[#7089ba]">
              <span className="font-mono text-xl font-bold">!</span>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#7089ba] bg-[#7089ba]/10 px-2.5 py-0.5 rounded-full border border-[#7089ba]/20 font-bold">
                RUNTIME EXCEPTION SHIELD
              </span>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                An unexpected interface error occurred
              </h2>
              <p className="text-xs text-[#8c8c8c] max-w-sm mx-auto leading-relaxed">
                The client encountered an unhandled exception. Your local session and encryption state remain secure.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left font-mono text-[10px] text-[#a0a0a0] bg-[#0c0c0c] p-3 rounded-lg border border-[#242424] overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-6 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 transition-colors shadow-sm"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
export default ErrorBoundary
