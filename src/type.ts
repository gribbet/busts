import { createReader, type Reader } from "./reader";
import type { Any } from "./util";
import { assert, keys } from "./util";
import { createWriter, type Writer } from "./writer";

export type Type<T> = {
  description: string;
  encode: (writer: Writer, value: T) => void;
  decode: (reader: Reader) => T;
};

export type TypeType<T> = T extends Type<infer U> ? U : never;

export type Method<Request extends Type<Any>, Response extends Type<Any>> = {
  request: Request;
  response: Response;
};

export type Service = { [name: string]: Method<Any, Any> };

export type ServiceType<S extends Service> = {
  [Name in keyof S]: (
    request: TypeType<S[Name]["request"]>,
    source?: number,
  ) => TypeType<S[Name]["response"]> | Promise<TypeType<S[Name]["response"]>>;
};

export const encode = <T>(type: Type<T>, _: T) => {
  const writer = createWriter();
  type.encode(writer, _);
  return writer.data;
};

export const decode = <T>(type: Type<T>, _: Uint8Array) =>
  type.decode(createReader(_));

export const _void = () => {
  const description = "void";
  const encode = () => {};
  const decode = () => {};
  return { description, encode, decode } satisfies Type<void>;
};

export const literal = <T extends string>(_: T) => {
  const description = '"{_}"';
  const encode = () => {};
  const decode = () => _;
  return { description, encode, decode } satisfies Type<T>;
};

export const u8 = () => {
  const description = "u8";
  const encode = (writer: Writer, _: number) => writer.writeU8(_);
  const decode = (reader: Reader) => reader.readU8();
  return { description, encode, decode } satisfies Type<number>;
};

export const u16 = () => {
  const description = "u16";
  const encode = (writer: Writer, _: number) => writer.writeU16(_);
  const decode = (reader: Reader) => reader.readU16();
  return { description, encode, decode } satisfies Type<number>;
};

export const u32 = () => {
  const description = "u32";
  const encode = (writer: Writer, _: number) => writer.writeU32(_);
  const decode = (reader: Reader) => reader.readU32();
  return { description, encode, decode } satisfies Type<number>;
};

export const u64 = () => {
  const description = "u64";
  const encode = (writer: Writer, _: bigint) => writer.writeU64(_);
  const decode = (reader: Reader) => reader.readU64();
  return { description, encode, decode } satisfies Type<bigint>;
};

export const f32 = () => {
  const description = "f32";
  const encode = (writer: Writer, _: number) => writer.writeF32(_);
  const decode = (reader: Reader) => reader.readF32();
  return { description, encode, decode } satisfies Type<number>;
};

export const f64 = () => {
  const description = "f64";
  const encode = (writer: Writer, _: number) => writer.writeF64(_);
  const decode = (reader: Reader) => reader.readF64();
  return { description, encode, decode } satisfies Type<number>;
};

export const boolean = () => {
  const description = "boolean";
  const encode = (writer: Writer, _: boolean) => writer.writeBoolean(_);
  const decode = (reader: Reader) => reader.readBoolean();
  return { description, encode, decode } satisfies Type<boolean>;
};

export const bytes = () => {
  const description = "bytes";
  const encode = (writer: Writer, _: Uint8Array) => writer.writeBytes(_);
  const decode = (reader: Reader) => reader.readBytes();
  return { description, encode, decode } satisfies Type<Uint8Array>;
};

export const string = () => {
  const description = "string";
  const encode = (writer: Writer, _: string) => writer.writeString(_);
  const decode = (reader: Reader) => reader.readString();
  return { description, encode, decode } satisfies Type<string>;
};

export const object = <T>(fields: { [K in keyof T]: Type<T[K]> }) => {
  const description = `{ ${keys(fields)
    .map(name => `${String(name)}: ${assert(fields[name]).description}`)
    .join(", ")} }`;

  const encode = (writer: Writer, _: T) =>
    keys(fields).forEach(name => assert(fields[name]).encode(writer, _[name]));

  const decode = (reader: Reader) =>
    keys(fields).reduce((acc, name) => {
      acc[name] = assert(fields[name]).decode(reader);
      return acc;
    }, {} as T);

  return { description, encode, decode } satisfies Type<T>;
};

// TODO: Union type
