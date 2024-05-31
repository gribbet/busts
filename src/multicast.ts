import { createSocket } from "dgram";
import { networkInterfaces } from "os";

import type { Channel } from "./channel";

export const createMulticastChannel = (address: string, port: number) => {
  const socket = createSocket({ type: "udp4", reuseAddr: true });

  socket.bind(port, "0.0.0.0");

  const read = (handler: (data: Uint8Array) => void) => {
    socket.on("message", handler);
    return () => socket.off("message", handler);
  };

  const write = (data: Uint8Array) =>
    new Promise<void>((resolve, reject) => {
      socket.send(data, port, address, error =>
        error ? reject(error) : resolve(undefined),
      );
    });

  socket.on("listening", () => {
    socket.setMulticastTTL(64);
    Object.values(networkInterfaces()).forEach(
      infos =>
        infos
          ?.filter(_ => _.family === "IPv4" && !_.internal)
          .forEach(_ => socket.addMembership(address, _.address)),
    );
  });

  const destroy = () => socket.close();

  return {
    read,
    write,
    destroy,
  } satisfies Channel<Uint8Array>;
};
