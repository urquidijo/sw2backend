const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$connect()
  .then(() => { console.log('DB Connected!'); return p.$disconnect(); })
  .catch(e => { console.error('DB Error:', e.message); process.exit(1); });
