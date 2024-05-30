import type { Services } from "./specification";
import { keys } from "./util";

export const collectSignatures = <S extends Services>(services: S) =>
  keys(services).map(name => {
    const { request, response } = services[name]!;
    const description = `${name}: ${request.description} => ${response.description}`;
    const signature = crc(new TextEncoder().encode(description));
    return [name, signature];
  });
