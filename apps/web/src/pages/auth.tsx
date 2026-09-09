import { useState } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { useAuth, browserSupportsWebAuthn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth-layout"

type Mode = "signIn" | "signUp" | "forgot"

const COPY: Record<Mode, { eyebrow: string; heading: string; blurb: string }> =
  {
    signIn: {
      eyebrow: "Welcome back",
      heading: "Pick up where\nyou left off.",
      blurb: "Sign in to see what's next in every show you're watching.",
    },
    signUp: {
      eyebrow: "Create an account",
      heading: "Never lose\nyour place again.",
      blurb: "Track every series, season and episode in one place.",
    },
    forgot: {
      eyebrow: "Reset password",
      heading: "Let's get you\nback in.",
      blurb: "We'll email you a link. It works once and expires in an hour.",
    },
  }

export default function AuthPage() {
  const { login, register, loginWithPasskey, requestPasswordReset } = useAuth()

  const [mode, setMode] = useState<Mode>("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [pending, setPending] = useState<null | "form" | "passkey">(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const copy = COPY[mode]
  const busy = pending !== null

  const switchTo = (next: Mode) => {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setPending("form")
    try {
      if (mode === "signIn") {
        await login(email, password)
      } else if (mode === "signUp") {
        await register(email, password, name.trim() || undefined)
      } else {
        await requestPasswordReset(email)
        setNotice("If that account exists, a reset link is on its way.")
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      )
    } finally {
      setPending(null)
    }
  }

  const handlePasskey = async () => {
    setError(null)
    setNotice(null)
    setPending("passkey")
    try {
      await loginWithPasskey()
    } catch (err) {
      // Cancelling the system prompt is a deliberate "not now", not a failure.
      if (err instanceof Error && err.name === "NotAllowedError") return
      setError(
        err instanceof Error ? err.message : "That passkey didn't work here."
      )
    } finally {
      setPending(null)
    }
  }

  return (
    <AuthLayout
      eyebrow={copy.eyebrow}
      heading={copy.heading}
      blurb={copy.blurb}
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {mode === "signUp" && (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Optional"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            // Lets the browser offer a saved passkey inline, which is the
            // whole appeal of conditional UI.
            autoComplete={mode === "signIn" ? "username webauthn" : "email"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            data-testid="input-email"
          />
        </div>

        {mode !== "forgot" && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "signIn" && (
                <button
                  type="button"
                  onClick={() => switchTo("forgot")}
                  className="font-sans text-[12px] text-muted-foreground hover:text-foreground"
                >
                  Forgot?
                </button>
              )}
            </div>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "signIn" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              data-testid="input-password"
            />
            {mode === "signUp" && (
              <p className="font-mono text-[11px] text-muted-foreground">
                At least 8 characters
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="font-sans text-[13px] text-destructive"
            data-testid="text-auth-error"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="font-sans text-[13px] text-foreground">{notice}</p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={busy}
          data-testid="button-submit"
        >
          {pending === "form" && (
            <Loader2 className="animate-spin" aria-hidden />
          )}
          {mode === "signIn"
            ? "Sign in"
            : mode === "signUp"
              ? "Create account"
              : "Email me a link"}
        </Button>
      </form>

      {mode === "signIn" && browserSupportsWebAuthn() && (
        <>
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handlePasskey}
            disabled={busy}
            data-testid="button-passkey"
          >
            {pending === "passkey" ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <KeyRound aria-hidden />
            )}
            Use a passkey
          </Button>
        </>
      )}

      <p className="mt-8 font-sans text-[13px] text-muted-foreground">
        {mode === "signUp" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchTo("signIn")}
              className="font-semibold text-foreground hover:underline"
            >
              Sign in
            </button>
          </>
        ) : mode === "forgot" ? (
          <button
            type="button"
            onClick={() => switchTo("signIn")}
            className="font-semibold text-foreground hover:underline"
          >
            ← Back to sign in
          </button>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={() => switchTo("signUp")}
              className="font-semibold text-foreground hover:underline"
              data-testid="button-show-signup"
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </AuthLayout>
  )
}
