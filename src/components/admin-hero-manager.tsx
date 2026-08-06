import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listHeroSlides, saveHeroSlide, deleteHeroSlide, setHeroOverride, type HeroSlide } from "@/lib/hero.functions";
import { ImageUploader } from "@/components/image-uploader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ImageIcon, Pin, Star, EyeOff, Sparkles } from "lucide-react";

type Draft = {
  id?: string;
  image_url: string;
  title: string;
  subtitle: string;
  link_url: string;
  cta_label: string;
  sort_order: number;
  is_active: boolean;
  is_pinned: boolean;
  is_featured: boolean;
};

const empty: Draft = {
  image_url: "",
  title: "",
  subtitle: "",
  link_url: "",
  cta_label: "",
  sort_order: 0,
  is_active: true,
  is_pinned: false,
  is_featured: false,
};

export function AdminHeroManager() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["adminHeroSlides"], queryFn: () => listHeroSlides() });
  const [draft, setDraft] = useState<Draft>(empty);

  const saveFn = useServerFn(saveHeroSlide);
  const delFn = useServerFn(deleteHeroSlide);
  const overrideFn = useServerFn(setHeroOverride);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["adminHeroSlides"] });
    qc.invalidateQueries({ queryKey: ["heroSlides"] });
  };

  const save = useMutation({
    mutationFn: (d: Draft) =>
      saveFn({
        data: {
          ...(d.id ? { id: d.id } : {}),
          image_url: d.image_url,
          title: d.title || null,
          subtitle: d.subtitle || null,
          link_url: d.link_url || null,
          cta_label: d.cta_label || null,
          sort_order: Number(d.sort_order) || 0,
          is_active: d.is_active,
          is_pinned: d.is_pinned,
          is_featured: d.is_featured,
        } as any,
      }),
    onSuccess: () => { toast.success("Hero ad saved"); setDraft(empty); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Delete failed"),
  });

  const override = useMutation({
    mutationFn: (v: { s: HeroSlide; patch: Partial<{ is_pinned: boolean; is_featured: boolean; is_disabled: boolean }> }) =>
      overrideFn({
        data: {
          source_type: v.s.source_type as "vendor" | "artisan" | "product",
          source_id: v.s.source_id as string,
          is_pinned: v.patch.is_pinned ?? !!v.s.is_pinned,
          is_featured: v.patch.is_featured ?? !!v.s.is_featured,
          is_disabled: v.patch.is_disabled ?? !v.s.is_active,
        },
      }),
    onSuccess: () => { toast.success("Banner updated"); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Update failed"),
  });

  const manual = data?.manual ?? [];
  const auto = data?.auto ?? [];

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold"><ImageIcon className="h-5 w-5 text-primary" /> Homepage hero ads</h2>
      <p className="text-xs text-muted-foreground">
        Paid stores, paid artisans and their newest products enter the hero rotation automatically. Upload extra banners below, and pin, feature or hide any banner.
      </p>

      <Card className="mt-3 space-y-3 p-4">
        <div className="text-sm font-semibold">{draft.id ? "Edit slide" : "Add a new slide"}</div>
        <ImageUploader value={draft.image_url} onChange={(url) => setDraft({ ...draft, image_url: url })} label="Upload hero image" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Title (optional)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <Input placeholder="Subtitle (optional)" value={draft.subtitle} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} />
          <Input placeholder="Link URL e.g. /marketplace" value={draft.link_url} onChange={(e) => setDraft({ ...draft, link_url: e.target.value })} />
          <Input placeholder="Button label (optional)" value={draft.cta_label} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} />
          <Input type="number" placeholder="Sort order" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} /> Active</label>
            <label className="flex items-center gap-2"><Switch checked={draft.is_pinned} onCheckedChange={(v) => setDraft({ ...draft, is_pinned: v })} /> Pin</label>
            <label className="flex items-center gap-2"><Switch checked={draft.is_featured} onCheckedChange={(v) => setDraft({ ...draft, is_featured: v })} /> Feature</label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={!draft.image_url || save.isPending} onClick={() => save.mutate(draft)}>
            <Plus className="mr-1.5 h-4 w-4" /> {draft.id ? "Save changes" : "Add slide"}
          </Button>
          {draft.id && <Button variant="ghost" onClick={() => setDraft(empty)}>Cancel</Button>}
        </div>
      </Card>

      <Card className="mt-3 overflow-hidden">
        <ul className="divide-y">
          {manual.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No manual hero ads yet.</li>}
          {manual.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <img src={s.image_url} alt="" className="h-14 w-20 rounded-lg border object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.title ?? "Untitled slide"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  #{s.sort_order} · {s.is_active ? "Active" : "Hidden"}{s.is_pinned ? " · Pinned" : ""}{s.is_featured ? " · Featured" : ""}{s.link_url ? ` · ${s.link_url}` : ""}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({
                    id: s.id,
                    image_url: s.image_url,
                    title: s.title ?? "",
                    subtitle: s.subtitle ?? "",
                    link_url: s.link_url ?? "",
                    cta_label: s.cta_label ?? "",
                    sort_order: s.sort_order,
                    is_active: s.is_active,
                    is_pinned: !!s.is_pinned,
                    is_featured: !!s.is_featured,
                  })
                }
              >
                Edit
              </Button>
              <Button size="icon" variant="ghost" aria-label="Delete slide" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <h3 className="mt-6 flex items-center gap-2 font-display text-lg font-bold"><Sparkles className="h-4 w-4 text-gold" /> Automatic banners (paid sellers)</h3>
      <Card className="mt-2 overflow-hidden">
        <ul className="divide-y">
          {auto.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">No paid stores yet — automatic banners appear as soon as a seller subscribes.</li>
          )}
          {auto.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <img src={s.image_url} alt="" className="h-14 w-20 rounded-lg border object-cover" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.title}</div>
                <div className="truncate text-xs capitalize text-muted-foreground">
                  {s.source_type} · {s.is_active ? "Live" : "Disabled"} · {s.link_url}
                </div>
              </div>
              <Button size="sm" variant={s.is_pinned ? "default" : "outline"} onClick={() => override.mutate({ s, patch: { is_pinned: !s.is_pinned } })}>
                <Pin className="mr-1.5 h-3.5 w-3.5" />{s.is_pinned ? "Pinned" : "Pin"}
              </Button>
              <Button size="sm" variant={s.is_featured ? "default" : "outline"} onClick={() => override.mutate({ s, patch: { is_featured: !s.is_featured } })}>
                <Star className="mr-1.5 h-3.5 w-3.5" />{s.is_featured ? "Featured" : "Feature"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => override.mutate({ s, patch: { is_disabled: s.is_active } })}>
                <EyeOff className="mr-1.5 h-3.5 w-3.5" />{s.is_active ? "Disable" : "Enable"}
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
