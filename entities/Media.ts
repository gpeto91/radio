import fs from "fs";
import Os from "os";
import ytdl from "ytdl-core";
import YTDlpWrap from "yt-dlp-wrap";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import queue from "./Queue";

import { IMedia } from "../interfaces/Media";
import { IQueue } from "../interfaces/Queue";

ffmpeg.setFfmpegPath(ffmpegPath.path);

class Media implements IMedia {
  private basePath: string;
  private ytDlpWrap?: YTDlpWrap;

  constructor(private queue: IQueue) {
    this.basePath = path.join(__dirname, "../../tracks");
    this.queue = queue;
  }

  async loadYtDlp() {
    const ytDlpBin = Os.platform() === "win32" ? path.resolve(__dirname, '../../bin/yt-dlp.exe') : path.resolve(__dirname, '../../bin/yt-dlp_linux');
    this.ytDlpWrap = new YTDlpWrap(ytDlpBin);
  }

  async downloadVideo(url: string, socketId: string, title: string, artist: string, user?: string): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        this.ytDlpWrap?.exec([
          url,
          '--xff',
          'BR',
          '-o',
          `${this.basePath}/temp.mp4`
        ])
          .on("error", (error) => {
            console.log(error);
            reject("Houve um problema ao baixar o vídeo fornecido")
          })
          .on("close", () => {
            const filepath = path.resolve(`${this.basePath}/${artist} - ${title}.mp3`);

            ffmpeg(`${this.basePath}/temp.mp4`)
              .audioBitrate(128)
              .audioFrequency(44100)
              .toFormat("mp3")
              .save(filepath)
              .on("end", async () => {
                fs.unlink(`${this.basePath}/temp.mp4`, (err) => {
                  if (err) {
                    reject("Não foi possível remover arquivo temporário de vídeo");
                  }
                });
                await this.queue.loadTrack(`tracks/${artist} - ${title}.mp3`, { title, artist }, user);

                let queueLength = this.queue.tracks.filter((track) => track.queue).length - 1

                if (this.queue.currentTrack?.queue) {
                  queueLength--;
                }

                resolve(queueLength >= 0 ? queueLength : 0);
              })
              .on("error", (err) => {
                reject(`Não foi possível baixar o link fornecido`);
              })
          })
        return;

        const audioStream = ytdl(url, {
          filter: "audioonly",
          requestOptions: {
            headers: {
              cookie: process.env.YT_COOKIE,
              "x-youtube-identity-token": process.env.YT_TOKEN
            }
          }
        });
        // const metadata = await ytdl.getBasicInfo(url);
        // const trackTitle = metadata.videoDetails.title.replace(/[&\?:|\\\/|]/gi, "");

      } catch (err) {
        reject(`Não foi possível obter informações do link fornecido`);
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