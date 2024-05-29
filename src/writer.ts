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
  let data = new Uint8Array();
  let view = new DataView(data.buffer);
  let offset = 0;

  const advance = (_: number) => {
    offset += _;
    if (offset > data.length) {
      const current = data;
      data = new Uint8Array(data.length * 2);
      data.set(current);
      view = new DataView(data.buffer);
    }
    return offset - _;
  };

  const writeU8 = (_: number) => view.setUint8(advance(1), _);
  const writeU16 = (_: number) => view.setUint16(advance(2), _);
  const writeU32 = (_: number) => view.setUint32(advance(4), _);
  const writeU64 = (_: bigint) => view.setBigUint64(advance(8), _);
  const writeF32 = (_: number) => view.setFloat32(advance(4), _);
  const writeF64 = (_: number) => view.setFloat64(advance(8), _);
  const writeBoolean = (_: boolean) => writeU8(_ ? 1 : 0);
  const writeBytes = (_: Uint8Array) => {
    writeU32(_.length);
    data.set(_, advance(_.length));
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
