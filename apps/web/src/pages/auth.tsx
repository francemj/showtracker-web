import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AuthPage() {
  const [isLoading, setIsLoading] = useState<"login" | "signup" | null>(null)
  const { login } = useAuth()
  const { toast } = useToast()

  const handleLogin = async () => {
    setIsLoading("login")
    try {
      await login({ signUp: false })
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Could not sign in. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  const handleSignup = async () => {
    setIsLoading("signup")
    try {
      await login({ signUp: true })
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description:
          error.message || "Could not create account. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-14 h-14 bg-primary rounded-xl">
              <TrendingUp className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-heading font-bold text-foreground">
              TV Tracker
            </h1>
          </div>
          <p className="text-muted-foreground">
            Track your favorite TV shows and never miss an episode
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Welcome</CardTitle>
            <CardDescription>
              Sign in or create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              type="button"
              className="w-full"
              onClick={handleLogin}
              disabled={!!isLoading}
              data-testid="button-login"
            >
              {isLoading === "login" ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleSignup}
              disabled={!!isLoading}
              data-testid="button-signup"
            >
              {isLoading === "signup"
                ? "Creating account..."
                : "Create Account"}
            </Button>
          </CardContent>
          <CardFooter className="text-xs text-center text-muted-foreground">
            You’ll sign in or sign up securely in a popup. Your password is
            never shared with this app.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
