"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App error:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                <h2 className="text-xl font-semibold">Qualcosa è andato storto</h2>
                <p className="text-muted-foreground text-sm">
                    Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
                </p>
                <Button onClick={reset} variant="outline">
                    Riprova
                </Button>
            </div>
        </div>
    );
}
