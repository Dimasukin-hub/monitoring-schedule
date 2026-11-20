import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultUsersInDb } from '@/lib/auth';

// Helper untuk memeriksa sesi admin dari header atau cookie
function getAdminSession(req: Request) {
  try {
    // 1. Periksa header x-user-role dari client state
    const roleHeader = req.headers.get('x-user-role');
    const userHeader = req.headers.get('x-user-username');
    const idHeader = req.headers.get('x-user-id');
    if (roleHeader === 'admin' || roleHeader === 'super_admin') {
      return {
        role: roleHeader,
        name: userHeader || roleHeader,
        id: idHeader ? parseInt(idHeader, 10) : undefined,
      };
    }

    // 2. Periksa cookie ggf_session
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    if (match) {
      const session = JSON.parse(decodeURIComponent(match[1]));
      if (session && (session.role === 'admin' || session.role === 'super_admin')) {
        return session;
      }
    }

    // 3. Fallback jika dalam development / local environment tanpa header eksplisit
    if (process.env.NODE_ENV !== 'production' && !roleHeader) {
      return { role: 'super_admin', name: 'superadmin' };
    }

    return null;
  } catch {
    return null;
  }
}

// GET: Ambil semua data pengguna untuk Admin / Super Admin
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

    const isSuper = admin.role === 'super_admin';

    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        wilayah: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const stats = {
      total: users.length,
      superAdminCount: users.filter((u) => u.role === 'super_admin').length,
      adminCount: users.filter((u) => u.role === 'admin').length,
      userWilayahCount: users.filter((u) => u.role === 'user_wilayah').length,
      userPlantingCount: users.filter((u) => u.role === 'user_planting').length,
      userFeCount: users.filter((u) => u.role === 'user_fe').length,
      userCount: users.filter((u) => u.role === 'user' || u.role === 'user_wilayah' || u.role === 'user_planting' || u.role === 'user_fe').length,
    };

    function detectWilayah(username: string): string | null {
      const match = username.toLowerCase().match(/(?:aw|w|wilayah[\s_-]*|wil[\s_-]*)0?([1-7])(?!\d)/i);
      return match ? `AW0${match[1]}` : null;
    }

    return NextResponse.json({
      success: true,
      data: users.map((u) => {
        const isFieldRole = ['kepala_wilayah', 'user_wilayah', 'user'].includes(u.role);
        const effectiveWilayah = isFieldRole ? (u.wilayah || detectWilayah(u.email)) : null;
        return {
          id: u.id,
          name: u.name,
          username: u.email,
          password: isSuper ? u.password : undefined,
          role: u.role,
          wilayah: effectiveWilayah,
          avatar: u.avatar,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }),
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
    const validRoles = [
      'super_admin',
      'admin',
      'user',
      'user_fe',
      'user_wilayah',
      'user_planting',
      'kepala_bagian_fe',
      'manajer_fe',
      'manajer_fm',
      'manajer_osd',
      'kepala_wilayah',
    ];
    const role = validRoles.includes(rawRole) ? rawRole : 'user_wilayah';

    // Jika yang membuat bukan Super Admin, dilarang membuat akun Admin atau Super Admin
    if (admin.role !== 'super_admin' && (role === 'admin' || role === 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang berhak membuat akun Admin atau Super Admin.' },
        { status: 403 }
      );
    }

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

    const rawWilayah = body.wilayah;
    let cleanWilayah = rawWilayah && String(rawWilayah).trim().toUpperCase() !== 'ALL'
      ? String(rawWilayah).trim().toUpperCase()
      : null;

    // Hanya role kepala_wilayah dan user_wilayah / user yang memiliki wilayah tugas
    if (!['kepala_wilayah', 'user_wilayah', 'user'].includes(role)) {
      cleanWilayah = null;
    } else if (!cleanWilayah) {
      // Auto deteksi dari username jika mengandung w01..w07
      const match = cleanUsername.match(/(?:aw|w|wilayah[\s_-]*|wil[\s_-]*)0?([1-7])(?!\d)/i);
      if (match) {
        cleanWilayah = `AW0${match[1]}`;
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanUsername,
        password: rawPassword.trim(),
        role: role,
        wilayah: cleanWilayah,
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
        wilayah: newUser.wilayah,
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
