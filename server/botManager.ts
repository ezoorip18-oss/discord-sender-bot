
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
  private massDmProcess: ChildProcess | null = null;
  private logs: LogEntry[] = [];
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

  isRunning() {
    return this.process !== null && this.process.exitCode === null;
  }

  isMassDmRunning() {
    return this.massDmProcess !== null && this.massDmProcess.exitCode === null;
  }

  start(token: string, channelId: string, message: string, cooldownMinutes: number) {
    if (this.isRunning()) {
      this.addLog("Attempted to start bot while already running", 'error');
      return;
    }

    this.addLog("Starting auto-send bot process...", 'info');

    const botPath = path.resolve(process.cwd(), "bot.py");

    this.process = spawn("python3", [
      botPath,
      "--token", token,
      "--mode", "auto_send",
      "--channel", channelId,
      "--message", message,
      "--interval", String(cooldownMinutes * 60)
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
      this.addLog(`Auto-send process exited with code ${code}`, code === 0 || code === null ? 'info' : 'error');
      this.process = null;
    });

    this.process.on("error", (err) => {
      this.addLog(`Failed to start auto-send process: ${err.message}`, 'error');
      this.process = null;
    });
  }

  stop() {
    if (this.process) {
      this.addLog("Stopping auto-send bot process...", 'info');
      this.process.kill();
      this.process = null;
    } else {
      this.addLog("Attempted to stop bot but it is not running", 'info');
    }
  }

  startMassDm(token: string, serverId: string, dmMessage: string, delay: number) {
    if (this.isMassDmRunning()) {
      this.addLog("Mass DM campaign is already running", 'error');
      return false;
    }

    this.addLog(`Starting mass DM campaign to server ${serverId}...`, 'info');

    const botPath = path.resolve(process.cwd(), "bot.py");

    this.massDmProcess = spawn("python3", [
      botPath,
      "--token", token,
      "--mode", "mass_dm",
      "--server", serverId,
      "--dm-message", dmMessage,
      "--delay", String(delay)
    ]);

    this.massDmProcess.stdout?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) this.addLog(msg, 'info');
    });

    this.massDmProcess.stderr?.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg) this.addLog(msg, 'error');
    });

    this.massDmProcess.on("close", (code) => {
      this.addLog(
        `Mass DM process exited with code ${code}`,
        code === 0 || code === null ? 'success' : 'error'
      );
      this.massDmProcess = null;
    });

    this.massDmProcess.on("error", (err) => {
      this.addLog(`Failed to start mass DM process: ${err.message}`, 'error');
      this.massDmProcess = null;
    });

    return true;
  }

  stopMassDm() {
    if (this.massDmProcess) {
      this.addLog("Stopping mass DM campaign...", 'info');
      this.massDmProcess.kill();
      this.massDmProcess = null;
    }
  }
}

export const botManager = new BotManager();
