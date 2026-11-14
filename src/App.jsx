import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowUpLeft, Bot, CheckCircle2,
  ChevronLeft, CircleHelp, Clock3, Cpu, Database, FileSearch, HardDrive,
  LayoutDashboard, ListVideo, MemoryStick, Menu, Package, Search, Settings,
  ShieldCheck, Stethoscope, Tv, Wifi, X, Server, RefreshCw, LockKeyhole
} from "lucide-react";
import { demoDevice, metrics, findings } from "./data/demo";
import { getReceiverSnapshot, getConnectionCapabilities } from "./services/receiverAdapter";

const scanReports = {
  full: {
    title: "الفحص الشامل للنظام",
    status: "مراجعة عامة",
    summary: "المؤشرات الأساسية مستقرة في العينة التجريبية، مع ملاحظة تستحق المتابعة لمساحة التخزين.",
    recommendation: "راجع الملفات الكبيرة وسجلات التسجيل القديمة يدويًا قبل اتخاذ قرار بالحذف.",
    checks: ["مؤشرات المعالج والذاكرة", "مساحة التخزين", "حالة الخدمات الأساسية", "مراجعة التنبيهات التجريبية"]
  },
  logs: {
    title: "تحليل سجلات الأخطاء",
    status: "لا توجد عينة حرجة",
    summary: "لا تحتوي بيانات العرض الحالية على أخطاء حرجة. لا يعني ذلك فحص سجلات الرسيفر الفعلية.",
    recommendation: "عند ربط الجهاز مستقبلًا، راجع السجل الأصلي مع الاحتفاظ بنسخة منه وعدم مشاركة بيانات حساسة.",
    checks: ["عينة أخطاء النظام", "مستوى الخطورة", "تكرار التنبيه", "مصدر الرسالة"]
  },
  plugins: {
    title: "فحص البلجنات",
    status: "مراجعة توضيحية",
    summary: "لا تتوفر حاليًا قائمة بلجنات فعلية؛ النتيجة توضح فقط شكل تقرير التوافق القادم.",
    recommendation: "قبل تحديث أي بلجن، تحقق من توافقه مع إصدار Enigma2 وخذ نسخة احتياطية من الإعدادات.",
    checks: ["قائمة الإضافات (غير متصلة)", "معلومات الإصدار", "مراجعة التوافق", "تنبيهات التحديث"]
  },
  safety: {
    title: "فحص سلامة النظام",
    status: "لا توجد تغييرات",
    summary: "الفحص الحالي للعرض فقط ولا يقرأ الملفات أو يغيّر الإعدادات أو ينفذ أوامر.",
    recommendation: "احتفظ بنسخة احتياطية حديثة قبل أي صيانة فعلية، ونفّذ التغييرات يدويًا بعد فهم أثرها.",
    checks: ["حدود وضع العرض", "عدم تنفيذ أوامر", "عدم تعديل الملفات", "إرشادات النسخ الاحتياطي"]
  }
};

const nav = [
  { label: "AI Doctor", sub: "التشخيص الذكي", icon: Stethoscope, active: true },
  { label: "Smart Manager", sub: "إدارة الجهاز", icon: LayoutDashboard },
  { label: "Plugin Store", sub: "المكتبة والمتجر", icon: Package },
  { label: "Channel Intelligence", sub: "إدارة القنوات", icon: ListVideo }
];

function MetricCard({ item }) {
  const Icon = item.key === "cpu" ? Cpu : item.key === "memory" ? MemoryStick : item.key === "storage" ? HardDrive : Activity;
  return <article className="glass metric-card">
    <div className="metric-top">
      <span className={`metric-icon ${item.tone}`}><Icon size={19}/></span>
      <span className="metric-label">{item.label}</span>
      <span className="metric-menu">•••</span>
    </div>
    <div className="metric-value">{item.value}</div>
    <div className="progress"><span className={item.tone} style={{width: `${item.amount}%`}} /></div>
    <div className="metric-detail">{item.detail}</div>
  </article>;
}


