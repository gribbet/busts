import type { Channel } from "./channel";
import { decodeFrame, encodeFrame, type Frame } from "./frame";
import type {
  ServiceName,
  ServiceRequest,
  ServiceResponse,
  Services,
} from "./specification";
import { createSubscriber } from "./subscriber";
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
  channel: Channel<Uint8Array>,
  services: Services,
) => {
  const id = (Math.random() * 2 ** 32) >>> 0;
  let sequence = Math.random() * 2 ** 16;

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

  const request = async <Name extends ServiceName<S>>(
    name: Name,
    request: ServiceRequest<S, Name>,
    destination = 0,
  ) => {
    const [response, onResponse] = createSignal<ServiceResponse<S, Name>>();
    const signature = serviceSignature(name);

    const _sequence = sequence;

    const destroy = subscriber.subscribe(
      ({ request, sequence, signature: _signature, payload }) => {
        if (request || signature !== _signature || sequence !== _sequence)
          return;
        const response = services[name]?.response.decode(payload);
        onResponse(response);
      },
    );

    const payload = services[name]?.request.encode(request);
    const frame: Frame = {
      reserved,
      sequence,
      request: true,
      signature,
      source: id,
      destination,
      payload,
    };
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
        if (
          !request ||
          destination !== id ||
          signature !== serviceSignature(name)
        )
          return;
        const _request = services[name]?.request.decode(payload);
        const response = await handler(_request, source);
        const frame: Frame = {
          reserved,
          request: false,
          sequence,
          signature,
          source: id,
          destination: source,
          payload: services[name]?.response.encode(response),
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
