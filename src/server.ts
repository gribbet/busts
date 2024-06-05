import { reserved } from "./constants";
import type { Node } from "./node";
import { serviceSignatures } from "./signature";
import type { Service, ServiceType } from "./type";
import { _void, decode, encode } from "./type";
import { keys } from "./util";

export type Server = {
  destroy: () => void;
};

export const createServer = <S extends Service>(
  node: Node,
  service: S,
  impl: ServiceType<S>,
) => {
  const signatures = serviceSignatures(service);

  const destroy = node.read(
    async ({ request, sequence, signature, source, payload }) => {
      const name = keys(signatures).find(_ => signatures[_] === signature);

      if (!name || !request) return;
      const [requestType = _void(), responseType = _void()] =
        service[name] ?? [];
      const response = await impl[name](decode(requestType, payload), source);
      node.write({
        reserved,
        request: false,
        sequence,
        signature,
        source,
        destination: source,
        payload: encode(responseType, response),
      });
    },
  );

  return { destroy } satisfies Server;
};
