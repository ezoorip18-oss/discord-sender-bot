import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertBotConfig, type BotConfig } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Fetch Configuration
export function useBotConfig() {
  return useQuery({
    queryKey: [api.config.get.path],
    queryFn: async () => {
      const res = await fetch(api.config.get.path);
      if (res.status === 404) return null; // Handle case where no config exists yet
      if (!res.ok) throw new Error("Failed to fetch configuration");
      return api.config.get.responses[200].parse(await res.json());
    },
  });
}

// Update Configuration
export function useUpdateBotConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertBotConfig) => {
      const res = await fetch(api.config.update.path, {
        method: api.config.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update configuration");
      }
      return api.config.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.config.get.path] });
      toast({
        title: "Configuration Saved",
        description: "Your bot settings have been updated successfully.",
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Toggle Bot Status
export function useToggleBot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (isRunning: boolean) => {
      const res = await fetch(api.config.toggle.path, {
        method: api.config.toggle.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRunning }),
      });

      if (!res.ok) throw new Error("Failed to toggle bot status");
      return api.config.toggle.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.config.get.path] });
      // Invalidate logs so we see the startup/shutdown message immediately
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      
      toast({
        title: data.isRunning ? "Bot Started" : "Bot Stopped",
        description: `The selfbot is now ${data.isRunning ? "active" : "inactive"}.`,
        className: data.isRunning ? "bg-green-600 text-white border-none" : "bg-zinc-700 text-white border-none",
      });
    },
  });
}

// Fetch Logs
export function useBotLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });
}
