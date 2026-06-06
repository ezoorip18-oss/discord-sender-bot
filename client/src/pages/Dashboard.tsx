import { useState } from "react";
import { useBotConfig } from "@/hooks/use-bot-config";
import { ConfigForm } from "@/components/ConfigForm";
import { StatusCard } from "@/components/StatusCard";
import { LogConsole } from "@/components/LogConsole";
import { MassDmPanel } from "@/components/MassDmPanel";
import { Ghost, Loader2, Settings, Mail } from "lucide-react";

type Tab = "autosend" | "massdm";

export default function Dashboard() {
  const { data: config, isLoading, isError } = useBotConfig();
  const [activeTab, setActiveTab] = useState<Tab>("autosend");

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground font-medium">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Ghost className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-red-400 font-medium">Failed to load configuration.</p>
          <button
            onClick={() => window.location.reload()}
            className="text-primary hover:underline"
          >
            Try Refreshing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Ghost className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spectre</h1>
              <p className="text-muted-foreground">Selfbot Control Panel</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-black/30 border border-white/5 rounded-xl p-1 gap-1">
            <button
              data-testid="tab-autosend"
              onClick={() => setActiveTab("autosend")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "autosend"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="w-4 h-4" />
              Auto Send
            </button>
            <button
              data-testid="tab-massdm"
              onClick={() => setActiveTab("massdm")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === "massdm"
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="w-4 h-4" />
              Mass DM
            </button>
          </div>
        </header>

        {/* Auto Send Tab */}
        {activeTab === "autosend" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Config */}
            <div className="lg:col-span-5 h-full">
              <ConfigForm config={config} />
            </div>
            {/* Right: Status + Logs */}
            <div className="lg:col-span-7 space-y-8 flex flex-col h-full">
              <StatusCard config={config} />
              <LogConsole />
            </div>
          </div>
        )}

        {/* Mass DM Tab */}
        {activeTab === "massdm" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Mass DM Panel */}
            <div className="lg:col-span-5 h-full">
              <MassDmPanel />
            </div>
            {/* Right: Logs */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <LogConsole />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
