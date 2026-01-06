import { Link } from "react-router";
import { User, Briefcase, Mic, LogOut, Menu, X, Wand2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/context/AuthContext";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="flex items-center font-serif font-bold text-xl text-primary hover:opacity-80 transition-opacity"
            onClick={closeMobileMenu}
          >
            <img src="/favicon.svg" alt="Entervio" className="w-16 h-16" />
            Entervio
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/setup"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              S'entraîner
            </Link>
            <Link
              to="/interviews"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Mes entretiens
            </Link>
            <Link
              to="/jobs"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4" />
              Offres
            </Link>
            <Link
              to="/tools"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              L'Atelier
            </Link>
          </div>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <Link to="/account">
                  <User className="w-5 h-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground hover:text-destructive"
                onClick={() => logout()}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Connexion</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Inscription</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <div className="relative w-5 h-5">
            <Menu
              className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                isMobileMenuOpen
                  ? "rotate-90 opacity-0 scale-0"
                  : "rotate-0 opacity-100 scale-100"
              }`}
            />
            <X
              className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${
                isMobileMenuOpen
                  ? "rotate-0 opacity-100 scale-100"
                  : "-rotate-90 opacity-0 scale-0"
              }`}
            />
          </div>
        </Button>
      </div>

      {/* Mobile Menu with Animated Slide */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 ease-in-out ${
          isMobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="border-t border-border bg-linear-to-b from-background/95 to-background/90 backdrop-blur-lg">
          <div className="container mx-auto px-6 py-6 flex flex-col gap-1">
            {/* Navigation Links with Staggered Animation */}
            <Link
              to="/setup"
              className={`text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-3 py-3 px-4 rounded-lg transform ${
                isMobileMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0"
              } transition-all duration-300 delay-75`}
              onClick={closeMobileMenu}
            >
              <Mic className="w-4 h-4" />
              S'entraîner
            </Link>
            <Link
              to="/interviews"
              className={`text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-3 py-3 px-4 rounded-lg transform ${
                isMobileMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0"
              } transition-all duration-300 delay-150`}
              onClick={closeMobileMenu}
            >
              <Briefcase className="w-4 h-4" />
              Mes entretiens
            </Link>
            <Link
              to="/jobs"
              className={`text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-3 py-3 px-4 rounded-lg transform ${
                isMobileMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0"
              } transition-all duration-300 delay-225`}
              onClick={closeMobileMenu}
            >
              <Briefcase className="w-4 h-4" />
              Offres
            </Link>
            <Link
              to="/tools"
              className={`text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all flex items-center gap-3 py-3 px-4 rounded-lg transform ${
                isMobileMenuOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-4 opacity-0"
              } transition-all duration-300 delay-300`}
              onClick={closeMobileMenu}
            >
              <Wand2 className="w-4 h-4" />
              L'Atelier
            </Link>

            {user ? (
              <div
                className={`flex flex-col gap-1 pt-4 mt-2 border-t border-border transform ${
                  isMobileMenuOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                } transition-all duration-300 delay-300`}
              >
                <Button
                  asChild
                  variant="ghost"
                  className="justify-start hover:bg-primary/5"
                  onClick={closeMobileMenu}
                >
                  <Link to="/account" className="flex items-center gap-3 py-3">
                    <User className="w-4 h-4" />
                    Mon compte
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Déconnexion
                </Button>
              </div>
            ) : (
              <div
                className={`flex flex-col gap-2 pt-4 mt-2 border-t border-border transform ${
                  isMobileMenuOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                } transition-all duration-300 delay-300`}
              >
                <Button
                  asChild
                  variant="ghost"
                  className="w-full"
                  onClick={closeMobileMenu}
                >
                  <Link to="/login">Connexion</Link>
                </Button>
                <Button asChild className="w-full" onClick={closeMobileMenu}>
                  <Link to="/signup">Inscription</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
