import { useLocation } from "react-router";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isSearchPage = location.pathname.startsWith("/jobs/search");

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Navbar />
      <main className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        {children}
      </main>

      {!isSearchPage && (
        <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-6 transition-all duration-300 ease-in-out">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <span>Propulsé par</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors">Groq Whisper</span>
                <span>•</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors">Google Gemini</span>
                <span>•</span>
                <span className="text-muted-foreground hover:text-foreground transition-colors">ElevenLabs</span>
              </div>
              <div className="text-xs text-muted-foreground/60 font-medium">
                © 2024 Entervio. Tous droits réservés.
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}