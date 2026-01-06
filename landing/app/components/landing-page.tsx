import type React from "react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import {
  ArrowRight,
  Mic,
  FileText,
  Briefcase,
  BarChart3,
  Lock,
  Play,
  CheckCircle2,
  Sparkles,
  Zap,
  Trophy,
  MessageSquare,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "~/lib/supabase";

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Waitlist state
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animated");
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      },
    );

    // Observe all elements with animate-on-scroll class
    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observerRef.current?.disconnect();
    };
  }, []);

  const scrollToWaitlist = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const waitlistSection = document.getElementById("waitlist");
    if (waitlistSection) {
      waitlistSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    e.preventDefault();
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert({ email: email.trim().toLowerCase() });

      if (error) {
        // Check for duplicate email
        if (error.code === "23505") {
          setSubmitStatus({
            type: "error",
            message: "Cet email est déjà inscrit sur la liste d'attente.",
          });
        } else {
          setSubmitStatus({
            type: "error",
            message: "Une erreur s'est produite. Veuillez réessayer.",
          });
        }
      } else {
        setSubmitStatus({
          type: "success",
          message: "Merci ! Vous êtes inscrit sur la liste d'attente.",
        });
        setEmail(""); // Clear input on success
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Une erreur s'est produite. Veuillez réessayer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary/30">
      <nav
        className={`fixed top-0 w-full border-b border-border bg-background/80 backdrop-blur-md z-50 transition-shadow duration-300 ${scrollY > 20 ? "shadow-sm" : ""}`}
      >
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="transition-transform duration-300 hover:scale-110 hover:rotate-6">
              {/* Fox Logo */}
              <img src="/favicon.svg" alt="Entervio" className="w-16 h-16" />
            </div>
            <span className="text-xl font-serif font-bold text-primary">
              Entervio
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              onClick={(e) => scrollToSection(e, "features")}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Fonctionnalités
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "how-it-works")}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Comment ça marche
            </a>
          </div>

          <Button
            asChild
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            <a href="#waitlist" onClick={scrollToWaitlist}>
              Liste d'attente
            </a>
          </Button>
        </div>
      </nav>

      <main className="pt-16">
        <section className="container mx-auto px-6 py-24 md:py-32 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div
              className={`space-y-8 text-left transition-all duration-1000 ${mounted ? "animate-slide-in-left" : "opacity-0"}`}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/60 border border-border shadow-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-foreground">
                  Bientôt disponible
                </span>
              </div>

              <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-medium tracking-tight leading-[0.95] text-primary">
                Décrochez le <br />
                job rêvé.
              </h1>

              <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed font-light">
                Maîtrisez vos entretiens, créez le CV parfait, et trouvez votre
                prochaine opportunité. Tout en un seul endroit.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="h-14 px-8 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary-foreground/10 shadow-[var(--shadow-diffuse)] rounded-lg font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <a href="#waitlist" onClick={scrollToWaitlist}>
                    Rejoindre la liste d'attente
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg bg-card border-border text-foreground hover:bg-muted/50 shadow-sm rounded-lg font-medium transition-all hover:-translate-y-0.5"
                >
                  <a href="#how-it-works">Découvrir</a>
                </Button>
              </div>
            </div>

            <div
              className={`relative transition-all duration-1000 delay-200 ${mounted ? "animate-slide-in-right" : "opacity-0"}`}
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-secondary/20 to-transparent rounded-[2rem] blur-3xl -z-10" />

              <div className="grid gap-6">
                <Card className="border-border shadow-[var(--shadow-diffuse)] bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-8 flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Mic className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Simulation d'Entretien
                      </p>
                      <h3 className="text-2xl font-serif font-medium text-foreground mt-1">
                        IA Adaptative
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Entraînez-vous avec une IA qui s'adapte à votre profil
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                  <Card className="border-border shadow-sm bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="mb-4 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-secondary-foreground">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h4 className="text-lg font-serif font-medium text-foreground mb-1">
                        CV Parfait
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Générateur professionnel
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-border shadow-sm bg-card hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="mb-4 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-secondary-foreground">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <h4 className="text-lg font-serif font-medium text-foreground mb-1">
                        Recherche Intelligente
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Offres personnalisées
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="container mx-auto px-6 py-24 max-w-7xl"
        >
          <div className="text-center mb-16 animate-on-scroll">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border shadow-sm mb-4">
              <Zap className="w-4 h-4 text-accent-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Plateforme Complète
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground mb-4 text-balance">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
              Une suite d'outils IA pour maximiser vos chances de succès.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Entretiens IA Adaptatifs",
                desc: "Simulations réalistes qui s'adaptent à votre profil et au poste visé. L'IA ajuste la difficulté en temps réel.",
                icon: <Mic className="w-6 h-6" />,
              },
              {
                title: "Générateur de CV",
                desc: "Créez des CV professionnels en quelques clics avec notre moteur Typst. Format ATS-friendly garanti.",
                icon: <FileText className="w-6 h-6" />,
              },
              {
                title: "Recherche d'Emploi Intelligente",
                desc: "Accédez aux offres France Travail avec un classement IA basé sur votre profil et vos compétences.",
                icon: <Briefcase className="w-6 h-6" />,
              },
              {
                title: "Feedback Chirurgical",
                desc: "Analyse détaillée de votre clarté, contenu technique, et assurance. Notes et axes d'amélioration précis.",
                icon: <BarChart3 className="w-6 h-6" />,
              },
              {
                title: "Lettres de Motivation",
                desc: "Générez des lettres personnalisées et convaincantes pour chaque candidature automatiquement.",
                icon: <MessageSquare className="w-6 h-6" />,
              },
              {
                title: "Sécurité & Confidentialité",
                desc: "Vos données sont chiffrées de bout en bout et ne seront jamais revendues à des tiers.",
                icon: <Lock className="w-6 h-6" />,
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="border-border shadow-sm hover:shadow-[var(--shadow-diffuse)] transition-all duration-300 group animate-on-scroll hover:-translate-y-1"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-secondary/30 transition-colors flex items-center justify-center text-foreground mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-serif">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed mt-2">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-y border-border bg-muted/30 py-24"
        >
          <div className="container mx-auto px-6 max-w-7xl">
            <div className="text-center mb-16 animate-on-scroll">
              <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground mb-4 text-balance">
                Comment ça marche ?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
                Quatre étapes simples pour transformer votre recherche d'emploi.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Créez votre profil",
                  desc: "Renseignez vos compétences, expériences et objectifs de carrière.",
                  icon: <Mic className="w-6 h-6" />,
                },
                {
                  step: "02",
                  title: "Entraînez-vous",
                  desc: "Réalisez des simulations d'entretien adaptées à votre profil.",
                  icon: <Play className="w-6 h-6" />,
                },
                {
                  step: "03",
                  title: "Progressez",
                  desc: "Analysez vos performances et améliorez-vous avec les feedbacks IA.",
                  icon: <BarChart3 className="w-6 h-6" />,
                },
                {
                  step: "04",
                  title: "Réussissez",
                  desc: "Générez CV et lettres, puis trouvez votre prochaine opportunité.",
                  icon: <Trophy className="w-6 h-6" />,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="relative animate-on-scroll h-full"
                  style={{ animationDelay: `${i * 150}ms` }}
                >
                  {i < 3 && (
                    <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10" />
                  )}
                  <Card className="border-border shadow-sm hover:shadow-md transition-all duration-300 group hover:-translate-y-1 h-full">
                    <CardContent className="p-6 text-center flex flex-col h-full">
                      <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-secondary/30 transition-colors flex items-center justify-center text-foreground mb-4 mx-auto">
                        {item.icon}
                      </div>
                      <div className="text-sm font-bold text-muted-foreground mb-2">
                        {item.step}
                      </div>
                      <h3 className="text-lg font-serif font-medium text-foreground mb-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="waitlist"
          className="container mx-auto px-6 py-24 max-w-7xl"
        >
          <Card className="border-border shadow-[var(--shadow-diffuse)] bg-card animate-on-scroll">
            <CardContent className="p-12 md:p-16 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/60 border border-border mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Accès Anticipé
                  </span>
                </div>

                <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-medium text-foreground mb-6">
                  Rejoignez la liste d'attente
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Soyez parmi les premiers à découvrir Entervio et transformez
                  votre recherche d'emploi.
                </p>

                <form
                  onSubmit={handleWaitlistSubmit}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                >
                  <input
                    type="email"
                    placeholder="Votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="h-12 px-4 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="h-12 w-full sm:w-auto px-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary-foreground/10 shadow-[var(--shadow-diffuse)] rounded-lg font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isSubmitting ? "Inscription..." : "S'inscrire"}
                    {!isSubmitting && <ArrowRight className="w-5 h-5 ml-2" />}
                  </Button>
                </form>

                {/* Status Messages */}
                {submitStatus.type && (
                  <div
                    className={`mt-4 p-4 rounded-lg ${
                      submitStatus.type === "success"
                        ? "bg-green-500/10 border border-green-500/20 text-green-600"
                        : "bg-red-500/10 border border-red-500/20 text-red-600"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Accès anticipé</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Pas de spam</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>Désabonnement facile</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-sm text-muted-foreground">
              Créé avec ❤️ par l'équipe Entervio
            </div>
            <div className="text-xs text-muted-foreground/60">
              © 2025 Entervio. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
