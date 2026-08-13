import { PrismaClient } from '@prisma/client';

async function migrateEverything() {
  const local = new PrismaClient({
    datasources: {
      db: { url: 'postgresql://postgres:admin@127.0.0.1:5433/retail_db?schema=public' }
    }
  });

  const supa = new PrismaClient({
    datasources: {
      db: { url: 'postgresql://postgres.bdjbwwewpefrirozlwvc:7jrukhyojNsQ4MQD@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' }
    }
  });

  console.log('=== Starting Thorough Relational Migration to Supabase ===');

  // 1. Get primary Admin user on Supabase
  const supaAdmin = await supa.user.findFirst({ where: { email: 'usamashamshiri@gmail.com' } });
  const defaultUserId = supaAdmin?.id;

  // Sync users first
  const localUsers = await local.user.findMany();
  for (const u of localUsers) {
    try {
      await supa.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    } catch (e: any) {
      // If email exists, update id
      console.log('User sync note:', u.email, e.message);
    }
  }

  // Helper function to sanitize createdById
  const sanitize = (obj: any) => {
    const copy = { ...obj };
    if (copy.createdById && defaultUserId) {
      copy.createdById = defaultUserId;
    }
    if (copy.userId && defaultUserId) {
      copy.userId = defaultUserId;
    }
    return copy;
  };

  const models = [
    'branch',
    'productCategory',
    'unit',
    'product',
    'inventory',
    'supplier',
    'buyer',
    'expenseCategory',
    'purchase',
    'purchaseItem',
    'inventoryLayer',
    'supplierPayment',
    'sale',
    'saleItem',
    'buyerPayment',
    'salesReturn',
    'salesReturnItem',
    'expense',
    'stockMovement',
    'stockAdjustment',
    'stockTransfer',
    'stockTransferItem',
    'auditLog'
  ];

  for (const m of models) {
    try {
      const localCount = await (local as any)[m].count();
      const supaCountBefore = await (supa as any)[m].count();
      console.log(`\nModel [${m}]: Local = ${localCount} | Supabase Before = ${supaCountBefore}`);

      if (localCount > 0) {
        const rows = await (local as any)[m].findMany();
        let successCount = 0;

        for (const row of rows) {
          const cleanRow = sanitize(row);
          try {
            await (supa as any)[m].upsert({
              where: { id: cleanRow.id },
              update: cleanRow,
              create: cleanRow,
            });
            successCount++;
          } catch (err: any) {
            try {
              delete cleanRow.id;
              await (supa as any)[m].create({ data: cleanRow });
              successCount++;
            } catch (err2: any) {
              console.error(` -> Failed row in [${m}]:`, err2.message);
            }
          }
        }
        const supaCountAfter = await (supa as any)[m].count();
        console.log(` -> Result [${m}]: Synced ${successCount}/${localCount} rows. Supabase total now = ${supaCountAfter}`);
      }
    } catch (e: any) {
      console.error(`Error processing model [${m}]:`, e.message);
    }
  }

  console.log('\n=== Thorough Relational Migration Complete ===');
}

migrateEverything()
  .catch(console.error)
  .finally(() => process.exit(0));
