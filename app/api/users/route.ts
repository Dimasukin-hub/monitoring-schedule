import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultUsersInDb } from '@/lib/auth';

// Helper untuk memeriksa sesi admin dari header atau cookie
function getAdminSession(req: Request) {
  try {
    // 1. Periksa header x-user-role dari client state
    const roleHeader = req.headers.get('x-user-role');
    if (roleHeader === 'admin') {
      return { role: 'admin', name: req.headers.get('x-user-username') || 'admin' };
    }

    // 2. Periksa cookie ggf_session
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    if (match) {
      const session = JSON.parse(decodeURIComponent(match[1]));
      if (session && session.role === 'admin') {
        return session;
      }
    }

    // 3. Fallback jika dalam development / local environment
    if (process.env.NODE_ENV !== 'production') {
      return { role: 'admin', name: 'admin' };
    }

    return null;
  } catch {
    return null;
  }
}

// GET: Ambil semua data pengguna untuk Admin
export async function GET(req: Request) {
  try {
    const admin = getAdminSession(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang dapat mengakses data ini.' },
        { status: 403 }
      );
    }

    await ensureDefaultUsersInDb();

    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const stats = {
      total: users.length,
      adminCount: users.filter((u) => u.role === 'admin').length,
      userCount: users.filter((u) => u.role === 'user').length,
    };

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        username: u.email,
        role: u.role,
        avatar: u.avatar,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      stats,
    });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memuat data pengguna.' },
      { status: 500 }
    );
  }
}

// POST: Tambah user baru (Username & Password)
export async function POST(req: Request) {
  try {
    const admin = getAdminSession(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang dapat menambah pengguna.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawUsername = body.username || body.email;
    const rawName = body.name;
    const rawPassword = body.password;
    const rawRole = body.role || 'user';

    if (!rawUsername || !rawUsername.trim()) {
      return NextResponse.json(
        { success: false, message: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    if (!rawPassword || rawPassword.trim().length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password wajib diisi (minimal 8 karakter).' },
        { status: 400 }
      );
    }

    const cleanUsername = rawUsername.trim().toLowerCase();
    const cleanName = rawName?.trim() || cleanUsername;
    const role = rawRole === 'admin' ? 'admin' : 'user';

    // Periksa apakah username sudah terpakai
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanUsername, mode: 'insensitive' } },
          { name: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Username "${cleanUsername}" sudah terdaftar. Silakan gunakan username lain.` },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanUsername,
        password: rawPassword.trim(),
        role: role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna "${cleanUsername}" berhasil ditambahkan.`,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menambahkan pengguna. Pastikan database aktif.' },
      { status: 500 }
    );
  }
}
