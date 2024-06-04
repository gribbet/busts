import { crc } from "./crc";
import { _void, type Service } from "./type";
import { keys } from "./util";

const methodSignature = <S extends Service, Name extends keyof S & string>(
  name: Name,
  [request = _void(), response = _void()]: Service[Name] = [],
) => {
  const description = `${name}: ${request.description} => ${response.description}`;
  return crc(new TextEncoder().encode(description));
};

export const serviceSignatures = <S extends Service>(service: S) =>
  keys(service).reduce(
    (acc, name) => {
      if (typeof name !== "string") return acc;
      const signature = methodSignature(name, service[name]);
      return {
        ...acc,
        [name]: signature,
      };
    },
    {} as { [Name in keyof S]: bigint },
  );
