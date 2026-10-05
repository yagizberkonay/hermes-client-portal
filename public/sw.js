self.addEventListener("push", (event) => {
  let data = { title: "Hermes Software", body: "Yeni bir portal güncellemesi var.", url: "/" };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/favicon.svg", badge: "/favicon.svg", data: { url: data.url || "/" }, tag: "hermes-portal" }));
});
self.addEventListener("notificationclick", (event) => { event.notification.close(); const url = event.notification.data?.url || "/"; event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => { const existing = windows.find((client) => "focus" in client); if (existing) { existing.navigate(url); return existing.focus(); } return clients.openWindow(url); })); });
