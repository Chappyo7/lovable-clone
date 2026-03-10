import { useState } from 'react'

interface AuthModalProps {
  cliFound: boolean
  loginInProgress: boolean
  onStartLogin: (email?: string) => void
  onCancelLogin: () => void
}

export default function AuthModal({
  cliFound,
  loginInProgress,
  onStartLogin,
  onCancelLogin,
}: AuthModalProps) {
  const [email, setEmail] = useState('')

  // CLI not found
  if (!cliFound) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl p-6 w-[420px] shadow-2xl">
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-error/20 flex items-center justify-center">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-white">Claude CLI Not Found</h2>
            <p className="text-text-secondary text-sm mt-2">
              Lovable Clone requires the Claude CLI to be installed.
            </p>
          </div>

          <div className="bg-base/50 rounded-lg p-4 mb-4">
            <p className="text-text-secondary text-xs mb-2">Install with npm:</p>
            <code className="block bg-black/30 rounded px-3 py-2 text-sm text-primary font-mono">
              npm install -g @anthropic-ai/claude-code
            </code>
          </div>

          <div className="text-center">
            <a
              href="https://docs.anthropic.com/en/docs/claude-code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm hover:underline"
            >
              View installation docs
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Login in progress
  if (loginInProgress) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-xl p-6 w-[420px] shadow-2xl">
          <div className="text-center mb-4">
            <div className="w-12 h-12 mx-auto mb-3 relative">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30"></div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
            <h2 className="text-lg font-semibold text-white">Waiting for Browser</h2>
            <p className="text-text-secondary text-sm mt-2">
              Complete sign-in in your browser window.
            </p>
          </div>

          <div className="bg-base/50 rounded-lg p-4 mb-4">
            <p className="text-text-secondary text-xs">
              A browser window should have opened automatically. If not, check your
              terminal for a login URL.
            </p>
          </div>

          <button
            onClick={onCancelLogin}
            className="w-full py-2 px-4 rounded-lg border border-border text-text-secondary hover:text-white hover:border-text-secondary transition text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Ready to login
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 w-[420px] shadow-2xl">
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white">Sign in to Claude</h2>
          <p className="text-text-secondary text-sm mt-2">
            Connect your Anthropic account to start building.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-text-secondary text-xs mb-1.5">
            Email (optional)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => onStartLogin(email || undefined)}
          className="w-full py-2.5 px-4 rounded-lg bg-primary text-base font-medium hover:brightness-110 transition text-sm"
        >
          Sign in with Browser
        </button>

        <p className="text-text-secondary text-xs text-center mt-4">
          This will open a browser window for OAuth authentication.
        </p>
      </div>
    </div>
  )
}
