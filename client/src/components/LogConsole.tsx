import { useBotLogs } from "@/hooks/use-bot-config";
import { Terminal, RefreshCw, AlertCircle, CheckCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LogConsole() {
  const { data: logs, isLoading, error } = useBotLogs();

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 flex flex-col h-[500px]"
    >
      <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <Terminal className="w-5 h-5 text-primary" />
          Live Logs
        </h2>
        {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs md:text-sm custom-scrollbar bg-black/20 m-2 rounded-lg">
        {error ? (
          <div className="text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Failed to load logs
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="text-muted-foreground italic text-center mt-10">No logs available yet...</div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log, idx) => (
              <motion.div 
                key={`${log.timestamp}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 p-2 rounded hover:bg-white/5 transition-colors"
              >
                <span className="text-muted-foreground whitespace-nowrap opacity-60">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                
                <span className="flex items-center gap-2 flex-1 break-words">
                  {log.type === 'error' && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
                  {log.type === 'success' && <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                  {log.type === 'info' && <Info className="w-3 h-3 text-blue-400 shrink-0" />}
                  
                  <span className={`
                    ${log.type === 'error' ? 'text-red-400' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'info' ? 'text-gray-300' : ''}
                  `}>
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
