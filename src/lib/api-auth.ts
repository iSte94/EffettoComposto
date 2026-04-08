import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export class UnauthorizedError extends Error {
    constructor() {
        super('Unauthorized');
        this.name = 'UnauthorizedError';
    }
}

/**
 * Estrae e verifica l'userId dal token JWT nei cookies.
 * Lancia UnauthorizedError se il token manca o non e' valido.
 */
export async function getAuthenticatedUserId(): Promise<string> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        throw new UnauthorizedError();
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        throw new UnauthorizedError();
    }

    return decoded.userId;
}

/**
 * Risposta 401 standard per route non autenticate.
 */
export function unauthorizedResponse() {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
