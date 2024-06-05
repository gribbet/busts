import type { Channel } from "./channel";
import { reserved } from "./constants";
import type { Frame } from "./frame";
import { decodeFrame, encodeFrame } from "./frame";

export type Node = Channel<Frame>;

export const createNode = (
  channel: Channel<Uint8Array>,
  id: number = (Math.random() * 2 ** 32) >>> 0,
) => {
  const read = (handler: (_: Frame) => void) =>
    channel.read(_ => {
      const frame = decodeFrame(_);
      if (
        frame.reserved === reserved &&
        ((frame.destination === 0 && frame.source !== id) ||
          frame.destination === id)
      )
        handler(frame);
    });

  const write = (_: Frame) => channel.write(encodeFrame({ ..._, source: id }));

  const { destroy } = channel;

  return { read, write, destroy } satisfies Node;
};
