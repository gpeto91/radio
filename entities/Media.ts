import ytdl from "@distube/ytdl-core";
import fs from "fs";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import queue from "./Queue";

import { IMedia } from "../interfaces/Media";
import { IQueue } from "../interfaces/Queue";
import { IYoutubeCookie } from "../interfaces/YoutubeCookie";
import { YoutubeCookie } from "./YoutubeCookie";

ffmpeg.setFfmpegPath(ffmpegPath.path);

class Media implements IMedia {
  private basePath: string;

  constructor(private queue: IQueue, private YoutubeCookie: IYoutubeCookie) {
    this.basePath = path.join(__dirname, "../../tracks");
    this.queue = queue;
    this.YoutubeCookie = YoutubeCookie;
  }

  async downloadVideo(
    url: string,
    socketId: string,
    title: string,
    artist: string,
    user?: string
  ): Promise<number> {
    return new Promise(async (resolve, reject) => {
      try {
        const cookies = await this.YoutubeCookie.getLatestCookie();
        const agent = ytdl.createAgent(cookies);

        const audioStream = ytdl(url, {
          agent,
          filter: "audioonly",
          requestOptions: {
            headers: {
              "x-youtube-identity-token": process.env.YT_TOKEN,
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
            },
          },
        });

        const filepath = path.resolve(
          `${this.basePath}/${artist} - ${title}.mp3`
        );

        ffmpeg(audioStream)
          .audioBitrate(128)
          .audioFrequency(44100)
          .outputOptions("-movflags frag_keyframe+empty_moov")
          .toFormat("mp3")
          .save(filepath)
          .on("end", async () => {
            await this.queue.loadTrack(
              `tracks/${artist} - ${title}.mp3`,
              { title, artist },
              user
            );

            let queueLength =
              this.queue.tracks.filter((track) => track.queue).length - 1;

            if (this.queue.currentTrack?.queue) {
              queueLength--;
            }

            resolve(queueLength >= 0 ? queueLength : 0);
          })
          .on("error", (err) => {
            console.log(err);
            reject(`Não foi possível baixar o link fornecido`);
          });
      } catch (err) {
        console.log(err);
        reject(`Não foi possível obter informações do link fornecido`);
      }
    });
  }
}

const media = new Media(queue, new YoutubeCookie());

export default media;
