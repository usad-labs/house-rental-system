import { Suspense } from "react";
import { ActionForm } from "@/components/action-form";
import { requireUser } from "@/lib/auth";
import { messengerConfig } from "@/lib/messenger";
import { saveGcash } from "@/server/dashboard-actions";
import { getPaymentSettings } from "@/server/messenger";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <h1>Settings</h1>
      <Suspense fallback={<p className="sub">Loading…</p>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  await requireUser();
  const { gcashQrUrl, gcashName } = await getPaymentSettings();
  const { pageToken, appSecret } = messengerConfig();
  const messengerReady = Boolean(pageToken && appSecret);

  return (
    <>
      <h2>GCash QR</h2>
      <p className="hint">This QR is sent with every rent reminder in Messenger.</p>
      <ActionForm action={saveGcash} submit="Save" className="panel stack">
        {gcashQrUrl ? <img className="qr-preview" src={gcashQrUrl} alt="Your GCash QR" /> : <p className="muted">No QR yet.</p>}
        <label className="field">
          {gcashQrUrl ? "Change QR picture" : "Upload your GCash QR picture"}
          <input name="qr" type="file" accept="image/png,image/jpeg,image/webp" />
        </label>
        <label className="field">
          GCash account name
          <input name="gcashName" defaultValue={gcashName} placeholder="e.g. A. Bañas" />
        </label>
      </ActionForm>

      <h2>Messenger</h2>
      <div className="panel stack">
        {messengerReady ? (
          <p className="messenger-ok">✓ Connected. Reminders go out every morning at 8.</p>
        ) : (
          <>
            <p>
              <b>Not set up yet.</b> Until then, use the <b>Copy message</b> button on each house to send reminders yourself.
            </p>
            <p className="hint">To turn on automatic reminders, we need your Facebook page and a Meta app. Ange will set this up.</p>
          </>
        )}
      </div>
    </>
  );
}
