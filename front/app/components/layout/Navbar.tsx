import { Link, useLocation } from "react-router";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { MessageSquare } from "lucide-react";

export function Navbar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">
              Entervio
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant={isActive("/interviews") ? "secondary" : "ghost"}
              size="default"
              className={cn(
                "font-medium",
                isActive("/interviews") && "bg-secondary text-secondary-foreground"
              )}
            >
              <Link to="/interviews">Mes entretiens</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/account") ? "secondary" : "ghost"}
              size="default"
              className={cn(
                "font-medium",
                isActive("/account") && "bg-secondary text-secondary-foreground"
              )}
            >
              <Link to="/account">Mon compte</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}