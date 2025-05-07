// src/routes/v1/auth.ts
import { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import prisma from "@/lib/prisma";

const authRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get("/me", async (request, reply) => {
    return { id: 1, name: "Dummy" };
  });

  fastify.post("/login", async (request, reply) => {
    return { message: "Logged in successfully", token: "dummy-token" };
  });

  fastify.post("/register", async (request, reply) => {
    const { first_name, email, password } = request.body as {
      first_name: string;
      email: string;
      password: string;
    };

    if (!first_name || !email || !password) {
      return reply.status(400).send({ message: "Missing required fields" });
    }

    const hashedPassword = await argon2.hash(password);

    console.log(hashedPassword);

    await prisma.user.create({
      data: { email: email, password: hashedPassword },
    });

    return {
      message: "Registered successfully",
      user: { id: 1, name: "Dummy" },
    };
  });
};

export default authRoute;
