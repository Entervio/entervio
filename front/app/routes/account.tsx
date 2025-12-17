import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Loader2, ChevronRight, Pencil, Briefcase } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";

import type { UserDetailed } from "~/types/user";

import { useAuth } from "~/context/AuthContext";
import { authApi } from "~/lib/api";
import { useNavigate } from "react-router";

export default function Account() {
  const { token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetailed | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", phone: "" });

  useEffect(() => {
    if (!authLoading && !token) {
      navigate("/login");
      return;
    }

    if (token) {
      fetchUser();
    }
  }, [token, authLoading, navigate]);

  const fetchUser = async () => {
    if (!token) return;

    try {
      const res = await authApi.getMe();
      setUser(res);
      setFormData({ first_name: res.first_name, last_name: res.last_name, phone: res.phone || "" });
    } catch (error) {
      console.error("Failed to fetch user", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      headers.append("Authorization", `Bearer ${token}`);

      const res = await fetch("http://localhost:8000/api/v1/auth/me", {
        method: "PUT",
        headers,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const updated = await res.json();
        setUser(updated);
        setEditing(false);
      }
    } catch (error) {
      console.error("Failed to update user", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-20">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
         {/* Page Header */}
        <div className="mb-8 space-y-2 text-center md:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
            Mon Compte
          </h1>
          <p className="text-muted-foreground text-lg">
            Gérez vos informations personnelles et votre dossier de candidature.
          </p>
        </div>
        
        <div className="grid gap-6">
          
          {/* Card A: Profile & Status */}
          <Card className="border border-border/40 shadow-none bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full flex items-center justify-center border border-border/60">
                    <span className="text-2xl font-bold text-primary/80">
                        {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
                    </span>
                </div>
                {user?.has_resume && (
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-background"></div>
                )}
              </div>
              
              <div className="text-center md:text-left flex-1 space-y-1">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight capitalize">{user?.first_name} {user?.last_name}</h2>
                    <p className="text-muted-foreground font-medium text-sm">{user?.email}</p>
                  </div>
              </div>

              <div className="mt-2 md:mt-0 flex items-center gap-2">
                 {user?.has_resume ? (
                    <>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-0 px-4 py-1.5 text-sm font-medium rounded-full shadow-none transition-colors">
                        CV Importé
                      </Badge>
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
                        <Link to="/account/resume">Modifier</Link>
                      </Button>
                    </>
                  ) : (
                     <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 px-4 py-1.5 text-sm font-medium rounded-full shadow-none">
                      CV Incomplet
                    </Badge>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Card B: Account Information */}
          <Card className="border border-border/40 shadow-none overflow-hidden bg-card/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 pt-6 px-6">
                  <div className="space-y-1">
                      <CardTitle className="text-lg font-bold">Informations du Compte</CardTitle>
                      <CardDescription>Vos coordonnées de contact</CardDescription>
                  </div>
                  {!editing && (
                      <Button size="sm" variant="ghost" className="rounded-full hover:bg-muted h-8 px-3 text-muted-foreground" onClick={() => setEditing(true)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Modifier
                      </Button>
                  )}
              </CardHeader>
              
              <CardContent className="p-0">
                  {editing ? (
                      <form onSubmit={handleUpdate} className="p-6 space-y-5 bg-muted/10">
                          <div className="grid md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                  <Label htmlFor="first_name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prénom</Label>
                                  <Input
                                      id="first_name"
                                      value={formData.first_name}
                                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                      className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                  />
                              </div>
                              <div className="space-y-2">
                                  <Label htmlFor="last_name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</Label>
                                  <Input
                                      id="last_name"
                                      value={formData.last_name}
                                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                      className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                  />
                              </div>
                          </div>
                          
                              <div className="space-y-2">
                                  <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Téléphone</Label>
                                  <Input
                                      id="phone"
                                      value={formData.phone}
                                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                      className="border border-border/50 bg-background shadow-none focus-visible:ring-emerald-500"
                                  />
                              </div>

                          
                          <div className="flex justify-end gap-3 pt-2">
                              <Button variant="ghost" size="sm" type="button" onClick={() => setEditing(false)}>
                                  Annuler
                              </Button>
                              <Button type="submit" size="sm" className="shadow-none bg-emerald-600 hover:bg-emerald-700 text-white">
                                  Enregistrer
                              </Button>
                          </div>
                      </form>
                  ) : (
                      <div className="divide-y divide-border/30">
                          <div className="flex flex-col md:flex-row md:items-center py-4 px-6 hover:bg-muted/5 transition-colors group">
                              <span className="text-sm text-muted-foreground/70 font-medium w-1/3">Nom complet</span>
                              <span className="text-foreground font-medium text-base group-hover:text-emerald-700 transition-colors capitalize">{user?.first_name} {user?.last_name}</span>
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center py-4 px-6 hover:bg-muted/5 transition-colors group">
                              <span className="text-sm text-muted-foreground/70 font-medium w-1/3">Email</span>
                              <span className="text-foreground font-medium group-hover:text-emerald-700 transition-colors">{user?.email}</span>
                          </div>
                          <div className="flex flex-col md:flex-row md:items-center py-4 px-6 hover:bg-muted/5 transition-colors group">
                              <span className="text-sm text-muted-foreground/70 font-medium w-1/3">Téléphone</span>
                              <span className="text-foreground font-medium group-hover:text-emerald-700 transition-colors">{user?.phone || "Non renseigné"}</span>
                          </div>
                      </div>
                  )}
              </CardContent>
          </Card>

          {/* Card C: Resume Management */}
          <Card className="border border-border/40 shadow-none overflow-hidden group bg-gradient-to-r from-card to-emerald-50/30 hover:to-emerald-50/50 transition-all duration-500">
              <CardHeader className="relative z-10 pb-2">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-emerald-100/50 rounded-lg text-emerald-700">
                        <Briefcase className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">Gérer votre CV</CardTitle>
                  </div>
                  <CardDescription className="text-sm max-w-lg text-muted-foreground line-clamp-1">
                      Mettez à jour vos expériences et compétences.
                  </CardDescription>
              </CardHeader>
              <CardContent className="pb-6 relative z-10 pt-2">
                  <Link to="/account/resume">
                      <Button className="w-full md:w-auto h-9 text-sm px-4 shadow-none transition-all rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0" size="sm">
                          <span>Accéder à mon CV</span>
                          <ChevronRight className="ml-2 h-4 w-4 opacity-80 group-hover:translate-x-1 transition-transform" />
                      </Button>
                  </Link>
              </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}