import {
  createMotorcartServer,
  listen,
  registerGracefulShutdown,
} from "./src/infra/create-server";

async function main() {
  const server = await createMotorcartServer();
  registerGracefulShutdown(server);
  await listen(server);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
