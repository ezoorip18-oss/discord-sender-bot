
import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export interface MassDmStats {
  guildName: string;
  guildId: string;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
  complete: boolean;
}

class BotManager {
  private process: ChildProcess | null = null;
  private logs: LogEntry[] = [];
  private stats: MassDmStats | null = null;
  private readonly MAX_LOGS = 200;

  constructor() {
    this.addLog("Bot manager initialized", 'info');
  }

  private addLog(message: string, type: LogEntry['type'] = 'info') {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      type
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  getLogs() {
    return this.logs;
  }

  getMassDmStats(): MassDmStats | null {
    return this.stats;
  }

  isRunning() {
    return this.process !== null && this.process.exitCode === null;
  }

  startMassDm(token: string, serverId: string, dmMessage: string, delay: number) {
    if (this.isRunning()) {
      this.addLog("Mass DM campaign is already running", 'error');
      return false;
    }

    // Reset stats for new campaign
    this.stats = null;

    this.addLog(`Starting mass DM campaign to server ${serverId}...`, 'info');

    const botPath = path.resolve(process.cwd(), "bot.py");

    this.process = spawn("python3", [
      botPath,
      "--token", token,
      "--server", serverId,
      "--dm-message", dmMessage,
      "--delay", String(delay),
    ]);

    this.process.stdout?.on("data", (data) => {
      const raw = data.toString();
      const lines = raw.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("[STATS_JSON]")) {
          try {
            const json = trimmed.slice("[STATS_JSON]".length).trim();
            const parsed = JSON.parse(json) as MassDmStats;
            this.stats = parsed;
            // Don't add stats lines to visible logs — they're high-frequency noise
          } catch {
            // ignore parse error
          }
        } else {
          const type: LogEntry['type'] = trimmed.includes('complete') ? 'success' : 'info';
          this.addLog(trimmed, type);
        }
      }
    });

    this.process.stderr?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) this.addLog(msg, 'error');
    });

    this.process.on("close", (code) => {
      this.addLog(
        `Mass DM process exited with code ${code}`,
        code === 0 || code === null ? 'success' : 'error'
      );
      this.process = null;
    });

    this.process.on("error", (err) => {
      this.addLog(`Failed to start mass DM process: ${err.message}`, 'error');
      this.process = null;
    });

    return true;
  }

  stopMassDm() {
    if (this.process) {
      this.addLog("Stopping mass DM campaign...", 'info');
      this.process.kill();
      this.process = null;
    }
  }
}

export const botManager = new BotManager();
