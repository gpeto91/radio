import { IQueue } from "./Queue";

export declare class IMedia {
  constructor(queue: IQueue);
  downloadVideo(url: string): Promise<void>;
}