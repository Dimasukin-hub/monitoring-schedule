const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const content = fs.readFileSync('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov24.sql', 'utf8');
  const lines = content.split('\n');
  const rows = [];
  let inCopy = false;

  for (const line of lines) {
    if (line.includes('COPY public."LokasiOrderGorongGorong"')) {
      inCopy = true;
      continue;
    }
    if (inCopy) {
      if (line.startsWith('\\.') || !line.trim()) {
        inCopy = false;
        continue;
      }
      const c = line.split('\t');
      rows.push({
        lokasi: c[1],
        wilayah: c[2],
        luas: parseFloat(c[3]) || 0,
        statusTanaman: c[4],
        umurBulan: parseInt(c[5]) || 0,
        tanggalOrder: c[6],
        aktBk: c[7],
        dsmBk: c[8],
        dsmSt: c[9],
        prioritas: c[10],
        statusAll: c[11],
        isClosedExcel: c[12] === 't',
        ratioPerHa: parseFloat(c[13]) || null,
        keteranganClose: c[14] || null,
        orderD40: parseInt(c[15]) || 0,
        dropD40: parseInt(c[16]) || 0,
        tglDropD40: c[17] || null,
        pasangManD40: parseInt(c[18]) || 0,
        pasangSapD40: parseInt(c[19]) || 0,
        statusD40: c[20],
        orderD60: parseInt(c[21]) || 0,
        dropD60: parseInt(c[22]) || 0,
        pasangManD60: parseInt(c[23]) || 0,
        pasangSapD60: parseInt(c[24]) || 0,
        statusD60: c[25],
        orderD80: parseInt(c[26]) || 0,
        dropD80: parseInt(c[27]) || 0,
        pasangManD80: parseInt(c[28]) || 0,
        pasangSapD80: parseInt(c[29]) || 0,
        statusD80: c[30],
        orderD100: parseInt(c[31]) || 0,
        dropD100: parseInt(c[32]) || 0,
        pasangManD100: parseInt(c[33]) || 0,
        pasangSapD100: parseInt(c[34]) || 0,
        statusD100: c[35],
      });
    }
  }

  console.log('Parsed rows from nov24 dump:', rows.length);
  await prisma.lokasiOrderGorongGorong.deleteMany({});
  for (let i = 0; i < rows.length; i += 50) {
    await prisma.lokasiOrderGorongGorong.createMany({ data: rows.slice(i, i + 50) });
  }
  const count = await prisma.lokasiOrderGorongGorong.count();
  console.log('Restored to local DB. Total rows:', count);
}

run().catch(console.error).finally(() => prisma.$disconnect());

