import fp from "fastify-plugin";
import cors, { FastifyCorsOptions } from "@fastify/cors";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-cors
 */
export default fp<FastifyCorsOptions>(async (fastify) => {
  await fastify.register(cors, {
    origin: (origin, callback) => {
      const hostname = origin ? new URL(origin).hostname : "";

      // Allow undefined origin in development
      if (process.env.NODE_ENV === "development" && !origin) {
        callback(null, true);
        return;
      }

      //  Request from origins will pass
      if (["localhost"].includes(hostname)) {
        callback(null, true);
        return;
      }
      // Generate an error on other origins, disabling access
      callback(new Error("Not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-csrf-token",
    ],
    credentials: true,
  });
});
