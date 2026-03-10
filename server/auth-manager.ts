import { spawn, execSync, type ChildProcess } from 'child_process'

export interface AuthStatus {
  cliFound: boolean
  authenticated: boolean
  account?: string
}

export class AuthManager {
  private loginProcess: ChildProcess | null = null
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private loginTimeout: ReturnType<typeof setTimeout> | null = null
  private static LOGIN_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Check if Claude CLI is found and authenticated
   */
  checkAuthSync(): AuthStatus {
    // Check if CLI is installed
    try {
      execSync('claude --version', { stdio: 'pipe' })
    } catch {
      return { cliFound: false, authenticated: false }
    }

    // Check auth status using a quick command
    try {
      const result = execSync('claude -p "hi" --max-turns 1 --output-format text', {
        stdio: 'pipe',
        timeout: 15000,
      })
      // If we get here, authenticated
      return { cliFound: true, authenticated: true, account: this.getAccount() }
    } catch {
      return { cliFound: true, authenticated: false }
    }
  }

  /**
   * Try to get the account name from claude config
   */
  private getAccount(): string | undefined {
    try {
      // Try to get account info - this may vary by claude version
      const result = execSync('claude config get email', { stdio: 'pipe', timeout: 5000 })
      const email = result.toString().trim()
      return email || undefined
    } catch {
      return undefined
    }
  }

  /**
   * Start the login process - spawns `claude auth login` which opens browser
   */
  startLogin(
    onStatusChange: (status: AuthStatus) => void,
    onTimeout: () => void,
    email?: string,
  ): void {
    if (this.loginProcess) {
      return // Already in progress
    }

    // Build args for claude login
    const args = ['auth', 'login']
    if (email) {
      args.push('--email', email)
    }

    this.loginProcess = spawn('claude', args, {
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    this.loginProcess.on('exit', () => {
      this.cleanup()
    })

    // Start polling auth status every 2 seconds
    this.pollInterval = setInterval(() => {
      const status = this.checkAuthSync()
      if (status.authenticated) {
        onStatusChange(status)
        this.cleanup()
      }
    }, 2000)

    // Set timeout for 5 minutes
    this.loginTimeout = setTimeout(() => {
      onTimeout()
      this.cleanup()
    }, AuthManager.LOGIN_TIMEOUT_MS)
  }

  /**
   * Check if login is in progress
   */
  isLoginInProgress(): boolean {
    return this.loginProcess !== null
  }

  /**
   * Cancel the login process
   */
  cancelLogin(): void {
    this.cleanup()
  }

  private cleanup(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    if (this.loginTimeout) {
      clearTimeout(this.loginTimeout)
      this.loginTimeout = null
    }
    if (this.loginProcess) {
      this.loginProcess.kill()
      this.loginProcess = null
    }
  }
}
