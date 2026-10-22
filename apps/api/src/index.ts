import { buildApp } from './app.js';
import { loadConfig } from './config.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config });
  await app.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`@koode/api listening on http://localhost:${config.port}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
