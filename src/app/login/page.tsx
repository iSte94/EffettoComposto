"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { user, login } = useAuth();
    const router = useRouter();

    // Se gia' loggato, redirect alla home
    if (user) {
        router.replace("/");
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                login(data.user);
                toast.success(data.message);
                router.push("/");
            } else {
                toast.error(data.error || "Autenticazione fallita");
            }
        } catch {
            toast.error("Errore di rete");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80dvh] items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                        <TrendingUp className="size-8" />
                        <span className="text-2xl font-bold tracking-tight">Effetto Composto</span>
                    </Link>
                </div>

                <Card className="rounded-3xl border border-border bg-background/80 shadow-xl backdrop-blur-2xl">
                    <CardHeader className="space-y-1 pb-4 text-center">
                        <CardTitle className="text-xl font-bold">
                            {isLogin ? "Accedi" : "Crea un Account"}
                        </CardTitle>
                        <CardDescription>
                            {isLogin
                                ? "Inserisci le tue credenziali per accedere."
                                : "Crea un account locale per salvare le tue simulazioni."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="es: stefano_inv"
                                    className="min-h-11 bg-background/80 border-border focus-visible:ring-blue-500"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="min-h-11 bg-background/80 border-border focus-visible:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="space-y-3 pt-2">
                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full min-h-11 bg-blue-600 text-white shadow-md hover:bg-blue-700"
                                >
                                    {loading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="w-full min-h-11 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    {isLogin
                                        ? "Non hai un account? Registrati"
                                        : "Hai gia' un account? Accedi"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="size-3.5" />
                        Torna alla dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