function ReceiverDetails() {
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const capabilities = getConnectionCapabilities();

  const refreshDemo = async () => {
    setRefreshing(true);
    const data = await getReceiverSnapshot();
    setSnapshot(data);
    setRefreshing(false);
  };

  useEffect(() => { refreshDemo(); }, []);

  if (!snapshot) return <div className="glass receiver-details-loading">جاري تحميل بيانات العرض...</div>;

  return <div className="receiver-details-page">
    <section className="device-banner glass receiver-detail-hero">
      <div className="device-identity">
        <div className="device-visual"><Tv size={29}/><span className="device-signal"/></div>
        <div><div className="device-overline">ملف الجهاز · وضع تجريبي</div><h2>{snapshot.device.name}</h2>
          <div className="device-meta"><span>{snapshot.device.image}</span><i/><span>{snapshot.device.enigmaVersion}</span><i/><span>{snapshot.device.ip}</span></div>
        </div>
      </div>
      <div className="device-status"><span className="demo-status-dot"/><div><strong>غير متصل فعليًا</strong><small>بيانات محلية للعرض فقط</small></div></div>
    </section>

    <div className="demo-notice"><AlertTriangle size={16}/><span>كل المعلومات في الصفحة أمثلة توضيحية. عنوان IP المعروض تجريبي ولا تتم محاولة الوصول إليه.</span></div>

    <section className="section-block">
      <div className="section-heading"><div><h3>معلومات الجهاز</h3><p>بيانات التعريف والإصدار</p></div><span className="updated"><Database size={14}/> Demo Snapshot</span></div>
      <div className="device-info-grid">
        <article className="glass info-tile"><small>اسم الجهاز</small><strong>{snapshot.device.model}</strong></article>
        <article className="glass info-tile"><small>صورة النظام</small><strong>{snapshot.device.image}</strong></article>
        <article className="glass info-tile"><small>معمارية المعالج</small><strong>{snapshot.device.architecture}</strong></article>
        <article className="glass info-tile"><small>مدة التشغيل</small><strong>{snapshot.device.uptime}</strong></article>
        <article className="glass info-tile"><small>عنوان الشبكة (تجريبي)</small><strong dir="ltr">{snapshot.device.ip}</strong></article>
        <article className="glass info-tile"><small>آخر تحديث للبيانات</small><strong>{snapshot.device.lastSeen}</strong></article>
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><h3>موارد النظام</h3><p>مؤشرات توضيحية وليست قراءة مباشرة</p></div></div>
      <div className="resource-grid">{snapshot.resources.map(item => <article className="glass resource-tile" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></article>)}</div>
    </section>

    <section className="lower-grid receiver-lower-grid">
      <div className="glass panel">
        <div className="panel-heading"><div><h3>الخدمات الأساسية</h3><p>حالة افتراضية للشرح</p></div><span className="panel-icon"><Server size={19}/></span></div>
        <div className="service-list">{snapshot.services.map(service => <div className="service-row" key={service.name}><span>{service.name}</span><small>{service.state}</small></div>)}</div>
      </div>
      <div className="glass panel connection-panel">
        <div className="panel-heading"><div><h3>طبقة الاتصال</h3><p>جاهزية الربط الآمن مستقبلًا</p></div><span className="panel-icon"><LockKeyhole size={19}/></span></div>
        <div className="connection-state"><span className="demo-status-dot"/><div><strong>Demo Adapter نشط</strong><small>لا يوجد اتصال شبكي أو Bridge</small></div></div>
        <ul className="capability-list">
          <li><CheckCircle2 size={14}/> قراءة بيانات العرض المحلية</li>
          <li><X size={14}/> الاتصال بالشبكة غير مفعّل</li>
          <li><X size={14}/> تنفيذ الأوامر وتعديل الملفات معطّل</li>
        </ul>
        <button className="secondary-button refresh-demo" onClick={refreshDemo} disabled={refreshing}><RefreshCw size={15}/>{refreshing ? "جاري التحديث..." : "تحديث بيانات العرض"}</button>
        <small className="adapter-note">Provider: {capabilities.provider} · Network: disabled · Commands: disabled</small>
      </div>
    </section>
  </div>;
}


