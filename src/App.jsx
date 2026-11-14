import { useEffect, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowUpLeft, Bot, CheckCircle2,
  ChevronLeft, CircleHelp, Clock3, Cpu, Database, FileSearch, HardDrive, Copy, Terminal,
  LayoutDashboard, ListVideo, MemoryStick, Menu, Package, Search, Settings,
  ShieldCheck, Stethoscope, Tv, Wifi, X, Server, RefreshCw, LockKeyhole, Link2
} from "lucide-react";
import pluginsData from "./data/plugins.json";
import commandsData from "./data/commands.json";
import { trustLocalBridge, getLocalBridgeStatus, connectLocalReceiver } from "./services/localBridge";
import { getReceiverSnapshot, getConnectionCapabilities } from "./services/receiverAdapter";

const scanLabels = {
  full: "قراءة بيانات الجهاز",
  logs: "توفر سجلات النظام",
  plugins: "توفر قائمة البلجنات",
  safety: "حدود سلامة القراءة"
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

  const refreshReceiverData = async () => {
    setRefreshing(true);
    try {
      setSnapshot(await getReceiverSnapshot());
    } catch {
      setSnapshot(null);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshReceiverData();
    const handle = () => refreshReceiverData();
    window.addEventListener("o4t-receiver-updated", handle);
    const interval = window.setInterval(refreshReceiverData, 30000);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("o4t-receiver-updated", handle);
    };
  }, []);

  if (!snapshot) return <div className="glass receiver-details-loading">جاري قراءة بيانات الرسيفر...</div>;

  return <div className="receiver-details-page">
    <section className="device-banner glass receiver-detail-hero">
      <div className="device-identity">
        <div className="device-visual"><Tv size={29}/><span className="device-signal"/></div>
        <div><div className="device-overline">ملف الجهاز · قراءة فعلية</div><h2>{snapshot.device.name}</h2>
          <div className="device-meta"><span>{snapshot.device.image}</span><i/><span>{snapshot.device.enigmaVersion}</span><i/><span>{snapshot.device.ip}</span></div>
        </div>
      </div>
      <div className="device-status"><span className={snapshot.connected ? "live-dot" : "demo-status-dot"}/><div><strong>{snapshot.connected ? "متصل فعليًا" : "غير متصل"}</strong><small>{snapshot.connected ? "OpenWebif · قراءة فقط" : "لا توجد جلسة رسيفر محفوظة"}</small></div></div>
    </section>

    {!snapshot.connected && <div className="connection-notice"><AlertTriangle size={16}/><span>اتصل بالرسيفر من زر الجسر المحلي لعرض بياناته الحقيقية.</span></div>}

    <section className="section-block">
      <div className="section-heading"><div><h3>معلومات الجهاز</h3><p>بيانات التعريف والإصدار من OpenWebif</p></div><span className="updated"><Database size={14}/> Live Snapshot</span></div>
      <div className="device-info-grid">
        <article className="glass info-tile"><small>اسم الجهاز</small><strong>{snapshot.device.model}</strong></article>
        <article className="glass info-tile"><small>صورة النظام</small><strong>{snapshot.device.image}</strong></article>
        <article className="glass info-tile"><small>معمارية المعالج</small><strong>{snapshot.device.architecture}</strong></article>
        <article className="glass info-tile"><small>مدة التشغيل</small><strong>{snapshot.device.uptime}</strong></article>
        <article className="glass info-tile"><small>عنوان الشبكة (من إعداد الاتصال)</small><strong dir="ltr">{snapshot.device.ip}</strong></article>
        <article className="glass info-tile"><small>آخر تحديث للبيانات</small><strong>{snapshot.device.lastSeen}</strong></article>
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading"><div><h3>موارد النظام</h3><p>القيم التي لا يوفرها OpenWebif ستظهر كغير متاحة</p></div></div>
      <div className="resource-grid">{snapshot.resources.map(item => <article className="glass resource-tile" key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></article>)}</div>
    </section>
    <section className="lower-grid receiver-lower-grid">
      <div className="glass panel">
        <div className="panel-heading"><div><h3>الخدمات الأساسية</h3><p>الحالة المقروءة من الجهاز</p></div><span className="panel-icon"><Server size={19}/></span></div>
        <div className="service-list">{snapshot.services.map(service => <div className="service-row" key={service.name}><span>{service.name}</span><small>{service.state}</small></div>)}</div>
      </div>
      <div className="glass panel connection-panel">
        <div className="panel-heading"><div><h3>طبقة الاتصال</h3><p>جاهزية الربط الآمن مستقبلًا</p></div><span className="panel-icon"><LockKeyhole size={19}/></span></div>
        <div className="connection-state"><span className="offline-status-dot"/><div><strong>{snapshot.connected ? "OpenWebif متصل" : "الجسر غير متصل بالرسيفر"}</strong><small>{snapshot.connected ? "تمت قراءة بيانات الرسيفر" : "لا توجد بيانات حية"}</small></div></div>
        <ul className="capability-list">
          <li><CheckCircle2 size={14}/> قراءة بيانات OpenWebif الفعلية المتاحة</li>
          <li><CheckCircle2 size={14}/> الاتصال المحلي بالرسيفر مفعّل</li>
          <li><X size={14}/> تنفيذ الأوامر وتعديل الملفات معطّل</li>
        </ul>
        <button className="secondary-button refresh-data" onClick={refreshReceiverData} disabled={refreshing}><RefreshCw size={15}/>{refreshing ? "جاري التحديث..." : "تحديث البيانات الحقيقية"}</button>
        <small className="adapter-note">Provider: {capabilities.provider} · Network: read-only · Commands: disabled</small>
      </div>
    </section>
  </div>;
}


