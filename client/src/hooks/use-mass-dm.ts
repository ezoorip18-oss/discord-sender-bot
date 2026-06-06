
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useMassDmStatus() {
  return useQuery({
    queryKey: [api.massDm.status.path],
    queryFn: async () => {
      const res = await fetch(api.massDm.status.path);
      if (!res.ok) throw new Error("Failed to fetch status");
      return (await res.json()) as { isRunning: boolean };
    },
    refetchInterval: 2000,
  });
}

export function useMassDmStats() {
  return useQuery({
    queryKey: [api.massDm.stats.path],
    queryFn: async () => {
      const res = await fetch(api.massDm.stats.path);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return data as {
        guildName: string;
        guildId: string;
        sent: number;
        failed: number;
        skipped: number;
        total: number;
        complete: boolean;
      } | null;
    },
    refetchInterval: 1500,
  });
}

export function useStartMassDm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { serverId: string; message: string; delay: number }) => {
      const res = await fetch(api.massDm.start.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to start campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.massDm.status.path] });
      queryClient.invalidateQueries({ queryKey: [api.massDm.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      toast({
        title: "Campaign Started",
        description: "Mass DM campaign is running. Watch the stats update live.",
        className: "bg-violet-600 text-white border-none",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Campaign Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useStopMassDm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.massDm.stop.path, { method: "POST" });
      if (!res.ok) throw new Error("Failed to stop campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.massDm.status.path] });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      toast({
        title: "Campaign Stopped",
        description: "The mass DM campaign has been terminated.",
        className: "bg-zinc-700 text-white border-none",
      });
    },
  });
}

export function useSaveToken() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch(api.token.save.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save token");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Token Saved",
        description: "Your Discord token has been saved.",
        className: "bg-green-600 text-white border-none",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useGetToken() {
  return useQuery({
    queryKey: [api.token.get.path],
    queryFn: async () => {
      const res = await fetch(api.token.get.path);
      if (!res.ok) return { token: "" };
      return (await res.json()) as { token: string };
    },
  });
}
