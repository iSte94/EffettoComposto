import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from './auth';

describe('loginSchema', () => {
    it('accepts valid login data', () => {
        const result = loginSchema.safeParse({ username: 'admin', password: 'pass123' });
        expect(result.success).toBe(true);
    });

    it('rejects empty username', () => {
        const result = loginSchema.safeParse({ username: '', password: 'pass123' });
        expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
        const result = loginSchema.safeParse({ username: 'admin', password: '' });
        expect(result.success).toBe(false);
    });

    it('rejects missing fields', () => {
        expect(loginSchema.safeParse({}).success).toBe(false);
        expect(loginSchema.safeParse({ username: 'admin' }).success).toBe(false);
    });
});

describe('registerSchema', () => {
    it('accepts valid registration data', () => {
        const result = registerSchema.safeParse({ username: 'user123', password: 'password8' });
        expect(result.success).toBe(true);
    });

    it('requires username at least 3 chars', () => {
        expect(registerSchema.safeParse({ username: 'ab', password: 'password8' }).success).toBe(false);
        expect(registerSchema.safeParse({ username: 'abc', password: 'password8' }).success).toBe(true);
    });

    it('requires password at least 8 chars', () => {
        expect(registerSchema.safeParse({ username: 'user123', password: '1234567' }).success).toBe(false);
        expect(registerSchema.safeParse({ username: 'user123', password: '12345678' }).success).toBe(true);
    });

    it('rejects usernames with special characters', () => {
        expect(registerSchema.safeParse({ username: 'user@name', password: 'password8' }).success).toBe(false);
        expect(registerSchema.safeParse({ username: 'user name', password: 'password8' }).success).toBe(false);
        expect(registerSchema.safeParse({ username: 'user!name', password: 'password8' }).success).toBe(false);
    });

    it('allows underscores, dots, hyphens in username', () => {
        expect(registerSchema.safeParse({ username: 'user_name', password: 'password8' }).success).toBe(true);
        expect(registerSchema.safeParse({ username: 'user.name', password: 'password8' }).success).toBe(true);
        expect(registerSchema.safeParse({ username: 'user-name', password: 'password8' }).success).toBe(true);
    });

    it('rejects passwords over 128 chars', () => {
        const longPassword = 'a'.repeat(129);
        expect(registerSchema.safeParse({ username: 'user123', password: longPassword }).success).toBe(false);
    });
});
