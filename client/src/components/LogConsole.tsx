
import { Terminal, RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLogs } from "@/hooks/use-campaign";

export function LogConsole() {
  const { data: logs, isLoading } = useLogs();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 flex flex-col h-[320px]"
    >
      <div className="p-3.5 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2 text-foreground">
          <Terminal className="w-4 h-4 text-primary" /> Live Logs
        </h2>
        {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] bg-black/20 m-2 rounded-lg custom-scrollbar">
        {!logs || logs.length === 0 ? (
          <div className="text-muted-foreground italic text-center mt-8">No logs yet...</div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, idx) => (
              <motion.div
                key={`${log.timestamp}-${idx}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 p-1.5 rounded hover:bg-white/5 transition-colors"
              >
                <span className="text-zinc-600 whitespace-nowrap shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="flex items-center gap-1.5 flex-1 break-all">
                  {log.type === "error"   && <AlertCircle  className="w-3 h-3 text-red-500 shrink-0" />}
                  {log.type === "success" && <CheckCircle  className="w-3 h-3 text-green-500 shrink-0" />}
                  {log.type === "info"    && <Info         className="w-3 h-3 text-blue-400 shrink-0" />}
                  <span className={
                    log.type === "error"   ? "text-red-400" :
                    log.type === "success" ? "text-green-400" :
                    "text-zinc-300"
                  }>
                    {log.message}
                  </span>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
