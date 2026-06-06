
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Server, MessageSquare, Timer, Play, Square, Zap } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { useMassDmStatus, useStartMassDm, useStopMassDm } from "@/hooks/use-mass-dm";

const GIVEAWAY_TEMPLATES = [
  {
    label: "🎮 Nitro Giveaway",
    value: "🎉 **CONGRATULATIONS!** You have been selected for a **FREE DISCORD NITRO** giveaway!\n\nJoin below to claim your prize before it expires:\nhttps://discord.gg/giveaway\n\n⏰ Expires in 24 hours. Don't miss out!",
  },
  {
    label: "🟩 Robux Giveaway",
    value: "🎊 **YOU WON!** A **FREE ROBUX GIVEAWAY** has been sent to your account!\n\nClaim your Robux here:\nhttps://discord.gg/giveaway\n\n💰 Amount: 10,000 Robux — Claim NOW before it expires!",
  },
  {
    label: "🎨 Discord Decor Giveaway",
    value: "✨ **SPECIAL OFFER!** You've been selected to receive a **FREE DISCORD PROFILE DECORATION**!\n\nJoin the server to claim your Decor:\nhttps://discord.gg/giveaway\n\n🏆 Limited time only — claim within 24 hours!",
  },
];

const massDmSchema = z.object({
  serverId: z.string().min(1, "Server ID or invite link is required"),
  message: z.string().min(1, "Message is required"),
  delay: z.number().min(1, "Delay must be at least 1 second").max(60, "Delay cannot exceed 60 seconds"),
});

type MassDmForm = z.infer<typeof massDmSchema>;

export function MassDmPanel() {
  const { data: status } = useMassDmStatus();
  const { mutate: startCampaign, isPending: isStarting } = useStartMassDm();
  const { mutate: stopCampaign, isPending: isStopping } = useStopMassDm();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const isRunning = status?.isRunning ?? false;

  const form = useForm<MassDmForm>({
    resolver: zodResolver(massDmSchema),
    defaultValues: {
      serverId: "",
      message: "",
      delay: 3,
    },
  });

  const applyTemplate = (value: string, label: string) => {
    form.setValue("message", value, { shouldValidate: true });
    setSelectedTemplate(label);
  };

  const onSubmit = (data: MassDmForm) => {
    // Extract server ID from invite links
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 flex flex-col"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Mail className="w-5 h-5 text-violet-400" />
            Mass DM Campaign
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            DM all members in a server with a giveaway message.
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isRunning ? 'bg-violet-500/20 text-violet-400' : 'bg-zinc-700/50 text-zinc-400'}`}>
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-violet-400 animate-pulse' : 'bg-zinc-500'}`} />
          {isRunning ? "Running" : "Idle"}
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Templates */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-400" /> Quick Templates
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            <FormField
              control={form.control}
              name="serverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300">
                    <Server className="w-4 h-4 text-violet-400" /> Server ID or Invite Link
                  </FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-server-id"
                      placeholder="123456789012345678 or discord.gg/example"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Paste the server ID or a discord.gg invite link.
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
                  <FormLabel className="flex items-center gap-2 text-gray-300">
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
                    Recommended: 3–10s to avoid rate limits.
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
                  <FormLabel className="flex items-center gap-2 text-gray-300">
                    <MessageSquare className="w-4 h-4 text-violet-400" /> DM Message
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-dm-message"
                      placeholder="Select a template above or write your own giveaway message..."
                      className="font-mono text-sm min-h-[140px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              {isRunning ? (
                <Button
                  type="button"
                  data-testid="button-stop-campaign"
                  onClick={() => stopCampaign()}
                  disabled={isStopping}
                  className="flex-1 h-12 text-base font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-none transition-all active:scale-[0.98]"
                >
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  {isStopping ? "Stopping..." : "Stop Campaign"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  data-testid="button-start-campaign"
                  disabled={isStarting}
                  className="flex-1 h-12 text-base font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 transition-all active:scale-[0.98]"
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
