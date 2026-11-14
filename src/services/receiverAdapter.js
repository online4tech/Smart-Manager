import {
  connectLocalReceiver,
  getReceiverDataset,
  getStoredBridgeCredentials,
  getStoredReceiverConfig
} from "./localBridge";

const unavailable = (label) => ({ label, value: "غير متاح من OpenWebif", detail: "لم يوفّر إصدار الرسيفر هذه البيانات" });

export async function getReceiverSnapshot() {
  const credentials = getStoredBridgeCredentials();
  const config = getStoredReceiverConfig();
  if (!credentials || !config?.host) {
    return {
      mode: "disconnected",
      connected: false,
      device: { name: "لا يوجد رسيفر متصل", model: "—", image: "—", enigmaVersion: "—", ip: "—", architecture: "غير متاحة", uptime: "غير متاحة", lastSeen: "لم يتم الاتصال" },
      resources: [unavailable("المعالج"), unavailable("الذاكرة"), unavailable("التخزين")],
      services: [],
      datasets: {},
      message: "اربط الجسر والرسيفر أولاً لقراءة البيانات الحقيقية."
    };
  }

  const connection = await connectLocalReceiver(credentials, config);
  const receiver = connection.receiver;
  const read = async (name) => {
    try {
      const result = await getReceiverDataset(credentials, name);
      return result?.result?.data ?? null;
    } catch {
      return null;
    }
  };
  const [boxinfo, status, services, timers, recordings] = await Promise.all([
    read("boxinfo"), read("status"), read("services"), read("timers"), read("recordings")
  ]);

  const info = boxinfo?.info || boxinfo || {};
  const statusInfo = status || {};
  const model = receiver?.device?.model || receiver?.device?.name || "Enigma2 Receiver";
  const image = receiver?.device?.image || "غير متاح";
  const enigmaVersion = receiver?.device?.enigma_version || "غير متاح";
  const ip = receiver?.host || config.host;
  const findValue = (...keys) => {
    for (const key of keys) {
      const value = info?.[key] ?? boxinfo?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
  };
  const resources = [
    { label: "المعالج", value: findValue("cpu", "cpu_usage", "load") ?? "غير متاح", detail: "قراءة OpenWebif إن توفرت" },
    { label: "الذاكرة", value: findValue("mem", "memory", "memused") ?? "غير متاح", detail: "قراءة OpenWebif إن توفرت" },
    { label: "التخزين", value: findValue("hdd", "storage", "disk") ?? "غير متاح", detail: "قراءة OpenWebif إن توفرت" }
  ];
  const serviceRows = [
    { name: "OpenWebif", state: "متاح — تم الاتصال" },
    { name: "القناة الحالية", state: statusInfo.currservice_name || statusInfo.currservice_station || "غير متاحة" },
    { name: "التسجيل", state: statusInfo.isRecording === true || statusInfo.isRecording === "true" ? "قيد التسجيل" : statusInfo.isRecording === false || statusInfo.isRecording === "false" ? "لا يوجد تسجيل حسب الحالة الحالية" : "غير متاح" }
  ];

  return {
    mode: "live-read-only",
    connected: true,
    device: {
      name: model, model, image, enigmaVersion, ip,
      architecture: findValue("architecture", "arch") || "غير متاحة",
      uptime: findValue("uptime", "uptime_str") || "غير متاحة",
      lastSeen: new Date().toLocaleString("ar-EG")
    },
    resources,
    services: serviceRows,
    datasets: { boxinfo, status, services, timers, recordings },
    counts: {
      bouquets: Array.isArray(services?.services) ? services.services.length : null,
      timers: Array.isArray(timers?.timers) ? timers.timers.length : null,
      recordings: Array.isArray(recordings?.movies) ? recordings.movies.length : null
    },
    source: "OpenWebif read-only API"
  };
}

export async function connectReceiver() {
  return getReceiverSnapshot();
}

export function getConnectionCapabilities() {
  return {
    provider: "OpenWebif",
    networkAccess: true,
    commandExecution: false,
    fileMutation: false,
    bridgeEnabled: true,
    mode: "read-only"
  };
}
