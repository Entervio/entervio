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
    <nav className="border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
          >
            <div className="w-10 h-10 from-primary-500 to-accent rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-secondary tracking-tight">
              Entervio
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant={isActive("/interviews") ? "default" : "ghost"}
              size="default"
              className={cn(
                "font-medium",
                isActive("/interviews") && "bg-primary hover:bg-primary-600"
              )}
            >
              <Link to="/interviews">Mes entretiens</Link>
            </Button>
            <Button
              asChild
              variant={isActive("/account") ? "default" : "ghost"}
              size="default"
              className={cn(
                "font-medium",
                isActive("/account") && "bg-primary hover:bg-primary-600"
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