import { Server } from "socket.io";
import { PassThrough } from "stream";

export type TrackType = { 
  filepath: string,
  bitrate: number,
  queue: boolean,
  user: string;
  metadata: {
    title: string;
    artist: string;
  }
};

export type MetadataType = {
  title: string;
  artist: string;
}

export interface PlaylistFile {
  tracks: TrackType[];
}

export type WriteJSONAction = "insert" | "update";

export interface WriteJsonPayload {
  action: WriteJSONAction;
  data?: TrackType;
}

export declare class IQueue {
  constructor();
  tracks: TrackType[];
  currentTrack?: TrackType;
  broadcast(chunk: Buffer): void;
  addClient(): {
    id: string;
    client: PassThrough;
  };
  removeClient(id: string): void;
  loadTracks(dir: string): void;
  loadTrack(filePath: string, metadata: MetadataType, user?: string): Promise<void>;
  writeJson(): void;
  getTrackBitrate(filePath: string): Promise<number>;
  getNextTrack(): TrackType;
  pause(): void;
  resume(): void;
  started(): boolean;
  play(useNewTrack?: boolean): void;
  loadTrackStream(): void;
  start(): Promise<void>;
  loadIo(io: Server): void;
}