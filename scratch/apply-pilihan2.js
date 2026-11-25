const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const sql = fs.readFileSync('scratch/pilihan2_update.sql', 'utf8');
  // Execute via prisma $executeRawUnsafe
  // Split statements by semicolon
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s !== 'BEGIN' && s !== 'COMMIT');

  for (const stmt of statements) {
    console.log('Running stmt...');
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log('pilihan2_update.sql applied successfully!');
}

run().catch(console.error).finally(() => prisma.$disconnect());

