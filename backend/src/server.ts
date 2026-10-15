import { createApp } from './app';
import { env } from './config/env';
import { sequelize } from './database/connection';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on port ${env.port}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
