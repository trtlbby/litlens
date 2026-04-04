import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { firstName, lastName, email, password, bio, institution } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: { message: "First name, last name, email, and password are required" } },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: { message: "Invalid email address" } },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: { message: "Password must be at least 8 characters" } },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: { message: "An account with this email already exists" } },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    const name = `${String(firstName).trim()} ${String(lastName).trim()}`;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        bio: bio || null,
        institution: institution || null,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json(
      { error: { message: "Registration failed" } },
      { status: 500 }
    );
  }
}
