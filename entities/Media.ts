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

      const title = metadata.videoDetails.title.replace(/\|/g, "");
      const filepath = `${this.basePath}\\${title}.mp3`;

      ffmpeg(videoStream)
        .audioBitrate(128)
        .toFormat("mp3")
        .save(filepath)
        .on("end", async () => {
          const queueLength = await this.queue.loadTrack(`tracks\\${title}.mp3`);
          resolve(queueLength);
        })
        .on("error", (err) => {
          reject(err);
        })
    });
  }
}

const media = new Media(queue);

export default media;