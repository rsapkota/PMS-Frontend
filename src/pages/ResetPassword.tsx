import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { resetPasswordApi } from "@/lib/api/auth";
import { toast } from "sonner";

export default function ResetPassword() {
  usePageTitle("Reset Password");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!password.trim()) errs.password = "Password is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) errs.confirmPassword = "Passwords do not match.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    if (!token) {
      toast.error("Invalid or missing reset token. Please request a new link.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordApi({ token, password, confirmPassword });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password reset failed.");
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

        {done ? (
          <div className="flex flex-col items-center gap-4 text-center rounded-xl border bg-card p-8 shadow-sm">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h2 className="text-xl font-semibold">Password updated!</h2>
            <p className="text-sm text-muted-foreground">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
            <Button className="mt-2 w-full" onClick={() => navigate("/")}>
              Sign in
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex flex-col gap-1 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Set new password</h1>
              <p className="text-sm text-muted-foreground">
                Choose a strong password for your account.
              </p>
            </div>

            {!token && (
              <div
                className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
                role="alert"
              >
                Invalid or expired reset link. Please{" "}
                <Link to="/forgot-password" className="underline font-medium">
                  request a new one
                </Link>.
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    className="pl-10"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                  />
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    className="pl-10"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                    disabled={isLoading || !token}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading || !token}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </span>
                ) : (
                  "Reset password"
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
