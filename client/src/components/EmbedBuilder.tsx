
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Trash2, Save, ChevronDown, ChevronRight, Eye, EyeOff, Type, Layers,
  Link2, Image, User, AlignLeft, Hash, Clock
} from "lucide-react";
import { Input } from "./Input";
import { Textarea } from "./Textarea";
import { Button } from "@/components/ui/button";
import { useTemplates, useSaveTemplate, useDeleteTemplate } from "@/hooks/use-campaign";

// ── Types ─────────────────────────────────────────────────────────────────
export interface EmbedField  { id: string; name: string; value: string; inline: boolean }
export interface LinkButton  { id: string; label: string; url: string }
export interface EmbedData {
  mode: "text" | "embed";
  content: string;
  color: string;
  title: string; url: string;
  description: string;
  authorName: string; authorUrl: string; authorIcon: string;
  footerText: string; footerIcon: string;
  imageUrl: string; thumbnailUrl: string;
  timestamp: boolean;
  fields: EmbedField[];
  buttons: LinkButton[];
}

export const DEFAULT_EMBED: EmbedData = {
  mode: "embed", content: "", color: "5865F2",
  title: "", url: "", description: "",
  authorName: "", authorUrl: "", authorIcon: "",
  footerText: "", footerIcon: "",
  imageUrl: "", thumbnailUrl: "",
  timestamp: false, fields: [], buttons: [],
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Payload serialization ──────────────────────────────────────────────────
export function buildPayload(d: EmbedData): string {
  if (d.mode === "text") return JSON.stringify({ content: d.content });
  const payload: any = {};
  if (d.content.trim()) payload.content = d.content.trim();
  const e: any = {};
  e.color = parseInt(d.color.replace("#", "") || "5865F2", 16);
  if (d.title.trim())       e.title       = d.title.trim();
  if (d.url.trim())         e.url         = d.url.trim();
  if (d.description.trim()) e.description = d.description.trim();
  if (d.authorName.trim()) {
    e.author = { name: d.authorName.trim() };
    if (d.authorUrl.trim())  e.author.url      = d.authorUrl.trim();
    if (d.authorIcon.trim()) e.author.icon_url  = d.authorIcon.trim();
  }
  if (d.footerText.trim()) {
    e.footer = { text: d.footerText.trim() };
    if (d.footerIcon.trim()) e.footer.icon_url = d.footerIcon.trim();
  }
  if (d.imageUrl.trim())     e.image     = d.imageUrl.trim();
  if (d.thumbnailUrl.trim()) e.thumbnail = d.thumbnailUrl.trim();
  if (d.timestamp)           e.timestamp = true;
  const vf = d.fields.filter(f => f.name.trim() && f.value.trim());
  if (vf.length) e.fields = vf.map(f => ({ name: f.name, value: f.value, inline: f.inline }));
  payload.embed = e;
  const vb = d.buttons.filter(b => b.label.trim() && b.url.trim());
  if (vb.length) payload.buttons = vb.map(b => ({ label: b.label, url: b.url }));
  return JSON.stringify(payload);
}

export function parsePayload(json: string): EmbedData {
  try {
    const p = JSON.parse(json);
    if (typeof p === "string") return { ...DEFAULT_EMBED, mode: "text", content: p };
    if (!p.embed && !p.buttons) return { ...DEFAULT_EMBED, mode: "text", content: p.content || "" };
    const e = p.embed || {};
    return {
      mode: "embed",
      content: p.content || "",
      color: e.color != null ? e.color.toString(16).toUpperCase().padStart(6, "0") : "5865F2",
      title: e.title || "", url: e.url || "", description: e.description || "",
      authorName: e.author?.name || "", authorUrl: e.author?.url || "", authorIcon: e.author?.icon_url || "",
      footerText: e.footer?.text || "", footerIcon: e.footer?.icon_url || "",
      imageUrl: e.image || "", thumbnailUrl: e.thumbnail || "",
      timestamp: !!e.timestamp,
      fields: (e.fields || []).map((f: any) => ({ id: uid(), name: f.name || "", value: f.value || "", inline: !!f.inline })),
      buttons: (p.buttons || []).map((b: any) => ({ id: uid(), label: b.label || "", url: b.url || "" })),
    };
  } catch { return { ...DEFAULT_EMBED, mode: "text", content: json }; }
}

// ── Small helpers ──────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600 py-1">
      <div className="flex-1 h-px bg-white/5" />
      {label}
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-2 ${className}`}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ── Discord Preview ────────────────────────────────────────────────────────
function DiscordPreview({ d }: { d: EmbedData }) {
  const color = `#${d.color.replace("#", "") || "5865F2"}`;
  const hasEmbed = d.mode === "embed" && (d.title || d.description || d.authorName || d.footerText || d.imageUrl || d.fields.length > 0);

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "#313338", padding: "16px", fontFamily: "sans-serif" }}>
      {/* Avatar + name row */}
      <div className="flex items-start gap-3 mb-1">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">B</span>
        </div>
        <div>
          <span className="text-[13px] font-semibold text-white mr-2">Bot</span>
          <span className="text-[10px] text-zinc-500">Today</span>
          {d.content && (
            <div className="text-[13px] mt-0.5 whitespace-pre-wrap" style={{ color: "#dbdee1" }}>{d.content}</div>
          )}
          {!d.content && !hasEmbed && (
            <div className="text-[13px] mt-0.5" style={{ color: "#505060", fontStyle: "italic" }}>Empty message…</div>
          )}
        </div>
      </div>

      {/* Embed */}
      {hasEmbed && (
        <div className="ml-11" style={{
          background: "#2b2d31",
          borderLeft: `4px solid ${color}`,
          borderRadius: "4px",
          padding: "12px 16px",
          maxWidth: "432px",
          position: "relative",
        }}>
          {/* Thumbnail */}
          {d.thumbnailUrl && (
            <img src={d.thumbnailUrl} alt="" className="absolute top-3 right-3 w-16 h-16 rounded object-cover" />
          )}

          {/* Author */}
          {d.authorName && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {d.authorIcon && <img src={d.authorIcon} alt="" className="w-5 h-5 rounded-full" />}
              <span className="text-[13px] font-semibold" style={{ color: "#dbdee1" }}>{d.authorName}</span>
            </div>
          )}

          {/* Title */}
          {d.title && (
            <div className="mb-1.5">
              {d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="font-bold text-[15px]" style={{ color: "#00b0f4" }}>{d.title}</a>
              ) : (
                <span className="font-bold text-[15px]" style={{ color: "#dbdee1" }}>{d.title}</span>
              )}
            </div>
          )}

          {/* Description */}
          {d.description && (
            <div className="text-[13px] mb-2 whitespace-pre-wrap" style={{ color: "#dbdee1" }}>{d.description}</div>
          )}

          {/* Fields */}
          {d.fields.filter(f => f.name || f.value).length > 0 && (
            <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {d.fields.filter(f => f.name || f.value).map((f, i) => (
                <div key={f.id || i} style={{ gridColumn: f.inline ? "span 1" : "span 3" }}>
                  <div className="text-[12px] font-bold mb-0.5" style={{ color: "#dbdee1" }}>{f.name || "​"}</div>
                  <div className="text-[12px]" style={{ color: "#dbdee1" }}>{f.value || "​"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Image */}
          {d.imageUrl && (
            <img src={d.imageUrl} alt="" className="mt-3 rounded w-full max-w-[400px] object-cover" />
          )}

          {/* Footer */}
          {(d.footerText || d.timestamp) && (
            <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: "#949ba4" }}>
              {d.footerIcon && <img src={d.footerIcon} alt="" className="w-4 h-4 rounded-full" />}
              {d.footerText && <span>{d.footerText}</span>}
              {d.footerText && d.timestamp && <span>•</span>}
              {d.timestamp && <span>{new Date().toLocaleDateString()}</span>}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      {d.buttons.filter(b => b.label).length > 0 && (
        <div className="ml-11 mt-1 flex flex-wrap gap-1.5">
          {d.buttons.filter(b => b.label).map((btn, i) => (
            <div key={btn.id || i} className="flex items-center gap-1 px-3 py-1.5 rounded text-[13px] font-medium cursor-default"
              style={{ background: "#4e5058", color: "#dbdee1", border: "1px solid rgba(255,255,255,0.1)" }}>
              {btn.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-60 ml-0.5">
                <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"/>
                <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main EmbedBuilder ──────────────────────────────────────────────────────
interface Props {
  value: string;
  onChange: (payload: string) => void;
}

export function EmbedBuilder({ value, onChange }: Props) {
  const [d, setD] = useState<EmbedData>(() => value ? parsePayload(value) : { ...DEFAULT_EMBED });
  const [showPreview, setShowPreview] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("core");

  const { data: templates = [] } = useTemplates();
  const { mutate: saveTemplate, isPending: isSaving } = useSaveTemplate();
  const { mutate: deleteTemplate } = useDeleteTemplate();

  // Sync outward whenever d changes
  useEffect(() => {
    onChange(buildPayload(d));
  }, [d]);

  const update = (patch: Partial<EmbedData>) => setD(prev => ({ ...prev, ...patch }));
  const addField  = () => update({ fields:  [...d.fields,  { id: uid(), name: "", value: "", inline: false }] });
  const addButton = () => update({ buttons: [...d.buttons, { id: uid(), label: "", url: "" }] });

  const toggleSection = (s: string) => setOpenSection(prev => prev === s ? null : s);

  const handleLoadTemplate = (payload: string) => { setD(parsePayload(payload)); };
  const handleSaveTemplate = () => {
    if (!templateName.trim()) return;
    saveTemplate({ name: templateName.trim(), payload: buildPayload(d) });
    setTemplateName("");
    setSavingName(false);
  };

  const inputCls = "h-7 text-xs bg-zinc-900 border-white/10 focus:border-violet-500/50";

  return (
    <div className="space-y-3">
      {/* ── Template row ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            data-testid="select-template"
            onChange={e => { if (e.target.value) handleLoadTemplate(e.target.value); e.target.value = ""; }}
            className="flex-1 h-7 text-xs bg-zinc-900 border border-white/10 rounded-lg px-2 text-zinc-300 focus:outline-none focus:border-violet-500/50"
          >
            <option value="">Load saved template…</option>
            {templates.map(t => (
              <option key={t.id} value={t.payload}>{t.name}</option>
            ))}
          </select>
          <button
            data-testid="button-toggle-save-template"
            onClick={() => setSavingName(s => !s)}
            className="h-7 px-2.5 text-xs font-medium rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
          >
            <Save className="w-3 h-3" /> Save
          </button>
        </div>

        {savingName && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2">
            <Input
              data-testid="input-template-name"
              placeholder="Template name…"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveTemplate()}
              className={`${inputCls} flex-1`}
              autoFocus
            />
            <Button onClick={handleSaveTemplate} disabled={isSaving || !templateName.trim()}
              className="h-7 px-2.5 text-xs bg-violet-600 hover:bg-violet-500 text-white">
              {isSaving ? "…" : "Save"}
            </Button>
          </motion.div>
        )}

        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {templates.map(t => (
              <span key={t.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 border border-white/5 text-[10px] text-zinc-400 group">
                <button onClick={() => handleLoadTemplate(t.payload)} className="hover:text-violet-400 transition-colors">{t.name}</button>
                <button onClick={() => deleteTemplate(t.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex bg-zinc-900 border border-white/5 rounded-lg p-0.5 gap-0.5">
        <button data-testid="mode-text"
          onClick={() => update({ mode: "text" })}
          className={`flex-1 h-6 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${d.mode === "text" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
          <Type className="w-3 h-3" /> Plain Text
        </button>
        <button data-testid="mode-embed"
          onClick={() => update({ mode: "embed" })}
          className={`flex-1 h-6 text-xs font-medium rounded transition-all flex items-center justify-center gap-1 ${d.mode === "embed" ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
          <Layers className="w-3 h-3" /> Embed
        </button>
      </div>

      {/* Placeholders hint */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-600">
        <span>Placeholders:</span>
        <code className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-violet-400 select-all">{"{mention}"}</code>
        <span className="text-zinc-700">→ pings the recipient</span>
        <code className="bg-zinc-900 border border-white/5 rounded px-1.5 py-0.5 text-violet-400 select-all">{"{username}"}</code>
        <span className="text-zinc-700">→ their tag</span>
      </div>

      {/* ── Plain text mode ── */}
      {d.mode === "text" && (
        <Textarea data-testid="textarea-content-text"
          placeholder="Write your DM message… use {mention} to ping them"
          value={d.content}
          onChange={e => update({ content: e.target.value })}
          className="text-xs min-h-[100px] bg-zinc-900 border-white/10"
        />
      )}

      {/* ── Embed mode ── */}
      {d.mode === "embed" && (
        <div className="space-y-2 text-xs">

          {/* Content above embed */}
          <Field label="Text above embed (optional)">
            <Input data-testid="input-content" placeholder="Optional text before embed…"
              value={d.content} onChange={e => update({ content: e.target.value })} className={inputCls} />
          </Field>

          {/* Core embed */}
          <AccordionSection label="Core" icon={<Hash className="w-3 h-3" />}
            open={openSection === "core"} toggle={() => toggleSection("core")}>
            <Row>
              <Field label="Color">
                <div className="flex items-center gap-2 h-7 bg-zinc-900 border border-white/10 rounded-lg px-2">
                  <input type="color" value={`#${d.color.replace("#", "")}`}
                    onChange={e => update({ color: e.target.value.replace("#", "").toUpperCase() })}
                    className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="text-zinc-400 font-mono text-[10px] select-all">#{d.color.replace("#", "")}</span>
                </div>
              </Field>
              <Field label="URL (title link)">
                <Input placeholder="https://…" value={d.url}
                  onChange={e => update({ url: e.target.value })} className={inputCls} />
              </Field>
            </Row>
            <Field label="Title">
              <Input data-testid="input-title" placeholder="Embed title…"
                value={d.title} onChange={e => update({ title: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Description">
              <Textarea data-testid="textarea-description" placeholder="Embed description…"
                value={d.description} onChange={e => update({ description: e.target.value })}
                className="min-h-[70px] text-xs bg-zinc-900 border-white/10" />
            </Field>
          </AccordionSection>

          {/* Author */}
          <AccordionSection label="Author" icon={<User className="w-3 h-3" />}
            open={openSection === "author"} toggle={() => toggleSection("author")}>
            <Field label="Name">
              <Input placeholder="Author name…" value={d.authorName}
                onChange={e => update({ authorName: e.target.value })} className={inputCls} />
            </Field>
            <Row>
              <Field label="URL">
                <Input placeholder="https://…" value={d.authorUrl}
                  onChange={e => update({ authorUrl: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Icon URL">
                <Input placeholder="https://…" value={d.authorIcon}
                  onChange={e => update({ authorIcon: e.target.value })} className={inputCls} />
              </Field>
            </Row>
          </AccordionSection>

          {/* Media */}
          <AccordionSection label="Media" icon={<Image className="w-3 h-3" />}
            open={openSection === "media"} toggle={() => toggleSection("media")}>
            <Field label="Image URL (full width)">
              <Input placeholder="https://…" value={d.imageUrl}
                onChange={e => update({ imageUrl: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Thumbnail URL (top right)">
              <Input placeholder="https://…" value={d.thumbnailUrl}
                onChange={e => update({ thumbnailUrl: e.target.value })} className={inputCls} />
            </Field>
          </AccordionSection>

          {/* Fields */}
          <AccordionSection label={`Fields (${d.fields.length})`} icon={<AlignLeft className="w-3 h-3" />}
            open={openSection === "fields"} toggle={() => toggleSection("fields")}>
            {d.fields.map((f, i) => (
              <div key={f.id} className="flex gap-1.5 items-center">
                <Input placeholder="Name" value={f.name}
                  onChange={e => { const nf = [...d.fields]; nf[i] = { ...f, name: e.target.value }; update({ fields: nf }); }}
                  className={`${inputCls} w-24 shrink-0`} />
                <Input placeholder="Value" value={f.value}
                  onChange={e => { const nf = [...d.fields]; nf[i] = { ...f, value: e.target.value }; update({ fields: nf }); }}
                  className={`${inputCls} flex-1`} />
                <label className="flex items-center gap-1 text-zinc-500 shrink-0 cursor-pointer">
                  <input type="checkbox" checked={f.inline}
                    onChange={e => { const nf = [...d.fields]; nf[i] = { ...f, inline: e.target.checked }; update({ fields: nf }); }}
                    className="accent-violet-600 w-3 h-3" />
                  <span className="text-[10px]">Inline</span>
                </label>
                <button onClick={() => update({ fields: d.fields.filter((_, j) => j !== i) })}
                  className="text-zinc-600 hover:text-red-400 shrink-0 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button onClick={addField} data-testid="button-add-field"
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-violet-400 transition-colors">
              <Plus className="w-3 h-3" /> Add Field
            </button>
          </AccordionSection>

          {/* Footer */}
          <AccordionSection label="Footer" icon={<Clock className="w-3 h-3" />}
            open={openSection === "footer"} toggle={() => toggleSection("footer")}>
            <Row>
              <Field label="Footer text">
                <Input placeholder="Footer text…" value={d.footerText}
                  onChange={e => update({ footerText: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Icon URL">
                <Input placeholder="https://…" value={d.footerIcon}
                  onChange={e => update({ footerIcon: e.target.value })} className={inputCls} />
              </Field>
            </Row>
            <label className="flex items-center gap-2 text-zinc-400 cursor-pointer">
              <input type="checkbox" checked={d.timestamp} onChange={e => update({ timestamp: e.target.checked })}
                className="accent-violet-600" />
              <span className="text-[11px]">Show timestamp</span>
            </label>
          </AccordionSection>

          {/* Link Buttons */}
          <AccordionSection label={`Link Buttons (${d.buttons.length}/5)`} icon={<Link2 className="w-3 h-3" />}
            open={openSection === "buttons"} toggle={() => toggleSection("buttons")}>
            {d.buttons.map((btn, i) => (
              <div key={btn.id} className="flex gap-1.5 items-center">
                <Input placeholder="Label" value={btn.label}
                  onChange={e => { const nb = [...d.buttons]; nb[i] = { ...btn, label: e.target.value }; update({ buttons: nb }); }}
                  className={`${inputCls} w-24 shrink-0`} />
                <Input placeholder="https://…" value={btn.url}
                  onChange={e => { const nb = [...d.buttons]; nb[i] = { ...btn, url: e.target.value }; update({ buttons: nb }); }}
                  className={`${inputCls} flex-1`} />
                <button onClick={() => update({ buttons: d.buttons.filter((_, j) => j !== i) })}
                  className="text-zinc-600 hover:text-red-400 shrink-0 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            {d.buttons.length < 5 && (
              <button onClick={addButton} data-testid="button-add-button"
                className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-violet-400 transition-colors">
                <Plus className="w-3 h-3" /> Add Link Button
              </button>
            )}
          </AccordionSection>
        </div>
      )}

      {/* ── Preview toggle ── */}
      <button data-testid="button-toggle-preview"
        onClick={() => setShowPreview(s => !s)}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors w-full">
        {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {showPreview ? "Hide Preview" : "Show Preview"}
        <div className="flex-1 h-px bg-white/5" />
      </button>

      <AnimatePresence>
        {showPreview && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <DiscordPreview d={d} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Accordion section component ────────────────────────────────────────────
function AccordionSection({ label, icon, open, toggle, children }: {
  label: string; icon: React.ReactNode; open: boolean; toggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/60 hover:bg-zinc-900 transition-colors text-left">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {icon} {label}
        </span>
        {open ? <ChevronDown className="w-3 h-3 text-zinc-600" /> : <ChevronRight className="w-3 h-3 text-zinc-600" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="p-3 space-y-2 bg-zinc-950/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
