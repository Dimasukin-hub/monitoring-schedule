import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    let currentUser: any = null;

    if (match) {
      try {
        currentUser = JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {
        // ignore
      }
    }

    const body = await req.json();
    const { name, email, password, avatar } = body;

    const userId = currentUser?.id || body.id;
    if (!userId && !currentUser?.email && !body.email && !currentUser?.name) {
      return NextResponse.json(
        { success: false, message: 'Sesi login tidak valid.' },
        { status: 401 }
      );
    }

    // Cari user di database
    let user = userId
      ? await prisma.user.findUnique({ where: { id: Number(userId) } })
      : await prisma.user.findFirst({
          where: {
            OR: [
              { email: currentUser?.email || '' },
              { name: currentUser?.name || 'admin' },
            ],
          },
        });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name ? name.trim() : 'admin',
          email: email ? email.trim() : 'admin@ggf.co.id',
          password: password && password.trim() ? password.trim() : 'admin123',
          role: currentUser?.role || 'admin',
          avatar: avatar || null,
        },
      });
    } else {
      const updateData: any = {};
      if (name && name.trim()) updateData.name = name.trim();
      if (email && email.trim()) updateData.email = email.trim();
      if (password && password.trim()) updateData.password = password.trim();
      if (avatar !== undefined) updateData.avatar = avatar;

      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    const authData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || null,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: authData,
    });

    response.cookies.set('ggf_session', JSON.stringify(authData), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal memperbarui profil.' },
      { status: 500 }
    );
  }
}
