import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/interviews._index";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  FileText,
  Calendar,
  Star,
  User,
  Search,
  Filter,
  ArrowRight,
  Clock,
  MoreHorizontal
} from "lucide-react";
import { useInterviewListStore } from "~/services/interview-list-store";
import { cn } from "~/lib/utils";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Mes entretiens - Entervio" },
    { name: "description", content: "Historique de vos entretiens" },
  ];
}

const INTERVIEWER_STYLE_LABELS: Record<string, string> = {
  nice: "Le Mentor",
  neutral: "Le Professionnel",
  mean: "L'Exigeant",
};

const INTERVIEWER_STYLE_COLORS: Record<string, string> = {
  nice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  neutral: "bg-blue-100 text-blue-700 border-blue-200",
  mean: "bg-red-100 text-red-700 border-red-200",
};

export default function InterviewsIndex() {
  const { interviews, loading, error, fetchInterviews } = useInterviewListStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 8) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (grade >= 5) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  // Filter and Sort Logic
  const filteredInterviews = interviews
    .filter((interview) => {
      const matchesSearch =
        interview.interviewer_style.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (INTERVIEWER_STYLE_LABELS[interview.interviewer_style] || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = filterType === "all" || interview.interviewer_style === filterType;

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date-asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "grade-desc") return b.grade - a.grade;
      if (sortBy === "grade-asc") return a.grade - b.grade;
      return 0;
    });

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded mx-auto"></div>
          <div className="h-4 w-64 bg-muted rounded mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-24 text-center">
        <div className="p-6 bg-red-50 text-red-900 rounded-lg inline-block">
          <p>Une erreur est survenue: {error}</p>
          <Button onClick={() => fetchInterviews()} variant="outline" className="mt-4">Réessayer</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-serif font-medium text-foreground tracking-tight mb-2">
            Historique des sessions
          </h1>
          <p className="text-muted-foreground text-lg font-light">
            Retrouvez vos analyses et suivez votre progression.
          </p>
        </div>
        <Button asChild size="lg" className="shadow-lg shadow-primary/20">
          <Link to="/setup">
            Nouvelle simulation
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-background/60 backdrop-blur-md border border-border/40 rounded-2xl p-4 mb-10 shadow-sm sticky top-20 z-40 transition-all duration-300 hover:shadow-md hover:border-border/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
          <Input
            placeholder="Rechercher une session..."
            className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-all duration-200 h-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="nice">Le Mentor</SelectItem>
              <SelectItem value="neutral">Le Professionnel</SelectItem>
              <SelectItem value="mean">L'Exigeant</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px] bg-background">
              <ArrowRight className="w-4 h-4 mr-2 text-muted-foreground rotate-90" />
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Plus récent</SelectItem>
              <SelectItem value="date-asc">Plus ancien</SelectItem>
              <SelectItem value="grade-desc">Meilleur score</SelectItem>
              <SelectItem value="grade-asc">Moins bon score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty State */}
      {filteredInterviews.length === 0 && (
        <div className="text-center py-24 bg-card/50 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">Aucune session trouvée</h3>
          <p className="text-muted-foreground">Essayez de modifier vos filtres ou démarrez une nouvelle simulation.</p>
        </div>
      )}

      {/* Grid View */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInterviews.map((interview, index) => (
          <Link
            key={interview.id}
            to={`/interviews/${interview.id}`}
            className="group block h-full animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-backwards"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="h-full border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[var(--shadow-diffuse)] hover:-translate-y-1 bg-card">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-4">
                  <Badge
                    variant="outline"
                    className={cn("px-3 py-1 font-medium border", INTERVIEWER_STYLE_COLORS[interview.interviewer_style] || "bg-gray-100 text-gray-700")}
                  >
                    {INTERVIEWER_STYLE_LABELS[interview.interviewer_style] || interview.interviewer_style}
                  </Badge>
                  <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm font-bold", getGradeColor(interview.grade))}>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {interview.grade.toFixed(1)}
                  </div>
                </div>
                <CardTitle className="text-xl font-serif font-medium text-foreground group-hover:text-primary transition-colors">
                  Entretien {INTERVIEWER_STYLE_LABELS[interview.interviewer_style]}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {formatDate(interview.created_at)}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>15 min</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{interview.question_count} questions</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}