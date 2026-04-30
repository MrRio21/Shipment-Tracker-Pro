import { Link, useRoute } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Anchor, LogOut, Ship, Truck, Calendar } from "lucide-react";
import { format } from "date-fns";

export function AppHeader() {
  const { logout } = useAuth();
  const [isDashboard] = useRoute("/dashboard");
  const [isDispatch] = useRoute("/dispatch");

  const hijriDate = new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  }).format(new Date());

  const gregorianDate = format(new Date(), "MMMM do, yyyy");

  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
              <Anchor className="text-primary-foreground h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-semibold text-foreground leading-tight tracking-tight">PortLogistics</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Operations Console</p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 border-l border-border/50 pl-6">
            <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDashboard ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Ship className="h-4 w-4" />
              <span className="hidden sm:inline">Shipments</span>
            </Link>
            <Link href="/dispatch" className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isDispatch ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
              <Truck className="h-4 w-4" />
              <span className="hidden sm:inline">Dispatch</span>
            </Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-md border border-border/50 cursor-help">
                <Calendar className="h-4 w-4 text-primary/70" />
                <span>{hijriDate}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{gregorianDate}</p>
            </TooltipContent>
          </Tooltip>

          <div className="text-sm font-medium text-muted-foreground hidden lg:block">
            admin@example.com
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
