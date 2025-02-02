import ytdl from "@distube/ytdl-core";

export interface IYoutubeCookie {
  getLatestCookie(): Promise<ytdl.Cookie[]>;
}
