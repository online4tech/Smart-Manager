const BRIDGE_BASE = "http://127.0.0.1:8765";

async function bridgeRequest(path, { body, token, csrf } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["X-Bridge-Token"] = token;
    if (csrf) headers["X-CSRF-Token"] = csrf;
    const response = await fetch(`${BRIDGE_BASE}${path}`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers,
      body: JSON.stringify(body || {}),
      signal: controller.signal
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("الجسر أعاد استجابة غير مفهومة."); }
    if (!response.ok || !data.ok) {
      const messages = {
        unauthorized: "تعذر التحقق من الثقة المحلية. اضغط اتصال الجسر مرة أخرى.",
        request_not_allowed: "المتصفح أو إعدادات الجسر رفضت الطلب. تأكد من تشغيل النسخة المصححة واسم الموقع.",
        invalid_receiver_address: "اكتب عنوان IPv4 خاصًا داخل شبكتك المحلية.",
        invalid_receiver_port: "المنفذ المسموح به هو 80 أو 443 فقط.",
        invalid_receiver_scheme: "اختيار HTTP/HTTPS غير متوافق مع المنفذ.",
        receiver_auth_required: "واجهة الرسيفر تطلب تسجيل دخول؛ هذا الإصدار لا يرسل كلمات مرور.",
        receiver_access_denied: "الرسيفر رفض قراءة معلومات WebIF.",
        receiver_unreachable: "تعذر الوصول للرسيفر. تحقق من العنوان وتشغيل OpenWebif.",
        receiver_webif_unavailable: "لم يتم العثور على بيانات OpenWebif بصيغة XML."
      };
      throw new Error(data.message || messages[data.error] || `تعذر إتمام الطلب (رمز ${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("انتهت مهلة الاتصال بالجسر. تأكد أنه يعمل على هذا الكمبيوتر.");
    if (error instanceof TypeError) throw new Error("تعذر الوصول للجسر المحلي. شغّل برنامج Online4Tech Bridge واسمح للمتصفح بالوصول إلى الشبكة المحلية إذا طلب ذلك.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function trustLocalBridge() {
  return bridgeRequest("/api/trust", { body: {} });
}

export async function getLocalBridgeStatus(credentials) {
  if (!credentials?.token || !credentials?.csrf) throw new Error("جلسة الاقتران غير متاحة.");
  return bridgeRequest("/api/status", { token: credentials.token, csrf: credentials.csrf });
}


export async function connectLocalReceiver(credentials, config) {
  if (!credentials?.token || !credentials?.csrf) throw new Error("اقترن بالجسر المحلي أولاً.");
  if (!config?.host) throw new Error("اكتب عنوان IP الرسيفر أولاً.");
  const scheme = config.scheme === "https" ? "https" : "http";
  return bridgeRequest("/api/receiver/connect", {
    body: { host: config.host.trim(), scheme, port: scheme === "https" ? 443 : 80 },
    token: credentials.token,
    csrf: credentials.csrf
  });
}

export async function getReceiverDataset(credentials, dataset) {
  if (!credentials?.token || !credentials?.csrf) throw new Error("جلسة الجسر غير متاحة.");
  const allowed = new Set(["boxinfo", "status", "services", "timers", "recordings"]);
  if (!allowed.has(dataset)) throw new Error("مجموعة البيانات غير مدعومة.");
  return bridgeRequest("/api/receiver/data", {
    body: { dataset },
    token: credentials.token,
    csrf: credentials.csrf
  });
}

export function getStoredBridgeCredentials() {
  try {
    const saved = JSON.parse(localStorage.getItem("o4t-bridge-trust") || "null");
    return saved?.token && saved?.csrf ? saved : null;
  } catch {
    return null;
  }
}

export function getStoredReceiverConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("o4t-receiver-config") || "null");
    return saved?.host ? saved : null;
  } catch {
    return null;
  }
}
