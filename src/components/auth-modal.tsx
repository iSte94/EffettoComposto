import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Download, Upload, LogOut } from "lucide-react";

interface AuthModalProps {
    user: { username: string } | null;
    onLogin: (user: { username: string }) => void;
    onLogout: () => void;
}

export function AuthModal({ user, onLogin, onLogout }: AuthModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                onLogin(data.user);
                toast.success(data.message);
                setIsOpen(false);
                setUsername("");
                setPassword("");
            } else {
                toast.error(data.error || "Autenticazione fallita");
            }
        } catch {
            toast.error("Errore di rete");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/me", { method: "DELETE" });
            onLogout();
            toast.success("Disconnesso con successo");
        } catch {
            toast.error("Errore durante il logout");
        }
    };

    const handleExport = async () => {
        try {
            const res = await fetch("/api/user-data");
            if (!res.ok) throw new Error("Errore durante l'esportazione");
            const data = await res.json();

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `effetto-composto-backup-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success("Backup esportato con successo");
        } catch {
            toast.error("Errore durante l'esportazione dei dati");
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version) {
                toast.error("File non valido: formato non riconosciuto");
                return;
            }

            const res = await fetch("/api/user-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: text,
            });

            const result = await res.json();

            if (res.ok) {
                toast.success(
                    `Dati importati! Preferenze: ${result.results.preferences ? "sì" : "no"}, ` +
                    `Snapshot: ${result.results.patrimonio}, Obiettivi: ${result.results.obiettivi}` +
                    (result.results.abbonamenti ? `, Abbonamenti: ${result.results.abbonamenti}` : "")
                );
                // Ricarica la pagina per riflettere i nuovi dati
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error(result.error || "Errore durante l'importazione");
            }
        } catch {
            toast.error("File non valido o errore di lettura");
        } finally {
            // Reset input file per consentire reimportazione dello stesso file
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (user) {
        return (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                    Ciao, <strong className="text-foreground">{user.username}</strong>
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="size-10 bg-background/80 border-border text-foreground hover:bg-muted backdrop-blur-md"
                            title="Impostazioni"
                        >
                            <Settings className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="size-4 mr-2" />
                            Esporta dati
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            <Upload className="size-4 mr-2" />
                            Importa dati
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="size-4 mr-2" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                />
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="min-h-11 bg-blue-600 border border-blue-500 px-4 sm:px-5 text-white shadow-md hover:bg-blue-700"
                >
                    Accedi / Registrati
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1.5rem)] max-w-[28rem] sm:max-w-[425px] rounded-3xl border border-border bg-background/90 text-foreground shadow-2xl backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-foreground">
                        {isLogin ? "Accedi" : "Crea un Account Locale"}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        {isLogin
                            ? "Inserisci le tue credenziali per caricare le preferenze."
                            : "Inserisci un nome utente e una password per creare il tuo account locale e salvare le simulazioni."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-foreground">
                            Username
                        </Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="es: stefano_inv"
                            className="min-h-11 bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-foreground">
                            Password
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="min-h-11 bg-background/80 border-border text-foreground focus-visible:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-3 pt-4 border-t border-border">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full min-h-11 bg-blue-600 text-white shadow-md transition-all hover:bg-blue-700"
                        >
                            {loading ? "Caricamento..." : isLogin ? "Accedi" : "Registrati"}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsLogin(!isLogin)}
                            className="min-h-11 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            {isLogin
                                ? "Non hai un account? Registrati"
                                : "Hai già un account? Accedi"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
