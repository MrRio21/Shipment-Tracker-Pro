import { Link, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Anchor, LogOut, Settings, Ship, Truck } from "lucide-react";

export function AppHeader() {
  const { logout, user } = useAuth();
  const [isDashboard] = useRoute("/dashboard");
  const [isDispatch] = useRoute("/dispatch");
  const [isUsers] = useRoute("/users");

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Anchor className="text-primary-foreground h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-foreground leading-tight tracking-tight text-sm">
                Global Sail Logistics
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Operations Console
              </p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 border-l border-border/50 pl-6">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isDashboard
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Ship className="h-4 w-4" />
              <span className="hidden sm:inline">Shipments</span>
            </Link>
            <Link
              href="/dispatch"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isDispatch
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Dispatch</span>
            </Link>
            {user?.role === "admin" && (
              <Link
                href="/users"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isUsers
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="text-xs text-muted-foreground hidden lg:flex flex-col items-end">
              <span className="font-medium text-foreground">{user.email}</span>
              <span className="capitalize">{user.role}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
