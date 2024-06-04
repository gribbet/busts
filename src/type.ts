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

export type Method<
  Request extends Type<Any>,
  Response extends Type<Any>,
> = readonly [request?: Request, response?: Response];

export type Service = { [name: string]: Method<Any, Any> };

export type RequestType<S extends Service, Name extends keyof S> = TypeType<
  S[Name][0]
> extends never
  ? void
  : TypeType<S[Name][0]>;

export type ResponseType<S extends Service, Name extends keyof S> = TypeType<
  S[Name][1]
> extends never
  ? void
  : TypeType<S[Name][1]>;

export type ServiceType<S extends Service> = {
  [Name in keyof S]: (
    request: RequestType<S, Name>,
    source?: number,
  ) => ResponseType<S, Name> | Promise<ResponseType<S, Name>>;
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

export const literal = <T extends string>(value: T) => {
  const description = `"${value}"`;
  const encode = () => {};
  const decode = () => value;
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

export const partial = <T>(fields: { [K in keyof T]: Type<T[K]> }) => {
  const description = `{ ${keys(fields)
    .map(name => `${String(name)}: ${assert(fields[name]).description}?`)
    .join(", ")} }`;
  const encode = (writer: Writer, _: Partial<T>) =>
    keys(fields).forEach(name => {
      const value = _[name];
      const present = !!value;
      writer.writeBoolean(present);
      if (present) assert(fields[name]).encode(writer, value);
    });
  const decode = (reader: Reader) =>
    keys(fields).reduce((acc, name) => {
      const present = reader.readBoolean();
      if (!present) return acc;
      acc[name] = assert(fields[name]).decode(reader);
      return acc;
    }, {} as Partial<T>);
  return { description, encode, decode } satisfies Type<Partial<T>>;
};

export const optional = <T>(type: Type<T>) => {
  const description = `${type.description}?`;
  const encode = (writer: Writer, _?: T) => {
    writer.writeBoolean(_ !== undefined);
    if (_) type.encode(writer, _);
  };
  const decode = (reader: Reader) => {
    const present = reader.readBoolean();
    return present ? type.decode(reader) : undefined;
  };
  return { description, encode, decode } satisfies Type<T | undefined>;
};

export const enumeration = <T extends [string, ...string[]]>(values: T) => {
  type Value = T[number];
  const description = values.map(_ => `"${_}"`).join(" | ");
  const encode = (writer: Writer, _: Value) =>
    writer.writeU16(values.indexOf(_));
  const decode = (reader: Reader) =>
    (values[reader.readU16()] ?? values[0]) as Value;
  return { description, encode, decode } satisfies Type<Value>;
};

export const tuple = <T extends [] | [Type<Any>, ...Type<Any>[]]>(types: T) => {
  type Value = { [K in keyof T]: TypeType<T[K]> };
  const description = `[ ${types.map(_ => _.description).join(", ")} ]`;
  const encode = (writer: Writer, _: Value) =>
    types.forEach((type, i) => type.encode(writer, _[i]));
  const decode = (reader: Reader) => types.map(_ => _.decode(reader)) as Value;
  return { description, encode, decode } satisfies Type<Value>;
};

export const union = <T extends [Type<Any>, ...Type<Any>[]]>(
  types: T,
  discriminator: (_: TypeType<T[number]>) => T[number],
) => {
  type Value = TypeType<T[number]>;
  const description = types.map(_ => _.description).join(" | ");
  const encode = (writer: Writer, _: Value) => {
    const index = types.indexOf(discriminator(_));
    writer.writeU32(index);
    types[index]?.encode(writer, _);
  };
  const decode = (reader: Reader) => {
    const index = reader.readU32();
    return types[index]?.decode(reader) as Value;
  };
  return { description, encode, decode } satisfies Type<Value>;
};

export const array = <T extends Type<Any>>(type: T) => {
  type Value = TypeType<T>[];
  const description = `${type.description}[]`;
  const encode = (writer: Writer, _: Value) => {
    writer.writeU32(_.length);
    _.forEach(_ => type.encode(writer, _));
  };
  const decode = (reader: Reader) => {
    const length = reader.readU32();
    const result: Value = [];
    for (let i = 0; i < length; i++) result.push(type.decode(reader));
    return result;
  };
  return { description, encode, decode } satisfies Type<Value>;
};
