import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const rateCheck = checkRateLimit(`login:${ip}`);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const parsed = loginSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = signToken(user.id);

        const response = NextResponse.json({
            user: { id: user.id, username: user.username },
            message: 'Logged in successfully'
        });

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
