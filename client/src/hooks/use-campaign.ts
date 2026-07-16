
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Q = {
  settings:  "/api/settings",
  bots:      "/api/bots",
  active:    "/api/campaign/active",
  logs:      "/api/logs",
  templates: "/api/templates",
};

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) {
    const e = await r.json().catch(() => ({ message: r.statusText }));
    throw new Error(e.message ?? "Request failed");
  }
  return r.json();
}

// ── Settings ──────────────────────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: [Q.settings],
    queryFn: () => api<{ selfbotToken: string }>(Q.settings),
  });
}
export function useSaveSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (selfbotToken: string) =>
      api("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ selfbotToken }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.settings] });
      toast({ title: "Saved", description: "Selfbot token updated.", className: "bg-green-600 text-white border-none" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

// ── Bot Pool ──────────────────────────────────────────────────────────────
export function useBots() {
  return useQuery({
    queryKey: [Q.bots],
    queryFn: () => api<Array<{ id: number; clientId: string; name: string; status: string }>>(Q.bots),
  });
}
export function useAddBot() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { token: string; clientId: string; name?: string }) =>
      api("/api/bots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.bots] });
      toast({ title: "Bot Added", className: "bg-green-600 text-white border-none" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
export function useRemoveBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/bots/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [Q.bots] }),
  });
}
export function useResetBots() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => api("/api/bots/reset", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.bots] });
      toast({ title: "Bots Reset", description: "All bot statuses set to available.", className: "bg-zinc-700 text-white border-none" });
    },
  });
}

// ── Campaign ──────────────────────────────────────────────────────────────
export interface ActiveCampaign {
  id: number;
  guildId: string;
  guildName: string;
  dmMessage: string;
  botQuota: number;
  delay: number;
  status: string;
  totalMembers: number;
  stats: { sent: number; failed: number; skipped: number; pending: number; in_progress: number; total: number };
  runs: Array<{ id: number; botName: string; sent: number; failed: number; skipped: number; status: string; startedAt?: string; completedAt?: string }>;
}

export function useActiveCampaign() {
  return useQuery({
    queryKey: [Q.active],
    queryFn: () => api<ActiveCampaign | null>(Q.active),
    refetchInterval: 2000,
  });
}
export function useStartCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { serverInput: string; dmMessage: string; botQuota: number; delay: number }) =>
      api<{ campaignId: number }>("/api/campaign/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.active] });
      qc.invalidateQueries({ queryKey: [Q.logs] });
      toast({ title: "Campaign Started", description: "Bot rotation is initializing.", className: "bg-violet-600 text-white border-none" });
    },
    onError: (e: Error) => toast({ title: "Failed to Start", description: e.message, variant: "destructive" }),
  });
}
export function useStopCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => api("/api/campaign/stop", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.active] });
      toast({ title: "Campaign Stopped", className: "bg-zinc-700 text-white border-none" });
    },
  });
}

// ── Templates ──────────────────────────────────────────────────────────────
export function useTemplates() {
  return useQuery({
    queryKey: [Q.templates],
    queryFn: () => api<Array<{ id: number; name: string; payload: string; createdAt?: string }>>(Q.templates),
  });
}
export function useSaveTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { name: string; payload: string }) =>
      api("/api/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [Q.templates] });
      toast({ title: "Template Saved", className: "bg-green-600 text-white border-none" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [Q.templates] }),
  });
}

// ── Logs ──────────────────────────────────────────────────────────────────
export function useLogs() {
  return useQuery({
    queryKey: [Q.logs],
    queryFn: () => api<Array<{ timestamp: string; message: string; type: "info" | "error" | "success" }>>(Q.logs),
    refetchInterval: 3000,
  });
}
