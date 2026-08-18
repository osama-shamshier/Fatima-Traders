import { PrismaClient } from '@prisma/client';

const railwayUrl = "postgresql://postgres:fdwMMPbnEQDMAmehyYUbFAatgSXmJzTV@altaria.proxy.rlwy.net:31459/railway";
const prisma = new PrismaClient({
  datasources: {
    db: { url: railwayUrl }
  }
});

async function inspectAll() {
  console.log('--- ALL SALES ---');
  const sales = await prisma.sale.findMany({
    where: { isDeleted: false },
    include: { buyer: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total sales: ${sales.length}`);
  sales.forEach(s => {
    console.log(`Sale: ${s.id} | Inv: ${s.invoiceNumber} | Buyer: ${s.buyer?.name || 'Walkin'} | Method: ${s.paymentMethod} | Total: ${s.grandTotal} | Paid: ${s.amountPaid} | Date: ${s.createdAt}`);
  });

  console.log('\n--- ALL BUYER PAYMENTS ---');
  const payments = await prisma.buyerPayment.findMany({
    where: { isDeleted: false },
    include: { buyer: true, sale: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total buyer payments: ${payments.length}`);
  payments.forEach(p => {
    console.log(`Payment: ${p.id} | Buyer: ${p.buyer?.name} | SaleId: ${p.saleId} | Inv: ${p.sale?.invoiceNumber || 'None'} | Method: ${p.paymentMethod} | Amount: ${p.amount} | Date: ${p.createdAt}`);
  });
}

inspectAll()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
