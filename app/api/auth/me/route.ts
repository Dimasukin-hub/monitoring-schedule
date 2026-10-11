import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);

    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        const user = JSON.parse(decoded);
        return NextResponse.json({ success: true, user });
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
