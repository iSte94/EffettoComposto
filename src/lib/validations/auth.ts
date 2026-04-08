import { z } from 'zod';

export const loginSchema = z.object({
    username: z.string().min(1, 'Username obbligatorio').max(50),
    password: z.string().min(1, 'Password obbligatoria'),
});

export const registerSchema = z.object({
    username: z.string()
        .min(3, 'Username deve essere almeno 3 caratteri')
        .max(50, 'Username troppo lungo')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Username puo\' contenere solo lettere, numeri, _, . e -'),
    password: z.string()
        .min(8, 'Password deve essere almeno 8 caratteri')
        .max(128, 'Password troppo lunga'),
});
