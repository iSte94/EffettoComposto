// Rate limiter in-memory semplice per protezione brute-force
const attempts = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000; // 15 minuti
const MAX_ATTEMPTS = 10; // max 10 tentativi per finestra

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const entry = attempts.get(key);

    if (!entry || now > entry.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true };
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true };
}

// Pulizia periodica delle entry scadute (evita memory leak)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
        if (now > entry.resetAt) {
            attempts.delete(key);
        }
    }
}, 60 * 1000); // Ogni minuto
