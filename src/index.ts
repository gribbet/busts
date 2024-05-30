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

const { emit, subscribe } = createSubscriber<Uint8Array>();
const channel = createFrameChannel(
  {
    read: subscribe,
    write: emit,
    destroy: () => {},
  },
  (Math.random() * 2 ** 32) >>> 0,
);

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
