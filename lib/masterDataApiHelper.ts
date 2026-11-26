import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifikasi hak akses Admin atau Super Admin dari cookie ggf_session (atau header x-user-role).
 */
export function verifyAdminSession(request: NextRequest): {
  authorized: boolean;
  response?: NextResponse;
} {
  const roleHeader = request.headers.get('x-user-role')?.trim().toLowerCase();
  if (roleHeader === 'admin' || roleHeader === 'super_admin') {
    return { authorized: true };
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/ggf_session=([^;]+)/);
  if (match) {
    try {
      const session = JSON.parse(decodeURIComponent(match[1]));
      const role = String(session?.role || '').trim().toLowerCase();
      if (role === 'admin' || role === 'super_admin') {
        return { authorized: true };
      }
    } catch {
      // Abaikan parse error
    }
  }

  return {
    authorized: false,
    response: NextResponse.json(
      {
        success: false,
        message: 'Akses ditolak. Fitur ini hanya tersedia untuk Admin dan Super Admin.',
      },
      { status: 403 }
    ),
  };
}

/**
 * Ekstrak ID numerik dari query ?id= atau JSON body { id }.
 */
export function parseRecordId(request: NextRequest, body?: any): number | null {
  const { searchParams } = new URL(request.url);
  const queryId = searchParams.get('id');
  if (queryId) {
    const parsed = parseInt(queryId, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
  if (body && body.id !== undefined && body.id !== null) {
    const parsed = parseInt(String(body.id), 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}
