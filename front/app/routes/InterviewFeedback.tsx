import { useParams } from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/InterviewFeedback";
import { useFeedbackStore } from "~/services/usefeedbackstore";
import { FeedbackContent } from "~/components/FeedbackContent";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Détails de l'entretien - Entervio" },
    { name: "description", content: "Analyse détaillée de votre entretien" },
  ];
}

export default function InterviewDetail() {
  const { interviewId } = useParams();
  const { summary, loading, error, fetchSummary } = useFeedbackStore();

  useEffect(() => {
    if (interviewId) {
      fetchSummary(interviewId);
      console.log(summary);
    }
  }, [interviewId, fetchSummary]);

  return (
    <div className="container mx-auto px-6 py-12 max-w-5xl">
      <FeedbackContent summary={summary} loading={loading} error={error} />
    </div>
  );
}