const demoPlugins = [
  { id: 1, name: "AutoBouquetsMaker", category: "القنوات", version: "3.1.2", compatibility: "يتطلب التحقق", description: "أداة لتنظيم الباقات وتحديث ترتيب القنوات.", tags: ["تنظيم", "قنوات"] },
  { id: 2, name: "EPGImport", category: "دليل البرامج", version: "1.0.4", compatibility: "يتطلب التحقق", description: "إدارة مصادر دليل البرامج الإلكتروني EPG.", tags: ["EPG", "دليل البرامج"] },
  { id: 3, name: "OpenWebif", category: "أدوات النظام", version: "مكوّن نظام", compatibility: "معلومات توضيحية", description: "واجهة ويب لإدارة بعض وظائف Enigma2 عند تفعيلها.", tags: ["واجهة ويب", "إدارة"] },
  { id: 4, name: "SubtitlePlayer", category: "الوسائط", version: "غير محدد", compatibility: "يتطلب التحقق", description: "عرض وإدارة ملفات الترجمة أثناء تشغيل الوسائط.", tags: ["ترجمة", "وسائط"] },
  { id: 5, name: "MediaPlayer", category: "الوسائط", version: "مكوّن نظام", compatibility: "معلومات توضيحية", description: "مشغل وسائط ضمن بيئة Enigma2.", tags: ["فيديو", "صوت"] },
  { id: 6, name: "Backup Suite", category: "النسخ الاحتياطي", version: "1.0", compatibility: "يتطلب التحقق", description: "مفهوم توضيحي لإدارة النسخ الاحتياطية قبل الصيانة.", tags: ["نسخ احتياطي", "صيانة"] }
];

