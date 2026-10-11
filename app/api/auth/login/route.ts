import { NextResponse } from 'next/server';
import { findUserByEmail } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = body.email || body.username || body.identifier;
    const password = body.password;

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Username/Email dan password wajib diisi.' },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(identifier);

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, message: 'Username/Email atau password salah.' },
        { status: 401 }
      );
    }

    // Return user info (tanpa password)
    const authData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil.',
      user: authData,
    });

    // Set cookie sederhana untuk session
    response.cookies.set('ggf_session', JSON.stringify(authData), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error: any) {
    console.error('Error in login API:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server.' },
      { status: 500 }
    );
  }
}
