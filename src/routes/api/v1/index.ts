// src/routes/v1/index.ts
import authRoute from "./auth";
import { FastifyPluginAsync } from "fastify";

const v1: FastifyPluginAsync = async (fastify): Promise<void> => {
  void fastify.register(authRoute, { prefix: "/auth" });
};

export default v1;
