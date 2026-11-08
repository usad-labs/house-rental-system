"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/server/dashboard-actions";

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/** Dashboard form: runs a server action, shows its error or a short "Saved", optionally clears itself. */
export function ActionForm({
  action,
  children,
  submit,
  className = "form",
  reset = false,
}: {
  action: Action;
  children: ReactNode;
  submit: string;
  className?: string;
  /** Clear the fields after a successful save (for "add" forms). */
  reset?: boolean;
}) {
  const [state, run, pending] = useActionState(action, { ok: false, error: "" });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && reset) ref.current?.reset();
  }, [state, reset]);

  return (
    <form ref={ref} className={className} action={run}>
      {children}
      <div className="form-foot">
        <button className="btn btn-navy btn-sm" type="submit" disabled={pending}>
          {pending ? "Saving…" : submit}
        </button>
        {state.error && (
          <span className="form-msg err" role="alert">
            {state.error}
          </span>
        )}
        {state.ok && !pending && (
          <span className="form-msg ok" role="status" key={state.at}>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
