import type { Channel } from "./channel";
import { createRpc } from "./rpc";
import { _void, literal, string, u64 } from "./type";

const channel = 0 as unknown as Channel;

const api = createRpc(channel, {
  status: {
    request: {
      status: literal("ok"),
      timestamp: u64(),
    },
    response: _void(),
  },
  info: {
    request: _void(),
    response: {
      name: string(),
    },
  },
});

api.onRequest("status", (_, source) => {
  console.log(`Found id ${source}`);
});

setInterval(
  () => api.request("status", { status: "ok", timestamp: BigInt(Date.now()) }),
  1000,
);
