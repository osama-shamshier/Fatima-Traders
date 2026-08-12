import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id, isDeleted: false },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const formattedRole = {
      ...role,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      rolePermissions: undefined,
    };

    return NextResponse.json(formattedRole);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json({ error: 'Failed to fetch role' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const body = roleSchema.parse(json);

    // Check if role exists and isn't deleted
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole || existingRole.isDeleted) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if updating name conflicts with another role
    if (existingRole.name !== body.name) {
      const nameConflict = await prisma.role.findFirst({
        where: {
          name: { equals: body.name, mode: 'insensitive' },
          id: { not: id },
          isDeleted: false,
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 400 }
        );
      }
    }

    // Use a transaction to delete old permissions and create new ones
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Delete old permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Update role and create new permissions
      return await tx.role.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,
          rolePermissions: {
            create: body.permissionIds.map((permId) => ({
              permissionId: permId,
            })),
          },
        },
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      });
    });

    return NextResponse.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const role = await prisma.role.findUnique({
      where: { id },
    });

    if (!role || role.isDeleted) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete a system role' },
        { status: 403 }
      );
    }

    // Check if role is assigned to users
    const usersCount = await prisma.userRole.count({
      where: { roleId: id },
    });

    if (usersCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete role assigned to users' },
        { status: 400 }
      );
    }

    // Soft delete
    await prisma.role.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
