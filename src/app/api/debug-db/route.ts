import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        isActive: true,
        isDeleted: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    const results = [];
    for (const u of users) {
      const match = await bcrypt.compare("admin123", u.password);
      results.push({
        id: u.id,
        email: u.email,
        name: u.name,
        isActive: u.isActive,
        isDeleted: u.isDeleted,
        roles: u.userRoles.map((ur) => ur.role.name),
        passwordMatchesAdmin123: match,
      });
    }

    const branchCount = await prisma.branch.count();
    const productCount = await prisma.product.count();

    return NextResponse.json({
      status: "SUCCESS",
      databaseConnected: true,
      userCount: users.length,
      branchCount,
      productCount,
      users: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        databaseConnected: false,
        error: error.message || String(error),
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
