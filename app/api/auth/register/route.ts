import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawUsername = (body.username || body.email || '').trim();
    const rawName = (body.name || rawUsername).trim();
    const rawPassword = body.password || '';

    if (!rawUsername) {
      return NextResponse.json(
        { success: false, message: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    if (rawUsername.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Username minimal 3 karakter.' },
        { status: 400 }
      );
    }

    if (/\s/.test(rawUsername)) {
      return NextResponse.json(
        { success: false, message: 'Username tidak boleh mengandung spasi.' },
        { status: 400 }
      );
    }

    if (!rawPassword || rawPassword.trim().length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password wajib diisi (minimal 8 karakter).' },
        { status: 400 }
      );
    }

    const cleanUsername = rawUsername.toLowerCase();
    const cleanName = rawName || cleanUsername;

    // Cek apakah username sudah terdaftar di database
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanUsername, mode: 'insensitive' } },
          { name: { equals: cleanUsername, mode: 'insensitive' } },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: `Username "${cleanUsername}" sudah terdaftar. Silakan gunakan username lain atau login.` },
        { status: 409 }
      );
    }

    // Tentukan role (user_wilayah, user_fe, atau user biasa; dilarang mendaftar admin secara bebas)
    const allowedRoles = ['user_wilayah', 'user_fe', 'user'];
    const targetRole = allowedRoles.includes(body.role) ? body.role : 'user';

    // Buat user baru dengan role yang sesuai
    const newUser = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanUsername,
        password: rawPassword.trim(),
        role: targetRole,
      },
    });

    const authData = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar || null,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Pendaftaran akun berhasil! Anda kini dapat masuk ke sistem.',
      user: authData,
    });

    // Otomatis set session cookie agar bisa langsung login
    response.cookies.set('ggf_session', JSON.stringify(authData), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error in register API:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server saat mendaftarkan akun.' },
      { status: 500 }
    );
  }
}
