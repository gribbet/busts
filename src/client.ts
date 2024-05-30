import type { Channel } from "./channel";
import { reserved } from "./constants";
import { type Frame } from "./frame";
import { serviceSignatures } from "./signature";
import type { Service, ServiceType, TypeType } from "./type";
import { decode, encode } from "./type";
import { createSignal, keys } from "./util";

export const createClient = <S extends Service>(
  channel: Channel<Frame>,
  service: S,
  destination = 0,
) => {
  let sequence = (Math.random() * 2 ** 16) >>> 0;
  const signatures = serviceSignatures(service);

  const clientMethod =
    <Name extends keyof S & string>(name: Name) =>
    async (request: TypeType<S[Name]["request"]>) => {
      const method = service[name]!;
      const payload = encode(method.request, request);
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

      const [response, onResponse] =
        createSignal<TypeType<S[Name]["response"]>>();

      const destroy = channel.read(
        ({ request, sequence, signature: _signature, payload }) => {
          if (
            request ||
            signature !== _signature ||
            sequence !== frame.sequence
          )
            return;
          onResponse(decode(method.response, payload));
        },
      );

      try {
        channel.write(frame);
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
