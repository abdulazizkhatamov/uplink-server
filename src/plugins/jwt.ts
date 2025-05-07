import fp from "fastify-plugin";
import jwt, { FastifyJWTOptions } from "@fastify/jwt";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-jwt
 */
export default fp<FastifyJWTOptions>(async (fastify) => {
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || "JWT_SECRET",
  });
});
