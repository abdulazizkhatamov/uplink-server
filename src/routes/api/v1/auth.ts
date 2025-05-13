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

      request.session.user = { email };

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
              token: { type: "string" },
            },
          },
          400: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { first_name, last_name, email, password } = request.body as {
          first_name: string;
          last_name?: string;
          email: string;
          password: string;
        };

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
          return reply.status(400).send({ message: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await argon2.hash(password);

        // Create a JWT token for email verification
        const emailToken = fastify.jwt.sign({ email }, { expiresIn: "1h" });
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration time

        // Create the user in the database
        const user = await prisma.user.create({
          data: {
            first_name,
            last_name,
            email,
            password: hashedPassword,
            email_token: emailToken,
            email_token_exp: tokenExpiry,
          },
        });

        // Send email after the user is successfully created
        const { mailer } = fastify;
        const verificationLink = `https://${process.env.CLIENT_URL}/verify-email?token=${emailToken}`;

        await mailer.sendMail({
          to: email,
          subject: "Verify your email address",
          html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
              <h2>Welcome to Our App, ${first_name}!</h2>
              <p>Thanks for registering. Please verify your email by clicking the link below:</p>
              <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                Verify Email
              </a>
              <p>This link will expire in 1 hour.</p>
              <br>
              <small>If you didn't request this, you can safely ignore this email.</small>
            </div>
          `,
        });

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

        console.log({ accessToken });

        return reply.status(201).send({
          message: "User created successfully. Please verify your email.",
          token: accessToken,
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );
  fastify.post("/logout", async (request, reply) => {
    try {
      // Clear the refresh token cookie
      reply.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth/refresh",
      });

      return reply.status(200).send({ message: "Logged out successfully" });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Internal server error" });
    }
  });
  // Refresh route
  fastify.post(
    "/refresh",
    { preHandler: [fastify.verifyRefreshToken] },
    async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;

      console.log(refreshToken);

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
