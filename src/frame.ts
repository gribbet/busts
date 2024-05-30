import type { Channel } from "./channel";
import { reserved } from "./constants";
import type { TypeType } from "./type";
import {
  boolean,
  bytes,
  decode,
  encode,
  object,
  u8,
  u16,
  u32,
  u64,
} from "./type";

const frame = object({
  reserved: u8(),
  request: boolean(),
  sequence: u16(),
  signature: u64(), // TODO: u32?
  source: u32(),
  destination: u32(),
  payload: bytes(),
});

export type Frame = TypeType<typeof frame>;

export const encodeFrame = (_: Frame) => encode(frame, _);
export const decodeFrame = (_: Uint8Array) => decode(frame, _);

export const createFrameChannel = (
  channel: Channel<Uint8Array>,
  id: number,
) => {
  const read = (handler: (_: Frame) => void) =>
    channel.read(_ => {
      const frame = decodeFrame(_);
      if (frame.reserved === reserved && frame.destination === id)
        handler(frame);
    });

  const write = (_: Frame) => channel.write(encodeFrame({ ..._, source: id }));
  const { destroy } = channel;

  return { read, write, destroy } satisfies Channel<Frame>;
};
