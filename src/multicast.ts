import { createSocket } from "dgram";
import { networkInterfaces } from "os";

import type { Channel } from "./channel";
import { createSubscriber } from "./subscriber";

export const createMulticastChannel = (address: string, port: number) => {
  const { subscribe: read, emit: reading } = createSubscriber<Uint8Array>();
  const { subscribe: writing, emit: write } = createSubscriber<Uint8Array>();

  const socket = createSocket({ type: "udp4", reuseAddr: true });
  socket.on("message", reading);

  socket.bind(port, () =>
    interfaces().forEach(_ => socket.addMembership(address, _)),
  );

  const sockets = interfaces().map(_interface => {
    const socket = createSocket({ type: "udp4", reuseAddr: true });

    socket.bind(() => {
      socket.setMulticastInterface(_interface);
      socket.setMulticastTTL(64);
    });

    const destroy = writing(
      _ =>
        new Promise((resolve, reject) =>
          socket.send(_, port, address, error =>
            error ? reject(error) : resolve(undefined),
          ),
        ),
    );

    socket.on("close", () => {
      destroy();
      socket.off("message", reading);
    });

    return socket;
  });

  const destroy = () => sockets.forEach(_ => _.close());

  return {
    read,
    write,
    destroy,
  } satisfies Channel<Uint8Array>;
};

export const interfaces = () =>
  Object.entries(networkInterfaces())
    .map(([, _ = []]) => _.find(_ => _.family === "IPv4" && !_.internal))
    .map(_ => _?.address)
    .filter((_): _ is string => !!_);
