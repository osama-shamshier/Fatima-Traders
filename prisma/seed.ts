import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

const MODULES = [
  'users', 'roles', 'branches', 'counters', 'products', 'categories', 
  'units', 'inventory', 'purchases', 'suppliers', 'supplier_payments', 
  'sales', 'pos', 'buyers', 'buyer_payments', 'returns', 'expenses', 
  'stock_transfers', 'stock_adjustments', 'reports', 'audit', 'settings', 'backups'
];

const ACTIONS = ['create', 'read', 'update', 'delete', 'export'];

async function main() {
  console.log('Seeding database...');

  // 1. Create permissions
  console.log('Creating permissions...');
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: {
          module_action: {
            module,
            action,
          },
        },
        update: {},
        create: {
          module,
          action,
          description: `Can ${action} ${module.replace('_', ' ')}`,
        },
      });
    }
  }

  // Get all permissions to assign to roles
  const allPermissions = await prisma.permission.findMany();

  // Helper function to get permission IDs by module and action
  const getPermissionIds = (criteria: { module: string; actions?: string[] }[]) => {
    return allPermissions
      .filter(p => 
        criteria.some(c => 
          c.module === p.module && 
          (!c.actions || c.actions.includes(p.action))
        )
      )
      .map(p => ({ permissionId: p.id }));
  };

  // 2. Create roles
  console.log('Creating roles...');
  
  // a) Owner - ALL permissions
  const ownerRole = await prisma.role.upsert({
    where: { name: 'Owner' },
    update: {},
    create: {
      name: 'Owner',
      description: 'System owner with full access',
      isSystem: true,
      rolePermissions: {
        create: allPermissions.map(p => ({ permissionId: p.id }))
      }
    },
  });

  // b) Bill Counter Manager
  const bcmCriteria = [
    { module: 'pos', actions: ACTIONS },
    { module: 'sales', actions: ['create', 'read'] },
    { module: 'buyers', actions: ['create', 'read', 'update'] },
    { module: 'buyer_payments', actions: ['create', 'read'] },
    { module: 'returns', actions: ['create', 'read'] },
  ];
  
  await prisma.role.upsert({
    where: { name: 'Bill Counter Manager' },
    update: {},
    create: {
      name: 'Bill Counter Manager',
      description: 'Manages POS and sales operations',
      isSystem: true,
      rolePermissions: {
        create: getPermissionIds(bcmCriteria)
      }
    },
  });

  // c) Stock Manager
  const smCriteria = [
    { module: 'products', actions: ACTIONS },
    { module: 'categories', actions: ACTIONS },
    { module: 'units', actions: ACTIONS },
    { module: 'inventory', actions: ACTIONS },
    { module: 'purchases', actions: ACTIONS },
    { module: 'suppliers', actions: ACTIONS },
    { module: 'supplier_payments', actions: ['create', 'read', 'update'] },
    { module: 'stock_adjustments', actions: ACTIONS },
    { module: 'stock_transfers', actions: ['create', 'read'] },
    { module: 'reports', actions: ['read'] },
  ];

  await prisma.role.upsert({
    where: { name: 'Stock Manager' },
    update: {},
    create: {
      name: 'Stock Manager',
      description: 'Manages inventory and purchases',
      isSystem: true,
      rolePermissions: {
        create: getPermissionIds(smCriteria)
      }
    },
  });

  // 3. Create Default Branch
  console.log('Creating default branch...');
  const defaultBranch = await prisma.branch.upsert({
    where: { id: 'main-branch-01' },
    update: {},
    create: {
      id: 'main-branch-01',
      name: 'Main Branch - Lahore',
      address: 'Fatima Traders Commercial Market',
      phone: '0300-1234567',
      email: 'store@fatimatraders.com',
      isActive: true,
    }
  });

  // 4. Create Default Cash Counter
  console.log('Creating default cash counter...');
  await prisma.cashCounter.upsert({
    where: { id: 'counter-01' },
    update: {},
    create: {
      id: 'counter-01',
      name: 'Counter 1',
      branchId: defaultBranch.id,
      isActive: true,
    }
  });

  // 5. Create Default Units
  console.log('Creating default units...');
  const units = [
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Piece', abbreviation: 'pcs' },
    { name: 'Packet', abbreviation: 'pkt' },
    { name: 'Bag', abbreviation: 'bag' },
    { name: 'Drum', abbreviation: 'drum' },
  ];
  for (const u of units) {
    await prisma.unit.upsert({
      where: { name: u.name },
      update: {},
      create: { name: u.name, abbreviation: u.abbreviation }
    });
  }

  // 6. Create Default Categories
  console.log('Creating default categories...');
  const categories = [
    { name: 'Chemicals', description: 'Industrial & Raw Chemicals' },
    { name: 'Packaging Material', description: 'Bags, Bottles, Drums' },
    { name: 'Raw Material', description: 'Manufacturing Raw Materials' },
    { name: 'Finished Goods', description: 'Ready to sell products' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, description: c.description }
    });
  }

  // 7. Create Default Owner User
  console.log('Creating default admin user...');
  const hashedPassword = await bcryptjs.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'usamashamshiri@gmail.com' },
    update: {},
    create: {
      name: 'Usama Shamshiri',
      email: 'usamashamshiri@gmail.com',
      password: hashedPassword,
      branchId: defaultBranch.id,
      isActive: true,
      userRoles: {
        create: {
          roleId: ownerRole.id
        }
      }
    }
  });

  console.log('🎉 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
