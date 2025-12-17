import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Trash2, Save, Loader2, Briefcase, Lightbulb } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { toast } from "sonner";

import { useAuth } from "~/context/AuthContext";
import { useResumeStore } from "~/services/useResume";
import { AutoResizeTextarea, DatePicker, Section } from "~/components/resume/ResumeFormComponents";

export default function ResumePage() {
    const { token, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    // Pull everything from the store
    const { 
        resume, 
        loading, 
        fetchResume, 
        saveResume, 
        updateField, 
        addItem, 
        updateItem, 
        removeItem 
    } = useResumeStore();

    useEffect(() => {
        if (!authLoading && !token) {
            navigate("/login");
            return;
        }
        if (token) fetchResume(token);
    }, [authLoading, token, navigate, fetchResume]);

    const handleSave = async () => {
        if (!token) return;
        try {
            await saveResume(token);
            toast.success("CV mis à jour avec succès");
        } catch (err) {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    if (loading && !resume.summary) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-20">
            <div className="container mx-auto px-4 py-12 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild className="rounded-full h-10 w-10 hover:bg-muted/50">
                            <Link to="/account">
                                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mon CV</h1>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSave} 
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Enregistrer
                        </Button>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Global Info */}
                    <Card className="border border-border/40 shadow-none bg-card/50">
                        <CardContent className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium uppercase tracking-wide">Résumé</Label>
                                <AutoResizeTextarea
                                    value={resume.summary}
                                    onChange={(e) => updateField('summary', e.target.value)}
                                    placeholder="Un bref résumé..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Work Experience */}
                    <Section 
                        title="Expériences Professionnelles" 
                        icon={<Briefcase className="h-5 w-5" />}
                        onAdd={() => addItem('work_experiences', { company: '', role: '', start_date: '', end_date: '', description: '' })}
                    >
                        {resume.work_experiences.map((item, idx) => (
                            <Card key={idx} className="border border-border/40 shadow-none bg-card/50">
                                <CardContent className="p-6 space-y-5">
                                    <div className="flex justify-between items-start gap-4">
                                         <div className="flex-1 space-y-5">
                                            <div className="grid md:grid-cols-2 gap-5">
                                                <Input 
                                                    value={item.role} 
                                                    onChange={(e) => updateItem('work_experiences', idx, 'role', e.target.value)} 
                                                    placeholder="Poste" 
                                                />
                                                <Input 
                                                    value={item.company} 
                                                    onChange={(e) => updateItem('work_experiences', idx, 'company', e.target.value)} 
                                                    placeholder="Entreprise" 
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-5">
                                                <DatePicker 
                                                    value={item.start_date} 
                                                    onChange={(val) => updateItem('work_experiences', idx, 'start_date', val)} 
                                                />
                                                <DatePicker 
                                                    value={item.end_date} 
                                                    onChange={(val) => updateItem('work_experiences', idx, 'end_date', val)} 
                                                />
                                            </div>
                                         </div>
                                         <Button variant="ghost" size="icon" onClick={() => removeItem('work_experiences', idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <AutoResizeTextarea
                                        value={item.description}
                                        onChange={(e) => updateItem('work_experiences', idx, 'description', e.target.value)}
                                        placeholder="Description..."
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </Section>

                    {/* Skills */}
                    <Section 
                        title="Compétences" 
                        icon={<Lightbulb className="h-5 w-5" />}
                        onAdd={() => addItem('skills', { name: '', category: '' })}
                    >
                        <div className="grid gap-3">
                            {resume.skills.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center">
                                    <Input 
                                        className="flex-1"
                                        value={item.name} 
                                        onChange={(e) => updateItem('skills', idx, 'name', e.target.value)} 
                                        placeholder="Compétence" 
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeItem('skills', idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Section>
                </div>
            </div>
        </div>
    );
}