import fp from "fastify-plugin";
import { Transporter } from "nodemailer";
import mailer from "fastify-mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/coopflow/fastify-mailer
 */

export default fp(async (fastify) => {
  await fastify.register(mailer, {
    defaults: { from: process.env.MAILER_FROM },
    transport: {
      host: process.env.MAILER_HOST,
      port: process.env.MAILER_PORT,
      secure: true, // TLS
      auth: {
        user: process.env.MAILER_USER,
        pass: process.env.MAILER_PASS, // NOT your regular password
      },
    } as SMTPTransport.Options,
  });
});

export interface FastifyMailerNamedInstance {
  [namespace: string]: Transporter;
}

export type FastifyMailer = FastifyMailerNamedInstance & Transporter;

declare module "fastify" {
  interface FastifyInstance {
    mailer: FastifyMailer;
  }
}
