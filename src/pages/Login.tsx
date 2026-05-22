import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Mail } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const TESTIMONIALS = [
  { text: "MeroNest simplified our rent collection across 50 units in Kathmandu. Truly world-class.", author: "Rajesh Sharma", role: "Landlord, Thamel Heights" },
  { text: "MeroNest ले हाम्रो सम्पत्ति व्यवस्थापन एकदमै सजिलो बनायो। भाडा संकलन अब झन्झटमुक्त छ।", author: "सुरेश पौडेल", role: "जग्गाधनी, काठमाडौं" },
  { text: "The best tool for managing multiple properties. Reporting is now instantaneous.", author: "Anjali Gurung", role: "Property Manager, Gurung Estates" },
  { text: "यो प्रणाली प्रयोग गरेपछि हाम्रा भाडावालहरूसँग सम्पर्क राख्न धेरै सजिलो भयो। साँच्चै उत्कृष्ट सेवा।", author: "नमिता श्रेष्ठ", role: "सम्पत्ति व्यवस्थापक, पाटन" },
  { text: "Switched from spreadsheets to MeroNest and never looked back. Efficiency improved by 60%.", author: "Suman Thapa", role: "Property Manager, Pokhara Lakeside" },
  { text: "Managing tenants is no longer a headache. The automated reminders do all the work.", author: "Bina Rai", role: "Landlord, Dharan Properties" },
  { text: "MeroNest बिना अब सम्पत्ति व्यवस्थापन सोच्नै सक्दिनँ। हरेक कुरा व्यवस्थित र पारदर्शी छ।", author: "रमेश बस्नेत", role: "जग्गाधनी, भक्तपुर" },
  { text: "Solid support and very intuitive interface. Highly recommended for property owners.", author: "Prakash Adhikari", role: "Landlord, Lalitpur Hub" },
  { text: "Maintenance tracking is so organized now. No more lost repair requests.", author: "Deepak Jha", role: "Property Manager, Biratnagar Rentals" },
  { text: "मर्मत सम्भारका अनुरोधहरू अहिले तुरुन्तै ट्र्याक हुन्छन्। भाडावालहरू पनि खुसी छन्।", author: "कविता महर्जन", role: "सम्पत्ति व्यवस्थापक, ललितपुर" },
  { text: "Handles multi-family units perfectly. Transparent and reliable for all stakeholders.", author: "Sunita Tamang", role: "Landlord, Boudha Residency" },
  { text: "The financial module is exactly what we needed for VAT and tax compliance.", author: "Manoj Baidya", role: "Property Manager, Baidya Groups" },
  { text: "Everything is on my mobile. I can track my properties from anywhere in the world.", author: "Pooja Shrestha", role: "Landlord, Butwal Enclave" },
  { text: "Finally, a localized solution that understands Nepali real estate nuances.", author: "Kiran KC", role: "Landlord, Chitwan Greens" },
];

export default function Login() {
  usePageTitle("Sign In");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim()) { setError("Password is required."); return; }

    setIsLoading(true);
    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Side: Testimonial Panel */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 bg-slate-950 overflow-hidden">
        {/* Dot grid texture */}
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)`, backgroundSize: '32px 32px' }} />

        {/* Logo — untouched */}
        <div className="relative z-10 flex items-center gap-3 text-2xl font-black tracking-tighter">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
            <img src="/logo.png" alt="MeroNest Logo" className="h-14 w-14 object-contain" />
          </div>
          <span className="flex items-center">
            <span className="text-primary">Mero</span>
            <span className="text-brand-orange">Nest</span>
            <span className="text-white">.</span>
          </span>
        </div>

        {/* Testimonial carousel */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute left-12 right-12 transition-all duration-700 ease-in-out",
                idx === currentIdx ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              )}
            >
              <p className="text-2xl font-light leading-relaxed text-white/90 mb-6">
                &ldquo;{t.text}&rdquo;
              </p>
              <div>
                <p className="text-base font-semibold text-white">{t.author}</p>
                <p className="text-sm text-white/40 mt-0.5">{t.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="relative z-10 flex gap-1.5">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIdx(idx)}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                idx === currentIdx ? "w-8 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex w-full flex-col justify-center px-4 lg:w-1/2 lg:px-12">
        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground">
              Enter your credentials to access your property portfolio
            </p>
          </div>

          <form onSubmit={handleLogin} className="grid gap-4">
            {error && (
              <div id="login-error" className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive" role="alert" aria-live="assertive">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  disabled={isLoading}
                  aria-describedby={error ? "login-error" : undefined}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <KeyRound aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-lg font-medium" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Login to Portfolio"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
