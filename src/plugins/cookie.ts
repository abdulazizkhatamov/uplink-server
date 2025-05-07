import fp from "fastify-plugin";
import cookie, { FastifyCookieOptions } from "@fastify/cookie";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-cookie
 */
export default fp<FastifyCookieOptions>(async (fastify) => {
  await fastify.register(cookie);
});
