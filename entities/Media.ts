import ytdl from "ytdl-core";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

import { IMedia } from "../interfaces/Media";

ffmpeg.setFfmpegPath(ffmpegPath.path);

class Media implements IMedia {
  private basePath: string;
  
  constructor() {
    this.basePath = path.join(__dirname, "../../tracks");
  }

  async downloadVideo(url: string): Promise<void> {
      return new Promise(async (resolve, reject) => {
        const videoStream = ytdl(url, { quality: "highestaudio" });
        const metadata = await ytdl.getBasicInfo(url, { lang: "pt-BR" });

        const title = metadata.videoDetails.title.replace(/\|/g, "");

        const ffmpegCommand = ffmpeg(videoStream)
          .audioBitrate(128)
          .toFormat("mp3")
          .save(`${this.basePath}\\${title}.mp3`)
          .on("end", () => {
            resolve();
          })
          .on("error", (err) => {
            reject(err);
          })

        ffmpegCommand.run();
      });
  }
}

const media = new Media();

export default media;