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

      return { filepath, bitrate, queue: false };
    });

    this.tracks = await Promise.all(promises);

    console.log(`Loaded ${this.tracks.length} tracks`);
  }

  async loadTrack(filePath: string): Promise<number> {
    const bitrate = await this.getTrackBitrate(filePath);
    const track = { filepath: filePath, bitrate, queue: true };
    const title = filePath.split("\\")[1].replace(".mp3", "");

    console.log(`Loaded a new song! ${title}`);

    return this.handleQueue(track);
  }

  handleQueue(track: TrackType): number {
      const temp = this.tracks.slice(this.index);
      const find = temp.findIndex((track) => !track.queue);
      const position = find === -1 ? 0 : find;
      let queueLength;

      this.tracks.splice((position + this.index), 0, track);

      this.play();

      queueLength = this.tracks.filter((track) => track.queue).length - 1;

      if (this.currentTrack?.queue) {
        queueLength--;
      }

      return queueLength;
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
      .on("end", () => {
        if (this.currentTrack && this.currentTrack?.queue) {
          this.currentTrack.queue = false;

          this.tracks.splice(this.index - 1, 1, this.currentTrack);
        }
        
        this.play(true)
      })
      .on("error", (error) => {
        console.log(error);
        this.play(true);
      });
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

    console.log(`Client ${id} has entered the transmission`);

    return { id, client };
  }

  removeClient(id: string): void {
    this.clients.delete(id);

    console.log(`Client ${id} left the transmission`);
  }
}

const queue = new Queue();

export default queue;