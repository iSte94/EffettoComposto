import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId, UnauthorizedError } from '@/lib/api-auth';

export async function GET() {
    try {
        const userId = await getAuthenticatedUserId();

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true }
        });

        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ user: null }, { status: 401 });
        }
        console.error('Session check failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('token');
    return response;
}
