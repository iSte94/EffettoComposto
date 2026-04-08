import jwt from 'jsonwebtoken';

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // In development senza JWT_SECRET configurato, usa un fallback locale
        // In produzione, settare SEMPRE JWT_SECRET nell'environment
        console.warn('JWT_SECRET non configurato. Usando fallback locale (non sicuro per produzione).');
        return 'dev-only-local-secret-change-me';
    }
    return secret;
}

export function signToken(userId: string) {
    return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, getJwtSecret()) as { userId: string };
    } catch {
        return null;
    }
}
