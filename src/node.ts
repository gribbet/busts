import type { Channel } from "./channel";
import { decodeFrame, encodeFrame, type Frame } from "./frame";
import { serviceSignatures } from "./signature";
import { createSubscriber } from "./subscriber";
import type { Service, ServiceType, TypeType } from "./type";
import { decode, encode } from "./type";
import { createSignal, keys } from "./util";

const reserved = 0xc7;

export type Server = {
  destroy: () => void;
};

export type Node = {
  client: <S extends Service>(
    service: S,
    destination?: number,
  ) => ServiceType<S>;
  server: <S extends Service>(service: S, impl: ServiceType<S>) => Server;
  destroy: () => void;
};

export const createNode = (channel: Channel) => {
  const id = (Math.random() * 2 ** 32) >>> 0;
  let sequence = Math.random() * 2 ** 16;
  const subscriber = createSubscriber<Frame>();

  const client = <S extends Service>(service: S, destination = 0) => {
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
          source: id,
          destination,
          payload,
        };

        const [response, onResponse] =
          createSignal<TypeType<S[Name]["response"]>>();

        const destroy = subscriber.subscribe(
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
          channel.write(encodeFrame(frame));
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

  const destroy = channel.read(bytes => {
    const frame = decodeFrame(bytes);
    const { destination } = frame;
    if (
      frame.reserved !== reserved ||
      (destination !== 0 && destination !== id)
    )
      return;
    subscriber.emit(frame);
  });

  const server = <S extends Service>(service: S, impl: ServiceType<S>) => {
    const signatures = serviceSignatures(service);

    const destroy = subscriber.subscribe(
      async ({ request, sequence, signature, source, payload }) => {
        const name = keys(signatures).find(_ => signatures[_] === signature);
        if (!name || !request) return;
        const method = service[name]!;
        const response = await impl[name](decode(method.request, payload));
        const frame: Frame = {
          reserved,
          request: false,
          sequence,
          signature,
          source: id,
          destination: source,
          payload: encode(method.response, response),
        };
        channel.write(encodeFrame(frame));
      },
    );

    return { destroy };
  };

  return {
    client,
    server,
    destroy,
  } satisfies Node;
};
