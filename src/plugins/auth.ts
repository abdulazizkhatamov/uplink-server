import fp from "fastify-plugin";
import fastifyAuth from "@fastify/auth";
import { FastifyReply } from "fastify";
import { FastifyRequest } from "fastify";

export interface AuthPluginOptions {}

export default fp<AuthPluginOptions>(async (fastify, opts) => {
  // Register fastify-auth plugin first
  await fastify.register(fastifyAuth);

  // Use Fastify-style decorators with `done` callback for fastify-auth
  fastify.decorate(
    "verifyAccessToken",
    async function (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.code(401).send({ message: "Unauthorized" });
      }
    }
  );

  fastify.decorate(
    "verifyRefreshToken",
    async function (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      try {
        const { refreshToken } = request.cookies;
        if (!refreshToken) throw new Error("Missing token");
        request.user = fastify.jwt.verify(refreshToken);
      } catch (err) {
        reply.code(401).send({ message: "Invalid refresh token" });
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    verifyAccessToken: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    verifyRefreshToken: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
