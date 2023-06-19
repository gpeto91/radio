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

export declare class IQueue {
  constructor();
  broadcast(chunk: Buffer): void;
  addClient(): {
    id: string;
    client: PassThrough;
  };
  removeClient(id: string): void;
  loadTracks(dir: string): Promise<void>;
  loadTrack(filePath: string, metadata: MetadataType, user?: string): Promise<number>;
  handleQueue(track: TrackType): number;
  getTrackBitrate(filePath: string): Promise<number>;
  getNextTrack(): TrackType;
  pause(): void;
  resume(): void;
  started(): boolean;
  play(useNewTrack?: boolean): void;
  loadTrackStream(): void;
  start(): Promise<void>;
}