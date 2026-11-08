/** When the daily job sends a rent reminder: 3 days before, on the due date, then every 3 days while unpaid. */
import { diffDays } from "./dates";

export function shouldRemind(today: string, dueDate: string): boolean {
  const days = diffDays(today, dueDate);
  return days === 3 || days === 0 || (days < 0 && -days % 3 === 0);
}
