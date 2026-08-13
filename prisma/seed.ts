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

  // 3. Create Default Owner User
  console.log('Creating default admin user...');
  const hashedPassword = await bcryptjs.hash('admin123', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'usamashamshiri@gmail.com' },
    update: {},
    create: {
      name: 'Usama Shamshiri',
      email: 'usamashamshiri@gmail.com',
      password: hashedPassword,
      userRoles: {
        create: {
          roleId: ownerRole.id
        }
      }
    }
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
