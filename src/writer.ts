export type Writer = {
  writeU8(_: number): void;
  writeU16(_: number): void;
  writeU32(_: number): void;
  writeU64(_: bigint): void;
  writeF32(_: number): void;
  writeF64(_: number): void;
  writeBoolean(_: boolean): void;
  writeBytes(_: Uint8Array): void;
  writeString(_: string): void;
  data: Uint8Array;
};

export const createWriter: () => Writer = () => {
  let data = new Uint8Array(8);
  let view = new DataView(data.buffer);
  let offset = 0;

  const advance = (_: number) => {
    offset += _;
    while (offset > data.length) {
      const current = data;
      data = new Uint8Array(data.length * 2);
      data.set(current);
      view = new DataView(data.buffer);
    }
    return offset - _;
  };

  const writeU8 = (_: number) => {
    const offset = advance(1);
    view.setUint8(offset, _);
  };

  const writeU16 = (_: number) => {
    const offset = advance(2);
    view.setUint16(offset, _);
  };

  const writeU32 = (_: number) => {
    const offset = advance(4);
    view.setUint32(offset, _);
  };

  const writeU64 = (_: bigint) => {
    const offset = advance(8);
    view.setBigUint64(offset, _);
  };

  const writeF32 = (_: number) => {
    const offset = advance(4);
    view.setFloat32(offset, _);
  };

  const writeF64 = (_: number) => {
    const offset = advance(8);
    view.setFloat64(offset, _);
  };

  const writeBoolean = (_: boolean) => writeU8(_ ? 1 : 0);

  const writeBytes = (_: Uint8Array) => {
    writeU32(_.length);
    const offset = advance(_.length);
    data.set(_, offset);
  };

  const encoder = new TextEncoder();
  const writeString = (_: string) => writeBytes(encoder.encode(_));

  return {
    writeU8,
    writeU16,
    writeU32,
    writeU64,
    writeF32,
    writeF64,
    writeBoolean,
    writeBytes,
    writeString,
    get data() {
      return data.slice(0, offset);
    },
  };
};
