import ytdl from "ytdl-core";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import queue from "./Queue";

import { IMedia } from "../interfaces/Media";
import { IQueue } from "../interfaces/Queue";

ffmpeg.setFfmpegPath(ffmpegPath.path);

class Media implements IMedia {
  private basePath: string;

  constructor(private queue: IQueue) {
    this.basePath = path.join(__dirname, "../../tracks");
    this.queue = queue;
  }

  async downloadVideo(url: string, socketId: string, title: string, artist: string, user?: string): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const audioStream = ytdl(url, { filter: "audioonly" });

      try {
        const metadata = await ytdl.getBasicInfo(url);
        const trackTitle = metadata.videoDetails.title.replace(/[&\?:|\\\/|]/gi, "");
        const filepath = path.resolve(`${this.basePath}/${trackTitle}.mp3`);

        ffmpeg(audioStream)
          .audioBitrate(128)
          .audioFrequency(44100)
          .toFormat("mp3")
          .save(filepath)
          .on("end", async () => {
            await this.queue.loadTrack(`tracks/${trackTitle}.mp3`, { title, artist }, user);

            let queueLength = this.queue.tracks.filter((track) => track.queue).length - 1

            if (this.queue.currentTrack?.queue) {
              queueLength--;
            }

            resolve(queueLength >= 0 ? queueLength : 0);
          })
          .on("error", (err) => {
            console.log(`Erro no título:`, trackTitle);
            console.log(err);
            reject(`Não foi possível baixar o link fornecido`);
          })
      } catch (err) {
        reject(err);
        return;
      }


      // const category = metadata.videoDetails.category;

      //TODO verificar necessidade da validação por categoria
      /* if (category !== "Music") {
        reject("Verifique se o link fornecido é uma música");
        return;
      } */
    });
  }
}

const media = new Media(queue);

export default media;