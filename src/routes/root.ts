import { FastifyPluginAsync } from "fastify";

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get("/", async function (request, reply) {
    return { root: true };
  });
  fastify.post("/", async function (request, reply) {
    console.log(request.body);

    return reply.status(200).send({
      message: "Hello from the server!",
      data: request.body,
    });
  });
};

export default root;
