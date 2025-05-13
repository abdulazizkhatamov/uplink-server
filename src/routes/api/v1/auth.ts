// src/routes/v1/auth.ts
import { FastifyPluginAsync } from "fastify";
import argon2 from "argon2";
import prisma from "../../../lib/prisma";

const authRoute: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Protected route example
  fastify.get(
    "/me",
    { preHandler: fastify.csrfProtection },
    async (request, reply) => {
      if (!request.session.user)
        return reply.status(401).send({ error: "Unauthorized" });

      return { id: 1, user: request.session.user, dummy: "Dummy data !" };
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

      request.session.user = { id: user.id, email: user.email };

      reply.generateCsrf();
      return reply.status(200).send({
        message: "Login successful",
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
          required: ["first_name", "last_name", "email", "password"],
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
        await prisma.user.create({
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

        return reply.status(201).send({
          message: "User created successfully. Please verify your email.",
        });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );
  fastify.post("/logout", async (request, reply) => {
    try {
      await request.session.destroy();

      return reply.status(200).send({ message: "Logged out successfully" });
    } catch (err) {
      fastify.log.error(err);
      return reply.status(500).send({ message: "Internal server error" });
    }
  });
  fastify.get(
    "/csrf-token",
    {
      schema: {
        response: {
          201: {
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
      const token = reply.generateCsrf();
      return reply.status(201).send({
        message: "CSRF token generated successfully",
        token: token,
      });
    }
  );
};

export default authRoute;
