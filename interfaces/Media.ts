import { IQueue } from "./Queue";
import { IYoutubeCookie } from "./YoutubeCookie";

export declare class IMedia {
  constructor(queue: IQueue, youtubeCookie: IYoutubeCookie);
  downloadVideo(url: string, socketId: string, title: string, artist: string, user?: string): Promise<number>;
}