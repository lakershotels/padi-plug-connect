import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { processImage } from "@/lib/image-process";

type Props = {
  value: string;
  onChange: (url: string) => void;
  bucket?: "product-images" | "avatars" | "dispute-evidence";
  label?: string;
  /** crop ratio, e.g. 16/9 for hero banners */
  aspect?: number;
  maxWidth?: number;
};

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function ImageUploader({ value, onChange, bucket = "product-images", label = "Upload image", aspect, maxWidth = 1600 }: Props) {
  const [busy, setBusy] = useState(false);

  const onFile = async (input: File | null) => {
    if (!input) return;
    if (input.size > 15 * 1024 * 1024) {
      toast.error("Max 15MB");
      return;
    }
    setBusy(true);
    try {
      const file = await processImage(input, { aspect, maxWidth, maxHeight: maxWidth });
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Sign in required");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;

      const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, TEN_YEARS);
      if (sErr || !signed) throw sErr ?? new Error("Sign failed");
      onChange(signed.signedUrl);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-32 w-32 rounded-xl border object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" asChild variant="outline" disabled={busy}>
            <span>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {busy ? "Uploading…" : label}
            </span>
          </Button>
        </label>
      )}
    </div>
  );
}
