import puppeteer from "puppeteer";
import { IYoutubeCookie } from "../interfaces/YoutubeCookie";

export class YoutubeCookie implements IYoutubeCookie {
  async getLatestCookie() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await page.goto(
        "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Faccounts.google.com%2F&followup=https%3A%2F%2Faccounts.google.com%2F&passive=1209600&ifkv=AVdkyDnoX5txRqNDy399sYA71MtDV4v-PpcMRhPKd9Zd7rWskZXfJgqYAJOxPAbD1GJ_2GTfq-ES&ddm=1&flowName=GlifWebSignIn&flowEntry=ServiceLogin",
        { waitUntil: "networkidle2" }
      );

      console.log("navegou pagina login");

      await page.waitForSelector('input[type="email"]', { visible: true });
      console.log("esperou input email");
      await page.type('input[type="email"]', process.env.YT_LOGIN as string, {
        delay: 100,
      });
      console.log("preencheu email");
      await page.click('div[id="identifierNext"]');

      console.log("clicou next");

      await page.waitForNavigation({ waitUntil: "networkidle2" });

      await page.waitForSelector('input[type="password"]', { visible: true });
      await page.type('input[type="password"]', process.env.YT_PASS as string, {
        delay: 100,
      });
      await page.click('div[id="passwordNext"]');

      console.log("preencheu senha");

      await page.waitForNavigation({ waitUntil: "networkidle2" });

      await page.goto("https://www.youtube.com", { waitUntil: "networkidle2" });

      console.log("logou");

      await page.waitForFunction(
        () => (window as any).ytcfg && (window as any).ytcfg.get("ID_TOKEN"),
        {
          timeout: 5000,
        }
      );

      const identityToken = await page.evaluate(() =>
        (window as any).ytcfg.get("ID_TOKEN")
      );

      console.log("identityToken", identityToken);

      const cookies = await page.cookies();

      await browser.close();

      return cookies;
    } catch (err) {
      console.error(err);
    }

    return [];
  }
}
