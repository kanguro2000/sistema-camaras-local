import { buildApp } from "./app.js";
import { config } from "./config.js";

const app = await buildApp();
try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`Gateway listening on http://0.0.0.0:${config.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
