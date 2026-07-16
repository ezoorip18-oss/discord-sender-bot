
import { useState } from "react";
import { motion } from "framer-motion";
import { Ghost, Settings, Mail, Key, Save } from "lucide-react";
import { BotPoolPanel } from "@/components/BotPoolPanel";
import { CampaignPanel } from "@/components/CampaignPanel";
import { CampaignStats } from "@/components/CampaignStats";
import { LogConsole } from "@/components/LogConsole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/Input";
import { useSettings, useSaveSettings } from "@/hooks/use-campaign";

type Tab = "setup" | "campaign";

function SetupPanel() {
  const { data: s } = useSettings();
  const { mutate: save, isPending } = useSaveSettings();
  const [token, setToken] = useState("");
  const saved = !!s?.selfbotToken;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-card rounded-xl border border-white/5 shadow-xl"
    >
      <div className="p-4 border-b border-white/5 bg-black/10">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Settings className="w-4 h-4 text-violet-400" /> Selfbot Account
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">The user account already in the target server (used to invite bots + fetch the member list).</p>
      </div>
      <div className="p-4 space-y-2">
        <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-violet-400" /> User Account Token
        </label>
        <div className="flex gap-2">
          <Input
            data-testid="input-selfbot-token"
            type="password"
            placeholder={saved ? "••••••••• (saved)" : "User token..."}
            value={token}
            onChange={e => setToken(e.target.value)}
            className="flex-1 h-9 text-sm"
          />
          <Button
            data-testid="button-save-settings"
            onClick={() => { if (token.trim()) { save(token.trim()); setToken(""); } }}
            disabled={isPending || !token.trim()}
            className="h-9 px-3 bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
        </div>
        {saved && <p className="text-xs text-green-500/80">✓ Token saved</p>}
        <p className="text-xs text-zinc-600">This account must have <strong className="text-zinc-400">Manage Server</strong> permissions in the target server.</p>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Ghost className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Spectre</h1>
              <p className="text-xs text-muted-foreground">Discord Mass DM · Bot Rotation System</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-black/30 border border-white/5 rounded-xl p-1 gap-1">
            <button
              data-testid="tab-setup"
              onClick={() => setActiveTab("setup")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "setup"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4" /> Setup
            </button>
            <button
              data-testid="tab-campaign"
              onClick={() => setActiveTab("campaign")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "campaign"
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-4 h-4" /> Campaign
            </button>
          </div>
        </header>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Left panel */}
          <div className="lg:col-span-5 space-y-4">
            {activeTab === "setup" ? (
              <>
                <SetupPanel />
                <BotPoolPanel />
              </>
            ) : (
              <CampaignPanel />
            )}
          </div>

          {/* Right panel: always visible */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            <CampaignStats />
            <LogConsole />
          </div>

        </div>
      </div>
    </div>
  );
}
