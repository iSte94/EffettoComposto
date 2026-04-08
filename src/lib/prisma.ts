import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    return new PrismaClient()
}

declare global {
    var prismaGlobal3: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal3 ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal3 = prisma
