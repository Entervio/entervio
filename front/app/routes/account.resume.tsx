import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Briefcase, GraduationCap, Code, Languages, Lightbulb, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Textarea } from "~/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { format, parse } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "~/lib/utils";
import { Calendar } from "~/components/ui/calendar";

import type { ResumeData } from "~/types/resume";
import { useAuth } from "~/context/AuthContext";
import { useNavigate } from "react-router";

const EMPTY_RESUME: ResumeData = {
    work_experiences: [],
    educations: [],
    projects: [],
    skills: [],
    languages: [],
};

// Helper for minimal empty text area
function AutoResizeTextarea({ value, onChange, placeholder, className }: { value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, placeholder?: string, className?: string }) {
    return (
        <Textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`min-h-[80px] resize-y ${className}`}
        />
    );
}

function formatDate(d: Date | undefined) {
    if (!d) return "";
    return d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function DatePicker({ value, onChange, placeholder, className }: { value: string | undefined, onChange: (date: string) => void, placeholder?: string, className?: string }) {
    // Internal state management to match user's snippet logic
    const [open, setOpen] = useState(false);
    
    // Parse initial state
    // value can be "yyyy-MM-dd" or "yyyy-MM"
    const initialDate = useMemo(() => {
        if (!value) return undefined;
        let d = parse(value, 'yyyy-MM-dd', new Date());
        if (!isValidDate(d)) {
            d = parse(value, 'yyyy-MM', new Date());
        }
        return isValidDate(d) ? d : undefined;
    }, [value]);

    const [date, setDate] = useState<Date | undefined>(initialDate);
    const [month, setMonth] = useState<Date | undefined>(initialDate);
    const [inputValue, setInputValue] = useState(formatDate(initialDate));

    // Sync from props
    useEffect(() => {
        if (initialDate && isValidDate(initialDate)) {
            setDate(initialDate);
            setMonth(initialDate);
            setInputValue(formatDate(initialDate));
        } else {
            setDate(undefined);
            setInputValue("");
        }
    }, [initialDate]);

    const handleSelect = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
            setInputValue(formatDate(newDate));
            onChange(format(newDate, "yyyy-MM-dd")); 
            setOpen(false);
        } else {
             // User snippet didn't clear on undefined select in `onSelect`, but usually one can't unselect in single mode unless required=false
            setDate(undefined);
            setInputValue("");
            onChange("");
        }
    };
    
    // User snippet input logic for typing
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);
        const newDate = new Date(val);
        if (isValidDate(newDate)) {
            setDate(newDate);
            setMonth(newDate);
            onChange(format(newDate, "yyyy-MM-dd"));
        }
    };

    return (
        <div className="relative flex gap-2 w-full">
            <Input
                value={inputValue}
                placeholder={placeholder || "June 01, 2025"}
                className={cn("bg-background pr-10", className)}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
            />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className="absolute top-1/2 right-2 size-6 -translate-y-1/2 p-0 h-6 w-6"
                    >
                        <CalendarIcon className="size-4" />
                        <span className="sr-only">Select date</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0"
                    align="end"
                    alignOffset={-8}
                    sideOffset={10}
                >
                    <Calendar
                        mode="single"
                        selected={date}
                        month={month}
                        onMonthChange={setMonth}
                        onSelect={handleSelect}
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

function isValidDate(date: Date | undefined) {
    if (!date) return false;
    return !Number.isNaN(date.getTime());
}

export default function ResumePage() {
    const { token, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [resume, setResume] = useState<ResumeData>(EMPTY_RESUME);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!authLoading && !token) {
            navigate("/login");
            return;
        }

        if (token) {
            fetchResume();
        }
    }, [token, authLoading, navigate]);

    const fetchResume = async () => {
        if (!token) return;

        try {
            const headers = new Headers();
            headers.append("Authorization", `Bearer ${token}`);
            const res = await fetch("http://localhost:8000/api/v1/resume/full", { headers });
            if (res.ok) {
                const data = await res.json();
                setResume(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!token) return;
        setSaving(true);
        try {
            const headers = new Headers();
            headers.append("Content-Type", "application/json");
            headers.append("Authorization", `Bearer ${token}`);

            const res = await fetch("http://localhost:8000/api/v1/resume/full", {
                method: "PUT",
                headers,
                body: JSON.stringify(resume),
            });
            if (res.ok) {
                const data = await res.json();
                setResume(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    // --- Generic Handlers ---
    const updateItem = <T,>(listKey: keyof ResumeData, index: number, field: keyof T, value: any) => {
        setResume(prev => {
            const list = [...prev[listKey]] as any[];
            list[index] = { ...list[index], [field]: value };
            return { ...prev, [listKey]: list };
        });
    };

    const addItem = (listKey: keyof ResumeData, emptyItem: any) => {
        setResume(prev => ({
            ...prev,
            [listKey]: [...prev[listKey], emptyItem]
        }));
    };

    const removeItem = (listKey: keyof ResumeData, index: number) => {
        setResume(prev => ({
            ...prev,
            [listKey]: (prev[listKey] as any[]).filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
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
                            <p className="text-muted-foreground text-sm">Mettez à jour vos expériences et compétences</p>
                        </div>
                    </div>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-none rounded-lg">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Enregistrer
                    </Button>
                </div>

                <div className="space-y-8">
                    {/* Work Experience */}
                    <Section 
                        title="Expériences Professionnelles" 
                        icon={<Briefcase className="h-5 w-5" />}
                        onAdd={() => addItem('work_experiences', { company: '', role: '', start_date: '', end_date: '', description: '' })}
                    >
                        {resume.work_experiences.map((item, idx) => (
                            <Card key={idx} className="group relative border border-border/40 shadow-none bg-card/50 hover:bg-card/80 transition-colors">
                                <CardContent className="p-6 space-y-5">
                                    <div className="flex justify-between items-start gap-4">
                                         <div className="flex-1 space-y-5">
                                             {/* Top Row: Role & Company - Primary Info */}
                                            <div className="grid md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Rôle / Poste</Label>
                                                    <Input 
                                                        className="font-medium text-base h-10 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500" 
                                                        value={item.role} 
                                                        onChange={(e) => updateItem('work_experiences', idx, 'role', e.target.value)} 
                                                        placeholder="Ex: Senior Backend Developer" 
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Entreprise</Label>
                                                    <Input 
                                                        className="h-10 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                        value={item.company} 
                                                        onChange={(e) => updateItem('work_experiences', idx, 'company', e.target.value)} 
                                                        placeholder="Ex: Google" 
                                                    />
                                                </div>
                                            </div>

                                            {/* Second Row: Dates - Secondary Info */}
                                            <div className="grid grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1">Début</Label>
                                                    <DatePicker 
                                                        value={item.start_date || ''} 
                                                        onChange={(val) => updateItem('work_experiences', idx, 'start_date', val)} 
                                                        placeholder="Début"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 flex items-center gap-1">Fin</Label>
                                                    <DatePicker 
                                                        value={item.end_date || ''} 
                                                        onChange={(val) => updateItem('work_experiences', idx, 'end_date', val)} 
                                                        placeholder="Présent"
                                                    />
                                                </div>
                                            </div>
                                         </div>
                                         
                                         {/* Delete Button */}
                                         <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-1 hover:bg-destructive/10"
                                            onClick={() => removeItem('work_experiences', idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <Separator className="bg-border/40" />
                                    
                                    {/* Description */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Description</Label>
                                        <AutoResizeTextarea
                                            value={item.description || ''}
                                            onChange={(e) => updateItem('work_experiences', idx, 'description', e.target.value)}
                                            placeholder="Décrivez vos responsabilités et résultats clés..."
                                            className="text-sm border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </Section>

                    {/* Education */}
                    <Section 
                        title="Formation" 
                        icon={<GraduationCap className="h-5 w-5" />}
                        onAdd={() => addItem('educations', { institution: '', degree: '', end_date: '' })}
                    >
                        {resume.educations.map((item, idx) => (
                            <Card key={idx} className="group relative border border-border/40 shadow-none bg-card/50 hover:bg-card/80 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="grid md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Diplôme</Label>
                                                    <Input 
                                                        className="font-medium border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                        value={item.degree} 
                                                        onChange={(e) => updateItem('educations', idx, 'degree', e.target.value)} 
                                                        placeholder="Ex: Master en Informatique" 
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Institution</Label>
                                                    <Input 
                                                        className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                        value={item.institution} 
                                                        onChange={(e) => updateItem('educations', idx, 'institution', e.target.value)} 
                                                        placeholder="Ex: École Polytechnique" 
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-1/2 pr-2 space-y-1.5">
                                                <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Année d'obtention</Label>
                                                <Input 
                                                    type="number"
                                                    className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                    value={item.end_date || ''} 
                                                    onChange={(e) => updateItem('educations', idx, 'end_date', e.target.value)} 
                                                    placeholder="YYYY" 
                                                />
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-1 hover:bg-destructive/10"
                                            onClick={() => removeItem('educations', idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </Section>

                    {/* Projects */}
                    <Section 
                        title="Projets" 
                        icon={<Code className="h-5 w-5" />}
                        onAdd={() => addItem('projects', { name: '', tech_stack: '', details: '' })}
                    >
                        {resume.projects.map((item, idx) => (
                            <Card key={idx} className="group relative border border-border/40 shadow-none bg-card/50 hover:bg-card/80 transition-colors">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-4">
                                            <div className="grid md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Nom du projet</Label>
                                                    <Input 
                                                        className="font-medium border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                        value={item.name} 
                                                        onChange={(e) => updateItem('projects', idx, 'name', e.target.value)} 
                                                        placeholder="Ex: Portfolio Personnel" 
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Stack Technique</Label>
                                                    <Input 
                                                        className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                                        value={item.tech_stack || ''} 
                                                        onChange={(e) => updateItem('projects', idx, 'tech_stack', e.target.value)} 
                                                        placeholder="Ex: React, Node.js, AWS" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-muted-foreground hover:text-destructive shrink-0 -mt-1 -mr-1 hover:bg-destructive/10"
                                            onClick={() => removeItem('projects', idx)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    
                                    <Separator className="bg-border/40" />

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">Détails</Label>
                                        <AutoResizeTextarea
                                            value={item.details || ''}
                                            onChange={(e) => updateItem('projects', idx, 'details', e.target.value)}
                                            placeholder="Description du projet..."
                                            className="text-sm border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </Section>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Skills */}
                        <Section 
                            title="Compétences" 
                            icon={<Lightbulb className="h-5 w-5" />}
                            onAdd={() => addItem('skills', { name: '' })}
                        >
                            <div className="grid gap-3">
                                {resume.skills.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center group">
                                        <Input 
                                            className="flex-1 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                            value={item.name} 
                                            onChange={(e) => updateItem('skills', idx, 'name', e.target.value)} 
                                            placeholder="Ex: Python" 
                                        />
                                        <Input 
                                            className="w-1/3 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500" 
                                            value={item.category || ''} 
                                            onChange={(e) => updateItem('skills', idx, 'category', e.target.value)} 
                                            placeholder="Catégorie" 
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeItem('skills', idx)} className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Section>

                        {/* Languages */}
                        <Section 
                            title="Langues" 
                            icon={<Languages className="h-5 w-5" />}
                            onAdd={() => addItem('languages', { name: '' })}
                        >
                            <div className="grid gap-3">
                                {resume.languages.map((item, idx) => (
                                    <div key={idx} className="flex gap-3 items-center group">
                                        <Input 
                                            className="flex-1 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                            value={item.name} 
                                            onChange={(e) => updateItem('languages', idx, 'name', e.target.value)} 
                                            placeholder="Ex: Anglais" 
                                        />
                                        <Input 
                                            className="w-1/3 border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500" 
                                            value={item.proficiency || ''} 
                                            onChange={(e) => updateItem('languages', idx, 'proficiency', e.target.value)} 
                                            placeholder="Niveau" 
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeItem('languages', idx)} className="text-muted-foreground hover:text-destructive opacity-50 group-hover:opacity-100 transition-opacity hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon, children, onAdd }: { title: string, icon: React.ReactNode, children: React.ReactNode, onAdd: () => void }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-3 text-lg font-bold text-foreground">
                    <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-700">
                        {icon}
                    </div>
                    {title}
                </div>
                <Button variant="ghost" size="sm" onClick={onAdd} className="gap-2 h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50">
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                </Button>
            </div>
            <div className="space-y-4 pt-2">
                {children}
            </div>
        </div>
    );
}
