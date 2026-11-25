import { apiService } from "./apiService";

export function pushUnavailableReason(): string | null {
  if (!window.isSecureContext) return "Open JobJourney over HTTPS to enable notifications on this device.";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS && !window.matchMedia("(display-mode: standalone)").matches
    && !(navigator as Navigator & { standalone?: boolean }).standalone) {
    return "On iPhone, use Safari’s Share → Add to Home Screen, then open JobJourney from that icon to enable notifications.";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "This browser does not support web push. On iPhone, use iOS 16.4 or later and open JobJourney from the Home Screen.";
  }
  if (Notification.permission === "denied") return "Notifications are blocked. Allow them in your device’s notification settings, then reopen JobJourney.";
  return null;
}

export async function currentPushSubscription() {
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.pushManager ? registration.pushManager.getSubscription() : null;
}

function applicationKey(value: string) {
  const bytes = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bytes, char => char.charCodeAt(0));
}

export async function enablePush(publicKey: string) {
  const reason = pushUnavailableReason();
  if (reason) throw new Error(reason);
  // Request permission directly from the button click, before network work.
  if (await Notification.requestPermission() !== "granted") throw new Error("Notification permission was not granted.");
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  const key = applicationKey(publicKey);
  if (subscription) {
    const previousKey = subscription.options.applicationServerKey;
    if (!previousKey || previousKey.byteLength !== key.byteLength
      || !new Uint8Array(previousKey).every((byte, index) => byte === key[index])) {
      await apiService.unsubscribePush(subscription.endpoint);
      if (!await subscription.unsubscribe()) throw new Error("Couldn't update this device’s notification registration. Please try again.");
      subscription = null;
    }
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await apiService.subscribePush(subscription.toJSON());
  return subscription;
}

export async function disablePush() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  // Either server removal or browser unsubscription is enough to stop delivery.
  let removed = false;
  try { await apiService.unsubscribePush(subscription.endpoint); removed = true; } catch { /* Try the browser as well. */ }
  let unsubscribed = false;
  try { unsubscribed = await subscription.unsubscribe(); } catch { /* Server removal may already have succeeded. */ }
  if (!removed && !unsubscribed) throw new Error("Couldn't turn off this device’s notifications. Check your connection and try again.");
}
