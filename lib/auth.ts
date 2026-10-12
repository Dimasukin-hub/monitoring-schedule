import { prisma } from './prisma';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
}

// Akun Default (Fallback & Quick Login)
export const DEFAULT_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 1,
    name: 'admin',
    email: 'admin',
    password: 'admin123',
    role: 'admin',
    avatar: null,
  },
  {
    id: 2,
    name: 'Administrator GGF',
    email: 'admin@ggf.co.id',
    password: 'admin123',
    role: 'admin',
    avatar: null,
  },
  {
    id: 3,
    name: 'user',
    email: 'user',
    password: 'user123',
    role: 'user',
    avatar: null,
  },
  {
    id: 4,
    name: 'Operator & User GGF',
    email: 'user@ggf.co.id',
    password: 'user123',
    role: 'user',
    avatar: null,
  },
];

let hasSeededUsers = false;

export async function ensureDefaultUsersInDb() {
  if (hasSeededUsers) return;
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin' },
          { email: 'admin@ggf.co.id' },
          { name: 'admin' },
        ],
      },
    });

    if (!adminUser) {
      await prisma.user.create({
        data: {
          name: 'admin',
          email: 'admin',
          password: 'admin123',
          role: 'admin',
        },
      });
    }

    const regUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'user' },
          { email: 'user@ggf.co.id' },
          { name: 'user' },
        ],
      },
    });

    if (!regUser) {
      await prisma.user.create({
        data: {
          name: 'user',
          email: 'user',
          password: 'user123',
          role: 'user',
        },
      });
    }

    hasSeededUsers = true;
  } catch (error) {
    console.warn('ensureDefaultUsersInDb warning:', error);
  }
}

export async function findUserByEmail(identifier: string) {
  const clean = identifier.toLowerCase().trim();
  await ensureDefaultUsersInDb();

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: 'insensitive' as const } },
          { name: { equals: clean, mode: 'insensitive' as const } },
          ...(clean === 'admin' ? [{ email: { equals: 'admin@ggf.co.id', mode: 'insensitive' as const } }] : []),
          ...(clean === 'user' ? [{ email: { equals: 'user@ggf.co.id', mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password,
        role: (user.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        avatar: (user as any).avatar || null,
      };
    }
  } catch (error) {
    console.warn('Prisma DB error, falling back to in-memory users:', error);
  }

  // Fallback ke default users jika DB belum terisi
  const fallback = DEFAULT_USERS.find(
    (u) =>
      u.email.toLowerCase() === clean ||
      u.name.toLowerCase() === clean ||
      (clean === 'admin' && (u.email === 'admin@ggf.co.id' || u.email === 'admin')) ||
      (clean === 'user' && (u.email === 'user@ggf.co.id' || u.email === 'user'))
  );
  return fallback || null;
}

export const findUserByIdentifier = findUserByEmail;

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}) {
  const cleanEmail = data.email.toLowerCase().trim();
  const cleanName = data.name.trim();

  try {
    const created = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: data.password,
        role: data.role,
      },
    });
    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: (created.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
    };
  } catch (error) {
    console.warn('Prisma DB error in createUser, creating in-memory user:', error);
    const newUser = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      password: data.password,
      role: data.role,
    };
    DEFAULT_USERS.push(newUser);
    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };
  }
}
