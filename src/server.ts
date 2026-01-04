import { buildApp } from "./app";
import { env } from "./config/env";

async function main() {
  const app = await buildApp();

  const port = Number(env.port) || 3333;

  await app.listen({ port, host: "0.0.0.0" });

  console.log(`🚀 Backend rodando em http://127.0.0.1:${port}`);
}

main().catch((err) => {
  console.error("❌ Erro ao iniciar servidor:", err);
  process.exit(1);
});
