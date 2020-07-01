import { serve } from "../deps.ts";

let s = serve({ port: 8000 });

for await (let req of s) {
  req.respond({ body: "Hello World!" });
}
