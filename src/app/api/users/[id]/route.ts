import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hasPermission, MODULES, ACTIONS } from "@/lib/rbac";
import bcryptjs from "bcryptjs";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  phone: z.string().optional(),
  branchId: z.string().optional().nullable(),
  roleIds: z.array(z.string()).min(1, "At least one role is required").optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const permissions = (session?.user as any)?.permissions || [];
    if (!session || !hasPermission(permissions, MODULES.USERS, ACTIONS.READ)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id, isDeleted: false },
      include: {
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const permissions = (session?.user as any)?.permissions || [];
    if (!session || !hasPermission(permissions, MODULES.USERS, ACTIONS.UPDATE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validatedData = updateUserSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {
      name: validatedData.name,
      email: validatedData.email,
      phone: validatedData.phone || null,
      branchId: validatedData.branchId || null,
      isActive: validatedData.isActive,
    };

    if (validatedData.password) {
      updateData.password = await bcryptjs.hash(validatedData.password, 10);
    }

    if (validatedData.roleIds) {
      await prisma.userRole.deleteMany({
        where: { userId: id },
      });
      updateData.userRoles = {
        create: validatedData.roleIds.map((roleId) => ({
          roleId,
        })),
      };
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        branch: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PUT /api/users/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    const permissions = (session?.user as any)?.permissions || [];
    if (!session || !hasPermission(permissions, MODULES.USERS, ACTIONS.DELETE)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    
    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false, // also deactivate
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