const catalogEntries = pluginsData.items || [];
const commandEntries = commandsData.items || [];

function PluginStore() {
  const [view, setView] = useState("plugins");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("الكل");
  const [commandType, setCommandType] = useState("الكل");
  const [selected, setSelected] = useState(null);
  const [copiedId, setCopiedId] = useState("");
  const categories = ["الكل", ...new Set((view === "plugins" ? catalogEntries : commandEntries).map(item => item.category))];
  const filteredPlugins = catalogEntries.filter(item =>
    (category === "الكل" || item.category === category) &&
    (item.name + " " + item.category + " " + item.path).toLowerCase().includes(query.toLowerCase())
  );
  const filteredCommands = commandEntries.filter(item =>
    (category === "الكل" || item.category === category) &&
    (commandType === "الكل" || item.type === commandType) &&
    (item.name + " " + item.category + " " + item.path + " " + item.command).toLowerCase().includes(query.toLowerCase())
  );
  const copyCommand = async (item) => {
    try {
      await navigator.clipboard.writeText(item.command);
      setCopiedId(item.id);
      window.setTimeout(() => setCopiedId(current => current === item.id ? "" : current), 1800);
    } catch {
      setCopiedId("");
    }
  };

  return <section className="module-page catalog-page">
    <div className="glass bridge-download-strip">
      <div className="bridge-download-copy">
        <span className="bridge-kicker">ONLINE4TECH LOCAL BRIDGE</span>
        <strong>قبل توصيل الرسيفر، حمّل الجسر وثبّته على الكمبيوتر</strong>
        <small>يعمل في الخلفية ويتيح اتصالًا محليًا آمنًا من نفس الكمبيوتر.</small>
      </div>
      <a className="primary-button bridge-download-link" href="https://github.com/online4tech/Smart-Manager/releases/latest/download/Online4Tech-Bridge-Windows.zip">
        <Package size={16}/> تحميل الجسر لويندوز
      </a>
    </div>
    <div className="catalog-switcher glass">
      <button className={view === "plugins" ? "active" : ""} onClick={() => { setView("plugins"); setCategory("الكل"); setQuery(""); }}>
        <Package size={17}/> البلجنات والأدوات <span>{catalogEntries.length.toLocaleString("ar-EG")}</span>
      </button>
      <button className={view === "commands" ? "active" : ""} onClick={() => { setView("commands"); setCategory("الكل"); setQuery(""); }}>
        <Terminal size={17}/> مكتبة الأوامر <span>{commandEntries.length.toLocaleString("ar-EG")}</span>
      </button>
    </div>
    <div className="module-toolbar glass catalog-toolbar">
      <div className="module-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={view === "plugins" ? "ابحث باسم البلجن أو الأداة أو المسار..." : "ابحث باسم البلجن أو الأمر أو القسم..."}/></div>
      {view === "commands" && <div className="catalog-type-filter">
        {[["الكل","الكل"],["install","التثبيت"],["remove","الإزالة"]].map(([value,label]) => <button key={value} className={commandType === value ? "selected" : ""} onClick={() => setCommandType(value)}>{label}</button>)}
      </div>}
      <div className="category-pills">{categories.map(item => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
    </div>
    {view === "plugins" ? <>
      <div className="module-summary"><strong>{filteredPlugins.length.toLocaleString("ar-EG")}</strong><span>بلجن وأداة</span><small>مرتبة حسب القسم</small></div>
      <div className="catalog-grid">{filteredPlugins.map(item => <article className="glass catalog-card" key={item.id}>
        <div className="catalog-card-head"><span className="plugin-symbol"><Package size={19}/></span><span className="catalog-category">{item.category}</span></div>
        <h3>{item.name}</h3>
        <p className="catalog-path" dir="ltr">{item.path || "—"}</p>
        <button className="secondary-button catalog-open" onClick={() => setSelected(item)}>التفاصيل <ChevronLeft size={15}/></button>
      </article>)}</div>
      {filteredPlugins.length === 0 && <div className="glass empty-state">لا توجد نتائج مطابقة.</div>}
    </> : <>
      <div className="module-summary"><strong>{filteredCommands.length.toLocaleString("ar-EG")}</strong><span>أمر في النتائج</span><small>{commandType === "install" ? "أوامر التثبيت" : commandType === "remove" ? "أوامر الإزالة" : "التثبيت والإزالة"}</small></div>
      <div className="catalog-command-grid">{filteredCommands.map(item => <article className="glass catalog-command-card" key={item.id}>
        <div className="catalog-command-head"><div><span className="catalog-category">{item.category}</span><h3>{item.name}</h3></div><span className={"command-kind " + item.type}>{item.typeLabel}</span></div>
        <code className="catalog-command-code" dir="ltr">{item.command}</code>
        <div className="catalog-command-footer">
          {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer">المصدر <Link2 size={13}/></a> : <span/>}
          <button className="secondary-button copy-command" onClick={() => copyCommand(item)}><Copy size={14}/>{copiedId === item.id ? "تم النسخ" : "نسخ الأمر"}</button>
        </div>
      </article>)}</div>
      {filteredCommands.length === 0 && <div className="glass empty-state">لا توجد أوامر مطابقة.</div>}
    </>}
    {selected && <div className="modal-backdrop" onClick={() => setSelected(null)}><section className="glass plugin-modal catalog-detail-modal" onClick={e => e.stopPropagation()}>
      <button className="modal-close" onClick={() => setSelected(null)} aria-label="إغلاق"><X size={18}/></button>
      <span className="plugin-symbol"><Package size={22}/></span><small>{selected.category}</small><h2>{selected.name}</h2>
      <div className="catalog-detail-path"><span>مسار العنصر</span><code dir="ltr">{selected.path || "—"}</code></div>
      <div className="catalog-install-actions">
        <button className="primary-button" disabled title="التثبيت الفعلي غير مفعّل حتى اعتماد الحزمة والتحقق من توافقها">التثبيت غير متاح حاليًا</button>
        <a className="secondary-button" href="https://github.com/online4tech/Smart-Manager/releases/latest/download/Online4Tech-Bridge-Windows.zip"><Package size={14}/> تحميل الجسر</a>
      </div>
      <small className="catalog-install-note">زر التثبيت غير مفعّل حاليًا. سيتم تفعيله فقط للعناصر المعتمدة والمتوافقة، وبعد تأكيد المستخدم.</small>
      <div className="catalog-related-commands">
        {commandEntries.filter(item => item.id === selected.id || item.id === selected.id + "-remove").map(item => <div key={item.id}>
          <div className="catalog-command-head"><strong>{item.typeLabel}</strong><span className={"command-kind " + item.type}>{item.typeLabel}</span></div>
          <code className="catalog-command-code" dir="ltr">{item.command}</code>
          <button className="secondary-button copy-command" onClick={() => copyCommand(item)}><Copy size={14}/>{copiedId === item.id ? "تم النسخ" : "نسخ الأمر"}</button>
        </div>)}
      </div>
    </section></div>}
  </section>;
}

function ChannelIntelligence() {
  const [snapshot, setSnapshot] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedBouquet, setSelectedBouquet] = useState("الكل");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refreshChannels = async () => {
    setRefreshing(true);
    setError("");
    try {
      const data = await getReceiverSnapshot();
      setSnapshot(data);
      if (!data.connected) setError(data.message || "اتصل بالرسيفر أولاً.");
    } catch (err) {
      setError(err.message || "تعذر قراءة قائمة القنوات.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshChannels();
    const handle = () => refreshChannels();
    window.addEventListener("o4t-receiver-updated", handle);
    return () => window.removeEventListener("o4t-receiver-updated", handle);
  }, []);

  const bouquets = snapshot?.datasets?.services?.services || [];
  const bouquetNames = ["الكل", ...bouquets.map(item => item.servicename || "Bouquet")];
  const channels = bouquets.flatMap(bouquet => (bouquet.subservices || []).map(service => ({
    id: service.servicereference,
    name: service.servicename || "قناة بدون اسم",
    reference: service.servicereference || "",
    bouquet: bouquet.servicename || "غير مصنف"
  })));
  const filtered = channels.filter(item =>
    (selectedBouquet === "الكل" || item.bouquet === selectedBouquet) &&
    (item.name + " " + item.reference + " " + item.bouquet).toLowerCase().includes(query.toLowerCase())
  );

  return <section className="module-page">
    {!snapshot?.connected && <div className="connection-notice"><AlertTriangle size={16}/><span>{error || "جاري التحقق من اتصال الرسيفر..."}</span></div>}
    {snapshot?.connected && <div className="section-heading"><div><h3>قائمة القنوات الحقيقية</h3><p>مقروءة من باقات الرسيفر عبر OpenWebif · بدون تعديل</p></div><span className="updated"><Database size={14}/> Live data</span></div>}
    <div className="module-toolbar glass">
      <div className="module-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث باسم القناة أو مرجع الخدمة..." /></div>
      <div className="category-pills">{bouquetNames.map(item => <button key={item} className={selectedBouquet === item ? "selected" : ""} onClick={() => setSelectedBouquet(item)}>{item}</button>)}</div>
    </div>
    <div className="channel-stats">
      <article className="glass"><strong>{filtered.length.toLocaleString("ar-EG")}</strong><span>قناة في النتائج</span></article>
      <article className="glass"><strong>{bouquets.length.toLocaleString("ar-EG")}</strong><span>باقة / قائمة</span></article>
      <article className="glass"><strong>{snapshot?.connected ? "فعلي" : "—"}</strong><span>مصدر البيانات</span></article>
    </div>
    <div className="glass channel-table-wrap">
      <div className="table-heading"><div><h3>قنوات الرسيفر</h3><p>الأسماء ومراجع الخدمة التي وفرها OpenWebif</p></div><button className="secondary-button" onClick={refreshChannels} disabled={refreshing}><RefreshCw size={14}/>{refreshing ? "جاري التحديث" : "تحديث"}</button></div>
      <div className="channel-table-scroll"><table className="channel-table"><thead><tr><th>اسم القناة</th><th>الباقة</th><th>مرجع الخدمة</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.bouquet}</td><td dir="ltr">{item.reference}</td></tr>)}</tbody>
      </table></div>
      {snapshot?.connected && filtered.length === 0 && <div className="empty-state">لا توجد قنوات متاحة في الاستجابة الحالية أو لا توجد نتائج مطابقة.</div>}
    </div>
  </section>;
}

