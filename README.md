# busts

A simple binary, type-safe peer-to-peer RPC system

1. Define your schema

```
export const heartbeatService = {
  heartbeat: [object({ timestamp: u32() })],
} as const;

export const infoService = {
  name: [_void(), string()],
} as const;
```

2. Define a channel and peer nodes

```
const channel = createSimpleChannel();
const node1 = createNode(channel);
const node2 = createNode(channel);
const node3 = createNode(channel);
```

3. Implement

```
createServer(node1, infoService, {
  name: () => "Node 1",
});

createServer(node2, infoService, {
  name: () => "Node 2",
});

createServer(node3, heartbeatService, {
  heartbeat: async (_, source) => {
    const info = createClient(node3, infoService, source);
    const name = await info.name();
    console.log(`Node ${source?.toString(16).padStart(8, "0")}: ${name}`);
  },
});

const heartbeat1 = createClient(node1, heartbeatService);
const heartbeat2 = createClient(node2, heartbeatService);

setInterval(async () => {
  await heartbeat1.heartbeat({ timestamp: Date.now() });
  await heartbeat2.heartbeat({ timestamp: Date.now() });
}, 1000);
```

This will output, for example:

```
Node 4b63cce4: Node 1
Node a8ece6d5: Node 2
Node 4b63cce4: Node 1
Node a8ece6d5: Node 2
```
