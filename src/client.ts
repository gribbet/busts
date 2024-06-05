import { reserved } from "./constants";
import { type Frame } from "./frame";
import type { Node } from "./node";
import { serviceSignatures } from "./signature";
import type { RequestType, ResponseType, Service, ServiceType } from "./type";
import { _void, decode, encode } from "./type";
import { createSignal, keys } from "./util";

export const createClient = <S extends Service>(
  node: Node,
  service: S,
  _destination = 0,
) => {
  let sequence = (Math.random() * 2 ** 16) >>> 0;
  const signatures = serviceSignatures(service);

  const clientMethod =
    <Name extends keyof S & string>(name: Name) =>
    async (request: RequestType<S, Name>, destination = _destination) => {
      const [requestType = _void(), responseType = _void()] =
        service[name] ?? [];
      const payload = encode(requestType, request);
      const signature = signatures[name];
      const frame: Frame = {
        reserved,
        sequence,
        request: true,
        signature,
        source: 0,
        destination,
        payload,
      };

      const [response, onResponse] = createSignal<ResponseType<S, Name>>();

      const destroy = node.read(
        ({ request, sequence, signature: _signature, payload }) => {
          if (
            request ||
            signature !== _signature ||
            sequence !== frame.sequence
          )
            return;
          onResponse(decode(responseType, payload));
        },
      );

      try {
        node.write(frame);
        sequence = (sequence + 1) % 2 ** 16;
        return await response;
      } finally {
        destroy();
      }
    };

  return keys(service).reduce((acc, name) => {
    if (typeof name !== "string") return acc;
    return {
      ...acc,
      [name]: clientMethod(name),
    };
  }, {} as ServiceType<S>);
};
