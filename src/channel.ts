export type Channel = {
  read: (handler: (data: Uint8Array) => void) => () => void;
  write: (data: Uint8Array) => Promise<void>;
  destroy: () => void;
};
