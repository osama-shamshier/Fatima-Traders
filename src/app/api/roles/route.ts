import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
});

export async function GET() {
  try {
    const roles = await prisma.role.findMany({
      where: { isDeleted: false },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { userRoles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedRoles = roles.map((role) => ({
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      rolePermissions: undefined, // remove raw join table data
    }));

    return NextResponse.json(formattedRoles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = roleSchema.parse(json);

    // Check if role name already exists
    const existingRole = await prisma.role.findFirst({
      where: {
        name: { equals: body.name, mode: 'insensitive' },
        isDeleted: false,
      },
    });

    if (existingRole) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 400 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        isSystem: false, // User created roles are never system roles
        rolePermissions: {
          create: body.permissionIds.map((id) => ({
            permissionId: id,
          })),
        },
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}
