import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { forgotPasswordApi } from "@/lib/api/auth";

export default function ForgotPassword() {
  usePageTitle("Forgot Password");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      await forgotPasswordApi({ email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 text-2xl font-black tracking-tighter">
          <div className="h-12 w-12 bg-slate-950 rounded-xl flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="MeroNest Logo" className="h-10 w-10 object-contain" />
          </div>
          <span className="flex items-center">
            <span className="text-primary">Mero</span>
            <span className="text-brand-orange">Nest</span>
            <span className="text-foreground">.</span>
          </span>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 text-center rounded-xl border bg-card p-8 shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Check your inbox</h2>
            <p className="text-sm text-muted-foreground">
              If an account exists for <strong>{email}</strong>, we've sent a password reset link. It may take a few minutes to arrive.
            </p>
            <Link to="/" className="mt-2 text-sm text-primary font-medium hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6 rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Forgot your password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              {error && (
                <div
                  className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link to="/" className="text-sm text-primary font-medium hover:underline flex items-center justify-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
