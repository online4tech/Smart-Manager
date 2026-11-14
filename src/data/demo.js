// بيانات تجريبية فقط — لا يوجد اتصال فعلي بالرسيفر في هذه المرحلة.
export const demoDevice = {
  name: "Vu+ Duo4K",
  image: "OpenATV 8.0.1",
  version: "Enigma2",
  ip: "192.168.1.120",
  status: "demo"
};

export const metrics = [
  { key: "cpu", label: "استخدام المعالج", value: "24%", detail: "مستوى طبيعي", amount: 24, tone: "blue" },
  { key: "memory", label: "الذاكرة المستخدمة", value: "58%", detail: "ضمن الحدود الطبيعية", amount: 58, tone: "cyan" },
  { key: "storage", label: "مساحة التخزين", value: "82%", detail: "يُفضّل مراجعة المساحة", amount: 82, tone: "amber" },
  { key: "services", label: "الخدمات الأساسية", value: "5 / 5", detail: "كل الخدمات تعمل", amount: 100, tone: "green" }
];

export const findings = [
  { title: "مساحة التخزين تقترب من الامتلاء", description: "استخدام القرص وصل إلى 82% في بيانات العرض التجريبية.", severity: "تحذير", tone: "warning", evidence: "Disk usage sample" },
  { title: "لا توجد أخطاء حرجة في الخدمات", description: "حالة الخدمات الأساسية سليمة وفق بيانات العرض.", severity: "سليم", tone: "success", evidence: "Service status sample" }
];