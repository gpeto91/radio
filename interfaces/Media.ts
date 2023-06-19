import { IQueue } from "./Queue";

export declare class IMedia {
  constructor(queue: IQueue);
  downloadVideo(url: string, title: string, artist: string, user?: string): Promise<number>;
}