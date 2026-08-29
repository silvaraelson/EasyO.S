import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { healthRoutes } from "./routes/health.js";
import { customerRoutes } from "./routes/customers.js";
import { serviceTypeRoutes } from "./routes/service-types.js";
import { serviceOrderRoutes } from "./routes/service-orders.js";
import { userRoutes } from "./routes/users.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.WEB_ORIGIN,
  credentials: true,
});

await app.register(authRoutes);
await app.register(healthRoutes);
await app.register(customerRoutes, { prefix: "/api" });
await app.register(serviceTypeRoutes, { prefix: "/api" });
await app.register(serviceOrderRoutes, { prefix: "/api" });
await app.register(userRoutes, { prefix: "/api" });

app
  .listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`easy-os api on :${env.PORT}`))
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
