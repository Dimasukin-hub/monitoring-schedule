import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// PUT: Update data user atau Reset Password
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminSession(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang dapat mengubah data pengguna.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna tidak valid.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, role, password, username, wilayah } = body;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Jika yang melakukan update bukan Super Admin, dilarang mengubah akun Admin atau Super Admin
    if (admin.role !== 'super_admin' && (existingUser.role === 'admin' || existingUser.role === 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang berhak mengubah akun Admin atau Super Admin.' },
        { status: 403 }
      );
    }

    // Siapkan data update
    const updateData: any = {};

    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    if (username && username.trim()) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== existingUser.email.toLowerCase()) {
        const usernameConflict = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            OR: [
              { email: { equals: cleanUsername, mode: 'insensitive' } },
              { name: { equals: cleanUsername, mode: 'insensitive' } },
            ],
          },
        });
        if (usernameConflict) {
          return NextResponse.json(
            { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain.` },
            { status: 400 }
          );
        }
        updateData.email = cleanUsername;
      }
    }

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
    if (role && validRoles.includes(role)) {
      // Jika yang melakukan update bukan Super Admin, dilarang menaikkan role menjadi Admin atau Super Admin
      if (admin.role !== 'super_admin' && (role === 'admin' || role === 'super_admin')) {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak. Hanya Super Admin yang berhak memberikan role Admin atau Super Admin.' },
          { status: 403 }
        );
      }

      // Jika mencoba mengubah super_admin menjadi non-super_admin, pastikan masih ada super_admin lain
      if (existingUser.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await prisma.user.count({
          where: { role: 'super_admin' },
        });
        if (superAdminCount <= 1) {
          return NextResponse.json(
            { success: false, message: 'Tidak dapat mengubah role. Harus ada minimal satu Super Admin dalam sistem.' },
            { status: 400 }
          );
        }
      }

      // Jika mencoba mengubah admin menjadi non-admin, pastikan masih ada admin lain
      if (existingUser.role === 'admin' && role !== 'admin') {
        const adminCount = await prisma.user.count({
          where: { role: 'admin' },
        });
        if (adminCount <= 1) {
          return NextResponse.json(
            { success: false, message: 'Tidak dapat mengubah role. Harus ada minimal satu Admin dalam sistem.' },
            { status: 400 }
          );
        }
      }
      updateData.role = role;
    }

    // Jika admin melakukan Reset Password
    if (password && password.trim()) {
      if (password.trim().length < 8) {
        return NextResponse.json(
          { success: false, message: 'Password minimal 8 karakter.' },
          { status: 400 }
        );
      }
      updateData.password = password.trim();
    }

    if (wilayah !== undefined) {
      updateData.wilayah = wilayah && String(wilayah).trim().toUpperCase() !== 'ALL'
        ? String(wilayah).trim().toUpperCase()
        : null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Data pengguna "${updatedUser.name}" berhasil diperbarui.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.email,
        role: updatedUser.role,
        wilayah: updatedUser.wilayah,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error in PUT /api/users/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui data pengguna.' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus pengguna
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminSession(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Admin yang dapat menghapus pengguna.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna tidak valid.' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'Pengguna tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Cegah admin/super_admin menghapus akunnya sendiri
    const authUserId = req.headers.get('x-user-id') ? parseInt(req.headers.get('x-user-id')!, 10) : admin.id;
    const authUsername = (req.headers.get('x-user-username') || admin.name || '').trim().toLowerCase();
    const isSelf = (authUserId && authUserId === userId) ||
                   (authUsername && (existingUser.email.toLowerCase() === authUsername || existingUser.name.toLowerCase() === authUsername));

    if (isSelf) {
      return NextResponse.json(
        { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' },
        { status: 400 }
      );
    }

    // Jika yang menghapus bukan Super Admin, dilarang menghapus akun Admin atau Super Admin
    if (admin.role !== 'super_admin' && (existingUser.role === 'admin' || existingUser.role === 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang berhak menghapus akun Admin atau Super Admin.' },
        { status: 403 }
      );
    }

    // Jika yang dihapus super_admin, pastikan masih ada super_admin lain yang tersisa
    if (existingUser.role === 'super_admin') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'super_admin' },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menghapus satu-satunya akun Super Admin yang tersisa.' },
          { status: 400 }
        );
      }
    }

    // Jika yang dihapus admin, pastikan masih ada admin lain yang tersisa
    if (existingUser.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menghapus satu-satunya akun Admin yang tersisa.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Pengguna "${existingUser.name}" (${existingUser.email}) berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus pengguna.' },
      { status: 500 }
    );
  }
}
