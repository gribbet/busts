export type Channel<T> = {
  read: (_: (_: T) => void) => () => void;
  write: (_: T) => void;
  destroy: () => void;
};
