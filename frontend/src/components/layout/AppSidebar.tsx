import { useAuthStore } from "@/store";
import {
  canAccessAdminUsers,
  canAccessAccounting,
  canAccessLeases,
  canCreateMaintenanceRequest,
  canManageAgencyOnboarding,
  canManageAssignedMaintenance,
  canReviewApplications,
  canReviewVerifications,
  canTrackMaintenanceRequests,
  isTenant,
  prefetchRoute,
} from "@/utils";
import {
  ArrowLeft,
  Building2,
  Calculator,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

type SidebarLink = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: SidebarLink[] = (() => {
    const baseLinks: SidebarLink[] = [
      { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
      ...(isTenant(user)
        ? [
            {
              label: "My Applications",
              to: "/applications",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(canReviewApplications(user)
        ? [
            {
              label: "Review Applications",
              to: "/applications/review",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(canAccessLeases(user)
        ? [
            {
              label: "Leases",
              to: "/leases",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(canCreateMaintenanceRequest(user)
        ? [
            {
              label: "Request Maintenance",
              to: "/maintenance/requests/new",
              icon: Wrench,
            },
          ]
        : []),
      ...(canTrackMaintenanceRequests(user)
        ? [
            {
              label: "My Maintenance Status",
              to: "/maintenance/requests/mine",
              icon: Wrench,
            },
          ]
        : []),
      ...(canManageAssignedMaintenance(user)
        ? [
            {
              label: "Manage Maintenance",
              to: "/maintenance/requests/assigned",
              icon: Wrench,
            },
          ]
        : []),
      { label: "Settings", to: "/settings", icon: Settings },
      { label: "Verification", to: "/verification", icon: Shield },
    ];

    if (canReviewVerifications(user)) {
      baseLinks.push({
        label: "Verification Review",
        to: "/super-administrator/verifications",
        icon: ShieldCheck,
      });
    }

    if (canAccessAdminUsers(user)) {
      baseLinks.push({
        label: "User Administration",
        to: "/super-administrator/users",
        icon: Users,
      });
    }

    if (canManageAgencyOnboarding(user)) {
      baseLinks.push({
        label: "My Agencies",
        to: "/branch-manager/agencies",
        icon: Building2,
      });
    }

    if (canAccessAccounting(user)) {
      baseLinks.push({
        label: "Accounting",
        to: "/dashboard/accounting",
        icon: Calculator,
      });
    }

    return baseLinks;
  })();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <>
      <div className="hidden lg:block">
        <Navbar />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 text-gray-700"
          aria-label="Back to home"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-medium">Home</span>
        </button>

        <div className="flex items-center gap-2">
          <p className="max-w-32.5 truncate text-sm font-semibold text-gray-900">
            {user?.fullName || "SmartProperty"}
          </p>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          />
          <aside className="relative h-full w-72 bg-white px-4 py-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between px-2">
              <p className="text-lg font-bold text-gray-900">SmartProperty</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Navigation
            </p>
            <nav className="space-y-1" aria-label="Mobile sidebar navigation">
              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <button
                    key={`mobile-${link.to}`}
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      navigate(link.to);
                    }}
                    onMouseEnter={() => prefetchRoute(link.to)}
                    onFocus={() => prefetchRoute(link.to)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </button>
                );
              })}
            </nav>

            <div className="absolute bottom-6 left-4 right-4">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
