import { Server } from "socket.io";

export type DownloadParams = {
  url: string;
  socketId: string;
  title: string;
  artist: string;
  user?: string;
}

export declare class IProcessor {
  constructor();
  add(data: DownloadParams): void;
  setLoadIo(io: Server): void;
  processQueue(): Promise<void>;
}