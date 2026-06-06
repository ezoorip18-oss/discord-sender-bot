
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Mail, Server, MessageSquare, Timer, Play, Square, Zap,
  Key, Save,
} from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import {
  useMassDmStatus,
  useStartMassDm,
  useStopMassDm,
  useSaveToken,
  useGetToken,
} from "@/hooks/use-mass-dm";

const GIVEAWAY_TEMPLATES = [
  {
    label: "🎮 Nitro",
    value: "🎉 **CONGRATULATIONS!** You have been selected for a **FREE DISCORD NITRO** giveaway!\n\nJoin below to claim your prize before it expires:\nhttps://discord.gg/giveaway\n\n⏰ Expires in 24 hours. Don't miss out!",
  },
  {
    label: "🟩 Robux",
    value: "🎊 **YOU WON!** A **FREE ROBUX GIVEAWAY** has been sent to your account!\n\nClaim your Robux here:\nhttps://discord.gg/giveaway\n\n💰 Amount: 10,000 Robux — Claim NOW before it expires!",
  },
  {
    label: "🎨 Decor",
    value: "✨ **SPECIAL OFFER!** You've been selected to receive a **FREE DISCORD PROFILE DECORATION**!\n\nJoin the server to claim your Decor:\nhttps://discord.gg/giveaway\n\n🏆 Limited time only — claim within 24 hours!",
  },
];

const massDmSchema = z.object({
  serverId: z.string().min(1, "Server ID or invite link is required"),
  message: z.string().min(1, "Message is required"),
  delay: z.number().min(1, "Min 1 second").max(60, "Max 60 seconds"),
});

type MassDmForm = z.infer<typeof massDmSchema>;

export function MassDmPanel() {
  const { data: status } = useMassDmStatus();
  const { data: tokenData } = useGetToken();
  const { mutate: startCampaign, isPending: isStarting } = useStartMassDm();
  const { mutate: stopCampaign, isPending: isStopping } = useStopMassDm();
  const { mutate: saveToken, isPending: isSavingToken } = useSaveToken();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  const isRunning = status?.isRunning ?? false;
  const savedToken = tokenData?.token ?? "";

  const form = useForm<MassDmForm>({
    resolver: zodResolver(massDmSchema),
    defaultValues: { serverId: "", message: "", delay: 3 },
  });

  const applyTemplate = (value: string, label: string) => {
    form.setValue("message", value, { shouldValidate: true });
    setSelectedTemplate(label);
  };

  const onSubmit = (data: MassDmForm) => {
    let serverId = data.serverId.trim();
    if (serverId.includes("discord.gg/")) {
      serverId = serverId.split("discord.gg/")[1].split("/")[0];
    } else if (serverId.includes("discord.com/invite/")) {
      serverId = serverId.split("discord.com/invite/")[1].split("/")[0];
    }
    startCampaign({ serverId, message: data.message, delay: data.delay });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 flex flex-col"
    >
      {/* Header */}
      <div className="p-5 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Mail className="w-5 h-5 text-violet-400" />
            Mass DM Campaign
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            DM all members in a server with a giveaway message.
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isRunning ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-700/50 text-zinc-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-violet-400 animate-pulse' : 'bg-zinc-500'}`} />
          {isRunning ? "Running" : "Idle"}
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Token Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4 text-violet-400" /> Discord Token
          </label>
          <div className="flex gap-2">
            <Input
              data-testid="input-token"
              type="password"
              placeholder={savedToken ? "••••••••••••• (saved)" : "MTAw..."}
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              className="flex-1"
            />
            <Button
              data-testid="button-save-token"
              type="button"
              onClick={() => { if (tokenInput.trim()) saveToken(tokenInput.trim()); }}
              disabled={isSavingToken || !tokenInput.trim()}
              className="shrink-0 bg-zinc-700 hover:bg-zinc-600 text-white border-none h-10 px-3"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
          {savedToken && (
            <p className="text-xs text-green-500/80">✓ Token saved</p>
          )}
        </div>

        <div className="border-t border-white/5" />

        {/* Templates */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-violet-400" /> Quick Templates
          </p>
          <div className="flex flex-wrap gap-2">
            {GIVEAWAY_TEMPLATES.map((t) => (
              <button
                key={t.label}
                data-testid={`template-${t.label}`}
                onClick={() => applyTemplate(t.value, t.label)}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${selectedTemplate === t.label
                    ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-gray-200'
                  }
                `}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            <FormField
              control={form.control}
              name="serverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300 text-sm">
                    <Server className="w-4 h-4 text-violet-400" /> Server ID or Invite Link
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-server-id"
                      placeholder="123456789012345678  or  discord.gg/example"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Paste a Server ID or a discord.gg invite URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="delay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300 text-sm">
                    <Timer className="w-4 h-4 text-violet-400" /> Delay Between DMs (seconds)
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-dm-delay"
                      type="number"
                      min={1}
                      max={60}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Recommended 3–10s to avoid rate limits.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300 text-sm">
                    <MessageSquare className="w-4 h-4 text-violet-400" /> DM Message
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-dm-message"
                      placeholder="Select a template above or write your own giveaway message..."
                      className="font-mono text-sm min-h-[130px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-1">
              {isRunning ? (
                <Button
                  type="button"
                  data-testid="button-stop-campaign"
                  onClick={() => stopCampaign()}
                  disabled={isStopping}
                  className="w-full h-11 text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-none transition-all active:scale-[0.98]"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  {isStopping ? "Stopping..." : "Stop Campaign"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  data-testid="button-start-campaign"
                  disabled={isStarting}
                  className="w-full h-11 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 transition-all active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  {isStarting ? "Launching..." : "Launch Campaign"}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
