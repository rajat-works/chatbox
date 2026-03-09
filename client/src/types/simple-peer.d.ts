declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  export interface Options {
    initiator?: boolean;
    trickle?: boolean;
    stream?: MediaStream;
  }

  export interface Instance extends EventEmitter {
    signal(data: any): void;
    destroy(): void;
    on(event: 'signal', cb: (data: any) => void): this;
    on(event: 'stream', cb: (stream: MediaStream) => void): this;
    on(event: 'close', cb: () => void): this;
    on(event: 'error', cb: (err: any) => void): this;
  }

  const SimplePeer: {
    new (opts: Options): Instance;
  };

  export default SimplePeer;
}
