import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function NotFound() {
  const navigate = useNavigate();
  usePageTitle("404 — Page Not Found");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Building2 className="h-10 w-10" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-6xl font-black tracking-tighter text-foreground">404</h1>
        <p className="text-xl font-semibold text-foreground">Page not found</p>
        <p className="text-muted-foreground max-w-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => navigate(-1 as any)}>
          Go Back
        </Button>
        <Button onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
