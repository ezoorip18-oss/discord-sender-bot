import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBotConfigSchema, type InsertBotConfig, type BotConfig } from "@shared/schema";
import { useUpdateBotConfig } from "@/hooks/use-bot-config";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion } from "framer-motion";
import { Settings, Save, Hash, Key, MessageSquare, Clock } from "lucide-react";

interface ConfigFormProps {
  config: BotConfig | null | undefined;
}

export function ConfigForm({ config }: ConfigFormProps) {
  const { mutate: updateConfig, isPending } = useUpdateBotConfig();
  
  const form = useForm<InsertBotConfig>({
    resolver: zodResolver(insertBotConfigSchema),
    defaultValues: {
      token: "",
      channelId: "",
      message: "",
      cooldown: 60,
      isRunning: false,
    },
  });

  // Load existing config into form when fetched
  useEffect(() => {
    if (config) {
      form.reset({
        token: config.token,
        channelId: config.channelId,
        message: config.message,
        cooldown: config.cooldown,
        isRunning: config.isRunning,
      });
    }
  }, [config, form]);

  const onSubmit = (data: InsertBotConfig) => {
    updateConfig(data);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card rounded-xl shadow-xl border border-white/5 h-full flex flex-col"
    >
      <div className="p-6 border-b border-white/5 bg-black/10">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Settings className="w-5 h-5 text-primary" />
          Configuration
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your selfbot parameters. Tokens are encrypted.
        </p>
      </div>

      <div className="p-6 flex-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300">
                    <Key className="w-4 h-4 text-primary" /> Discord Token
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="MTAw..." {...field} />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Your user account token. Never share this with anyone.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="channelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300">
                    <Hash className="w-4 h-4 text-primary" /> Channel ID
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012345678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cooldown"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-primary" /> Interval (min)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-gray-300">
                    <MessageSquare className="w-4 h-4 text-primary" /> Message Content
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Type your message here..." 
                      className="font-mono text-sm"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={isPending}
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                <Save className="w-4 h-4 mr-2" />
                {isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
