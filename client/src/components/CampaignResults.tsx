
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { useMassDmStats, useMassDmStatus } from "@/hooks/use-mass-dm";

function StatCell({
  value,
  color,
}: {
  value: number;
  color: "green" | "red" | "muted" | "white";
}) {
  const colorMap = {
    green: "text-green-400",
    red: "text-red-400",
    muted: "text-zinc-400",
    white: "text-white font-bold",
  };
  return (
    <td className={`px-6 py-4 text-right font-mono text-sm tabular-nums ${colorMap[color]}`}>
      {value.toLocaleString()}
    </td>
  );
}

export function CampaignResults() {
  const { data: stats } = useMassDmStats();
  const { data: status } = useMassDmStatus();
  const isRunning = status?.isRunning ?? false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          Campaign Results
        </h2>
        <div className="flex items-center gap-2">
          {stats?.complete && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </span>
          )}
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </div>

      {/* Subtitle row like the screenshot */}
      <div className="px-5 pt-4 pb-1">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">Destination Server</p>
        <p className="text-xs text-zinc-600 mt-0.5">Server from invite (where members were DM'd)</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-widest text-zinc-500">
                Server
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">
                Sent
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">
                Errors
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">
                Skipped
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-widest text-zinc-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {stats ? (
                <motion.tr
                  key="stats-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Server name + ID */}
                  <td className="px-5 py-4">
                    <div className="font-semibold text-foreground truncate max-w-[200px]" data-testid="text-guild-name">
                      {stats.guildName}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5" data-testid="text-guild-id">
                      {stats.guildId}
                    </div>
                  </td>
                  <StatCell value={stats.sent} color="green" />
                  <StatCell value={stats.failed} color="red" />
                  <StatCell value={stats.skipped} color="muted" />
                  <StatCell value={stats.total} color="white" />
                </motion.tr>
              ) : (
                <motion.tr
                  key="empty-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-600 text-sm italic">
                    No campaign data yet. Launch a campaign to see live stats.
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Summary bar when data exists */}
      {stats && (
        <div className="px-5 py-3 bg-black/20 border-t border-white/5 flex items-center gap-6 text-xs text-zinc-500 font-mono">
          <span>
            <span className="text-green-400 font-bold">{stats.sent.toLocaleString()}</span> sent
          </span>
          <span>
            <span className="text-red-400 font-bold">{stats.failed.toLocaleString()}</span> failed
          </span>
          <span>
            <span className="text-zinc-400 font-bold">{stats.skipped.toLocaleString()}</span> skipped
          </span>
          <span className="ml-auto">
            <span className="text-white font-bold">{stats.total.toLocaleString()}</span> total processed
          </span>
        </div>
      )}
    </motion.div>
  );
}
