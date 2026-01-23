
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

class BotManager {
  private process: ChildProcess | null = null;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 100;

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

  isRunning() {
    return this.process !== null && this.process.exitCode === null;
  }

  start(token: string, channelId: string, message: string, cooldownMinutes: number) {
    if (this.isRunning()) {
      this.addLog("Attempted to start bot while already running", 'error');
      return;
    }

    this.addLog("Starting bot process...", 'info');
    
    // Path to bot.py - assuming it's in the project root or server dir
    // We'll place bot.py in the root for simplicity
    const botPath = path.resolve(process.cwd(), "bot.py");
    
    // We use 'python3' assuming it's available in the environment
    this.process = spawn("python3", [
      botPath,
      "--token", token,
      "--channel", channelId,
      "--message", message,
      "--interval", String(cooldownMinutes * 60) // Convert to seconds
    ]);

    this.process.stdout?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) this.addLog(msg, 'info');
    });

    this.process.stderr?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) this.addLog(msg, 'error');
    });

    this.process.on("close", (code) => {
      this.addLog(`Bot process exited with code ${code}`, code === 0 || code === null ? 'info' : 'error');
      this.process = null;
    });

    this.process.on("error", (err) => {
      this.addLog(`Failed to start bot process: ${err.message}`, 'error');
      this.process = null;
    });
  }

  stop() {
    if (this.process) {
      this.addLog("Stopping bot process...", 'info');
      this.process.kill();
      this.process = null;
    } else {
      this.addLog("Attempted to stop bot but it is not running", 'info');
    }
  }
}

export const botManager = new BotManager();
