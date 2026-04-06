import { BrowserWindow } from "electron";
import axios from "axios";
import * as cheerio from "cheerio";

export interface LinkValidationResult {
  url: string;
  status: number;
  ok: boolean;
  size?: number;
  error?: string;
}

class FuckingFastHandler {
  private mainWindow: BrowserWindow;

  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  async getDownloadUrl(targetUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const win = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          win.destroy();
          reject(new Error("Timeout waiting for FuckingFast download link"));
        }
      }, 30000);

      const clickDownload = async () => {
        try {
          const isRateLimited = await win.webContents.executeJavaScript(`
            document.body.innerText.toLowerCase().includes('rate limited')
          `);

          if (isRateLimited) {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              win.destroy();
              reject(new Error("RATE_LIMITED"));
            }
            return;
          }

          await win.webContents.executeJavaScript(`
            (function() {
              const btn = document.querySelector('button.gay-button');
              if (btn) {
                btn.click();
              } else {
                const buttons = Array.from(document.querySelectorAll('button'));
                const downloadBtn = buttons.find(b => b.textContent?.includes('DOWNLOAD'));
                if (downloadBtn) downloadBtn.click();
              }
            })();
          `);
        } catch (err) {
          console.error("[FuckingFast] Script injection error:", err);
        }
      };

      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.includes("fuckingfast.co/dl/")) {
          console.log(`[FuckingFast] Detected download link in popup: ${url}`);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            win.destroy();
            resolve(url);
          }
          return { action: "deny" };
        }

        console.log(
          `[FuckingFast] Blocked actual popup: ${url}. Retrying click...`,
        );
        setTimeout(clickDownload, 500);
        return { action: "deny" };
      });

      win.webContents.session.once("will-download", (event, item) => {
        event.preventDefault();
        const url = item.getURL();
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          win.destroy();
          resolve(url);
        }
      });

      win.loadURL(targetUrl);

      win.webContents.on("did-finish-load", clickDownload);

      win.on("closed", () => {
        if (!resolved) {
          clearTimeout(timeout);
          reject(new Error("Window closed before download link was captured"));
        }
      });
    });
  }

  private async fetchWithRetry(
    url: string,
    retries = 3,
    backoff = 2000,
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 10000,
        });

        const bodyContent =
          typeof response.data === "string"
            ? response.data.toLowerCase()
            : JSON.stringify(response.data).toLowerCase();

        if (bodyContent.includes("rate limited")) {
          const error = new Error("Rate Limited");
          (error as any).response = { status: 429, data: response.data };
          throw error;
        }

        return response;
      } catch (err: any) {
        const isRateLimit = err.response?.status === 429;
        const isLastRetry = i === retries - 1;

        if (isRateLimit && !isLastRetry) {
          const waitTime = backoff * Math.pow(2, i);
          console.log(
            `[FuckingFast] Rate limited on ${url}. Retrying in ${waitTime}ms...`,
          );
          await this.sleep(waitTime);
          continue;
        }
        throw err;
      }
    }
  }

  async validateLinks(links: string[]): Promise<LinkValidationResult[]> {
    const results: LinkValidationResult[] = [];
    const concurrency = 3;

    for (let i = 0; i < links.length; i += concurrency) {
      const batch = links.slice(i, i + concurrency);

      const batchResults = await Promise.all(
        batch.map(async (url) => {
          try {
            await this.sleep(Math.random() * 500);

            const response = await this.fetchWithRetry(url);
            const $ = cheerio.load(response.data);

            const downloadButton = $(
              "button.link-button.gay-button, button",
            ).filter((i, el) => {
              return $(el).text().trim().includes("DOWNLOAD");
            });

            if (downloadButton.length > 0) {
              const sizeText = $("span.text-gray-500, div").text();
              const sizeMatch = sizeText.match(
                /Size:\s*([\d.,]+)\s*(GB|MB|KB|B)/i,
              );

              let sizeBytes = 0;
              if (sizeMatch) {
                const value = parseFloat(sizeMatch[1].replace(",", ""));
                const unit = sizeMatch[2].toUpperCase();
                if (unit === "GB") sizeBytes = value * 1024 * 1024 * 1024;
                else if (unit === "MB") sizeBytes = value * 1024 * 1024;
                else if (unit === "KB") sizeBytes = value * 1024;
                else sizeBytes = value;
              }

              return {
                url,
                status: response.status,
                ok: true,
                size: Math.floor(sizeBytes),
              };
            } else {
              return {
                url,
                status: response.status,
                ok: false,
                error: "Download button not found",
              };
            }
          } catch (err: any) {
            console.error(
              `[FuckingFast] Validation error for ${url}:`,
              err.message,
            );
            return {
              url,
              status: err.response?.status || 0,
              ok: false,
              error: err.message,
            };
          }
        }),
      );

      results.push(...batchResults);

      if (i + concurrency < links.length) {
        const batchDelay = 500 + Math.random() * 1000;
        await this.sleep(batchDelay);
      }
    }

    return results;
  }
}

export default FuckingFastHandler;
