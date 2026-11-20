'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  User,
  KeyRound,
  Trash2,
  Edit2,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  XCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { useAuth, getRoleDisplayName, UserRole } from '@/components/AuthProvider';

export interface UserItem {
  id: number;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  wilayah?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt?: string;
}

const ALL_ASSIGNABLE_ROLES: { role: UserRole; label: string; requireSuperAdmin?: boolean }[] = [
  { role: 'super_admin', label: 'Super Admin', requireSuperAdmin: true },
  { role: 'admin', label: 'Admin FE', requireSuperAdmin: true },
  { role: 'kepala_bagian_fe', label: 'Kepala Bagian FE' },
  { role: 'manajer_fe', label: 'Manajer FE' },
  { role: 'manajer_fm', label: 'Manajer FM' },
  { role: 'manajer_osd', label: 'Manajer OSD' },
  { role: 'kepala_wilayah', label: 'Kepala Wilayah' },
  { role: 'user_wilayah', label: 'Mandor Wilayah' },
  { role: 'user_planting', label: 'User Planting' },
];

const WILAYAH_OPTIONS = [
  { value: '', label: 'Semua Wilayah' },
  { value: 'AW01', label: 'Wilayah 01 (AW01)' },
  { value: 'AW02', label: 'Wilayah 02 (AW02)' },
  { value: 'AW03', label: 'Wilayah 03 (AW03)' },
  { value: 'AW04', label: 'Wilayah 04 (AW04)' },
  { value: 'AW05', label: 'Wilayah 05 (AW05)' },
  { value: 'AW06', label: 'Wilayah 06 (AW06)' },
  { value: 'AW07', label: 'Wilayah 07 (AW07)' },
];

export function detectWilayahFromUsernameOrName(username?: string, name?: string): string | null {
  const text = `${username || ''} ${name || ''}`.toLowerCase();
  const match = text.match(/(?:aw|w|wilayah[\s_-]*|wil[\s_-]*)0?([1-7])(?!\d)/i);
  if (match) {
    return `AW0${match[1]}`;
  }
  return null;
}

