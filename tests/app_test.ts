import { Application, Request, Response } from "../mod.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.59.0/testing/asserts.ts";
import { delay } from "https://deno.land/std@0.59.0/async/delay.ts";

function killApp(p: Deno.Process<{cmd: string[], stdout: "piped"}>) {
  Deno.kill(p.pid, Deno.Signal.SIGKILL);
  p.stdout.close()
  p.close();
}

function runApp(path: string) {
  return Deno.run({
    cmd: [
      Deno.execPath(),
      "run",
      "-A",
      "-r",
      path,
    ],
    stdout: "piped",
  });
}

// TODO: more tests: status code, status, middlewares, route, Https, body-parser mid
Deno.test("Hello World! test", async () => {
  const p = runApp(`./tests/apps/helloworld.ts`);

  delay(100)
  const res = await fetch("http://localhost:8000").then((res) => res.text());

  assertEquals(res, "Hello World!");
  killApp(p);
});
