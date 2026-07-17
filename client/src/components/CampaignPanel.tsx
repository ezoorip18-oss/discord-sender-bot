
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Server, Users, Timer, Play, Square, ShieldOff } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "./Input";
import { EmbedBuilder } from "./EmbedBuilder";
import { useActiveCampaign, useStartCampaign, useStopCampaign } from "@/hooks/use-campaign";

const schema = z.object({
  serverInput: z.string().min(1, "Server ID or invite link required"),
  dmMessage:   z.string().min(2, "Message required"),
  botQuota:    z.number().int().min(1).max(10000),
  delay:       z.number().int().min(1).max(60),
  skipInvite:  z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export function CampaignPanel() {
  const { data: campaign } = useActiveCampaign();
  const { mutate: start, isPending: isStarting } = useStartCampaign();
  const { mutate: stop,  isPending: isStopping  } = useStopCampaign();

  const isActive = campaign && ["initializing", "running"].includes(campaign.status);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { serverInput: "", dmMessage: "{}", botQuota: 500, delay: 3, skipInvite: false },
  });

  const onSubmit = (data: FormValues) => {
    start({ serverInput: data.serverInput, dmMessage: data.dmMessage, botQuota: data.botQuota, delay: data.delay, skipInvite: data.skipInvite });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-card rounded-xl border border-white/5 shadow-xl flex flex-col"
    >
      <div className="p-4 border-b border-white/5 bg-black/10 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-violet-400" /> Campaign Config
        </h3>
        {campaign && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
            campaign.status === "running"      ? "bg-green-500/20 text-green-400" :
            campaign.status === "initializing" ? "bg-violet-500/20 text-violet-400" :
            campaign.status === "completed"    ? "bg-blue-500/20 text-blue-400" :
            campaign.status === "paused"       ? "bg-yellow-500/20 text-yellow-400" :
            "bg-zinc-700/50 text-zinc-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${
              campaign.status === "running"      ? "bg-green-400 animate-pulse" :
              campaign.status === "initializing" ? "bg-violet-400 animate-pulse" :
              "bg-current"
            }`} />
            {campaign.status}
          </span>
        )}
      </div>

      <div className="p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Server + rotation settings */}
            <FormField control={form.control} name="serverInput" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs text-zinc-300">
                  <Server className="w-3.5 h-3.5 text-violet-400" /> Server ID or Invite Link
                </FormLabel>
                <FormControl>
                  <Input data-testid="input-server" placeholder="123456789 or discord.gg/invite" {...field} className="h-9 text-sm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="botQuota" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Users className="w-3.5 h-3.5 text-violet-400" /> DMs per Bot
                  </FormLabel>
                  <FormControl>
                    <Input data-testid="input-quota" type="number" min={1} max={10000}
                      {...field} onChange={e => field.onChange(parseInt(e.target.value))}
                      className="h-9 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="delay" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <Timer className="w-3.5 h-3.5 text-violet-400" /> Delay (sec)
                  </FormLabel>
                  <FormControl>
                    <Input data-testid="input-delay" type="number" min={1} max={60}
                      {...field} onChange={e => field.onChange(parseInt(e.target.value))}
                      className="h-9 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Skip invite toggle */}
            <FormField control={form.control} name="skipInvite" render={({ field }) => (
              <FormItem>
                <label data-testid="toggle-skip-invite"
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    field.value
                      ? "border-violet-500/40 bg-violet-500/10"
                      : "border-white/5 bg-zinc-900/40 hover:border-white/10"
                  }`}>
                  <input type="checkbox" checked={field.value} onChange={field.onChange}
                    className="accent-violet-600 mt-0.5 w-3.5 h-3.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                      <ShieldOff className="w-3.5 h-3.5 text-violet-400" />
                      Bots already in server (skip auto-invite)
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      Use this if Discord's hCaptcha blocks the invite step. Manually add all bots to the server first, then enable this.
                    </div>
                  </div>
                </label>
              </FormItem>
            )} />

            {/* Embed builder — replaces plain message textarea */}
            <FormField control={form.control} name="dmMessage" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 text-xs text-zinc-300 mb-2">
                  <Mail className="w-3.5 h-3.5 text-violet-400" /> Message Builder
                </FormLabel>
                <FormControl>
                  <EmbedBuilder value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Launch / Stop */}
            <div className="pt-1 pb-2">
              {isActive ? (
                <Button type="button" data-testid="button-stop"
                  onClick={() => stop()} disabled={isStopping}
                  className="w-full h-10 text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-none">
                  <Square className="w-4 h-4 mr-2 fill-current" />
                  {isStopping ? "Stopping..." : "Stop Campaign"}
                </Button>
              ) : (
                <Button type="submit" data-testid="button-start"
                  disabled={isStarting}
                  className="w-full h-10 text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30">
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
