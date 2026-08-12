import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Permission } from '@prisma/client';

export async function GET() {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' },
      ],
    });

    // Group by module
    const groupedPermissions = permissions.reduce((acc, curr) => {
      if (!acc[curr.module]) {
        acc[curr.module] = [];
      }
      acc[curr.module].push(curr);
      return acc;
    }, {} as Record<string, Permission[]>);

    return NextResponse.json(groupedPermissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 });
  }
}
