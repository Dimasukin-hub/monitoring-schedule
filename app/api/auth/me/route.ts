import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);

    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const sessionUser = JSON.parse(decoded);

        if (sessionUser && (sessionUser.id || sessionUser.email)) {
          // Sinkronisasi data user terbaru dari database agar wilayah tugas selalu akurat
          const dbUser = await prisma.user.findFirst({
            where: {
              OR: [
                ...(sessionUser.id ? [{ id: sessionUser.id }] : []),
                ...(sessionUser.email ? [{ email: sessionUser.email }] : []),
              ],
            },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              wilayah: true,
              avatar: true,
            },
          });

          if (dbUser) {
            const freshUser = {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role as any,
              wilayah: dbUser.wilayah || null,
              avatar: dbUser.avatar || null,
            };

            const response = NextResponse.json({ success: true, user: freshUser });
            response.cookies.set('ggf_session', JSON.stringify(freshUser), {
              httpOnly: false,
              path: '/',
              maxAge: 60 * 60 * 24 * 7,
            });
            return response;
          }
        }

        return NextResponse.json({ success: true, user: sessionUser });
      } catch (e) {
        // invalid cookie
      }
    }

    return NextResponse.json({ success: false, user: null });
  } catch (error) {
    return NextResponse.json({ success: false, user: null });
  }
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logout berhasil.' });
  response.cookies.delete('ggf_session');
  return response;
}
