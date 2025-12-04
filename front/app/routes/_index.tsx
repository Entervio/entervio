import { Link } from "react-router";
import type { Route } from "./+types/_index";
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
  CheckCircle2,
  Mic,
  Users,
  Archive,
  BarChart3,
  Lock,
  Play,
} from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Entervio - Maîtrisez vos entretiens" },
    {
      name: "description",
      content: "La plateforme de préparation aux entretiens d'élite.",
    },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-secondary selection:text-secondary-foreground">
      {/* Navbar Placeholder (Assuming Layout handles it, but visually we want it clean) */}

      <main className="container mx-auto px-6 pt-20 pb-32 max-w-7xl">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <div className="space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-border shadow-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">IA de nouvelle génération</span>
            </div>

            <h1 className="text-6xl md:text-7xl lg:text-8xl font-serif font-medium tracking-tight leading-[0.95] text-primary">
              Maîtrisez <br />
              votre voix.
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-xl leading-relaxed font-light">
              L'outil de simulation d'entretien utilisé par les meilleurs candidats.
              Préparez-vous dans un environnement calme, professionnel et rigoureux.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                asChild
                size="lg"
                className="h-14 px-8 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary-foreground/10 shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.5),0px_4px_12px_rgba(0,0,0,0.05)] rounded-lg font-medium transition-all hover:-translate-y-0.5"
              >
                <Link to="/setup">
                  Commencer la simulation
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 px-8 text-lg bg-white border-border text-foreground hover:bg-muted/50 shadow-sm rounded-lg font-medium"
              >
                <Link to="/interviews">
                  Historique
                </Link>
              </Button>
            </div>
          </div>

          {/* Hero Visual / Stats Grid */}
          <div className="relative">
            {/* Abstract Shape Background */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-secondary/30 to-transparent rounded-[2rem] blur-3xl -z-10" />

            <div className="grid gap-6">
              {/* Main Card */}
              <Card className="border-border shadow-[var(--shadow-diffuse)] bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Mic className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dernière Session</p>
                    <h3 className="text-2xl font-serif font-medium text-foreground mt-1">Fullstack Engineer</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded-md bg-green-100 text-green-700 text-sm font-medium">Score: 8.5/10</span>
                      <span className="text-sm text-muted-foreground">Il y a 2 heures</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Row (Bento) */}
              <div className="grid grid-cols-2 gap-6">
                <Card className="border-border shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4 w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-secondary-foreground">
                      <Users className="w-5 h-5" />
                    </div>
                    <h4 className="text-3xl font-bold text-foreground">3</h4>
                    <p className="text-sm text-muted-foreground mt-1">Styles de Recruteur</p>
                  </CardContent>
                </Card>
                <Card className="border-border shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <h4 className="text-3xl font-bold text-foreground">12</h4>
                    <p className="text-sm text-muted-foreground mt-1">Simulations Complétées</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-32">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground mb-4">Pourquoi Entervio ?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Une approche scientifique de la préparation aux entretiens.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Simulation Réaliste",
                desc: "Des scénarios adaptés à votre profil et au poste visé, propulsés par une IA contextuelle.",
                icon: <Play className="w-6 h-6" />
              },
              {
                title: "Feedback Chirurgical",
                desc: "Analyse précise de votre clarté, de votre contenu technique et de votre assurance.",
                icon: <BarChart3 className="w-6 h-6" />
              },
              {
                title: "Confidentialité Totale",
                desc: "Vos données et vos enregistrements sont chiffrés et ne servent qu'à votre progression.",
                icon: <Lock className="w-6 h-6" />
              }
            ].map((feature, i) => (
              <Card key={i} className="border-border shadow-sm hover:shadow-[var(--shadow-diffuse)] transition-all duration-300 group">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-muted group-hover:bg-secondary/30 transition-colors flex items-center justify-center text-foreground mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-serif">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed mt-2">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}