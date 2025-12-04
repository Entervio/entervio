import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Search, MapPin, Building2, Briefcase, ExternalLink, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { jobsService, type JobOffer } from "~/services/jobs";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

function JobCard({ job }: { job: JobOffer }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={cn(
                "group bg-card rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-border overflow-hidden cursor-pointer",
                isOpen ? "ring-1 ring-primary/20" : ""
            )}
            onClick={() => setIsOpen(!isOpen)}
        >
            <div className="p-6 flex items-start gap-4">
                {/* Logo Placeholder */}
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                    <Building2 className="w-6 h-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                                {job.intitule}
                            </h3>
                            <p className="text-sm text-muted-foreground font-sans mt-0.5">
                                {job.entreprise?.nom || "Company Confidential"}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {job.relevance_score !== undefined && (
                                <Badge variant="secondary" className="bg-secondary text-secondary-foreground font-medium">
                                    {job.relevance_score}% Match
                                </Badge>
                            )}
                            <Button variant="link" className="text-primary h-auto p-0 font-medium underline decoration-primary/30 hover:decoration-primary">
                                View
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{job.lieuTravail.libelle}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5" />
                            <span>{job.typeContrat}</span>
                        </div>
                        {job.salaire?.libelle && (
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground border-border">
                                {job.salaire.libelle}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Details */}
            {isOpen && (
                <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-2 duration-200">
                    <div className="h-px w-full bg-border mb-4" />

                    {job.relevance_reasoning && (
                        <div className="mb-4 p-3 bg-secondary/30 rounded-md border border-secondary/50">
                            <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground mb-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI Analysis</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {job.relevance_reasoning}
                            </p>
                        </div>
                    )}

                    <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p className="whitespace-pre-line">{job.description}</p>
                    </div>

                    <div className="mt-6 flex justify-end">
                        {job.urlPartner && (
                            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                <a
                                    href={job.urlPartner}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Apply Now <ExternalLink className="w-4 h-4 ml-2" />
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function JobsSearch() {
    const [keywords, setKeywords] = useState("");
    const [location, setLocation] = useState("");
    const [jobs, setJobs] = useState<JobOffer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchMode, setSearchMode] = useState<"standard" | "smart">("standard");

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!keywords.trim() && searchMode === "standard") return;

        setIsLoading(true);
        setJobs([]); // Clear previous results
        try {
            const results = await jobsService.search(keywords, location);
            setJobs(results);
            setSearchMode("standard");
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
            setHasSearched(true);
        }
    };

    const handleSmartSearch = async () => {
        setIsLoading(true);
        setJobs([]); // Clear previous results
        try {
            // Smart search doesn't strictly require keywords as it uses the resume
            const results = await jobsService.smartSearch(location);
            setJobs(results);
            setSearchMode("smart");
        } catch (error) {
            console.error("Smart search failed:", error);
        } finally {
            setIsLoading(false);
            setHasSearched(true);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center py-12 px-4">
            {/* Main Column */}
            <div className="w-full max-w-[800px] space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-serif font-medium text-foreground">
                        The Opportunity Deck
                    </h1>
                    <p className="text-muted-foreground">
                        Find roles that match your true potential.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="bg-card p-2 rounded-lg shadow-sm border border-border flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Search role or company..."
                            className="pl-12 h-12 border-0 shadow-none focus-visible:ring-0 text-base bg-transparent"
                            value={keywords}
                            onChange={(e) => setKeywords(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <div className="h-px sm:h-auto sm:w-px bg-border mx-2" />
                    <div className="relative w-full sm:w-1/3">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                            placeholder="Location"
                            className="pl-12 h-12 border-0 shadow-none focus-visible:ring-0 text-base bg-transparent"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                    </div>
                    <Button
                        onClick={(e) => handleSearch(e)}
                        disabled={isLoading}
                        className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium"
                    >
                        {isLoading && searchMode === "standard" ? "Searching..." : "Search"}
                    </Button>
                </div>

                {/* Smart Search Toggle */}
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleSmartSearch}
                        disabled={isLoading}
                        className={cn(
                            "gap-2 border-primary/20 hover:bg-secondary/50 hover:text-primary transition-colors",
                            searchMode === "smart" && hasSearched ? "bg-secondary/50 text-primary border-primary/50" : "text-muted-foreground"
                        )}
                    >
                        <Sparkles className={cn("w-4 h-4", isLoading && searchMode === "smart" ? "animate-spin" : "")} />
                        {isLoading && searchMode === "smart" ? "Analyzing Profile..." : "Use Smart Search (AI)"}
                    </Button>
                </div>

                {/* Results */}
                <div className="space-y-4">
                    {jobs.length > 0 ? (
                        jobs.map((job) => (
                            <JobCard key={job.id} job={job} />
                        ))
                    ) : hasSearched && !isLoading ? (
                        <div className="text-center py-16 bg-card rounded-lg border border-border border-dashed">
                            <p className="text-muted-foreground">No opportunities found. Try adjusting your search.</p>
                        </div>
                    ) : !hasSearched && !isLoading ? (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground text-sm">
                                Enter a keyword or use Smart Search to find jobs tailored to your resume.
                            </p>
                        </div>
                    ) : (
                        // Loading State Skeletons
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-32 bg-card rounded-lg border border-border animate-pulse" />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

