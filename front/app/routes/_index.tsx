import { Link } from "react-router";
import type { Route } from "./+types/_index";
import { Layout } from "~/components/layout/Layout";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ArrowRight,
  CheckCircle2,
  Mic,
  Users,
  Archive,
  BarChart3,
  Lock,
} from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Entervio - Entraînez-vous aux entretiens d'embauche" },
    {
      name: "description",
      content: "Pratiquez vos entretiens d'embauche avec un recruteur IA",
    },
  ];
}

export default function Home() {
  return (
    <div className="container mx-auto px-6 py-20 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-24">
        <div className="inline-block mb-6">
          <span className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold tracking-wide border border-primary/20">
            Formation professionnelle
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight">
          Maîtrisez vos entretiens
          <br />
          <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
            avec l'IA
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
          Entraînez-vous avec un recruteur virtuel intelligent. Recevez des
          feedbacks personnalisés et améliorez vos compétences.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="text-lg h-14 px-8 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link to="/setup">
              Démarrer un entretien
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="text-lg h-14 px-8 border-border text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Link to="/interviews">Voir mes entretiens</Link>
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid md:grid-cols-3 gap-8 mb-24">
        <Card className="text-center border-border hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-primary">
              100%
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Simulation réaliste
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="text-center border-border hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-primary">
              3
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Styles de recruteur
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="text-center border-border hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-primary">
              15min
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Durée moyenne
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="mb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
          Pourquoi choisir Entervio ?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <CheckCircle2 className="w-6 h-6" />,
              title: "Simulation authentique",
              desc: "Vivez une expérience d'entretien réaliste avec des questions pertinentes et contextuelles",
            },
            {
              icon: <Mic className="w-6 h-6" />,
              title: "Interaction vocale",
              desc: "Répondez naturellement à voix haute comme dans un véritable entretien professionnel",
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "Profils variés",
              desc: "Trois styles de recruteur pour vous préparer à toutes les situations",
            },
            {
              icon: <Archive className="w-6 h-6" />,
              title: "Historique complet",
              desc: "Accédez à tous vos entretiens passés et suivez votre progression",
            },
            {
              icon: <BarChart3 className="w-6 h-6" />,
              title: "Feedback détaillé",
              desc: "Recevez des analyses approfondies de vos performances après chaque session",
            },
            {
              icon: <Lock className="w-6 h-6" />,
              title: "Confidentialité",
              desc: "Vos données sont sécurisées et vos sessions restent privées",
            },
          ].map((feature, index) => (
            <Card key={index} className="border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all hover:-translate-y-1 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary border border-primary/20">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed text-muted-foreground">
                  {feature.desc}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <Card className="mb-24 border-border overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl shadow-black/5">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 p-8 border-b border-border">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">
            Comment ça fonctionne ?
          </h2>
        </div>
        <CardContent className="p-8 md:p-12">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                num: "1",
                title: "Configuration",
                desc: "Renseignez votre nom et sélectionnez le profil de recruteur qui correspond à vos besoins de préparation",
              },
              {
                num: "2",
                title: "Entretien",
                desc: "Participez à une session interactive de 10-15 minutes avec des questions personnalisées et répondez vocalement",
              },
              {
                num: "3",
                title: "Analyse",
                desc: "Consultez votre évaluation détaillée avec des recommandations pour améliorer vos performances futures",
              },
            ].map((step) => (
              <div key={step.num} className="relative group">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg border border-border group-hover:border-primary/50 transition-colors text-foreground">
                  {step.num}
                </div>
                <h3 className="font-bold text-xl mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="border-border overflow-hidden shadow-2xl shadow-primary/5 bg-card">
        <div className="bg-gradient-to-r from-secondary via-secondary/80 to-accent p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground relative z-10">
            Prêt à exceller dans vos entretiens ?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-muted-foreground relative z-10">
            Rejoignez des centaines de candidats qui améliorent leurs compétences
            avec Entervio
          </p>
          <Button
            asChild
            size="lg"
            variant="default"
            className="text-lg h-14 px-10 shadow-lg hover:shadow-xl bg-primary text-primary-foreground hover:bg-primary/90 relative z-10"
          >
            <Link to="/setup">Commencer maintenant</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}