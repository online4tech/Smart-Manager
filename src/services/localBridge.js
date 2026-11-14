const BRIDGE_BASE = "http://127.0.0.1:8765";

async function bridgeRequest(path, { body, token, csrf, timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
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


export async function stagePackageUpload(file) {
  const credentials = getStoredBridgeCredentials();
  if (!credentials?.token || !credentials?.csrf) throw new Error("اتصل بالجسر المحلي أولاً.");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".ipk")) {
    throw new Error("اختار ملف IPK فقط.");
  }
  if (!file.size || file.size > 32 * 1024 * 1024) {
    throw new Error("حجم الملف يجب أن يكون أقل من 32 ميجابايت.");
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${BRIDGE_BASE}/api/packages/stage`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "Content-Type": "application/vnd.debian.binary-package",
        "X-Bridge-Token": credentials.token,
        "X-CSRF-Token": credentials.csrf,
        "X-Package-Name": encodeURIComponent(file.name)
      },
      body: file,
      signal: controller.signal
    });
    let data;
    try { data = await response.json(); }
    catch { throw new Error("الجسر أعاد استجابة غير مفهومة."); }
    if (!response.ok || !data.ok) {
      const messages = {
        unauthorized: "انتهت الثقة المحلية. أعد الاتصال بالجسر.",
        ipk_size_invalid: "حجم الملف غير صالح أو يتجاوز 32 ميجابايت.",
        staging_quota_exceeded: "مساحة staging المحلية ممتلئة؛ راجع الملفات المحفوظة قبل رفع المزيد.",
        ipk_content_type_invalid: "نوع الملف غير مدعوم.",
        invalid_ipk_archive: "الملف ليس حزمة IPK سليمة.",
        ipk_control_missing: "بيانات تعريف الحزمة غير موجودة داخل الملف.",
        ipk_data_missing: "ملفات محتوى الحزمة غير موجودة.",
        ipk_data_archive_invalid: "أرشيف ملفات الحزمة غير صالح أو غير مدعوم.",
        ipk_control_archive_too_large: "أرشيف بيانات التعريف أكبر من حدود الفحص.",
        ipk_data_archive_too_large: "محتوى الحزمة يتجاوز حدود الفحص الآمن.",
        ipk_control_invalid: "تعذر قراءة بيانات تعريف الحزمة.",
        ipk_control_too_large: "بيانات تعريف الحزمة أكبر من الحد المسموح.",
        ipk_unsafe_path: "الملف يحتوي على مسار داخلي غير آمن وتم رفضه.",
        ipk_package_invalid: "اسم الحزمة داخل الملف غير صالح.",
        ipk_version_invalid: "إصدار الحزمة غير صالح.",
        ipk_architecture_invalid: "معمارية الحزمة غير صالحة."
      };
      throw new Error(data.message || messages[data.error] || "تعذر فحص ملف الحزمة.");
    }
    return data.package;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("انتهت مهلة رفع وفحص الحزمة.");
    if (error instanceof TypeError) throw new Error("تعذر الوصول للجسر المحلي. تأكد من تشغيله.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}


export async function installApprovedPackage(packageId) {
  const credentials = getStoredBridgeCredentials();
  if (!credentials?.token || !credentials?.csrf) throw new Error("اتصل بالجسر المحلي أولاً.");
  if (!/^[a-z0-9][a-z0-9+.-]{0,127}$/.test(String(packageId || ""))) {
    throw new Error("معرّف الحزمة غير صالح.");
  }
  return bridgeRequest("/api/packages/install", {
    body: { package_id: packageId, confirmed: true },
    token: credentials.token,
    csrf: credentials.csrf,
    timeoutMs: 150000
  });
}
