import { NextResponse } from 'next/server';
import { findUserByEmail, createUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.email || body.username || '').trim();
    const name = (body.name || identifier).trim();
    const password = body.password;
    const role = body.role === 'admin' ? 'admin' : 'user';

    if (!name || !identifier || !password) {
      return NextResponse.json(
        { success: false, message: 'Semua kolom wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 5) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 5 karakter.' },
        { status: 400 }
      );
    }

    const existingUser = await findUserByEmail(identifier);
    if (existingUser) {
      if (existingUser.password === password) {
        const authData = {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        };
        const response = NextResponse.json({
          success: true,
          message: 'Akun sudah siap. Berhasil masuk.',
          user: authData,
        });
        response.cookies.set('ggf_session', JSON.stringify(authData), {
          httpOnly: false,
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        });
        return response;
      }

      return NextResponse.json(
        { success: false, message: 'Username atau email sudah terdaftar. Silakan gunakan yang lain atau langsung masuk.' },
        { status: 409 }
      );
    }

    const newUser = await createUser({
      name,
      email: identifier,
      password,
      role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Registrasi berhasil. Akun Anda telah siap.',
      user: newUser,
    });

    response.cookies.set('ggf_session', JSON.stringify(newUser), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error in register API:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat mendaftarkan akun.' },
      { status: 500 }
    );
  }
}
