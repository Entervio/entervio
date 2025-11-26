import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <Navbar />
      <main className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
        {children}
      </main>
      <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Propulsé par</span>
              <span className="font-semibold text-foreground">Groq Whisper</span>
              <span>•</span>
              <span className="font-semibold text-foreground">Google Gemini</span>
              <span>•</span>
              <span className="font-semibold text-foreground">ElevenLabs</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 Entervio. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}