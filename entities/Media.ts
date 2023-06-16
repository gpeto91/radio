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

  async downloadVideo(url: string): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const videoStream = ytdl(url, { quality: "highestaudio" });
      const metadata = await ytdl.getBasicInfo(url, { lang: "pt-BR" });
      const category = metadata.videoDetails.category;

      //TODO verificar necessidade da validação por categoria
      /* if (category !== "Music") {
        reject("Verifique se o link fornecido é uma música");
        return;
      } */

      const title = metadata.videoDetails.title.replace(/[&\?:|\\\/|]/gi, "");
      const filepath = `${this.basePath}\\${title}.mp3`;

      ffmpeg(videoStream)
        .audioBitrate(128)
        .toFormat("mp3")
        .outputOptions(
          '-metadata', `title=${title}`
        )
        .save(filepath)
        .on("end", async () => {
          const queueLength = await this.queue.loadTrack(`tracks\\${title}.mp3`);
          resolve(queueLength);
        })
        .on("error", (err) => {
          console.log(`Erro no título:`, title);
          reject("Não foi possível baixar o link fornecido");
        })
    });
  }
}

const media = new Media(queue);

export default media;