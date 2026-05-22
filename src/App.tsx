import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Properties = lazy(() => import("@/pages/Properties"));
const PropertyDetails = lazy(() => import("@/pages/PropertyDetails"));
const UnitDetails = lazy(() => import("@/pages/UnitDetails"));
const UtilityMeters = lazy(() => import("@/pages/UtilityMeters"));
const LeaseOnboarding = lazy(() => import("@/pages/LeaseOnboarding"));
const LeaseDetails = lazy(() => import("@/pages/LeaseDetails"));
const Leases = lazy(() => import("@/pages/Leases"));
const Tenants = lazy(() => import("@/pages/Tenants"));
const Units = lazy(() => import("@/pages/Units"));
const Finance = lazy(() => import("@/pages/Finance"));
const Reminders = lazy(() => import("@/pages/Reminders"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Layout = lazy(() => import("@/components/Layout"));
const ProtectedRoute = lazy(() => import("@/components/ProtectedRoute"));

function PageFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background" aria-busy="true" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status">
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/units" element={<Units />} />
                <Route path="/leases" element={<Leases />} />
                <Route path="/leases/:leaseId" element={<LeaseDetails />} />

                {/* Unit Details & Onboarding Routes */}
                <Route path="/properties/:id/units/:unitId" element={<UnitDetails />} />
                <Route path="/properties/:id/units/:unitId/meters" element={<UtilityMeters />} />
                <Route path="/properties/:id/units/:unitId/onboard" element={<LeaseOnboarding />} />

                {/* Property Details Routes */}
                <Route path="/properties/:id" element={<PropertyDetails />}>
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={null} />
                  <Route path="units" element={null} />
                </Route>

                <Route path="/tenants" element={<Tenants />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/maintenance" element={<Maintenance />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </Router>
  );
}

export default App;
