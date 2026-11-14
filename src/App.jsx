import { useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownLeft, ArrowUpLeft, Bot, CheckCircle2,
  ChevronLeft, CircleHelp, Clock3, Cpu, Database, FileSearch, HardDrive,
  LayoutDashboard, ListVideo, MemoryStick, Menu, Package, Search, Settings,
  ShieldCheck, Stethoscope, Tv, Wifi, X
} from "lucide-react";
import { demoDevice, metrics, findings } from "./data/demo";

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

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scanState, setScanState] = useState("idle");
  const [activeNav, setActiveNav] = useState("AI Doctor");
  const [showDemo, setShowDemo] = useState(true);

  const startScan = () => {
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
            <div className="eyebrow"><span className="eyebrow-line"/> INTELLIGENT DIAGNOSTICS</div>
            <h1>AI Doctor <span className="title-ar">طبيب الرسيفر الذكي</span></h1>
            <p>افحص جهازك، افهم المشاكل، واعرف الخطوة المناسبة قبل تنفيذ أي إصلاح.</p>
          </div>
          <button className="primary-button" onClick={startScan}><Activity size={17}/>{scanState === "complete" ? "إعادة الفحص التجريبي" : "ابدأ فحص النظام"}</button>
        </section>

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
              <button className="scan-option" onClick={startScan}><span className="scan-icon blue"><Activity size={18}/></span><span><strong>فحص شامل للنظام</strong><small>فحص مؤشرات الجهاز والخدمات</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={startScan}><span className="scan-icon cyan"><FileSearch size={18}/></span><span><strong>تحليل سجلات الأخطاء</strong><small>مراجعة سجلات النظام المتاحة</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={startScan}><span className="scan-icon violet"><Package size={18}/></span><span><strong>فحص البلجنات</strong><small>مراجعة معلومات الإضافات والتوافق</small></span><ChevronLeft size={17}/></button>
              <button className="scan-option" onClick={startScan}><span className="scan-icon green"><ShieldCheck size={18}/></span><span><strong>سلامة النظام</strong><small>مراجعة مؤشرات الملفات والإعدادات</small></span><ChevronLeft size={17}/></button>
            </div>
          </div>

          <div className="glass panel findings-panel">
            <div className="panel-heading"><div><h3>آخر نتائج التشخيص</h3><p>ملخص الملاحظات المكتشفة</p></div><button className="link-button">عرض التقرير <ArrowUpLeft size={14}/></button></div>
            {scanState === "complete" && <div className="scan-complete"><CheckCircle2 size={16}/> اكتمل الفحص التجريبي بنجاح</div>}
            <div className="findings-list">{findings.map((f, i) => <div className="finding" key={i}>
              <span className={`finding-icon ${f.tone}`}>{f.tone === "warning" ? <AlertTriangle size={17}/> : <CheckCircle2 size={17}/>}</span>
              <div className="finding-copy"><strong>{f.title}</strong><p>{f.description}</p><small>الدليل: {f.evidence}</small></div>
              <span className={`severity ${f.tone}`}>{f.severity}</span>
            </div>)}</div>
            <div className="report-footer"><Database size={14}/> نتائج محلية تجريبية <span>•</span> لا توجد تغييرات على الجهاز</div>
          </div>
        </section>

        <section className="assistant-card glass">
          <div className="assistant-symbol"><Bot size={24}/></div>
          <div className="assistant-copy"><span className="assistant-label">COMING IN NEXT PHASE</span><h3>المساعد الذكي قادم قريباً</h3><p>اسأل عن أخطاء Enigma2 واحصل على شرح مبسط وتوصيات مبنية على بيانات التشخيص.</p></div>
          <button className="secondary-button" disabled>قريباً <ArrowDownLeft size={15}/></button>
        </section>

        <footer className="page-footer"><span>ONLINE4TECH SMART ECOSYSTEM</span><span>واجهة أولية • بيانات تجريبية • v0.1.0</span></footer>
      </div>
    </main>
  </div>;
}