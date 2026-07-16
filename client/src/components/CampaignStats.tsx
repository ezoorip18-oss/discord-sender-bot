
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, CheckCircle2, Loader2 } from "lucide-react";
import { useActiveCampaign } from "@/hooks/use-campaign";

const RUN_STATUS_COLORS: Record<string, string> = {
  completed: "text-green-400",
  running:   "text-violet-400",
  pending:   "text-zinc-500",
  stopped:   "text-red-400",
};

function Num({ v, color }: { v: number; color?: string }) {
  return (
    <td className={`px-5 py-3 text-right font-mono text-sm tabular-nums ${color ?? "text-zinc-300"}`}>
      {v.toLocaleString()}
    </td>
  );
}

export function CampaignStats() {
  const { data: campaign, isLoading } = useActiveCampaign();

  const isActive = campaign && ["initializing", "running"].includes(campaign.status);
  const stats  = campaign?.stats;
  const runs   = campaign?.runs ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border border-white/5 shadow-xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2 text-sm">
          <BarChart3 className="w-4 h-4 text-violet-400" /> Campaign Results
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {campaign?.status === "completed" && (
            <span className="flex items-center gap-1 text-green-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </span>
          )}
          {isActive && (
            <span className="flex items-center gap-1.5 text-violet-400 font-semibold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {campaign.status === "initializing" ? "Initializing..." : "Running"}
            </span>
          )}
          {campaign?.totalMembers ? (
            <span className="text-zinc-600">
              {campaign.totalMembers.toLocaleString()} total members
            </span>
          ) : null}
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-5 pt-3 pb-1">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Destination Server</p>
        <p className="text-[10px] text-zinc-700 mt-0.5">Server from invite (where members were DM'd)</p>
      </div>

      {/* Overall stats table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {["Server", "Sent", "Errors", "Skipped", "Total"].map(h => (
                <th key={h} className={`px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 ${h === "Server" ? "text-left" : "text-right"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="wait">
              {campaign ? (
                <motion.tr key="row" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <div className="font-semibold text-foreground truncate max-w-[160px]" data-testid="text-guild-name">
                      {campaign.guildName || campaign.guildId}
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono mt-0.5" data-testid="text-guild-id">
                      {campaign.guildId}
                    </div>
                  </td>
                  <Num v={stats?.sent ?? 0}     color="text-green-400" />
                  <Num v={stats?.failed ?? 0}   color="text-red-400" />
                  <Num v={stats?.skipped ?? 0}  color="text-zinc-500" />
                  <Num v={stats?.total ?? 0}    color="text-white font-bold" />
                </motion.tr>
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-zinc-600 text-xs italic">
                    {isLoading ? "Loading..." : "No campaign data yet. Launch a campaign to see live stats."}
                  </td>
                </tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Bot runs sub-table */}
      {runs.length > 0 && (
        <>
          <div className="px-5 pt-3 pb-1 border-t border-white/5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Bot Rotation Log</p>
          </div>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 sticky top-0 bg-card">
                  {["#", "Bot", "Sent", "Failed", "Skipped", "Status"].map(h => (
                    <th key={h} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600 ${h === "#" || h === "Bot" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run, i) => (
                  <tr key={run.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-zinc-600">{i + 1}</td>
                    <td className="px-4 py-2 text-zinc-300 truncate max-w-[120px]">{run.botName || `Bot #${i + 1}`}</td>
                    <td className="px-4 py-2 text-right text-green-400 tabular-nums">{run.sent.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-red-400   tabular-nums">{run.failed.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-zinc-500  tabular-nums">{run.skipped.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-semibold ${RUN_STATUS_COLORS[run.status] ?? "text-zinc-400"}`}>
                        {run.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Summary footer */}
      {stats && (
        <div className="px-5 py-2.5 bg-black/20 border-t border-white/5 flex flex-wrap gap-4 text-[11px] text-zinc-600 font-mono">
          <span><span className="text-green-400 font-bold">{(stats.sent ?? 0).toLocaleString()}</span> sent</span>
          <span><span className="text-red-400 font-bold">{(stats.failed ?? 0).toLocaleString()}</span> failed</span>
          <span><span className="text-zinc-400 font-bold">{(stats.skipped ?? 0).toLocaleString()}</span> skipped</span>
          <span><span className="text-yellow-500 font-bold">{(stats.pending ?? 0).toLocaleString()}</span> pending</span>
          <span className="ml-auto"><span className="text-white font-bold">{(stats.total ?? 0).toLocaleString()}</span> total</span>
        </div>
      )}
    </motion.div>
  );
}
