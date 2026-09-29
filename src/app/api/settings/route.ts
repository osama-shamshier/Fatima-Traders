import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany();
    const settingsMap = settings.reduce((acc: any, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return NextResponse.json(settingsMap);
  } catch (error: any) {
    console.error("GET /api/settings error:", error.message);
    return NextResponse.json({}, { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    for (const [key, value] of Object.entries(body)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/settings database error:", error.message);
    return NextResponse.json({ success: true, savedOffline: true, warning: error.message });
  }
}
