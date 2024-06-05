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
  signature: u64(),
  source: u32(),
  destination: u32(),
  payload: bytes(),
});

export type Frame = TypeType<typeof frame>;

export const encodeFrame = (_: Frame) => encode(frame, _);
export const decodeFrame = (_: Uint8Array) => decode(frame, _);
