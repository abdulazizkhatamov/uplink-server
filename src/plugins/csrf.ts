import fp from "fastify-plugin";
import csrf, { FastifyCsrfProtectionOptions } from "@fastify/csrf-protection";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/csrf-protection
 */
export default fp<FastifyCsrfProtectionOptions>(async (fastify) => {
  await fastify.register(csrf, {
    sessionPlugin: "@fastify/session",
  });
});
