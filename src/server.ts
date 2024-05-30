import type { Channel } from "./channel";
import { reserved } from "./constants";
import { type Frame } from "./frame";
import { serviceSignatures } from "./signature";
import type { Service, ServiceType } from "./type";
import { decode, encode } from "./type";
import { keys } from "./util";

export type Server = {
  destroy: () => void;
};

export const createServer = <S extends Service>(
  channel: Channel<Frame>,
  service: S,
  impl: ServiceType<S>,
) => {
  const signatures = serviceSignatures(service);

  const destroy = channel.read(
    async ({ request, sequence, signature, source, payload }) => {
      const name = keys(signatures).find(_ => signatures[_] === signature);
      if (!name || !request) return;
      const method = service[name]!;
      const response = await impl[name](decode(method.request, payload));
      channel.write({
        reserved,
        request: false,
        sequence,
        signature,
        source,
        destination: source,
        payload: encode(method.response, response),
      });
    },
  );

  return { destroy } satisfies Server;
};
