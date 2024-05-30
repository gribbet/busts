import type { Channel } from "./channel";
import { createClient } from "./client";
import { createNode } from "./node";
import { createServer } from "./server";
import { createSubscriber } from "./subscriber";
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

const createMemoryChannel = () => {
  const { emit, subscribe } = createSubscriber<Uint8Array>();
  return {
    read: subscribe,
    write: emit,
    destroy: () => {},
  } satisfies Channel<Uint8Array>;
};

const channel = createMemoryChannel();

for (let id = 1; id <= 3; id++) {
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
