import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Easy Kite API escuchando en http://localhost:${env.port}`);
});
