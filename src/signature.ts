import { crc } from "./crc";
import type { Method } from "./type";
import type { Any } from "./util";

export const methodSignature = (
  name: string,
  { request, response }: Method<Any, Any>,
) => {
  const description = `${name}: ${request.description} => ${response.description}`;
  return crc(new TextEncoder().encode(description));
};
