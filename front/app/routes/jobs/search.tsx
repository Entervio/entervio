import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, MapPin, Building2, Briefcase, ExternalLink } from "lucide-react";
import { jobsService, type JobOffer } from "~/services/jobs";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export default function JobsSearch() {
    const [keywords, setKeywords] = useState("");
    const [location, setLocation] = useState("");
    const [jobs, setJobs] = useState<JobOffer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keywords.trim()) return;

        setIsLoading(true);
        try {
            const results = await jobsService.search(keywords, location);
            setJobs(results);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
            setHasSearched(true);
        }
    };

    return (
        <div className="container mx-auto p-8 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-serif font-medium text-foreground">Job Search</h1>
            </div>

            <form onSubmit={handleSearch} className="flex gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for jobs (e.g. Python Developer)..."
                        className="pl-10"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                    />
                </div>
                <div className="relative w-1/3">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Location (optional)"
                        className="pl-10"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                </div>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Searching..." : "Search"}
                </Button>
            </form>

            <div className="space-y-4">
                {jobs.length > 0 ? (
                    jobs.map((job) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-medium text-foreground">{job.intitule}</h3>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4" />
                                                <span>{job.entreprise?.nom || "Company Confidential"}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPin className="w-4 h-4" />
                                                <span>{job.lieuTravail.libelle}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Briefcase className="w-4 h-4" />
                                                <span>{job.typeContrat}</span>
                                            </div>
                                        </div>
                                        <p className="text-muted-foreground line-clamp-2">{job.description}</p>
                                        <div className="flex gap-2 pt-2">
                                            {job.salaire?.libelle && (
                                                <Badge variant="secondary">{job.salaire.libelle}</Badge>
                                            )}
                                            <Badge variant="outline">{new Date(job.dateCreation).toLocaleDateString()}</Badge>
                                        </div>
                                    </div>
                                    {job.urlPartner && (
                                        <Button asChild variant="outline" size="sm">
                                            <a href={job.urlPartner} target="_blank" rel="noopener noreferrer">
                                                Apply <ExternalLink className="w-4 h-4 ml-2" />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : hasSearched ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No jobs found. Try adjusting your search terms.
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                        Enter a keyword to start searching for jobs.
                    </div>
                )}
            </div>
        </div>
    );
}

