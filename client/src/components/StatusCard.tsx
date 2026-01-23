import { BotConfig } from "@shared/schema";
import { useToggleBot } from "@/hooks/use-bot-config";
import { motion } from "framer-motion";
import { Power, Activity, Clock } from "lucide-react";

interface StatusCardProps {
  config: BotConfig | null | undefined;
}

export function StatusCard({ config }: StatusCardProps) {
  const { mutate: toggleBot, isPending } = useToggleBot();
  const isRunning = config?.isRunning ?? false;

  const handleToggle = () => {
    // Only allow starting if we have a config
    if (!config && !isRunning) return; 
    toggleBot(!isRunning);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-6 shadow-xl border border-white/5 relative overflow-hidden"
    >
      {/* Background Pulse Effect when running */}
      {isRunning && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse" />
      )}

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Activity className="w-5 h-5 text-primary" />
          Bot Status
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isRunning ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {isRunning ? "Online" : "Offline"}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>Last Run: {config?.lastRun || "Never"}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {isRunning 
              ? `Active in channel: ${config?.channelId || '...'}`
              : "Bot is currently stopped."
            }
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isPending || (!config && !isRunning)}
          className={`
            w-full md:w-auto px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2
            transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            ${isRunning 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' 
              : 'bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-900/20'
            }
          `}
        >
          <Power className="w-4 h-4" />
          {isPending ? "Processing..." : (isRunning ? "Stop Bot" : "Start Bot")}
        </button>
      </div>
    </motion.div>
  );
}
