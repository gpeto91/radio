import { readdir } from "fs/promises";
import { extname, join } from "path";
import fs from "fs";

import { IQueue, MetadataType, PlaylistFile, TrackType, WriteJSONAction, WriteJsonPayload } from "../interfaces/Queue";
import { ffprobe } from "@dropb/ffprobe";
import ffprobeStatic from "ffprobe-static";
import { ReadStream, createReadStream } from "fs";
import Throttle from "throttle";
import { PassThrough } from "stream";
import { v4 as uuid } from "uuid";
import { Server } from "socket.io";

ffprobe.path = ffprobeStatic.path;

class Queue implements IQueue {
  private clients: Map<string, PassThrough>;
  public tracks: TrackType[];
  private index: number;
  public currentTrack: TrackType | undefined;
  private stream: ReadStream | undefined;
  private throttle: Throttle;
  private playing: boolean;
  private io: Server | null;
  private writeQueue: WriteJsonPayload[];
  private writing: boolean;

  constructor() {
    this.clients = new Map();
    this.tracks = [];
    this.index = 0;
    this.throttle = new Throttle(128000 / 8);
    this.playing = false;
    this.io = null;
    this.writeQueue = [];
    this.writing = false;
  }

  loadIo(io: Server): void {
    this.io = io;
  }

  broadcast(chunk: Buffer): void {
    this.clients.forEach((client) => {
      client.write(chunk);
    })
  }

  writeJson(): void {
    if (this.writeQueue.length === 0) {
      this.writing = false;
      return;
    }

    this.writing = true;
    const { action, data } = this.writeQueue.shift() as WriteJsonPayload;
    const playlist: PlaylistFile = { tracks: [] }

    switch (action) {
      case "insert":
        const newTrack = data as TrackType;
        const temp = this.tracks.slice(this.index);
        const find = temp.findIndex((track) => !track.queue);

        if (find === -1) {
          this.tracks.push(newTrack);
        } else {
          this.tracks.splice((find + this.index), 0, newTrack);
        }

        playlist.tracks = this.tracks;

        fs.writeFile(`tracks/playlist.json`, JSON.stringify(playlist), (err) => {
          if (err) console.log("Não foi possível salvar o arquivo da playlist");
          else console.log("Playlist salva com sucesso");

          if (!this.playing && this.tracks.length === 1) this.play(true);

          this.writeJson();
        });

        break;
      case "update":
        (this.currentTrack as TrackType).queue = false;

        this.tracks.splice(this.index - 1, 1, this.currentTrack as TrackType);

        playlist.tracks = this.tracks;

        fs.writeFile(`tracks/playlist.json`, JSON.stringify(playlist), (err) => {
          if (err) console.log("Não foi possível salvar o arquivo da playlist");
          else console.log("Playlist atualizada com sucesso");

          this.writeJson();
        });

        break;
    }
  }

  async getTrackBitrate(filePath: string): Promise<number> {
    const data = await ffprobe(filePath);
    const bitrate = data?.format?.bit_rate;

    return bitrate ? Number(bitrate) : 128000;
  }

  loadTracks(dir: string): void {
    fs.readFile(`${dir}/playlist.json`, "utf-8", (err, data) => {
      if (err) {
        console.log("Erro ao abrir arquivo da playlist");
        throw new Error("Erro ao abrir arquivo da playlist");
      }

      const playlist: PlaylistFile = JSON.parse(data);

      this.tracks = playlist.tracks;

      console.log(`Loaded ${this.tracks.length} tracks`);

      if (this.tracks.length) this.play();
    });
  }

  async loadTrack(filePath: string, metadata: MetadataType, user?: string): Promise<void> {
    const bitrate = await this.getTrackBitrate(filePath);
    const track: TrackType = { filepath: filePath, bitrate, queue: true, user: user || "", metadata };
    const title = filePath.split("/")[1].replace(".mp3", "");

    console.log(`Loaded a new song! ${title}`);

    this.writeQueue.push({ action: "insert", data: track });
    
    if (!this.writing) {
      this.writeJson();
    }
  }

  getNextTrack(): TrackType {
    if (this.index >= this.tracks.length) {
      this.index = 0;
    }

    const track = this.tracks[this.index++];

    console.log("Musica atual:", track.metadata.title);

    this.currentTrack = track;

    return track;
  }

  loadTrackStream(): void {
    const track = this.currentTrack;

    if (!track) return;

    console.log("Starting audio stream");

    this.stream = createReadStream(track.filepath);

    setTimeout(() => {
      this.io?.emit("new-track", { user: track.user, metadata: track.metadata });
    }, 5000);
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
          this.writeQueue.push({ action: "update" });
          
          if (!this.writing) {
            this.writeJson();
          }
        }

        this.play(true);
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