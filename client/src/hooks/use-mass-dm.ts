
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const MASS_DM_STATUS_KEY = [api.massDm.status.path];

export function useMassDmStatus() {
  return useQuery({
    queryKey: MASS_DM_STATUS_KEY,
    queryFn: async () => {
      const res = await fetch(api.massDm.status.path);
      if (!res.ok) throw new Error("Failed to fetch mass DM status");
      return (await res.json()) as { isRunning: boolean };
    },
    refetchInterval: 3000,
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
        throw new Error(err.message || "Failed to start mass DM campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASS_DM_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      toast({
        title: "Campaign Started",
        description: "Mass DM campaign is now running. Watch the logs for progress.",
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
      if (!res.ok) throw new Error("Failed to stop mass DM campaign");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MASS_DM_STATUS_KEY });
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      toast({
        title: "Campaign Stopped",
        description: "The mass DM campaign has been terminated.",
        className: "bg-zinc-700 text-white border-none",
      });
    },
  });
}
