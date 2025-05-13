import "@fastify/session";

// 2. Declare module augmentation
declare module "@fastify/session" {
  interface FastifySessionObject {
    user: {
      id: string;
      email: string;
      // Add other user properties as needed
    };
  }
}
