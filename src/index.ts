import bootstrap from "./app.controller";

bootstrap().catch(() => {
  console.error("Startup failed. Check environment configuration and MongoDB availability.");
  process.exitCode = 1;
});
