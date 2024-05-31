import { createClient } from "./client";
import { createMulticastChannel } from "./multicast";
import { createNode } from "./node";
import { createServer } from "./server";
import { _void, literal, object, string, u64 } from "./type";

const status = {
  status: {
    request: object({
      status: literal("ok"),
      timestamp: u64(),
    }),
    response: _void(),
  },
  info: {
    request: _void(),
    response: object({
      name: string(),
    }),
  },
} as const;

const channel = createMulticastChannel("238.4.5.8", 8458);

for (let i = 1; i <= 3; i++) {
  const id = (Math.random() * 100) >>> 0;
  const node = createNode(channel, id);

  const client = createClient(node, status);

  createServer(node, status, {
    status: () => {},
    info: () => ({ name: `Testing ${id}` }),
  });

  setInterval(
    () => client.status({ status: "ok", timestamp: BigInt(Date.now()) }),
    1000,
  );
}

const monitor = createNode(channel, 100);

const client = createClient(monitor, status);

createServer(monitor, status, {
  status: async (_, source) => {
    const { name } = await client.info(undefined, source);
    console.log(`Found ${source}: ${name}`);
  },
  info: () => ({ name: "Monitor" }),
});

setInterval(
  () => client.status({ status: "ok", timestamp: BigInt(Date.now()) }),
  1000,
);
