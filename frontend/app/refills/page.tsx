/**
 * /refills → redirect to the kiosk refill flow at /kiosk/refill
 * This makes the printed/shared URL https://.../refills work correctly.
 */
import { redirect } from "next/navigation";

export default function RefillsRedirectPage() {
  redirect("/kiosk/refill");
}

