// Receiver adapter boundary.
// Demo mode is the only enabled provider. No network, SSH, HTTP or shell calls exist here.
const demoSnapshot = {
  mode: "demo",
  connected: false,
  device: {
    name: "Vu+ Duo4K",
    model: "Vu+ Duo4K",
    image: "OpenATV 8.0.1",
    enigmaVersion: "Enigma2",
    ip: "192.168.1.120",
    architecture: "MIPS / ARM (sample)",
    uptime: "3 أيام و 6 ساعات (عينة)",
    lastSeen: "بيانات ثابتة للعرض"
  },
  resources: [
    { label: "المعالج", value: "24%", detail: "استخدام تجريبي" },
    { label: "الذاكرة", value: "58%", detail: "استخدام تجريبي" },
    { label: "التخزين", value: "82%", detail: "استخدام تجريبي" }
  ],
  services: [
    { name: "Enigma2", state: "يعمل (عينة)" },
    { name: "Web Interface", state: "يعمل (عينة)" },
    { name: "Softcam", state: "غير محدد في العينة" },
    { name: "Streaming", state: "يعمل (عينة)" }
  ]
};

export async function getReceiverSnapshot() {
  return structuredClone(demoSnapshot);
}

// Real bridge integration is intentionally unavailable until a reviewed,
// authenticated, read-only protocol is implemented and explicitly enabled.
export async function connectReceiver() {
  throw new Error("الاتصال الحقيقي غير مفعّل. التطبيق يعمل في وضع العرض التجريبي فقط.");
}

export function getConnectionCapabilities() {
  return {
    provider: "demo",
    networkAccess: false,
    commandExecution: false,
    fileMutation: false,
    bridgeEnabled: false
  };
}
