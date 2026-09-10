import { useState } from "react"
import { useLocation } from "wouter"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPassword() {
  const { resetPassword } = useAuth()
  const [, setLocation] = useLocation()

  const token = new URLSearchParams(window.location.search).get("token") ?? ""
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await resetPassword(token, password)
      // Resetting signs you in, so there is nowhere to go but the app.
      setLocation("/")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reset your password."
      )
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Reset password"
        heading={"That link looks\nincomplete."}
        blurb="Open the link from your email exactly as it was sent, or request a new one."
      >
        <Button className="mt-8 w-full" onClick={() => setLocation("/")}>
          Back to sign in
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      heading={"Choose a new\npassword."}
      blurb="This signs you in and ends every other session on your account."
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
            data-testid="input-new-password"
          />
          <p className="font-mono text-[11px] text-muted-foreground">
            At least 8 characters
          </p>
        </div>

        {error && (
          <p role="alert" className="font-sans text-[13px] text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={pending}
          data-testid="button-reset-password"
        >
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Set password and sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
