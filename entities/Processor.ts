import { Server } from "socket.io";
import { IMedia } from "../interfaces/Media";
import { DownloadParams, IProcessor } from "../interfaces/Processor";
import media from "./Media";

class Processor implements IProcessor {
  private queue: DownloadParams[];
  private isProcessing: boolean;
  private io: Server | undefined;
  
  constructor(private media: IMedia) {
    this.queue = [];
    this.isProcessing = false;
    this.media = media;
  }

  setLoadIo(io: Server): void {
      this.io = io;
  }

  add(data: DownloadParams): void {
      this.queue.push(data);

      if (!this.isProcessing) {
        this.processQueue();
      }
  }

  async processQueue(): Promise<void> {
      if (this.queue.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.isProcessing = true;
      
      const data = this.queue.shift() as DownloadParams;

      try {
        const queueLength = await this.media.downloadVideo(data.url, data.socketId, data.title, data.artist, data.user);
        const message = queueLength === 0 ? 
          `Música adicionada! Sua música será a próxima 🎵` :
          queueLength === 1 ?
          `Música adicionada! Tem uma música na frente da sua` :
          `Música adicionada! Tem ${queueLength} músicas na frente da sua`;

        if (this.io) {
          this.io.to(data.socketId).emit("queued", message);
        }
      } catch (err) {
        console.log(err);

        if(this.io) {
          this.io.to(data.socketId).emit("queued-error", "Não foi possível adicionar sua música na fila 😥");
        }
      }
      
      this.processQueue();
  }
}

const processor = new Processor(media);

export default processor;