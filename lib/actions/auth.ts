"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function register(input: unknown) {
  const data = registerSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  });

  await signIn("credentials", {
    email: data.email,
    password: data.password,
    redirectTo: "/portfolio",
  });
}

export async function login(email: string, password: string) {
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/portfolio",
  });
}
