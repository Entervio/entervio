import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { 
  FileText, 
  Briefcase, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface InterviewContextData {
  job_description?: string;
  interviewer_style?: string;
}

interface InterviewContextProps {
  data: InterviewContextData;
  collapsible?: boolean;
}

const INTERVIEWER_STYLE_LABELS: Record<string, string> = {
  nice: "Le Mentor",
  neutral: "Le Professionnel",
  mean: "L'Exigeant",
};

export function InterviewContext({ 
  data, 
  collapsible = true 
}: InterviewContextProps) {
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const hasJobDescription = data.job_description && data.job_description.trim().length > 0;
  const descriptionPreview = data.job_description?.slice(0, 150);
  const isLongDescription = (data.job_description?.length || 0) > 150;

  return (
    <Card className="border-border shadow-sm bg-card/50 overflow-hidden">
      <CardHeader 
        className={cn(
          "pb-4",
          collapsible && hasJobDescription && "cursor-pointer hover:bg-muted/30 transition-colors"
        )}
        onClick={() => collapsible && hasJobDescription && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-medium">
              Contexte de l'entretien
            </CardTitle>
          </div>
          {collapsible && hasJobDescription && (
            <button className="p-1 hover:bg-muted rounded-md transition-colors">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Interviewer Style */}
        {data.interviewer_style && (
          <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
            <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Style d'entretien
              </div>
              <div className="text-sm font-medium text-foreground">
                {INTERVIEWER_STYLE_LABELS[data.interviewer_style] || data.interviewer_style}
              </div>
            </div>
          </div>
        )}

        {/* Job Description */}
        {hasJobDescription && (
          <div className={cn(
            "space-y-2 transition-all duration-300",
            !isExpanded && "max-h-0 overflow-hidden opacity-0"
          )}>
            <div className="flex items-center gap-2 pt-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold text-foreground">
                Description du poste
              </h4>
            </div>
            <div className={cn(
              "p-4 bg-background/60 border border-border/40 rounded-xl",
              "prose prose-sm max-w-none dark:prose-invert"
            )}>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap m-0">
                {data.job_description}
              </p>
            </div>
          </div>
        )}

        {/* Preview when collapsed */}
        {!isExpanded && hasJobDescription && isLongDescription && (
          <div className="p-3 bg-muted/20 rounded-lg border border-dashed border-border/40">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {descriptionPreview}...
            </p>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs text-primary hover:underline mt-1 font-medium"
            >
              Voir la description complète
            </button>
          </div>
        )}

        {/* No job description message */}
        {!hasJobDescription && (
          <div className="p-4 bg-muted/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground italic">
              Aucune description de poste fournie pour cet entretien
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
