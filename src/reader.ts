export type Reader = {
  readU8(): number;
  readU16(): number;
  readU32(): number;
  readU64(): bigint;
  readF32(): number;
  readF64(): number;
  readBoolean(): boolean;
  readBytes(): Uint8Array;
  readString(): string;
};

export const createReader: (data: Uint8Array) => Reader = data => {
  const view = new DataView(data.buffer, data.byteOffset);
  let offset = 0;

  const advance = (_: number) => {
    offset += _;
    return offset - _;
  };

  const readU8 = () => view.getUint8(advance(1));
  const readU16 = () => view.getUint16(advance(2));
  const readU32 = () => view.getUint32(advance(4));
  const readU64 = () => view.getBigUint64(advance(8));
  const readF32 = () => view.getFloat32(advance(4));
  const readF64 = () => view.getFloat64(advance(8));
  const readBoolean = () => !!readU8();
  const readBytes = () => {
    const length = readU32();
    return data.slice(advance(length), offset);
  };

  const decoder = new TextDecoder();
  const readString = () => decoder.decode(readBytes());

  return {
    readU8,
    readU16,
    readU32,
    readU64,
    readF32,
    readF64,
    readBoolean,
    readBytes,
    readString,
  };
};
