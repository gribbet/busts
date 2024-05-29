import { createReader } from "./reader";
import type { TypeType } from "./type";
import { boolean, bytes, object, u8, u16, u32, u64 } from "./type";
import { createWriter } from "./writer";

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

export const decodeFrame = (_: Uint8Array) => frame.decode(createReader(_));

export const encodeFrame = (_: Frame) => {
  const writer = createWriter();
  frame.encode(writer, _);
  return writer.data;
};
