#!/bin/bash
set -e

echo "============================================="
echo "  🚀 Updating Field Establishment Dashboard"
echo "============================================="

# 1. Bersihkan perubahan file cache lokal otomatis & tarik pembaruan dari repository
echo "📥 [1/4] Mengambil kode terbaru dari Git..."
git checkout -- data/lokasi-order-snapshot.json 2>/dev/null || true
git pull origin main

# 2. Sinkronisasi Skema Database & Prisma Client
echo "🗄️  [2/4] Sinkronisasi Database & Prisma Client..."
npx prisma db push --accept-data-loss
npx prisma generate

# 3. Build aplikasi untuk produksi
echo "🏗️  [3/4] Melakukan build aplikasi Next.js..."
npm run build

# 4. Restart server Next.js melalui PM2
echo "🔄 [4/4] Me-restart layanan di PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart all || pm2 reload all
    pm2 save
    echo "✅ PM2 berhasil di-restart!"
else
    echo "⚠️ PM2 tidak terdeteksi. Silakan jalankan 'npm run start' secara manual."
fi

echo "============================================="
echo "🎉 Update selesai! Buka: https://fieldestablishment.estatepg1.online"
echo "============================================="