const logRules = [
  { key: "disk", title: "مساحة التخزين", pattern: /no space left|disk full|not enough space|enospc/i, advice: "راجع مساحة التخزين من واجهة الجهاز، ولا تحذف ملفات النظام دون معرفة وظيفتها." },
  { key: "memory", title: "ضغط الذاكرة", pattern: /out of memory|cannot allocate memory|oom-killer|killed process/i, advice: "قد يكون هناك ضغط على الذاكرة. راجع العمليات والخدمات المفتوحة وسجّل وقت المشكلة." },
  { key: "plugin", title: "مشكلة إضافة أو اعتماد", pattern: /importerror|modulenotfounderror|no module named|plugin.*(error|failed)|failed to load plugin/i, advice: "قد تكون الإضافة غير متوافقة أو ينقصها اعتماد. تحقق من مصدرها وإصدار صورة النظام." },
  { key: "service", title: "تعثر خدمة", pattern: /failed to start|service.*failed|segmentation fault|core dumped/i, advice: "توجد إشارة لتعثر خدمة أو عملية. احتفظ بالسجل وراجع السطور المحيطة بالرسالة." },
  { key: "network", title: "مشكلة اتصال", pattern: /connection timed out|network is unreachable|name or service not known|temporary failure in name resolution/i, advice: "راجع إعدادات الشبكة والاتصال من الجهاز نفسه، وتأكد من وقت حدوث المشكلة." },
  { key: "tuner", title: "إشارة أو موالف", pattern: /tune failed|no data|frontend.*(error|failed)|lock failed/i, advice: "قد تكون المشكلة مرتبطة بالإشارة أو إعدادات الموالف. تحقق منها يدويًا." }
];

