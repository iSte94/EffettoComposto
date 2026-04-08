import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations/auth';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
    try {
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const rateCheck = checkRateLimit(`register:${ip}`);
        if (!rateCheck.allowed) {
            return NextResponse.json(
                { error: 'Troppi tentativi. Riprova tra qualche minuto.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const parsed = registerSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Dati non validi' },
                { status: 400 }
            );
        }

        const { username, password } = parsed.data;

        const existingUser = await prisma.user.findUnique({
            where: { username }
        });

        if (existingUser) {
            return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        const token = signToken(user.id);

        const response = NextResponse.json({
            user: { id: user.id, username: user.username },
            message: 'User registered successfully'
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
        console.error('Registration failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
