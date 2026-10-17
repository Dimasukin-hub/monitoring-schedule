const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  const lands2026 = await p.land.findMany({ where: { year: 2026 } });
  const stoks = await p.stokLahanMaster.findMany();
  console.log('Land 2026 count:', lands2026.length);
  console.log('StokLahanMaster count:', stoks.length);

  const lMap = new Map(lands2026.map((l) => [l.lokasi, l]));
  let exactMatch = 0;
  const diffs = [];

  for (const st of stoks) {
    const ld = lMap.get(st.lokasi);
    if (!ld) {
      diffs.push({ lokasi: st.lokasi, issue: 'Not found in Land with year=2026' });
      continue;
    }
    const d = [];
    if (ld.wilayah !== st.wilayah) d.push(`wilayah: ${ld.wilayah} vs ${st.wilayah}`);
    if (Math.abs(ld.luasBruto - st.luasBruto) > 0.01) d.push(`bruto: ${ld.luasBruto} vs ${st.luasBruto}`);
    if (Math.abs(ld.luasNetto - st.luasNetto) > 0.01) d.push(`netto: ${ld.luasNetto} vs ${st.luasNetto}`);
    if ((ld.eks || '') !== (st.eks || '')) d.push(`eks: ${ld.eks} vs ${st.eks}`);
    if ((ld.sejarah || '') !== (st.sejarah || '')) d.push(`sejarah: ${ld.sejarah} vs ${st.sejarah}`);
    if (d.length === 0) exactMatch++;
    else diffs.push({ lokasi: st.lokasi, d });
  }

  console.log('Exact match with Land 2026:', exactMatch, 'of', stoks.length);
  if (diffs.length > 0) {
    console.log('Differences / Missing in Land 2026:', JSON.stringify(diffs, null, 2));
  }
  await p.$disconnect();
}

check().catch((e) => {
  console.error(e);
  process.exit(1);
});
