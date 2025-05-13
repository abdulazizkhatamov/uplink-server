// src/types/fastify-mailer.d.ts

declare module "fastify-mailer" {
  import { FastifyPluginCallback } from "fastify";
  import { TransportOptions, Transporter } from "nodemailer";

  const fastifyMailer: FastifyPluginCallback<{
    defaults?: { from?: string };
    transport: TransportOptions;
  }>;

  export = fastifyMailer;
}
