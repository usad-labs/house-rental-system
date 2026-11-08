"use client";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { siteConfig } from "@/config/site";
import { login, type LoginState } from "@/server/auth-actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "";
  const [state, action, pending] = useActionState(login, { error: "" } satisfies LoginState);

  return (
    <form className="gate-form" action={action}>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p className="gate-error" role="alert">
          {state.error}
        </p>
      )}
      <label className="gate-field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="username" defaultValue={state.email} required />
      </label>
      <label className="gate-field">
        <span>Password</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      <button className="stamp-btn" type="submit" disabled={pending}>
        <span className="stamp">
          <span className="stamp-in">
            <small>{siteConfig.logoText}</small>
            {pending ? "Opening…" : "Open the dashboard"}
          </span>
        </span>
      </button>
    </form>
  );
}
