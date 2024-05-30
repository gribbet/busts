import type { Channel } from "./channel";
import { decodeFrame, encodeFrame, type Frame } from "./frame";
import {
  type ServiceName,
  type ServiceRequest,
  type ServiceResponse,
  type Services,
} from "./specification";
import { createSubscriber } from "./subscriber";
import { decode, encode } from "./type";
import { createSignal } from "./util";

const reserved = 0xc7;

export type Rpc<S extends Services> = {
  request: <Name extends ServiceName<S>>(
    name: Name,
    request: ServiceRequest<S, Name>,
    destination?: number,
  ) => Promise<ServiceResponse<S, Name> | undefined>;
  onRequest: <Name extends ServiceName<S>>(
    name: Name,
    handler: (
      request: ServiceRequest<S, Name>,
      source: number,
    ) => Promise<ServiceResponse<S, Name>>,
  ) => () => void;
  destroy: () => void;
};

export const createRpc = <S extends Services>(
  channel: Channel,
  services: Services,
) => {
  const id = (Math.random() * 2 ** 32) >>> 0;
  let sequence = Math.random() * 2 ** 16;
  const signatures = collectSignatures(services);

  const subscriber = createSubscriber<Frame>();

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

  const request = async <Name extends keyof Services>(
    name: Name,
    request: ServiceRequest<S, Name>,
    destination = 0,
  ) => {
    const service = services[name];
    const payload = encode(service.request, request);
    const frame: Frame = {
      reserved,
      sequence,
      request: true,
      signature: signatures[name],
      source: id,
      destination,
      payload,
    };

    const [response, onResponse] = createSignal<ServiceResponse<S, Name>>();

    const destroy = subscriber.subscribe(
      ({ request, sequence, signature, payload }) => {
        if (
          request ||
          signature !== signatures[name] ||
          sequence !== frame.sequence
        )
          return;
        onResponse(decode(service.response, payload));
      },
    );

    await channel.write(encodeFrame(frame));
    sequence = (sequence + 1) % 2 ** 16;
    const result = await response;
    destroy();
    return result;
  };

  const onRequest = <Name extends ServiceName<S>>(
    name: Name,
    handler: (
      Request: ServiceRequest<S, Name>,
      source: number,
    ) => Promise<ServiceResponse<S, Name>>,
  ) =>
    subscriber.subscribe(
      async ({
        request,
        sequence,
        signature,
        source,
        destination,
        payload,
      }) => {
        const service = services[name];
        if (!request || destination !== id || signature !== signatures[name])
          return;
        const response = await handler(
          decode(service.request, payload),
          source,
        );
        const frame: Frame = {
          reserved,
          request: false,
          sequence,
          signature,
          source: id,
          destination: source,
          payload: encode(service.response, response),
        };
        await channel.write(encodeFrame(frame));
      },
    );

  return {
    request,
    onRequest,
    destroy,
  } satisfies Rpc<S>;
};
