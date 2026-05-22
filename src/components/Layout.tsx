import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  Bell, Building2, FileText, Home, LayoutDashboard, Layers, 
  LogOut, Search, Users, Wallet, Check, Settings, 
  Clock, AlertTriangle, CheckCircle2, Menu, Wrench,
  ChevronLeft, ChevronRight,
  UserCircle, Briefcase, Key, SwitchCamera
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Initial sample notifications
const INITIAL_NOTIFICATIONS = [
  { id: 1, title: "Rent Received", description: "Unit 101 (Sunset Manor) - John Doe", time: "2m ago", type: "success", isRead: false },
  { id: 2, title: "Lease Expiring", description: "Sarah Williams (Unit 202) expires in 30 days", time: "1h ago", type: "warning", isRead: false },
  { id: 3, title: "Maintenance Request", description: "New request: Water leakage in Unit 305", time: "3h ago", type: "info", isRead: false },
  { id: 4, title: "Payment Overdue", description: "Michael Chen (Unit 401) is 3 days late", time: "1d ago", type: "error", isRead: true },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, setRole, selectedLandlord, setSelectedLandlordId, selectedLandlordId, landlords } = useRole();
  const { logout } = useAuth();
  
  // Navigation State
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      else setIsCollapsed(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-500" />;
      case "warning": return <Clock aria-hidden="true" className="h-4 w-4 text-amber-500" />;
      case "info": return <FileText aria-hidden="true" className="h-4 w-4 text-blue-500" />;
      case "error": return <AlertTriangle aria-hidden="true" className="h-4 w-4 text-red-500" />;
      default: return <Bell aria-hidden="true" className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative font-sans tracking-tight">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        aria-label="Application sidebar"
        className={cn(
          "h-full border-r bg-muted/20 flex flex-col shrink-0 transition-all duration-500 ease-in-out z-50 overflow-hidden",
          isCollapsed ? "w-[80px]" : "w-64",
          isMobileOpen ? "fixed inset-y-0 left-0 translate-x-0 w-64 shadow-2xl" : "hidden lg:flex translate-x-0"
        )}
      >
        <div className={cn("p-6 flex items-center justify-between", isCollapsed && "px-4")}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/5 shrink-0 overflow-hidden border border-muted/20 transition-all hover:scale-110">
              <img src="/logo.png" alt="" aria-hidden="true" loading="lazy" className="h-10 w-10 object-contain" />
            </div>
            {!isCollapsed && (
              <span className="font-black text-xl tracking-tighter animate-in fade-in slide-in-from-left-2 duration-500 flex items-center">
                <span className="text-primary">Mero</span>
                <span className="text-brand-orange">Nest</span>
                <span className="text-primary text-2xl">.</span>
              </span>
            )}
          </div>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" aria-label="Collapse sidebar" className="h-8 w-8 text-muted-foreground lg:flex hidden hover:bg-primary/10 hover:text-primary transition-all rounded-lg" onClick={() => setIsCollapsed(true)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        
        <nav aria-label="Main navigation" className="flex-1 px-3 space-y-1 mt-4">
          {/* Dashboard is common but could have different views later */}
          <NavItem to="/dashboard" icon={<LayoutDashboard className="h-5 w-5" />} label="Dashboard" active={location.pathname === "/dashboard"} collapsed={isCollapsed} />
          
          {(role === "Manager" || role === "Landlord") && (
            <>
              <NavItem to="/properties" icon={<Home className="h-5 w-5" />} label="Properties" active={location.pathname.startsWith("/properties")} collapsed={isCollapsed} />
              <NavItem to="/units" icon={<Layers className="h-5 w-5" />} label="Units" active={location.pathname === "/units"} collapsed={isCollapsed} />
              <NavItem to="/tenants" icon={<Users className="h-5 w-5" />} label="Tenants" active={location.pathname === "/tenants"} collapsed={isCollapsed} />
              <NavItem to="/leases" icon={<FileText className="h-5 w-5" />} label="Leases" active={location.pathname === "/leases"} collapsed={isCollapsed} />
              <NavItem to="/finance" icon={<Wallet className="h-5 w-5" />} label="Finance" active={location.pathname === "/finance"} collapsed={isCollapsed} />
              <NavItem to="/reminders" icon={<Bell className="h-5 w-5" />} label="Reminders" active={location.pathname === "/reminders"} collapsed={isCollapsed} />
            </>
          )}

          {(role === "Manager" || role === "Landlord" || role === "Tenant") && (
            <NavItem to="/maintenance" icon={<Wrench className="h-5 w-5" />} label={role === "Tenant" ? "My Requests" : "Maintenance"} active={location.pathname === "/maintenance"} collapsed={isCollapsed} />
          )}

          {role === "Tenant" && (
            <>
              <NavItem to="/units" icon={<Layers className="h-5 w-5" />} label="My Unit" active={location.pathname === "/units"} collapsed={isCollapsed} />
              <NavItem to="/finance" icon={<Wallet className="h-5 w-5" />} label="Payments" active={location.pathname === "/finance"} collapsed={isCollapsed} />
            </>
          )}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 flex items-center justify-between px-8 bg-background/50 backdrop-blur-xl z-10 border-b">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="lg:hidden" onClick={() => setIsMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            
            {isCollapsed && (
              <Button variant="ghost" size="icon" aria-label="Expand sidebar" className="h-9 w-9 text-muted-foreground lg:flex hidden hover:bg-primary/5 hover:text-primary transition-all rounded-xl border border-muted" onClick={() => setIsCollapsed(false)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            )}

            <div className="relative w-96 max-w-full group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Find anything..." 
                aria-label="Search"
                className="pl-11 bg-muted/40 border-transparent focus:bg-background focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all h-11 rounded-2xl text-sm" 
              />
            </div>

            {role === "Manager" && (
              <div className="flex items-center gap-2 border-l pl-4 ml-2 animate-in fade-in slide-in-from-left-4 duration-700">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-11 px-4 gap-3 bg-muted/20 border-muted rounded-2xl hover:bg-muted/40 transition-all group">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <Briefcase className="h-3.5 w-3.5" />
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">Managing Portfolio</p>
                        <p className="text-xs font-black mt-0.5">{selectedLandlord?.name}</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 rounded-3xl shadow-2xl border-muted" align="start" sideOffset={12}>
                    <div className="px-4 py-3 border-b mb-1">
                      <h3 className="font-black text-[11px] uppercase tracking-widest text-muted-foreground">Select Landlord Portfolio</h3>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">Switch between different client businesses.</p>
                    </div>
                    <div className="space-y-1">
                      {landlords.map((ll) => (
                        <button
                          key={ll.id}
                          onClick={() => setSelectedLandlordId(ll.id)}
                          className={cn(
                            "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-left group",
                            selectedLandlordId === ll.id 
                              ? "bg-primary/5 text-primary shadow-inner shadow-primary/5 ring-1 ring-primary/20" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "h-10 w-10 rounded-2xl flex items-center justify-center border transition-all",
                            selectedLandlordId === ll.id ? "bg-primary text-primary-foreground border-primary" : "bg-background group-hover:scale-110"
                          )}>
                            <Building2 className="h-5 w-5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-black truncate">{ll.name}</p>
                            <p className="text-[10px] text-muted-foreground font-bold italic">{ll.portfolioSize}</p>
                          </div>
                          {selectedLandlordId === ll.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`} className="relative h-11 w-11 rounded-2xl hover:bg-primary/5 transition-all flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span aria-hidden="true" className="absolute -top-1 -right-1 h-5 w-5 bg-primary text-[9px] font-black text-primary-foreground flex items-center justify-center rounded-full ring-2 ring-background animate-in zoom-in duration-300 shadow-md">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 overflow-hidden shadow-2xl border-muted rounded-3xl" align="end">
                <div className="bg-muted/10 p-5 border-b flex items-center justify-between">
                  <h3 className="font-black text-[11px] uppercase tracking-widest text-muted-foreground">Alerts Hub</h3>
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-[10px] font-black text-primary hover:bg-transparent" onClick={markAllAsRead}>
                    Clear All
                  </Button>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-muted/30">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 flex gap-4 transition-all hover:bg-muted/20 cursor-pointer ${notif.isRead ? "opacity-50" : "bg-primary/[0.01]"}`}
                        onClick={() => markAsRead(notif.id)}
                      >
                        <div className="h-10 w-10 rounded-2xl bg-background border flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/[0.02]">
                          {getNotificationIcon(notif.type)}
                        </div>
                        <div className="flex-1 space-y-1 overflow-hidden py-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black leading-none">{notif.title}</p>
                            {!notif.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0 shadow-sm" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{notif.description}</p>
                          <p className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-wider">{notif.time}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-16 text-center text-muted-foreground space-y-3">
                      <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto"><Bell className="h-6 w-6 opacity-20" /></div>
                      <p className="text-xs font-black uppercase tracking-widest opacity-40">All Caught Up</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-muted/5 border-t">
                  <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary h-9 rounded-xl hover:bg-primary/5" onClick={() => navigate("/reminders")}>
                    Open Command Center
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-3 py-2 text-left transition-all hover:bg-muted/40 hover:border-muted-foreground/10 focus:outline-none">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black shrink-0 border border-primary/20">
                    {role[0]}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-sm font-black truncate leading-tight">John Doe</p>
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] text-primary truncate uppercase font-black tracking-widest mt-0.5">{role}</p>
                      <SwitchCamera className="h-2 w-2 text-primary opacity-50" />
                    </div>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 rounded-2xl shadow-2xl border-muted" align="end" sideOffset={12}>
                <div className="px-3 py-3 border-b mb-1">
                  <p className="text-sm font-black leading-tight">John Doe</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-1">{role}</p>
                </div>
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => toast.info("Settings are not available yet.")}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-xs font-bold">Settings</span>
                </button>
                <div className="px-3 py-2 mt-1 border-t border-b">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Switch Persona</p>
                </div>
                <RoleOption active={role === "Manager"} icon={<Briefcase className="h-4 w-4" />} label="Property Manager" onClick={() => setRole("Manager")} />
                <RoleOption active={role === "Landlord"} icon={<UserCircle className="h-4 w-4" />} label="Landlord" onClick={() => setRole("Landlord")} />
                <RoleOption active={role === "Tenant"} icon={<Key className="h-4 w-4" />} label="Tenant" onClick={() => setRole("Tenant")} />
                <div className="mt-1 border-t pt-1">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    onClick={() => { logout(); navigate("/"); }}
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-xs font-bold">Sign Out</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Scrollable Area */}
        <div id="main-content" className="flex-1 overflow-y-auto p-8 scroll-smooth custom-scrollbar bg-background/50">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, icon, label, active, collapsed }: { to: string, icon: React.ReactNode, label: string, active: boolean, collapsed: boolean }) {
  return (
    <Link
      to={to}
      aria-label={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "flex items-center gap-3 rounded-2xl transition-all duration-300 group relative",
        active 
          ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 font-black" 
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        collapsed ? "justify-center h-14 p-0" : "px-5 h-12"
      )}
    >
      <div className={cn(
        "transition-transform duration-300",
        active ? "text-primary-foreground scale-110" : "text-muted-foreground group-hover:text-primary group-hover:scale-110",
        collapsed && "scale-100"
      )}>
        {icon}
      </div>
      
      {!collapsed && (
        <span className="text-[13px] font-bold tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">
          {label}
        </span>
      )}

      {active && collapsed && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary-foreground rounded-l-full shadow-sm" />
      )}
      
      {!collapsed && active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/50 shadow-sm" />
      )}
    </Link>
  );
}

function RoleOption({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left",
        active 
          ? "bg-primary/10 text-primary font-black shadow-inner shadow-primary/5" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <div className={cn(active ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <span className="text-xs font-bold">{label}</span>
      {active && <Check className="ml-auto h-3 w-3" />}
    </button>
  );
}
