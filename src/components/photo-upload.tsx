"use client";
import { startTransition, useActionState, useRef, useState } from "react";
import type { FormState } from "@/server/dashboard-actions";

const MAX_SIDE = 1600;

/** Shrinks a phone photo (often 5–10 MB) to a ~300 KB JPEG before upload. */
async function resize(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not read this photo.");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function PhotoUpload({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, run, pending] = useActionState(action, { ok: false, error: "" });
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setLocalError("");
    try {
      const fd = new FormData();
      fd.set("photo", await resize(file));
      startTransition(() => run(fd));
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not read this photo.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const error = localError || state.error;
  return (
    <div className="form-foot">
      <label className="btn btn-navy btn-sm">
        {busy || pending ? "Uploading…" : "Add photo"}
        <input ref={input} className="sr-only" type="file" accept="image/*" onChange={onPick} disabled={busy || pending} />
      </label>
      {error && <span className="form-msg err" role="alert">{error}</span>}
    </div>
  );
}
