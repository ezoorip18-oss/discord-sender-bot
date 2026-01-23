import { useBotConfig } from "@/hooks/use-bot-config";
import { ConfigForm } from "@/components/ConfigForm";
import { StatusCard } from "@/components/StatusCard";
import { LogConsole } from "@/components/LogConsole";
import { Ghost, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { data: config, isLoading, isError } = useBotConfig();

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
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Config */}
          <div className="lg:col-span-5 h-full">
            <ConfigForm config={config} />
          </div>

          {/* Right Column: Status & Logs */}
          <div className="lg:col-span-7 space-y-8 flex flex-col h-full">
            <StatusCard config={config} />
            <LogConsole />
          </div>

        </div>
      </div>
    </div>
  );
}
