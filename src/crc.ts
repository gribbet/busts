import { range } from "./util";

// TODO: Use different CRC

const mask = 0xffffffffffffffffn;
const poly = 0x42f0e1eba9ea3693n;

export const crc = (data: Uint8Array, initial = 0n) =>
  [...data].reduce(
    (value, x) =>
      range(0, 8).reduce(
        value =>
          value & (1n << 63n) ? ((value << 1n) & mask) ^ poly : value << 1n,
        value ^ ((BigInt(x) << 56n) & mask),
      ),
    initial ^ mask,
  ) ^ mask;
