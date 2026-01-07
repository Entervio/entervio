import { useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Heart } from "lucide-react";
import { cn } from "~/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isSearchPage = location.pathname.startsWith("/jobs");
  const isInterviewPage = location.pathname.startsWith("/interview");
  const isOnboardingPage = location.pathname === "/resume";

  return (
    <div
      className={cn(
        "bg-background text-foreground font-sans selection:bg-primary/20",
        isSearchPage ? "h-screen flex flex-col" : "min-h-screen",
      )}
    >
      {!isOnboardingPage && <Navbar />}
      <main
        className={cn(
          isOnboardingPage
            ? ""
            : "bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/5 via-background to-background",
          isSearchPage ? "flex-1 overflow-hidden flex flex-col" : "",
        )}
      >
        {children}
      </main>
      {!isSearchPage && !isInterviewPage && (
        <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                Créé avec{" "}
                <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />{" "}
                par l'équipe Entervio
              </div>
              <div className="text-xs text-muted-foreground/60">
                © 2025 Entervio. Tous droits réservés.
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