function PluginStore() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [selected, setSelected] = useState(null);
  const categories = ["الكل", ...new Set(demoPlugins.map(item => item.category))];
  const filtered = demoPlugins.filter(item => (category === "الكل" || item.category === category) && (item.name + " " + item.description + " " + item.tags.join(" ")).toLowerCase().includes(query.toLowerCase()));
  return <section className="module-page">
    <div className="demo-notice"><AlertTriangle size={16}/><span>كتالوج تجريبي للعرض فقط؛ لا توجد عمليات تنزيل أو تثبيت أو تحديث فعلية، والتوافق يحتاج مراجعة إصدار صورة النظام.</span></div>
    <div className="module-toolbar glass">
      <div className="module-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم البلجن أو وظيفته..." /></div>
      <div className="category-pills">{categories.map(item => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </div>
    <div className="module-summary"><strong>{filtered.length}</strong><span>إضافة في الكتالوج التجريبي</span><small>بيانات توضيحية غير مرتبطة بالرسيفر</small></div>
    <div className="plugin-grid">{filtered.map(item => <article className="glass plugin-card" key={item.id}>
      <div className="plugin-card-top"><span className="plugin-symbol"><Package size={20}/></span><span className="demo-tag">DEMO</span></div>
      <div className="plugin-category">{item.category}</div><h3>{item.name}</h3><p>{item.description}</p>
      <div className="plugin-meta"><span>الإصدار: {item.version}</span><span>{item.compatibility}</span></div>
      <button className="secondary-button plugin-details-button" onClick={() => setSelected(item)}>عرض التفاصيل <ChevronLeft size={15}/></button>
    </article>)}</div>
    {filtered.length === 0 && <div className="glass empty-state">مفيش إضافات مطابقة للبحث الحالي.</div>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="glass plugin-modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق"><X size={18}/></button>
      <span className="plugin-symbol"><Package size={22}/></span><small>{selected.category} · بيانات تجريبية</small><h2>{selected.name}</h2><p>{selected.description}</p>
      <div className="plugin-meta"><span>الإصدار: {selected.version}</span><span>{selected.compatibility}</span></div>
      <div className="demo-notice"><AlertTriangle size={15}/><span>لا يمكن تثبيت هذا العنصر من الواجهة الحالية. راجع المصدر والتوافق يدويًا قبل أي استخدام فعلي.</span></div>
    </section></div>}
  </section>;
}

const demoChannels = [
  { id: 1, name: "Demo News HD", satellite: "Astra 19.2°E", frequency: "11000", polarization: "H", symbolRate: "22000", type: "أخبار", quality: "HD" },
  { id: 2, name: "Demo Sports", satellite: "Hotbird 13°E", frequency: "11585", polarization: "V", symbolRate: "27500", type: "رياضة", quality: "HD" },
  { id: 3, name: "Demo Cinema", satellite: "Nilesat 7°W", frequency: "11727", polarization: "H", symbolRate: "27500", type: "أفلام", quality: "SD" },
  { id: 4, name: "Demo Documentary", satellite: "Badr 26°E", frequency: "11919", polarization: "V", symbolRate: "27500", type: "وثائقي", quality: "HD" },
  { id: 5, name: "Demo Kids", satellite: "Nilesat 7°W", frequency: "12015", polarization: "H", symbolRate: "27500", type: "أطفال", quality: "HD" },
  { id: 6, name: "Demo Music", satellite: "Hotbird 13°E", frequency: "12149", polarization: "V", symbolRate: "27500", type: "موسيقى", quality: "SD" }
];

function ChannelIntelligence() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("الكل");
  const [selected, setSelected] = useState(null);
  const types = ["الكل", ...new Set(demoChannels.map(item => item.type))];
  const filtered = demoChannels.filter(item => (type === "الكل" || item.type === type) && (item.name + " " + item.satellite + " " + item.frequency).toLowerCase().includes(query.toLowerCase()));
  return <section className="module-page">
    <div className="demo-notice"><AlertTriangle size={16}/><span>قائمة قنوات وهمية للتجربة فقط؛ لا يوجد اتصال بالرسيفر ولا يتم تعديل أو تصدير أي ملف قنوات.</span></div>
    <div className="module-toolbar glass">
      <div className="module-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم القناة أو القمر أو التردد..." /></div>
      <div className="category-pills">{types.map(item => <button key={item} className={type === item ? "selected" : ""} onClick={() => setType(item)}>{item}</button>)}</div>
    </div>
    <div className="channel-stats"><article className="glass"><strong>{filtered.length}</strong><span>قناة في النتائج</span></article><article className="glass"><strong>{new Set(filtered.map(item => item.satellite)).size}</strong><span>أقمار صناعية</span></article><article className="glass"><strong>{new Set(filtered.map(item => item.type)).size}</strong><span>تصنيفات</span></article></div>
    <div className="glass channel-table-wrap"><div className="table-heading"><div><h3>قائمة القنوات التجريبية</h3><p>بيانات عرض قابلة للبحث والتصفية</p></div><span className="demo-tag">DEMO DATA</span></div>
      <div className="channel-table-scroll"><table className="channel-table"><thead><tr><th>اسم القناة</th><th>القمر</th><th>التردد</th><th>الاستقطاب</th><th>الترميز</th><th>التصنيف</th><th>الجودة</th><th></th></tr></thead>
      <tbody>{filtered.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.satellite}</td><td dir="ltr">{item.frequency}</td><td dir="ltr">{item.polarization}</td><td dir="ltr">{item.symbolRate}</td><td>{item.type}</td><td><span className="quality-tag">{item.quality}</span></td><td><button className="table-action" onClick={() => setSelected(item)}>تفاصيل</button></td></tr>)}</tbody></table></div>
      {filtered.length === 0 && <div className="empty-state">لا توجد قنوات مطابقة للبحث.</div>}
    </div>
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="glass plugin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق"><X size={18}/></button><span className="plugin-symbol"><Tv size={22}/></span><small>تفاصيل قناة تجريبية</small><h2>{selected.name}</h2><p>{selected.satellite} · {selected.type} · {selected.quality}</p><div className="plugin-meta"><span>التردد: {selected.frequency} MHz</span><span>الاستقطاب: {selected.polarization}</span><span>معدل الترميز: {selected.symbolRate}</span></div></section></div>}
  </section>;
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scanState, setScanState] = useState("idle");
  const [activeNav, setActiveNav] = useState("AI Doctor");
  const [showDemo, setShowDemo] = useState(true);
  const [activeReport, setActiveReport] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  const startScan = (type = "full") => {
    const report = scanReports[type] || scanReports.full;
    const record = { ...report, id: Date.now(), time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) };
    setActiveReport(record);
    setScanHistory(previous => [record, ...previous].slice(0, 4));
    setScanState("complete");
    setShowDemo(true);
  };

  return <div className="app-shell">
    {mobileOpen && <button className="mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" />}
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark"><Tv size={23}/></div>
        <div><div className="brand-name">ONLINE4TECH</div><div className="brand-caption">SMART ECOSYSTEM</div></div>
        <button className="close-sidebar" onClick={() => setMobileOpen(false)}><X size={18}/></button>
      </div>
      <div className="side-section-label">القائمة الرئيسية</div>
      <nav className="nav-list">
        {nav.map(({label, sub, icon: Icon}) => <button
          key={label}
          className={`nav-item ${activeNav === label ? "active" : ""}`}
          onClick={() => {setActiveNav(label); setMobileOpen(false);}}
        >
          <span className="nav-icon"><Icon size={19}/></span>
          <span className="nav-copy"><strong>{label}</strong><small>{sub}</small></span>
          {activeNav === label && <span className="active-dot"/>}
        </button>)}
      </nav>
      <div className="side-section-label system-label">النظام</div>
      <button className="nav-item compact"><span className="nav-icon"><Settings size={18}/></span><span className="nav-copy"><strong>الإعدادات</strong></span></button>
      <button className="nav-item compact"><span className="nav-icon"><CircleHelp size={18}/></span><span className="nav-copy"><strong>المساعدة والتوثيق</strong></span></button>
      <div className="sidebar-spacer"/>
      <div className="receiver-mini glass">
        <div className="receiver-mini-top"><span className="live-dot"/><span>جهاز تجريبي</span><span className="demo-tag">DEMO</span></div>
        <strong>{demoDevice.name}</strong>
        <small>{demoDevice.image}</small>
        <div className="receiver-ip"><Wifi size={13}/> {demoDevice.ip}</div>
      </div>
      <div className="sidebar-footer">Online4Tech © 2026 <span>v0.1.0</span></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-start">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="فتح القائمة"><Menu size={21}/></button>
          <div className="breadcrumb">المنظومة <ChevronLeft size={14}/> <strong>{activeNav}</strong></div>
        </div>
        <div className="topbar-actions">
          <span className="connection-pill"><span className="live-dot"/> وضع العرض التجريبي</span>
          <button className="icon-button" aria-label="بحث"><Search size={18}/></button>
          <button className="icon-button" aria-label="الإعدادات"><Settings size={18}/></button>
          <div className="avatar">O4</div>
        </div>
      </header>

      <div className="content">
        <section className="page-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-line"/> {activeNav === "AI Doctor" ? "INTELLIGENT DIAGNOSTICS" : "ONLINE4TECH DEVICE CENTER"}</div>
            <h1>{activeNav === "AI Doctor" ? <>AI Doctor <span className="title-ar">طبيب الرسيفر الذكي</span></> : activeNav === "Smart Manager" ? <>Smart Manager <span className="title-ar">إدارة الجهاز</span></> : activeNav}</h1>
            <p>{activeNav === "AI Doctor" ? "افحص جهازك، افهم المشاكل، واعرف الخطوة المناسبة قبل تنفيذ أي إصلاح." : activeNav === "Smart Manager" ? "تفاصيل الجهاز ومؤشرات النظام وحالة طبقة الاتصال." : activeNav === "Plugin Store" ? "استكشف كتالوج الإضافات وصنّفها وراجع معلوماتها." : activeNav === "Channel Intelligence" ? "ابحث في القنوات التجريبية وصنّفها حسب القمر والتردد والنوع." : "القسم قيد التجهيز ضمن منظومة Online4Tech."}</p>
          </div>
          {activeNav === "AI Doctor" && <button className="primary-button" onClick={() => startScan("full")}><Activity size={17}/>{scanState === "complete" ? "إعادة الفحص التجريبي" : "ابدأ فحص النظام"}</button>}
        </section>
        {activeNav === "Smart Manager" ? <ReceiverDetails/> : activeNav === "Plugin Store" ? <PluginStore/> : activeNav === "Channel Intelligence" ? <ChannelIntelligence/> : activeNav !== "AI Doctor" ? <section className="glass module-placeholder"><Package size={28}/><h2>{activeNav}</h2><p>سيتم تجهيز هذا القسم في المرحلة التالية مع الحفاظ على نفس واجهة المنظومة.</p><span>قيد التطوير · Demo Mode</span></section> : <>

        <section className="device-banner glass">
          <div className="device-identity">
            <div className="device-visual"><Tv size={29}/><span className="device-signal"/></div>
            <div><div className="device-overline">الجهاز المحدد</div><h2>{demoDevice.name}</h2><div className="device-meta"><span>{demoDevice.image}</span><i/> <span>{demoDevice.version}</span><i/> <span>{demoDevice.ip}</span></div></div>
          </div>
          <div className="device-status"><span className="live-dot"/><div><strong>متصل تجريبياً</strong><small>بيانات توضيحية وليست اتصالاً حقيقياً</small></div></div>
          <button className="text-button" onClick={() => setShowDemo(!showDemo)}>{showDemo ? "إخفاء التنبيه" : "عرض التنبيه"} <ArrowUpLeft size={15}/></button>
        </section>

        {showDemo && <div className="demo-notice"><AlertTriangle size={16}/><span>وضع تجريبي: كل الأرقام ونتائج الفحص المعروضة أمثلة ثابتة. لم يتم الاتصال بأي رسيفر ولم يتم تنفيذ أوامر عليه.</span><button onClick={() => setShowDemo(false)} aria-label="إغلاق"><X size={15}/></button></div>}

        <section className="section-block">
          <div className="section-heading"><div><h3>نظرة عامة على حالة الجهاز</h3><p>مؤشرات النظام الأساسية</p></div><span className="updated"><Clock3 size={14}/> بيانات تجريبية</span></div>
          <div className="metrics-grid">{metrics.map(item => <MetricCard key={item.key} item={item}/>)}</div>
        </section>

        <section className="lower-grid">
          <div className="glass panel">
            <div className="panel-heading"><div><h3>مركز التشخيص</h3><p>اختر نوع الفحص المطلوب</p></div><span className="panel-icon"><Stethoscope size={19}/></span></div>
            <div className="scan-options">
              <button className="scan-option" onClick={() => startScan("full")}><span className="scan-icon blue"><Activity size={18}/></span><span><strong>فحص شامل للنظام</strong><small>فحص مؤشرات الجهاز والخدمات</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("logs")}><span className="scan-icon cyan"><FileSearch size={18}/></span><span><strong>تحليل سجلات الأخطاء</strong><small>مراجعة سجلات النظام المتاحة</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("plugins")}><span className="scan-icon violet"><Package size={18}/></span><span><strong>فحص البلجنات</strong><small>مراجعة معلومات الإضافات والتوافق</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("safety")}><span className="scan-icon green"><ShieldCheck size={18}/></span><span><strong>سلامة النظام</strong><small>مراجعة مؤشرات الملفات والإعدادات</small></span><ChevronLeft size={17}/></button>
            </div>
          </div>

          <div className="glass panel findings-panel">
            <div className="panel-heading"><div><h3>آخر نتائج التشخيص</h3><p>ملخص الملاحظات المكتشفة</p></div><button className="link-button">عرض التقرير <ArrowUpLeft size={14}/></button></div>
            {scanState === "complete" && activeReport && <div className="scan-result">
              <div className="scan-complete"><CheckCircle2 size={16}/> اكتمل الفحص التجريبي: {activeReport.title}</div>
              <strong>{activeReport.status}</strong>
              <p>{activeReport.summary}</p>
              <div className="report-checks">{activeReport.checks.map(item => <span key={item}><CheckCircle2 size={12}/>{item}</span>)}</div>
              <div className="recommendation"><strong>الخطوة المقترحة</strong><p>{activeReport.recommendation}</p></div>
              <small className="report-time">وقت إنشاء التقرير: {activeReport.time} · بيانات تجريبية محلية</small>
            </div>}
            <div className="findings-list">{findings.map((f, i) => <div className="finding" key={i}>
              <span className={`finding-icon ${f.tone}`}>{f.tone === "warning" ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}</span>
              <div className="finding-copy"><strong>{f.title}</strong><p>{f.description}</p><small>الدليل: {f.evidence}</small></div>
              <span className={`severity ${f.tone}`}>{f.severity}</span>
            </div>)}</div>
            <div className="report-footer"><Database size={14}/> نتائج محلية تجريبية <span>•</span> لا توجد تغييرات على الجهاز</div>
            {scanHistory.length > 0 && <div className="scan-history">
              <strong>سجل الفحوصات في الجلسة الحالية</strong>
              {scanHistory.map(item => <div className="history-row" key={item.id}><span>{item.title}</span><small>{item.time}</small></div>)}
            </div>}
          </div>
        </section>

        <section className="assistant-card glass">
          <div className="assistant-symbol"><Bot size={24}/></div>
          <div className="assistant-copy"><span className="assistant-label">COMING IN NEXT PHASE</span><h3>المساعد الذكي قادم قريباً</h3><p>اسأل عن أخطاء Enigma2 واحصل على شرح مبسط وتوصيات مبنية على بيانات التشخيص.</p></div>
          <button className="secondary-button" disabled>قريباً <ArrowDownLeft size={15}/></button>
        </section>

        </>}
        <footer className="page-footer"><span>ONLINE4TECH SMART ECOSYSTEM</span><span>واجهة أولية • بيانات تجريبية • v0.1.0</span></footer>
      </div>
    </main>
  </div>;
}