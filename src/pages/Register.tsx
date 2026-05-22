import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Mail, User, Phone, Quote } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { registerApi } from "@/lib/api/auth";

const TESTIMONIALS = [
  { text: "MeroNest simplified our rent collection across 50 units in Kathmandu. Truly world-class.", author: "Rajesh Sharma", role: "Landlord, Thamel Heights" },
  { text: "MeroNest ले हाम्रो सम्पत्ति व्यवस्थापन एकदमै सजिलो बनायो। भाडा संकलन अब झन्झटमुक्त छ।", author: "सुरेश पौडेल", role: "जग्गाधनी, काठमाडौं" },
  { text: "The best tool for managing multiple properties. Reporting is now instantaneous.", author: "Anjali Gurung", role: "Property Manager, Gurung Estates" },
  { text: "यो प्रणाली प्रयोग गरेपछि हाम्रा भाडावालहरूसँग सम्पर्क राख्न धेरै सजिलो भयो। साँच्चै उत्कृष्ट सेवा।", author: "नमिता श्रेष्ठ", role: "सम्पत्ति व्यवस्थापक, पाटन" },
  { text: "Switched from spreadsheets to MeroNest and never looked back. Efficiency improved by 60%.", author: "Suman Thapa", role: "Property Manager, Pokhara Lakeside" },
  { text: "Managing tenants is no longer a headache. The automated reminders do all the work.", author: "Bina Rai", role: "Landlord, Dharan Properties" },
  { text: "MeroNest बिना अब सम्पत्ति व्यवस्थापन सोच्नै सक्दिनँ। हरेक कुरा व्यवस्थित र पारदर्शी छ।", author: "रमेश बस्नेत", role: "जग्गाधनी, भक्तपुर" },
  { text: "Solid support and very intuitive interface. Highly recommended for property owners.", author: "Prakash Adhikari", role: "Landlord, Lalitpur Hub" },
  { text: "मर्मत सम्भारका अनुरोधहरू अहिले तुरुन्तै ट्र्याक हुन्छन्। भाडावालहरू पनि खुसी छन्।", author: "कविता महर्जन", role: "सम्पत्ति व्यवस्थापक, ललितपुर" },
  { text: "Finally, a localized solution that understands Nepali real estate nuances.", author: "Kiran KC", role: "Landlord, Chitwan Greens" },
];


export default function Register() {
  usePageTitle("Create Account");
  const [isLoading, setIsLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!fullName.trim()) e2.fullName = "Full name is required.";
    if (!email.trim()) e2.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e2.email = "Enter a valid email address.";
    if (!phone.trim()) e2.phone = "Phone number is required.";
    if (!password.trim()) e2.password = "Password is required.";
    else if (password.length < 8) e2.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) e2.confirmPassword = "Passwords do not match.";
    if (Object.keys(e2).length > 0) { setErrors(e2); return; }
    setIsLoading(true);
    try {
      await registerApi({ fullName, email, phone, password, confirmPassword });
      toast.success("Account created! Please sign in.");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Side: Testimonial Panel */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between p-12 bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)`, backgroundSize: "32px 32px" }} />

        {/* Logo */}
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

        {/* Testimonial */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className={cn(
                "absolute left-12 right-12 transition-all duration-700 ease-in-out",
                idx === currentIdx ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
              )}
            >
              <Quote className="h-10 w-10 text-white/10 mb-6" />
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

      {/* Right Side: Register Form */}
      <div className="flex w-full flex-col justify-center px-4 lg:w-1/2 lg:px-12">
        <div className="mx-auto flex w-full max-w-[420px] flex-col gap-6">

          {/* Header */}
          <div className="flex flex-col gap-1 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
            <p className="text-muted-foreground text-sm">Enter your details to get started with MeroNest.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName" className="font-bold text-xs">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="e.g. Suman Shrestha"
                  className="pl-10"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors({}); }}
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reg-email" className="font-bold text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="m@example.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({}); }}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="font-bold text-xs">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +977 98XXXXXXXX"
                  className="pl-10"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setErrors({}); }}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reg-password" className="font-bold text-xs">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  className="pl-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
                />
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="font-bold text-xs">Confirm Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  className="pl-10"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" className="w-full h-11 font-bold mt-2" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
