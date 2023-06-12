import { readdir } from "fs/promises";
import { extname, join } from "path";

import { IQueue, TrackType } from "../interfaces/Queue";
import { ffprobe } from "@dropb/ffprobe";
import ffprobeStatic from "ffprobe-static";
import { ReadStream, createReadStream } from "fs";
import Throttle from "throttle";
import { PassThrough } from "stream";
import { v4 as uuid } from "uuid";

ffprobe.path = ffprobeStatic.path;

class Queue implements IQueue {
  private clients: Map<string, PassThrough>;
  private tracks: TrackType[];
  private index: number;
  private currentTrack: TrackType | undefined;
  private stream: ReadStream | undefined;
  private throttle: Throttle;
  private playing: boolean;

  constructor() {
    this.clients = new Map();
    this.tracks = [];
    this.index = 0;
    this.throttle = new Throttle(128000 / 8);
    this.playing = false;
  }

  broadcast(chunk: Buffer): void {
    this.clients.forEach((client) => {
      client.write(chunk);
    })
  }

  async getTrackBitrate(filePath: string): Promise<number> {
    const data = await ffprobe(filePath);
    const bitrate = data?.format?.bit_rate;

    return bitrate ? parseInt(bitrate) : 128000;
  }

  async loadTracks(dir: string): Promise<void> {
    let filenames = await readdir(dir);

    filenames = filenames.filter((filename) => extname(filename) === ".mp3");

    const filepaths = filenames.map((filename) => join(dir, filename));

    const promises = filepaths.map(async (filepath) => {
      const bitrate = await this.getTrackBitrate(filepath);

      return { filepath, bitrate };
    });

    this.tracks = await Promise.all(promises);
    
    console.log(`Loaded ${this.tracks.length} tracks`);
  }

  getNextTrack(): TrackType {
    if (this.index >= this.tracks.length - 1) {
      this.index = 0;
    }

    const track = this.tracks[this.index++];

    this.currentTrack = track;

    return track;
  }

  loadTrackStream(): void {
    const track = this.currentTrack;

    if (!track) return;

    console.log("Starting audio stream");

    this.stream = createReadStream(track.filepath);
  }

  async start(): Promise<void> {
    const track = this.currentTrack;

    if (!track || !this.stream) return;

    this.playing = true;
    this.throttle = new Throttle(track.bitrate / 8);

    this.stream
      .pipe(this.throttle)
      .on("data", (chunk) => this.broadcast(chunk))
      .on("end", () => this.play(true))
      .on("error", () => this.play(true));
  }

  pause(): void {
    if (!this.started() || !this.playing) return;

    this.playing = false;

    console.log("Paused");

    this.throttle.removeAllListeners("end");
    this.throttle.end();
  }

  started(): boolean {
    return !!this.stream && this.throttle && !!this.currentTrack;
  }

  resume(): void {
    if (!this.started() || this.playing) return;

    console.log("Resumed");

    this.start();
  }

  play(useNewTrack?: boolean | undefined): void {
    if (useNewTrack || !this.currentTrack) {
      console.log("Playing new track");

      this.getNextTrack();
      this.loadTrackStream();
      this.start();
    } else {
      this.resume();
    }
  }

  addClient(): { id: string; client: PassThrough; } {
    const id = uuid();
    const client = new PassThrough();

    this.clients.set(id, client);

    return { id, client };
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }
}

const queue = new Queue();

export default queue;