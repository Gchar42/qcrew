self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Statgap.gg";
  const options = {
    body: data.body || "Something happened!",
    icon: "/logos/statgap-logo-transparent.png",
    badge: "/logos/statgap-logo-transparent.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
