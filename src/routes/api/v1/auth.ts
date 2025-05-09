// src/routes/v1/auth.ts
import { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import prisma from "../../../lib/prisma";

const authRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Protected route example
  fastify.get(
    "/me",
    { preHandler: [fastify.auth([fastify.verifyAccessToken])] },
    async (request, reply) => {
      return { id: 1, user: request.user, dummy: "Dummy data !" };
    }
  );

  // Login route
  fastify.post(
    "/login",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
              token: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as {
        email: string;
        password: string;
      };

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return reply.status(401).send({ message: "Invalid email or password" });
      }

      const isPasswordValid = await argon2.verify(user.password, password);

      if (!isPasswordValid) {
        return reply.status(401).send({ message: "Invalid email or password" });
      }

      const accessToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: "1h" }
      );
      const refreshToken = fastify.jwt.sign(
        { id: user.id, email: user.email },
        { expiresIn: "7d" }
      );

      reply.setCookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
      });

      return reply.status(200).send({
        message: "Login successful",
        token: accessToken,
      });
    }
  );

  // Register route
  fastify.post(
    "/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["first_name", "email", "password"],
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 6 },
          },
        },
        response: {
          201: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { first_name, last_name, email, password } = request.body as {
        first_name: string;
        last_name?: string;
        email: string;
        password: string;
      };

      console.log(request.body);

      const existingUser = await prisma.user.findUnique({ where: { email } });

      if (existingUser) {
        return reply.status(400).send({ message: "User already exists" });
      }

      const hashedPassword = await argon2.hash(password);

      await prisma.user.create({
        data: { first_name, last_name, email, password: hashedPassword },
      });

      return reply.status(201).send({ message: "User created successfully" });
    }
  );

  // Refresh route
  fastify.post(
    "/refresh",
    { preHandler: [fastify.verifyRefreshToken] },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      if (!refreshToken) {
        return reply.status(401).send({ message: "No refresh token provided" });
      }

      try {
        const decoded = fastify.jwt.verify<{ id: number; email: string }>(
          refreshToken
        );

        const accessToken = fastify.jwt.sign(
          { id: decoded.id, email: decoded.email },
          { expiresIn: "1h" }
        );

        return reply.status(200).send({
          message: "Token refreshed successfully",
          token: accessToken,
        });
      } catch (err) {
        return reply.status(401).send({ message: "Invalid refresh token" });
      }
    }
  );
};

export default authRoute;
