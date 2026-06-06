
import { Ghost, Loader2 } from "lucide-react";
import { MassDmPanel } from "@/components/MassDmPanel";
import { CampaignResults } from "@/components/CampaignResults";
import { LogConsole } from "@/components/LogConsole";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex items-center gap-4 pb-6 border-b border-white/5">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Ghost className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spectre</h1>
            <p className="text-muted-foreground text-sm">Mass DM Control Panel</p>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Campaign Form */}
          <div className="lg:col-span-5">
            <MassDmPanel />
          </div>

          {/* Right: Results + Logs */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <CampaignResults />
            <LogConsole />
          </div>

        </div>
      </div>
    </div>
  );
}
