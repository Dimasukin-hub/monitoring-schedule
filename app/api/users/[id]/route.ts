import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper untuk memeriksa sesi admin dari header atau cookie
function getAdminSession(req: Request) {
  try {
    // 1. Periksa header x-user-role dari client state
    const roleHeader = req.headers.get('x-user-role');
    if (roleHeader === 'admin' || roleHeader === 'super_admin') {
      return { role: roleHeader, name: req.headers.get('x-user-username') || roleHeader };
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

    // 3. Fallback jika dalam development / local environment
    if (process.env.NODE_ENV !== 'production') {
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
    const { name, role, password, username } = body;

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

    const validRoles = ['super_admin', 'admin', 'user', 'user_fe', 'user_wilayah'];
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

    // Cegah admin menghapus akunnya sendiri
    if (admin.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' },
        { status: 400 }
      );
    }

    // Lindungi akun default admin utama (id: 1)
    if (userId === 1) {
      return NextResponse.json(
        { success: false, message: 'Akun Super Admin utama tidak dapat dihapus.' },
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

    // Jika yang menghapus bukan Super Admin, dilarang menghapus akun Admin atau Super Admin
    if (admin.role !== 'super_admin' && (existingUser.role === 'admin' || existingUser.role === 'super_admin')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang berhak menghapus akun Admin atau Super Admin.' },
        { status: 403 }
      );
    }

    // Lindungi akun Super Admin bawaan sistem
    if (existingUser.email === 'superadmin' || existingUser.email === 'superadmin@ggf.co.id') {
      return NextResponse.json(
        { success: false, message: 'Akun Super Admin bawaan sistem tidak dapat dihapus.' },
        { status: 400 }
      );
    }

    // Jika yang dihapus super_admin, pastikan masih ada super_admin tersisa
    if (existingUser.role === 'super_admin') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'super_admin' },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menghapus satu-satunya akun Super Admin tersisa.' },
          { status: 400 }
        );
      }
    }

    // Jika yang dihapus admin, pastikan masih ada admin tersisa
    if (existingUser.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: { role: 'admin' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Tidak dapat menghapus satu-satunya akun Admin tersisa.' },
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
