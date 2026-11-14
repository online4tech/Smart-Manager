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
        invalid_or_expired_code: "كود الاقتران غير صحيح أو تم استخدامه من قبل.",
        too_many_attempts: "تم تجاوز عدد المحاولات. انتظر دقيقة ثم حاول مجددًا.",
        unauthorized: "انتهت صلاحية جلسة الاقتران. أعد الاقتران من جديد.",
        request_not_allowed: "المتصفح أو إعدادات الجسر رفضت الطلب. تأكد من تشغيل النسخة المصححة واسم الموقع."
      };
      throw new Error(messages[data.error] || `تعذر إتمام الطلب (رمز ${response.status}).`);
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("انتهت مهلة الاتصال بالجسر. تأكد أنه يعمل على هذا الكمبيوتر.");
    if (error instanceof TypeError) throw new Error("تعذر الوصول للجسر المحلي. شغّل start.bat واسمح للمتصفح بالوصول إلى الشبكة المحلية إذا طلب ذلك.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function pairLocalBridge(code) {
  if (!code) throw new Error("اكتب كود الاقتران أولاً.");
  return bridgeRequest("/api/pair", { body: { code } });
}

export async function getLocalBridgeStatus(credentials) {
  if (!credentials?.token || !credentials?.csrf) throw new Error("جلسة الاقتران غير متاحة.");
  return bridgeRequest("/api/status", { token: credentials.token, csrf: credentials.csrf });
}
