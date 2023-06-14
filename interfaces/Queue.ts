import { PassThrough } from "stream";

export type TrackType = { filepath: string, bitrate: number };

export declare class IQueue {
  constructor();
  broadcast(chunk: Buffer): void;
  addClient(): {
    id: string;
    client: PassThrough;
  };
  removeClient(id: string): void;
  loadTracks(dir: string): Promise<void>;
  loadTrack(filePath: string): Promise<void>;
  getTrackBitrate(filePath: string): Promise<number>;
  getNextTrack(): TrackType;
  pause(): void;
  resume(): void;
  started(): boolean;
  play(useNewTrack?: boolean): void;
  loadTrackStream(): void;
  start(): Promise<void>;
}