export default function UserManagementView({ portal }: { portal?: string } = {}) {
  const pathname = usePathname();
  const isGorongGorong = portal === 'gorong-gorong' || (pathname && pathname.includes('/gorong-gorong'));

  // Daftar peran yang dapat dipilih (User Planting disembunyikan di portal Gorong-Gorong)
  const assignableRoles = ALL_ASSIGNABLE_ROLES.filter((r) => {
    if (isGorongGorong && r.role === 'user_planting') return false;
    return true;
  });

  const { user: currentUser, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [stats, setStats] = useState<any>({ total: 0 });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [showAllPasswords, setShowAllPasswords] = useState<boolean>(false);
  const [showCurrentPasswordInModal, setShowCurrentPasswordInModal] = useState<boolean>(false);

  const togglePasswordVisibility = (userId: number) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Modal State - Tambah User
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<{
    username: string;
    name: string;
    password: string;
    confirmPassword: string;
    role: UserRole | '';
    wilayah: string;
  }>({
    username: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: '',
    wilayah: '',
  });
  const [showAddPassword, setShowAddPassword] = useState<boolean>(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Modal State - Edit User / Reset Password
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    username: string;
    role: UserRole;
    wilayah: string;
    newPassword: string;
  }>({
    name: '',
    username: '',
    role: 'user_wilayah',
    wilayah: '',
    newPassword: '',
  });
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal State - Hapus User
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toast / Notification banner
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const getAuthHeaders = () => ({
    'x-user-role': currentUser?.role || 'admin',
    'x-user-username': currentUser?.email || currentUser?.name || 'admin',
    'x-user-id': String(currentUser?.id || ''),
  });

  const fetchUsers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast('error', data.message || 'Gagal memuat pengguna.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToast('error', 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Filtered users list (User Planting disembunyikan jika di portal Gorong-Gorong)
  const filteredUsers = users.filter((u) => {
    if (isGorongGorong && u.role === 'user_planting') return false;
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Handle Submit Tambah User
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanUsername = addForm.username.trim().toLowerCase();
    const cleanName = addForm.name.trim();

    if (!cleanUsername) {
      setAddError('Username wajib diisi.');
      return;
    }
    if (cleanUsername.length < 3) {
      setAddError('Username minimal 3 karakter.');
      return;
    }
    if (/\s/.test(cleanUsername)) {
      setAddError('Username tidak boleh mengandung spasi.');
      return;
    }
    if (!addForm.password || addForm.password.length < 8) {
      setAddError('Password minimal 8 karakter.');
      return;
    }
    if (addForm.password !== addForm.confirmPassword) {
      setAddError('Konfirmasi password tidak cocok.');
      return;
    }
    if (!addForm.role) {
      setAddError('Pilih hak akses (role) terlebih dahulu.');
      return;
    }
    if (!isSuperAdmin && (addForm.role === 'admin' || addForm.role === 'super_admin')) {
      setAddError('Hanya Super Admin yang berhak membuat akun Admin atau Super Admin.');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const isFieldRole = ['kepala_wilayah', 'user_wilayah', 'user'].includes(addForm.role);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          username: cleanUsername,
          name: cleanName || cleanUsername,
          password: addForm.password,
          role: addForm.role,
          wilayah: isFieldRole ? (addForm.wilayah || null) : null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', data.message || 'Pengguna berhasil ditambahkan!');
        setIsAddModalOpen(false);
        setAddForm({
          username: '',
          name: '',
          password: '',
          confirmPassword: '',
          role: '',
          wilayah: '',
        });
        fetchUsers(true);
      } else {
        setAddError(data.message || 'Gagal menambahkan pengguna.');
      }
    } catch (err) {
      setAddError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (target: UserItem) => {
    if (!isSuperAdmin && (target.role === 'admin' || target.role === 'super_admin')) {
      showToast('error', 'Hanya Super Admin yang berhak mengubah akun Admin atau Super Admin.');
      return;
    }
    const isFieldRole = ['kepala_wilayah', 'user_wilayah', 'user'].includes(target.role);
    const initialWil = target.wilayah || (isFieldRole ? detectWilayahFromUsernameOrName(target.username, target.name) : null) || '';
    setEditingUser(target);
    setEditForm({
      name: target.name,
      username: target.username,
      role: target.role,
      wilayah: isFieldRole ? initialWil : '',
      newPassword: '',
    });
    setEditError(null);
    setShowEditPassword(false);
    setShowCurrentPasswordInModal(false);
  };

  // Handle Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!isSuperAdmin && (editingUser.role === 'admin' || editingUser.role === 'super_admin')) {
      setEditError('Hanya Super Admin yang berhak mengubah akun Admin atau Super Admin.');
      return;
    }

    if (!isSuperAdmin && (editForm.role === 'admin' || editForm.role === 'super_admin')) {
      setEditError('Hanya Super Admin yang berhak memberikan role Admin atau Super Admin.');
      return;
    }

    if (editForm.newPassword && editForm.newPassword.length < 8) {
      setEditError('Password baru minimal 8 karakter.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      const isFieldRole = ['kepala_wilayah', 'user_wilayah', 'user'].includes(editForm.role);
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: editForm.name.trim(),
          username: editForm.username.trim().toLowerCase(),
          role: editForm.role,
          wilayah: isFieldRole ? (editForm.wilayah || null) : null,
          password: editForm.newPassword ? editForm.newPassword.trim() : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', data.message || 'Data pengguna berhasil diperbarui!');
        setEditingUser(null);
        fetchUsers(true);
      } else {
        setEditError(data.message || 'Gagal memperbarui pengguna.');
      }
    } catch (err) {
      setEditError('Terjadi kesalahan jaringan.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Submit Delete User
  const handleDeleteSubmit = async () => {
    if (!deletingUser) return;
    setDeleteError(null);

    const isCurrent = currentUser?.id === deletingUser.id ||
      (!!currentUser?.email && currentUser.email.toLowerCase() === deletingUser.username.toLowerCase());
    if (isCurrent) {
      setDeleteError('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (!isSuperAdmin && (deletingUser.role === 'admin' || deletingUser.role === 'super_admin')) {
      setDeleteError('Hanya Super Admin yang berhak menghapus akun Admin atau Super Admin.');
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (data.success) {
        showToast('success', data.message || 'Pengguna berhasil dihapus.');
        setDeletingUser(null);
        fetchUsers(true);
      } else {
        setDeleteError(data.message || 'Gagal menghapus pengguna.');
      }
    } catch (err) {
      setDeleteError('Terjadi kesalahan jaringan saat menghapus pengguna.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-300/60 dark:border-indigo-700/50 text-indigo-800 dark:text-indigo-300 text-[11px] font-bold">
            <ShieldAlert className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300/60 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
            <ShieldCheck className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      case 'kepala_bagian_fe':
      case 'manajer_fe':
      case 'manajer_fm':
      case 'manajer_osd':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 border border-amber-300/60 dark:border-amber-700/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
            <ShieldCheck className="w-3 h-3 text-amber-600" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      case 'kepala_wilayah':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/70 border border-cyan-300/60 dark:border-cyan-700/50 text-cyan-800 dark:text-cyan-300 text-[11px] font-bold">
            <User className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      case 'user_wilayah':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 border border-blue-300/60 dark:border-blue-700/50 text-blue-800 dark:text-blue-300 text-[11px] font-bold">
            <User className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      case 'user_planting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 border border-teal-300/60 dark:border-teal-700/50 text-teal-800 dark:text-teal-300 text-[11px] font-bold">
            <User className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold">
            <User className="w-3 h-3" />
            <span>{getRoleDisplayName(role)}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-18 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-top duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header & Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/50 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hak Akses Administrator</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kelola akun, hak akses role, serta penambahan username dan password pengguna sistem.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddForm({
              username: '',
              name: '',
              password: '',
              confirmPassword: '',
              role: '',
              wilayah: '',
            });
            setAddError(null);
            setShowAddPassword(false);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {/* KPI Summary Cards - Terpisah Per Role agar Jelas Jumlah Akun Masing-Masing */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Pengguna</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{users.length}</p>
            <p className="text-[10px] text-slate-400">Semua akun</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/40 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* Super Admin */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Super Admin</p>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{users.filter(u => u.role === 'super_admin').length}</p>
            <p className="text-[10px] text-slate-400">Kendali sistem</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/40 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        {/* Admin FE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Admin FE</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{users.filter(u => u.role === 'admin').length}</p>
            <p className="text-[10px] text-slate-400">Admin Operasional</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/40 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Kepala Bagian FE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kabag FE</p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">{users.filter(u => u.role === 'kepala_bagian_fe').length}</p>
            <p className="text-[10px] text-slate-400">Kepala Bagian</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/40 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Manajer FE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Manajer FE</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">{users.filter(u => u.role === 'manajer_fe').length}</p>
            <p className="text-[10px] text-slate-400">Divisi FE</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/40 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Manajer FM */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Manajer FM</p>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 tracking-tight">{users.filter(u => u.role === 'manajer_fm').length}</p>
            <p className="text-[10px] text-slate-400">Divisi FM</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/40 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Manajer OSD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Manajer OSD</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">{users.filter(u => u.role === 'manajer_osd').length}</p>
            <p className="text-[10px] text-slate-400">Divisi OSD</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/40 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Kepala Wilayah */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Kepala Wilayah</p>
            <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400 tracking-tight">{users.filter(u => u.role === 'kepala_wilayah').length}</p>
            <p className="text-[10px] text-slate-400">Wilayah</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200/40 dark:border-cyan-800/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
        </div>

        {/* Mandor Wilayah */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Mandor Wilayah</p>
            <p className="text-xl font-bold text-teal-600 dark:text-teal-400 tracking-tight">{users.filter(u => u.role === 'user_wilayah' || u.role === 'user').length}</p>
            <p className="text-[10px] text-slate-400">Mandor Lapangan</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/40 dark:border-teal-800/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <User className="w-4 h-4" />
          </div>
        </div>

        {/* User Planting (jika ada akun non-gorong-gorong) */}
        {!isGorongGorong && users.some(u => u.role === 'user_planting') && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">User Planting</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">{users.filter(u => u.role === 'user_planting').length}</p>
              <p className="text-[10px] text-slate-400">Planting</p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/40 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
          </div>
        )}
      </div>

      {/* Control Bar: Search & Role Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Username atau Nama"
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Hapus pencarian"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Role Filter Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold whitespace-nowrap gap-1">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                roleFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semua ({users.filter(u => !isGorongGorong || u.role !== 'user_planting').length})
            </button>
            {assignableRoles.map((r) => {
              const count = users.filter((u) => u.role === r.role).length;
              const isSelected = roleFilter === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRoleFilter(r.role)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {r.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold">Memuat data pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <UserCheck className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold">Tidak ada pengguna yang cocok.</p>
            <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter role.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Username</th>
                  {isSuperAdmin && (
                    <th className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Password</span>
                        <button
                          type="button"
                          onClick={() => setShowAllPasswords((prev) => !prev)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-0.5 rounded transition-colors"
                          title={showAllPasswords ? 'Sembunyikan semua password' : 'Lihat semua password'}
                        >
                          {showAllPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </th>
                  )}
                  <th className="py-3 px-4 text-center">Role Akses</th>
                  <th className="py-3 px-4 text-center">Wilayah Tugas</th>
                  <th className="py-3 px-4 text-center">Tanggal Dibuat</th>
                  <th className="py-3 px-4 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredUsers.map((item, index) => {
                  const isCurrent = currentUser?.id === item.id || 
                    (!!currentUser?.email && currentUser.email.toLowerCase() === item.username.toLowerCase());
                  const isProtectedAdminAccount = item.role === 'admin' || item.role === 'super_admin';
                  const isLockedForAdmin = !isSuperAdmin && isProtectedAdminAccount;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs uppercase shadow-2xs shrink-0">
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              item.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                                  Anda
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold border border-slate-200/60 dark:border-slate-700/60">
                          @{item.username}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 tracking-wider">
                              {showAllPasswords || visiblePasswords[item.id]
                                ? (item.password || '-')
                                : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(item.id)}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                              title={showAllPasswords || visiblePasswords[item.id] ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {showAllPasswords || visiblePasswords[item.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="py-3 px-4 text-center">
                        {renderRoleBadge(item.role)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const isFieldRole = ['kepala_wilayah', 'user_wilayah', 'user'].includes(item.role);
                          const effectiveWil = item.wilayah || (isFieldRole ? detectWilayahFromUsernameOrName(item.username, item.name) : null);
                          if (effectiveWil) {
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                                {effectiveWil}
                              </span>
                            );
                          }
                          if (isFieldRole) {
                            return <span className="text-slate-400 text-xs italic">Semua Wilayah</span>;
                          }
                          return <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>;
                        })()}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Tombol Edit / Reset Password */}
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            disabled={isLockedForAdmin}
                            title={
                              isLockedForAdmin
                                ? 'Hanya Super Admin yang berhak mengubah akun Admin/Super Admin'
                                : 'Edit User / Reset Password'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isLockedForAdmin
                                ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-500 dark:text-slate-400 cursor-pointer'
                            }`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus */}
                          <button
                            type="button"
                            onClick={() => setDeletingUser(item)}
                            disabled={isCurrent || isLockedForAdmin}
                            title={
                              isCurrent
                                ? 'Tidak bisa menghapus akun Anda sendiri yang sedang aktif'
                                : isLockedForAdmin
                                ? 'Hanya Super Admin yang berhak menghapus akun Admin/Super Admin'
                                : 'Hapus Pengguna'
                            }
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrent || isLockedForAdmin
                                ? 'opacity-30 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                                : 'border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 hover:text-rose-600 dark:hover:text-rose-400 text-slate-500 dark:text-slate-400 cursor-pointer'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= MODAL: TAMBAH USER BARU ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Tambah Pengguna Baru</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} autoComplete="off" className="p-6 space-y-4">
              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showAddPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ulangi Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showAddPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={addForm.confirmPassword}
                  onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                  placeholder="Ketik ulang password"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Role Selection (Dipindah ke paling bawah) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hak Akses (Role) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {assignableRoles.filter((r) => !r.requireSuperAdmin || isSuperAdmin).map((r) => {
                    const isSelected = addForm.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setAddForm({ ...addForm, role: r.role })}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-start gap-2 cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/40 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wilayah Tugas (Hanya untuk Kepala Wilayah & Mandor Wilayah) */}
              {['kepala_wilayah', 'user_wilayah', 'user'].includes(addForm.role) && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Wilayah Tugas
                  </label>
                  <select
                    value={addForm.wilayah}
                    onChange={(e) => setAddForm({ ...addForm, wilayah: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    {WILAYAH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT USER / RESET PASSWORD ================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Edit2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Edit Pengguna</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} autoComplete="off" className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Nama Lengkap */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Password Saat Ini (Khusus Super Admin) */}
              {isSuperAdmin && editingUser?.password && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Password Saat Ini: </span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 ml-1">
                      {showCurrentPasswordInModal ? editingUser.password : '••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPasswordInModal(!showCurrentPasswordInModal)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 cursor-pointer p-0.5"
                    title={showCurrentPasswordInModal ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showCurrentPasswordInModal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Reset Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Reset Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Role Selection (Dipindah ke paling bawah) */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hak Akses (Role)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {assignableRoles.filter((r) => !r.requireSuperAdmin || isSuperAdmin).map((r) => {
                    const isSelected = editForm.role === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, role: r.role })}
                        className={`py-2 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-start gap-2 cursor-pointer transition-all text-left ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/40 font-bold'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span className="truncate">{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wilayah Tugas (Hanya untuk Kepala Wilayah & Mandor Wilayah) */}
              {['kepala_wilayah', 'user_wilayah', 'user'].includes(editForm.role) && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Wilayah Tugas
                  </label>
                  <select
                    value={editForm.wilayah}
                    onChange={(e) => setEditForm({ ...editForm, wilayah: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  >
                    {WILAYAH_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: KONFIRMASI HAPUS USER ================= */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Akun Pengguna?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Akun <strong className="text-slate-800 dark:text-slate-200 font-semibold">{deletingUser.name}</strong> (@{deletingUser.username}) akan dihapus permanen dari sistem.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
