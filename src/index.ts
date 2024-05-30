import type { Channel } from "./channel";
import { createClient } from "./client";
import { createFrameChannel } from "./frame";
import { createServer } from "./server";
import { createSubscriber } from "./subscriber";
import { _void, literal, object, string, u64 } from "./type";

const service = {
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

const id = (Math.random() * 2 ** 32) >>> 0;

const createMemoryChannel = () => {
  const { emit, subscribe } = createSubscriber<Uint8Array>();
  return {
    read: subscribe,
    write: emit,
    destroy: () => {},
  } satisfies Channel<Uint8Array>;
};

const channel = createFrameChannel(createMemoryChannel(), id);

const client = createClient(channel, service);

createServer(channel, service, {
  status: async (_, source) => {
    console.log(`Found id ${source}`);
    const { name } = await client.info(undefined, source);
    console.log(`Found id ${source} ${name}`);
  },
  info: () => ({ name: "Testing" }),
});

setInterval(
  () => client.status({ status: "ok", timestamp: BigInt(Date.now()) }),
  1000,
);