function LogAnalyzer() {
  const [logText, setLogText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const analyze = () => {
    const lines = logText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const matches = logRules.filter(rule => rule.pattern.test(logText));
    const errorLines = lines.filter(line => /\b(error|failed|fatal|critical|exception|traceback)\b/i.test(line)).slice(0, 12);
    setAnalysis({ total: lines.length, matches, errorLines });
  };
  return <section className="section-block log-analyzer">
    <div className="section-heading"><div><h3>محلل سجلات Enigma2</h3><p>الصق جزءًا من السجل للحصول على قراءة أولية محلية</p></div><span className="updated"><ShieldCheck size={14}/> تحليل داخل المتصفح</span></div>
    <div className="glass log-tool">
      <div className="connection-notice"><AlertTriangle size={15}/><span>الصق السطور الضرورية فقط بعد إزالة كلمات المرور وعناوين IP العامة وأي بيانات شخصية. التحليل إرشادي ولا يغيّر ملفات الرسيفر.</span></div>
      <textarea className="log-input" value={logText} onChange={e => {setLogText(e.target.value);setAnalysis(null);}} placeholder="الصق رسائل Enigma2 أو سجل البلجن هنا..." rows={7} />
      <div className="log-actions"><small>{logText.length.toLocaleString("ar-EG")} حرف</small><button className="secondary-button" onClick={() => {setLogText("");setAnalysis(null);}} disabled={!logText}>مسح النص</button><button className="primary-button" onClick={analyze} disabled={!logText.trim()}><FileSearch size={15}/> حلّل السجل</button></div>
      {analysis && <div className="log-analysis-result">
        <div className="log-result-heading"><CheckCircle2 size={16}/><strong>انتهى التحليل المحلي</strong><span>{analysis.total} سطر</span></div>
        {analysis.matches.length ? analysis.matches.map(item => <article className="log-finding" key={item.key}><strong>{item.title}</strong><p>{item.advice}</p></article>) : <p className="log-empty">لم تظهر أنماط معروفة في النص المدخل. ده لا يثبت خلو السجل من المشاكل.</p>}
        {analysis.errorLines.length > 0 && <div className="matched-lines"><strong>سطور تستحق المراجعة</strong>{analysis.errorLines.map((line,i)=><code key={i}>{line.slice(0,240)}</code>)}</div>}
        <small className="log-disclaimer">النتيجة مبنية على مطابقة كلمات مفتاحية فقط، وليست تشخيصًا نهائيًا.</small>
      </div>}
    </div>
  </section>;
}


function LocalBridgeControl() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("o4t-bridge-trust") || "null");
      return saved?.token && saved?.csrf ? saved : null;
    } catch { return null; }
  });
  const [bridgeStatus, setBridgeStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [receiverHost, setReceiverHost] = useState(() => { try { return JSON.parse(localStorage.getItem("o4t-receiver-config") || "null")?.host || ""; } catch { return ""; } });
  const [receiverScheme, setReceiverScheme] = useState(() => { try { return JSON.parse(localStorage.getItem("o4t-receiver-config") || "null")?.scheme || "http"; } catch { return "http"; } });
  const [receiverInfo, setReceiverInfo] = useState(null);

  const pair = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const trusted = await trustLocalBridge();
      const credentials = { token: trusted.token, csrf: trusted.csrf };
      localStorage.setItem("o4t-bridge-trust", JSON.stringify(credentials));
      setSession(credentials);
      setMessage("تم تفعيل الثقة المحلية على هذا المتصفح. لن تحتاج كود ربط مرة أخرى.");
      try {
        const status = await getLocalBridgeStatus(credentials);
        setBridgeStatus(status);
        setReceiverInfo(status.receiver?.device || null);
      } catch {
        setBridgeStatus(null);
        setMessage("تم حفظ الثقة المحلية، لكن تعذر تحديث حالة الجسر.");
      }
    } catch (err) {
      setError(err.message || "تعذر الاتصال بالجسر المحلي.");
    } finally {
      setBusy(false);
    }
  };

  const refreshStatus = async () => {
    if (!session) return;
    setBusy(true); setError("");
    try {
      const status = await getLocalBridgeStatus(session);
      setBridgeStatus(status);
      setReceiverInfo(status.receiver?.device || null);
      setMessage("تم تحديث حالة الجسر.");
    } catch (err) {
      setError(err.message || "تعذر تحديث حالة الجسر.");
    } finally {
      setBusy(false);
    }
  };

  const connectReceiver = async () => {
    if (!session) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await connectLocalReceiver(session, { host: receiverHost, scheme: receiverScheme });
      setReceiverInfo(result.receiver?.device || null);
      setBridgeStatus(previous => ({ ...(previous || {}), receiver: result.receiver }));
      localStorage.setItem("o4t-receiver-config", JSON.stringify({ host: receiverHost.trim(), scheme: receiverScheme }));
      window.dispatchEvent(new Event("o4t-receiver-updated"));
      setMessage("تم الاتصال بالرسيفر وقراءة بيانات OpenWebif فقط.");
    } catch (err) {
      setError(err.message || "تعذر قراءة بيانات الرسيفر.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem("o4t-bridge-trust");
    localStorage.removeItem("o4t-receiver-config");
    window.dispatchEvent(new Event("o4t-receiver-updated"));
    setSession(null); setBridgeStatus(null); setReceiverInfo(null);
    setMessage("تم مسح بيانات الاتصال المحفوظة من هذا المتصفح.");
    setError("");
  };

  return <>
    <button className="bridge-open-button" onClick={() => setOpen(true)}>
      <span className={session ? "bridge-dot paired" : "bridge-dot"} />
      <Link2 size={15}/> {session ? "الجسر موثوق" : "اتصال الجسر المحلي"}
    </button>
    {open && <div className="modal-backdrop bridge-backdrop" onClick={() => setOpen(false)}>
      <section className="glass bridge-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18}/></button>
        <div className="bridge-modal-icon"><Link2 size={22}/></div>
        <span className="bridge-kicker">ONLINE4TECH LOCAL BRIDGE</span>
        <h2>الاتصال بالجسر المحلي</h2>
        <p className="bridge-description">شغّل الجسر مرة واحدة على نفس الكمبيوتر، ثم اضغط اتصال. لا تحتاج كلمة مرور أو أرقام ربط.</p>
        <div className="bridge-endpoint" dir="ltr">http://127.0.0.1:8765</div>
        {!session ? <>
          <button className="primary-button bridge-submit" onClick={pair} disabled={busy}>{busy ? "جاري الاتصال..." : "اتصال آمن بالجسر"}</button>
        </> : <>
          <div className="bridge-status-card">
            <span className="bridge-dot paired"/>
            <div><strong>الجسر المحلي موثوق</strong><small>الثقة محفوظة على هذا المتصفح لهذا الكمبيوتر</small></div>
          </div>
          {bridgeStatus && <div className="bridge-capabilities">
            <div><span>حالة الجسر</span><strong>متصل</strong></div>
            <div><span>الرسيفر</span><strong>{bridgeStatus.receiver?.connected ? "متصل" : "غير متصل"}</strong></div>
            <div><span>SSH والأوامر</span><strong>غير مفعّلة</strong></div>
          </div>}
          <div className="bridge-receiver-form">
            <label className="bridge-label" htmlFor="receiver-host">عنوان IP الرسيفر داخل الشبكة</label>
            <input id="receiver-host" className="bridge-code-input bridge-host-input" value={receiverHost} onChange={e => setReceiverHost(e.target.value.trim())} placeholder="192.168.1.50" dir="ltr" autoComplete="off" spellCheck="false" />
            <div className="bridge-scheme-row"><label htmlFor="receiver-scheme">طريقة الاتصال</label><select id="receiver-scheme" value={receiverScheme} onChange={e => setReceiverScheme(e.target.value)}><option value="http">HTTP · 80</option><option value="https">HTTPS · 443</option></select></div>
            <button className="primary-button bridge-submit" onClick={connectReceiver} disabled={busy || !receiverHost.trim()}>{busy ? "جاري الفحص..." : "اختبار اتصال قراءة فقط"}</button>
            {receiverInfo && <div className="bridge-receiver-details"><strong>تمت قراءة بيانات الرسيفر</strong><div><span>الموديل</span><b>{receiverInfo.model || receiverInfo.name || "غير متاح"}</b></div><div><span>صورة النظام</span><b>{receiverInfo.image || "غير متاحة"}</b></div><div><span>إصدار Enigma2</span><b>{receiverInfo.enigma_version || "غير متاح"}</b></div><div><span>Kernel</span><b>{receiverInfo.kernel || "غير متاح"}</b></div></div>}
          </div>
          <div className="bridge-actions">
            <button className="secondary-button" onClick={refreshStatus} disabled={busy}>{busy ? "جاري التحديث..." : "تحديث الحالة"}</button>
            <button className="secondary-button bridge-disconnect" onClick={disconnect}>إنهاء الاقتران</button>
          </div>
        </>}
        {message && <div className="bridge-message">{message}</div>}
        {error && <div className="bridge-error" role="alert">{error}</div>}
        <div className="bridge-safety-note"><ShieldCheck size={15}/><span>قراءة معلومات OpenWebif فقط من IP محلي خاص. لا SSH ولا أوامر ولا تعديل ملفات ولا تثبيت أو حذف في هذه المرحلة.</span></div>
      </section>
    </div>}
  </>;
}

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scanState, setScanState] = useState("idle");
  const [activeNav, setActiveNav] = useState("AI Doctor");
    const [activeReport, setActiveReport] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [liveSnapshot, setLiveSnapshot] = useState(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await getReceiverSnapshot();
        if (active) setLiveSnapshot(data);
      } catch {
        if (active) setLiveSnapshot(null);
      }
    };
    refresh();
    const handle = () => refresh();
    window.addEventListener("o4t-receiver-updated", handle);
    const interval = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("o4t-receiver-updated", handle);
    };
  }, []);

  const device = liveSnapshot?.device || { name: "لا يوجد رسيفر متصل", model: "—", image: "—", enigmaVersion: "—", ip: "—" };
  const metricItems = [
    { key: "cpu", label: "استخدام المعالج", value: liveSnapshot?.resources?.[0]?.value || "غير متاح", detail: "حسب البيانات التي يوفرها OpenWebif", amount: 0, tone: "blue" },
    { key: "memory", label: "الذاكرة", value: liveSnapshot?.resources?.[1]?.value || "غير متاح", detail: "حسب البيانات التي يوفرها OpenWebif", amount: 0, tone: "cyan" },
    { key: "storage", label: "التخزين", value: liveSnapshot?.resources?.[2]?.value || "غير متاح", detail: "حسب البيانات التي يوفرها OpenWebif", amount: 0, tone: "amber" },
    { key: "services", label: "القنوات", value: liveSnapshot?.counts?.bouquets == null ? "غير متاح" : String(liveSnapshot.counts.bouquets), detail: "عدد الباقات المقروءة", amount: 0, tone: "green" }
  ];
  const liveFindings = (() => {
    if (!liveSnapshot?.connected) return [{
      title: "الرسيفر غير متصل",
      description: "لا توجد جلسة قراءة ناجحة حاليًا. لا يمكن إصدار تشخيص للجهاز قبل الاتصال.",
      severity: "بانتظار الاتصال",
      tone: "warning",
      evidence: liveSnapshot?.message || "OpenWebif connection unavailable"
    }];
    const datasets = liveSnapshot.datasets || {};
    const findings = [{
      title: "اتصال OpenWebif نشط",
      description: "تم الوصول إلى الرسيفر وقراءة بيانات التعريف.",
      severity: "متصل",
      tone: "success",
      evidence: liveSnapshot.source
    }];
    const available = ["boxinfo", "status", "services", "timers", "recordings"].filter(key => datasets[key] != null);
    const unavailable = ["boxinfo", "status", "services", "timers", "recordings"].filter(key => datasets[key] == null);
    findings.push({
      title: "تغطية مصادر البيانات",
      description: `تمت قراءة ${available.length} من 5 مجموعات بيانات مسموح بها.`,
      severity: unavailable.length ? "قراءة جزئية" : "مكتمل",
      tone: unavailable.length ? "warning" : "success",
      evidence: `المتاح: ${available.join("، ") || "لا شيء"} · غير المتاح: ${unavailable.join("، ") || "لا شيء"}`
    });
    if (liveSnapshot.counts?.bouquets != null) findings.push({
      title: "قوائم القنوات",
      description: `OpenWebif أعاد ${liveSnapshot.counts.bouquets} قائمة/باقة.`,
      severity: "مقروء",
      tone: "success",
      evidence: "GET /api/getallservices"
    });
    return findings;
  })();

  const startScan = async (type = "full") => {
    setScanState("running");
    try {
      const snapshot = await getReceiverSnapshot();
      setLiveSnapshot(snapshot);
      const connected = snapshot.connected === true;
      const datasets = snapshot.datasets || {};
      const dataNames = ["boxinfo", "status", "services", "timers", "recordings"];
      const available = dataNames.filter(key => datasets[key] != null);
      const missing = dataNames.filter(key => datasets[key] == null);
      let report;

      if (type === "logs") {
        report = {
          title: scanLabels.logs,
          status: "غير متاح عبر واجهة القراءة الحالية",
          summary: "OpenWebif في هذا الربط لا يوفّر سجلات النظام. لم يتم الادعاء بفحصها أو استنتاج عدم وجود أخطاء.",
          recommendation: "استخدم محلل السجلات اليدوي أسفل الصفحة بعد الحصول على سجل من واجهة الرسيفر، مع حذف أي بيانات شخصية.",
          checks: ["اتصال الرسيفر: " + (connected ? "ناجح" : "غير متصل"), "قراءة سجلات النظام: غير مدعومة حاليًا", "لم يتم فحص ملفات السجل"]
        };
      } else if (type === "plugins") {
        report = {
          title: scanLabels.plugins,
          status: "قائمة البلجنات غير متاحة",
          summary: "لم يتمكن الربط الحالي من قراءة قائمة الحزم المثبتة من OpenWebif. كتالوج Plugin Store ليس دليلًا على ما هو مثبت على هذا الرسيفر.",
          recommendation: "لا تعتبر عناصر الكتالوج مثبتة على الجهاز. يلزم مصدر قراءة مخصص للحزم قبل تقرير التوافق.",
          checks: ["اتصال الرسيفر: " + (connected ? "ناجح" : "غير متصل"), "قائمة البلجنات المثبتة: غير متاحة", "فحص التوافق: لم يُنفذ"]
        };
      } else if (type === "safety") {
        report = {
          title: scanLabels.safety,
          status: "نطاق قراءة فقط",
          summary: "تم التحقق من حالة الاتصال ومجموعات البيانات التي يتيحها OpenWebif فقط. لم يتم فحص ملفات النظام أو سلامة الحزم.",
          recommendation: "لا تستخدم التقرير كإثبات لسلامة النظام بالكامل؛ فهو لا يقرأ الملفات أو سجلات النظام ولا ينفذ تغييرات.",
          checks: ["SSH وتنفيذ الأوامر: معطّل", "تعديل الملفات: معطّل", "تثبيت أو إزالة الحزم: معطّل"]
        };
      } else {
        report = connected ? {
          title: scanLabels.full,
          status: "اكتملت القراءة الفعلية",
          summary: `الاتصال ناجح. تمت قراءة ${available.length} من 5 مجموعات بيانات OpenWebif المتاحة في هذا الربط.`,
          recommendation: missing.length
            ? "بعض واجهات البيانات لم تستجب أو غير مدعومة في صورة النظام الحالية. راجع تفاصيل التغطية قبل الاعتماد على أي استنتاج."
            : "البيانات الخمس المتاحة تمت قراءتها. هذا لا يشمل سجلات النظام أو قائمة البلجنات المثبتة أو فحص ملفات النظام.",
          checks: [
            "معلومات الجهاز: " + (datasets.boxinfo ? "مقروءة" : "غير متاحة"),
            "الحالة الحالية: " + (datasets.status ? "مقروءة" : "غير متاحة"),
            "قوائم القنوات: " + (datasets.services ? "مقروءة" : "غير متاحة"),
            "مؤقتات التسجيل: " + (datasets.timers ? "مقروءة" : "غير متاحة"),
            "التسجيلات: " + (datasets.recordings ? "مقروءة" : "غير متاحة")
          ]
        } : {
          title: "تعذر بدء القراءة",
          status: "الرسيفر غير متصل",
          summary: snapshot.message || "لم يتم العثور على اتصال محفوظ بالرسيفر.",
          recommendation: "افتح اتصال الجسر المحلي وأعد اختبار اتصال الرسيفر.",
          checks: ["لم يتم تنفيذ قراءة", "لا توجد بيانات حية"]
        };
      }

      const record = { ...report, id: Date.now(), time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) };
      setActiveReport(record);
      setScanHistory(previous => [record, ...previous].slice(0, 4));
      setScanState("complete");
    } catch (error) {
      setActiveReport({
        id: Date.now(),
        title: scanLabels[type] || "قراءة بيانات الجهاز",
        status: "فشلت القراءة",
        summary: error.message || "تعذر الوصول إلى الجسر المحلي أو الرسيفر.",
        recommendation: "تأكد من تشغيل الجسر ومن حفظ اتصال الرسيفر، ثم أعد المحاولة.",
        checks: ["لم تكتمل القراءة", "لم يتم تنفيذ أي تغيير على الرسيفر"],
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      });
      setScanState("complete");
    }
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
        <div className="receiver-mini-top"><span className={liveSnapshot?.connected ? "live-dot" : "demo-status-dot"}/><span>{liveSnapshot?.connected ? "جهاز متصل" : "بانتظار الاتصال"}</span><span className="connection-status-tag">{liveSnapshot?.connected ? "LIVE" : "OFFLINE"}</span></div>
        <strong>{device.name}</strong>
        <small>{device.image}</small>
        <div className="receiver-ip"><Wifi size={13}/> {device.ip}</div>
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
          <LocalBridgeControl/><span className="connection-pill"><span className={liveSnapshot?.connected ? "live-dot" : "demo-status-dot"}/> {liveSnapshot?.connected ? "بيانات فعلية · قراءة فقط" : "بانتظار اتصال الرسيفر"}</span>
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
            <p>{activeNav === "AI Doctor" ? "افحص جهازك، افهم المشاكل، واعرف الخطوة المناسبة قبل تنفيذ أي إصلاح." : activeNav === "Smart Manager" ? "تفاصيل الجهاز ومؤشرات النظام وحالة طبقة الاتصال." : activeNav === "Plugin Store" ? "استكشف كتالوج الإضافات وصنّفها وراجع معلوماتها." : activeNav === "Channel Intelligence" ? "ابحث في باقات وقنوات الرسيفر المقروءة عبر OpenWebif." : "القسم قيد التجهيز ضمن منظومة Online4Tech."}</p>
          </div>
          {activeNav === "AI Doctor" && <button className="primary-button" onClick={() => startScan("full")}><Activity size={17}/>{scanState === "running" ? "جاري القراءة..." : scanState === "complete" ? "تحديث الفحص" : "قراءة بيانات الجهاز"}</button>}
        </section>
        {activeNav === "Smart Manager" ? <ReceiverDetails/> : activeNav === "Plugin Store" ? <PluginStore/> : activeNav === "Channel Intelligence" ? <ChannelIntelligence/> : activeNav !== "AI Doctor" ? <section className="glass module-placeholder"><Package size={28}/><h2>{activeNav}</h2><p>سيتم تجهيز هذا القسم في المرحلة التالية مع الحفاظ على نفس واجهة المنظومة.</p><span>القسم غير متاح حاليًا</span></section> : <>

        <section className="device-banner glass">
          <div className="device-identity">
            <div className="device-visual"><Tv size={29}/><span className="device-signal"/></div>
            <div><div className="device-overline">الجهاز المحدد</div><h2>{device.name}</h2><div className="device-meta"><span>{device.image}</span><i/> <span>{device.enigmaVersion}</span><i/> <span>{device.ip}</span></div></div>
          </div>
          <div className="device-status"><span className={liveSnapshot?.connected ? "live-dot" : "demo-status-dot"}/><div><strong>{liveSnapshot?.connected ? "متصل فعليًا" : "غير متصل"}</strong><small>{liveSnapshot?.connected ? "OpenWebif · قراءة فقط" : "لا توجد بيانات حية"}</small></div></div>
        </section>

        {!liveSnapshot?.connected && <div className="connection-notice"><AlertTriangle size={16}/><span>لا توجد بيانات رسيفر حية حاليًا. اتصل بالجسر المحلي لقراءة المعلومات الفعلية.</span></div>}

        <section className="section-block">
          <div className="section-heading"><div><h3>نظرة عامة على حالة الجهاز</h3><p>مؤشرات النظام الأساسية</p></div><span className="updated"><Clock3 size={14}/> {liveSnapshot?.connected ? "بيانات OpenWebif" : "لا توجد بيانات حية"}</span></div>
          <div className="metrics-grid">{metricItems.map(item => <MetricCard key={item.key} item={item}/>)}</div>
        </section>

        <section className="lower-grid">
          <div className="glass panel">
            <div className="panel-heading"><div><h3>مركز التشخيص</h3><p>اختر نوع الفحص المطلوب</p></div><span className="panel-icon"><Stethoscope size={19}/></span></div>
            <div className="scan-options">
              <button className="scan-option" onClick={() => startScan("full")}><span className="scan-icon blue"><Activity size={18}/></span><span><strong>فحص شامل للنظام</strong><small>قراءة مجموعات OpenWebif المتاحة</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("logs")}><span className="scan-icon cyan"><FileSearch size={18}/></span><span><strong>تحليل سجلات الأخطاء</strong><small>التحقق من توفر السجلات؛ التحليل اليدوي بالأسفل</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("plugins")}><span className="scan-icon violet"><Package size={18}/></span><span><strong>فحص البلجنات</strong><small>التحقق من توفر قائمة البلجنات المثبتة</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={() => startScan("safety")}><span className="scan-icon green"><ShieldCheck size={18}/></span><span><strong>سلامة النظام</strong><small>عرض حدود الاتصال والقراءة فقط</small></span><ChevronLeft size={17}/></button>
            </div>
          </div>

          <div className="glass panel findings-panel">
            <div className="panel-heading"><div><h3>آخر نتائج التشخيص</h3><p>ملخص الملاحظات المكتشفة</p></div><button className="link-button">عرض التقرير <ArrowUpLeft size={14}/></button></div>
            {scanState === "complete" && activeReport && <div className="scan-result">
              <div className="scan-complete"><CheckCircle2 size={16}/> {activeReport.status}: {activeReport.title}</div>
              <strong>{activeReport.status}</strong>
              <p>{activeReport.summary}</p>
              <div className="report-checks">{activeReport.checks.map(item => <span key={item}><CheckCircle2 size={12}/>{item}</span>)}</div>
              <div className="recommendation"><strong>الخطوة المقترحة</strong><p>{activeReport.recommendation}</p></div>
              <small className="report-time">وقت إنشاء التقرير: {activeReport.time} · قراءة فعلية أو حالة عدم اتصال</small>
            </div>}
            <div className="findings-list">{liveFindings.map((f, i) => <div className="finding" key={i}>
              <span className={`finding-icon ${f.tone}`}>{f.tone === "warning" ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}</span>
              <div className="finding-copy"><strong>{f.title}</strong><p>{f.description}</p><small>الدليل: {f.evidence}</small></div>
              <span className={`severity ${f.tone}`}>{f.severity}</span>
            </div>)}</div>
            <div className="report-footer"><Database size={14}/> {liveSnapshot?.connected ? "مصدر البيانات: OpenWebif" : "بانتظار اتصال الرسيفر"} <span>•</span> وضع قراءة فقط</div>
            {scanHistory.length > 0 && <div className="scan-history">
              <strong>سجل الفحوصات في الجلسة الحالية</strong>
              {scanHistory.map(item => <div className="history-row" key={item.id}><span>{item.title}</span><small>{item.time}</small></div>)}
            </div>}
          </div>
        </section>
        <LogAnalyzer/>

        <section className="assistant-card glass">
          <div className="assistant-symbol"><Bot size={24}/></div>
          <div className="assistant-copy"><span className="assistant-label">ميزة غير مفعّلة</span><h3>المساعد الذكي غير متاح حاليًا</h3><p>اسأل عن أخطاء Enigma2 واحصل على شرح مبسط وتوصيات مبنية على بيانات التشخيص.</p></div>
          <button className="secondary-button" disabled>غير متاح <ArrowDownLeft size={15}/></button>
        </section>

        </>}
        <footer className="page-footer"><span>ONLINE4TECH SMART ECOSYSTEM</span><span>OpenWebif read-only • Online4Tech Smart Ecosystem • v0.1.0</span></footer>
      </div>
    </main>
  </div>;
}
