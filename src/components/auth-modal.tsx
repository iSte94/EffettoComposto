import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface AuthModalProps {
    user: { username: string } | null;
    onLogin: (user: { username: string }) => void;
    onLogout: () => void;
}

export function AuthModal({ user, onLogin, onLogout }: AuthModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                onLogin(data.user);
                toast.success(data.message);
                setIsOpen(false);
                setUsername('');
                setPassword('');
            } else {
                toast.error(data.error || 'Autenticazione fallita');
            }
        } catch (err) {
            toast.error('Errore di rete');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/me', { method: 'DELETE' });
            onLogout();
            toast.success('Disconnesso con successo');
        } catch (err) {
            toast.error('Errore durante il logout');
        }
    };

    if (user) {
        return (
            <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ciao, <strong className="text-slate-900 dark:text-slate-100">{user.username}</strong></span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-white hover:text-slate-900 dark:text-slate-100 backdrop-blur-md">
                    Logout
                </Button>
            </div>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="default" className="bg-blue-600 border border-blue-500 text-white hover:bg-blue-700 shadow-md">Accedi / Registrati</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white/80 backdrop-blur-2xl border border-white dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">{isLogin ? 'Accedi' : 'Crea un Account Locale'}</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {isLogin
                            ? 'Inserisci le tue credenziali per caricare le preferenze.'
                            : 'Inserisci un nome utente e una password per creare il tuo account locale e salvare le simulazioni.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 dark:text-slate-300">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="es: stefano_inv"
                            className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:text-slate-400 focus-visible:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="flex flex-col space-y-3 pt-4 border-t border-slate-200">
                        <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all">
                            {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-slate-500 hover:text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:bg-slate-800"
                        >
                            {isLogin
                                ? "Non hai un account? Registrati"
                                : 'Hai già un account? Accedi'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
