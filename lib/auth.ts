import { prisma } from './prisma';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'user'
  | 'user_fe'
  | 'user_wilayah'
  | 'user_planting'
  | 'kepala_bagian_fe'
  | 'manajer_fe'
  | 'manajer_fm'
  | 'manajer_osd'
  | 'kepala_wilayah';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string | null;
}

// Akun Default (Fallback & Quick Login)
export const DEFAULT_USERS: Array<AuthUser & { password: string }> = [
  {
    id: 0,
    name: 'Super Admin',
    email: 'superadmin',
    password: 'superadmin123',
    role: 'super_admin',
    avatar: null,
  },
  {
    id: 100,
    name: 'Super Admin GGF',
    email: 'superadmin@ggf.co.id',
    password: 'superadmin123',
    role: 'super_admin',
    avatar: null,
  },
  {
    id: 1,
    name: 'Admin FE',
    email: 'admin',
    password: 'admin123',
    role: 'admin',
    avatar: null,
  },
  {
    id: 2,
    name: 'Admin FE GGF',
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
    name: 'User GGF',
    email: 'user@ggf.co.id',
    password: 'user123',
    role: 'user',
    avatar: null,
  },
  {
    id: 5,
    name: 'Mandor Wilayah',
    email: 'wilayah',
    password: 'wilayah123',
    role: 'user_wilayah',
    avatar: null,
  },
  {
    id: 6,
    name: 'TK Verifikator FE',
    email: 'fe',
    password: 'fe123',
    role: 'user_fe',
    avatar: null,
  },
  {
    id: 7,
    name: 'Kepala Bagian FE',
    email: 'kabag_fe',
    password: 'kabag123',
    role: 'kepala_bagian_fe',
    avatar: null,
  },
  {
    id: 8,
    name: 'Manajer FE',
    email: 'manajer_fe',
    password: 'manajer123',
    role: 'manajer_fe',
    avatar: null,
  },
  {
    id: 9,
    name: 'Manajer FM',
    email: 'manajer_fm',
    password: 'manajer123',
    role: 'manajer_fm',
    avatar: null,
  },
  {
    id: 10,
    name: 'Manajer OSD',
    email: 'manajer_osd',
    password: 'manajer123',
    role: 'manajer_osd',
    avatar: null,
  },
  {
    id: 11,
    name: 'Kepala Wilayah',
    email: 'kawil',
    password: 'kawil123',
    role: 'kepala_wilayah',
    avatar: null,
  },
];

let hasSeededUsers = false;

export async function ensureDefaultUsersInDb() {
  if (hasSeededUsers) return;
  try {
    const superAdminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'superadmin' },
          { email: 'superadmin@ggf.co.id' },
          { name: 'superadmin' },
          { name: 'Super Admin' },
        ],
      },
    });

    if (!superAdminUser) {
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: 'superadmin',
          password: 'superadmin123',
          role: 'super_admin',
        },
      });
    }

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

    const wilayahUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: 'wilayah' }, { name: 'User Wilayah' }],
      },
    });
    if (!wilayahUser) {
      await prisma.user.create({
        data: {
          name: 'User Wilayah',
          email: 'wilayah',
          password: 'wilayah123',
          role: 'user_wilayah',
        },
      });
    }

    const feUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: 'fe' }, { name: 'User FE' }],
      },
    });
    if (!feUser) {
      await prisma.user.create({
        data: {
          name: 'User FE',
          email: 'fe',
          password: 'fe123',
          role: 'user_fe',
        },
      });
    }

    const managementUsers = [
      { name: 'Kepala Bagian FE', email: 'kabag_fe', password: 'kabag123', role: 'kepala_bagian_fe' },
      { name: 'Manajer FE', email: 'manajer_fe', password: 'manajer123', role: 'manajer_fe' },
      { name: 'Manajer FM', email: 'manajer_fm', password: 'manajer123', role: 'manajer_fm' },
      { name: 'Manajer OSD', email: 'manajer_osd', password: 'manajer123', role: 'manajer_osd' },
      { name: 'Kepala Wilayah', email: 'kawil', password: 'kawil123', role: 'kepala_wilayah' },
    ];

    for (const mu of managementUsers) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email: mu.email }, { name: mu.name }],
        },
      });
      if (!existing) {
        await prisma.user.create({
          data: {
            name: mu.name,
            email: mu.email,
            password: mu.password,
            role: mu.role,
          },
        });
      }
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
          ...(clean === 'superadmin' ? [{ email: { equals: 'superadmin@ggf.co.id', mode: 'insensitive' as const } }] : []),
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
        role: user.role as any,
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
      (clean === 'superadmin' && (u.email === 'superadmin@ggf.co.id' || u.email === 'superadmin')) ||
      (clean === 'admin' && (u.email === 'admin@ggf.co.id' || u.email === 'admin')) ||
      (clean === 'user' && (u.email === 'user@ggf.co.id' || u.email === 'user')) ||
      (clean === 'wilayah' && u.email === 'wilayah') ||
      (clean === 'fe' && u.email === 'fe')
  );
  return fallback || null;
}

export const findUserByIdentifier = findUserByEmail;

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
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
      role: created.role as any,
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
