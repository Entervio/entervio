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

export function meta({}: Route.MetaArgs) {
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
            <span className="px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold tracking-wide">
              Formation professionnelle
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            Maîtrisez vos entretiens
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              avec l'IA
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Entraînez-vous avec un recruteur virtuel intelligent. Recevez des
            feedbacks personnalisés et améliorez vos compétences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="text-lg h-14 px-8 shadow-lg bg-primary hover:bg-primary-600">
              <Link to="/setup">
                Démarrer un entretien
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="text-lg h-14 px-8 border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Link to="/interviews">Voir mes entretiens</Link>
            </Button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-24">
          <Card className="text-center border-2 border-gray-200 hover:shadow-lg transition-shadow bg-white">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary">
                100%
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Simulation réaliste
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center border-2 border-gray-200 hover:shadow-lg transition-shadow bg-white">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary">
                3
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Styles de recruteur
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-center border-2 border-gray-200 hover:shadow-lg transition-shadow bg-white">
            <CardHeader>
              <CardTitle className="text-4xl font-bold text-primary">
                15min
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Durée moyenne
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="mb-24">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
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
              <Card key={index} className="border-2 border-gray-200 hover:shadow-xl transition-all hover:-translate-y-1 bg-white">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl text-gray-900">{feature.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed text-gray-600">
                    {feature.desc}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* How it works */}
        <Card className="mb-24 border-2 border-gray-200 overflow-hidden bg-white shadow-xl">
          <div className="bg-gradient-to-r from-primary to-accent p-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center">
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
                <div key={step.num} className="relative">
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-2xl font-bold mb-6 shadow-lg">
                    {step.num}
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="border-2 border-gray-200 overflow-hidden shadow-xl bg-white">
          <div className="bg-gradient-to-r from-secondary via-primary to-accent p-12 md:p-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Prêt à exceller dans vos entretiens ?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Rejoignez des centaines de candidats qui améliorent leurs compétences
              avec Entervio
            </p>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg h-14 px-10 shadow-lg hover:shadow-xl bg-white text-primary hover:bg-gray-100"
            >
              <Link to="/setup">Commencer maintenant</Link>
            </Button>
          </div>
        </Card>
      </div>
  );
}