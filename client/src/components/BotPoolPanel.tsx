
import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Plus, Trash2, RefreshCw, Key, Hash, User } from "lucide-react";
import { useBots, useAddBot, useRemoveBot, useResetBots } from "@/hooks/use-campaign";
import { Button } from "@/components/ui/button";
import { Input } from "./Input";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500/20 text-green-400",
  working:   "bg-violet-500/20 text-violet-400",
  exhausted: "bg-zinc-600/40 text-zinc-400",
};

export function BotPoolPanel() {
  const { data: bots = [], isLoading } = useBots();
  const { mutate: addBot, isPending: isAdding } = useAddBot();
  const { mutate: removeBot } = useRemoveBot();
  const { mutate: resetBots, isPending: isResetting } = useResetBots();

  const [form, setForm] = useState({ name: "", token: "", clientId: "" });

  const handleAdd = () => {
    if (!form.token.trim() || !form.clientId.trim()) return;
    addBot({ token: form.token.trim(), clientId: form.clientId.trim(), name: form.name.trim() || undefined });
    setForm({ name: "", token: "", clientId: "" });
  };

  const available  = bots.filter(b => b.status === "available").length;
  const exhausted  = bots.filter(b => b.status === "exhausted").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-card rounded-xl border border-white/5 shadow-xl flex flex-col"
    >
      <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Bot className="w-4 h-4 text-violet-400" /> Bot Pool
          <span className="ml-1 text-xs text-zinc-500">({bots.length} total · {available} available · {exhausted} exhausted)</span>
        </h3>
        <button
          data-testid="button-reset-bots"
          onClick={() => resetBots()}
          disabled={isResetting}
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
          Reset All
        </button>
      </div>

      {/* Bot list */}
      <div className="max-h-48 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-zinc-600 text-xs">Loading...</div>
        ) : bots.length === 0 ? (
          <div className="p-4 text-center text-zinc-600 text-xs italic">No bots in pool yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-2 text-left text-zinc-500 font-semibold uppercase tracking-wider">#</th>
                <th className="px-4 py-2 text-left text-zinc-500 font-semibold uppercase tracking-wider">Name / Client ID</th>
                <th className="px-4 py-2 text-left text-zinc-500 font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {bots.map((bot, i) => (
                <tr key={bot.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-zinc-600">{i + 1}</td>
                  <td className="px-4 py-2">
                    <div className="text-zinc-300">{bot.name || "—"}</div>
                    <div className="text-zinc-600 font-mono">{bot.clientId}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_COLORS[bot.status] ?? "bg-zinc-700 text-zinc-400"}`}>
                      {bot.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      data-testid={`button-remove-bot-${bot.id}`}
                      onClick={() => removeBot(bot.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add bot form */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Bot
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <Input
              data-testid="input-bot-name"
              placeholder="Name (optional)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="relative">
            <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <Input
              data-testid="input-bot-client-id"
              placeholder="Client / App ID"
              value={form.clientId}
              onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
              className="pl-8 h-8 text-xs font-mono"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
            <Input
              data-testid="input-bot-token"
              type="password"
              placeholder="Bot Token"
              value={form.token}
              onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button
            data-testid="button-add-bot"
            onClick={handleAdd}
            disabled={isAdding || !form.token.trim() || !form.clientId.trim()}
            className="h-8 px-3 bg-violet-600 hover:bg-violet-500 text-white text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
