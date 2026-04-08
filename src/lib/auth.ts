import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET è OBBLIGATORIO in produzione.');
        }
        console.warn('JWT_SECRET non configurato. Usando fallback locale (solo sviluppo).');
        return 'dev-only-local-secret-change-me';
    }
    return secret;
}

export function signToken(userId: string) {
    return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '24h' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, getJwtSecret()) as { userId: string };
    } catch {
        return null;
    }
}
