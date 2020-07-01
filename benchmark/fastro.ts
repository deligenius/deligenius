import { Fastro } from "https://raw.githubusercontent.com/fastrodev/fastro/master/mod.ts";
const server = new Fastro();
server.get("/", (req) => req.send("Hello World"));
await server.listen();
