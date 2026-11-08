import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/options";

/** Fields for recording a rent payment (inside an ActionForm). */
export function PaymentFields({ amount, day }: { amount: number; day: string }) {
  return (
    <>
      <div className="pair">
        <label className="field">
          Amount (₱)
          <input name="amount" type="number" inputMode="numeric" min={1} defaultValue={amount} required />
        </label>
        <label className="field">
          Paid on
          <input name="paidOn" type="date" defaultValue={day} max={day} required />
        </label>
      </div>
      <div className="pair">
        <label className="field">
          Method
          <select name="method" defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabel[m]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Reference no. <span className="hint">(GCash/bank)</span>
          <input name="reference" />
        </label>
      </div>
      <input type="hidden" name="note" value="" />
    </>
  );
}
