#!/bin/bash
set -e

echo "============================================="
echo "  🚀 Updating Field Establishment Dashboard"
echo "============================================="

# 1. Tarik pembaruan dari repository (snapshot & data database VPS TIDAK di-reset)
echo "📥 [1/4] Mengambil kode terbaru dari Git..."
git pull origin main

# 2. Generate Prisma Client (AMAN: tidak menjalankan db push --accept-data-loss agar data Sulam/Labita/Gorong-Gorong tetap utuh)
echo "🗄️  [2/4] Generate Prisma Client..."
npx prisma generate

# 3. Build aplikasi untuk produksi
echo "🏗️  [3/4] Melakukan build aplikasi Next.js..."
npm run build

# 4. Restart khusus layanan monitoring-schedule di PM2 (tidak mengganggu app lain)
echo "🔄 [4/4] Me-restart layanan monitoring-schedule di PM2..."
if command -v pm2 &> /dev/null; then
    if pm2 describe monitoring-schedule > /dev/null 2>&1; then
        pm2 restart monitoring-schedule --update-env
        pm2 save
        echo "✅ PM2 (monitoring-schedule) berhasil di-restart!"
    else
        echo "⚠️ Proses PM2 'monitoring-schedule' tidak ditemukan. Cek nama proses via 'pm2 list' lalu jalankan: pm2 restart <nama-atau-id> --update-env"
    fi
else
    echo "⚠️ PM2 tidak terdeteksi. Silakan jalankan 'npm run start' secara manual."
fi

echo "============================================="
echo "🎉 Update selesai! Buka: https://fieldestablishment.estatepg1.online"
echo "============================================="
