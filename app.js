/* زاد الداعية — نسخة عاملة بسيطة، حفظ محلي، توليد عبر خدمة AI مفعّلة فقط (v1.1) */
(function(){
"use strict";

/* إظهار أي خطأ تشغيلي كرسالة مرئية بدل الفشل الصامت */
window.addEventListener("error", function(e){
  try{
    var box = document.getElementById("toasts");
    if(box){
      var t = document.createElement("div");
      t.className = "toast";
      t.textContent = "حدث خطأ في الصفحة: " + (e.message || "غير معروف") + " — حدّثي الصفحة بـ Ctrl+Shift+R وأخبرينا بهذه الرسالة.";
      box.appendChild(t);
    }
  }catch(_){}
});
var LS_LECTURES = "zad_lectures_v1";
var LS_SETTINGS = "zad_settings_v1";

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function toast(msg){ var t=document.createElement("div"); t.className="toast"; t.textContent=msg; $("toasts").appendChild(t); setTimeout(function(){t.remove();},2600); }
function loadLectures(){ try{ return JSON.parse(localStorage.getItem(LS_LECTURES)||"[]"); }catch(e){ return []; } }
function saveLectures(a){ localStorage.setItem(LS_LECTURES, JSON.stringify(a)); renderCount(); }
function loadSettings(){ try{ return JSON.parse(localStorage.getItem(LS_SETTINGS)||"{}"); }catch(e){ return {}; } }
function saveSettings(s){ localStorage.setItem(LS_SETTINGS, JSON.stringify(s)); }
function uid(){ return "L"+Date.now().toString(36)+Math.floor(Math.random()*9999); }
function fmtDate(ts){ try{ return new Date(ts).toLocaleString("ar"); }catch(e){ return ""; } }

/* ---------- التنقل ---------- */
var crumbMap = { home:"الرئيسية", "new":"محاضرة جديدة", my:"محاضراتي", settings:"الإعدادات", editor:"عرض المحاضرة" };
function show(view){
  var target = $("view-"+view);
  if(!target){ toast("تعذّر فتح الصفحة المطلوبة. حدّثي الصفحة بـ Ctrl+Shift+R وحاولي مجددًا."); return; }
  ["home","new","my","settings","editor","library-source-editor","library-topic-editor","library-add-to-lecture"].forEach(function(v){ var s=$("view-"+v); if(s) s.classList.add("hidden"); });
  target.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(function(b){ b.classList.toggle("active", b.dataset.view===view); });
  $("crumb").textContent = crumbMap[view]||view;
  $("sidebar").classList.remove("open");
  if(view==="my") renderList($("search").value||"");
  if(view==="home") renderAiStatus();
  window.scrollTo(0,0);
}
function on(id, fn){
  var el = $(id);
  if(el){ el.addEventListener("click", fn); return true; }
  toast("تعذّر تهيئة زر ("+id+"). حدّثي الصفحة بـ Ctrl+Shift+R.");
  return false;
}
document.querySelectorAll(".nav-item").forEach(function(b){ b.addEventListener("click", function(){
  if(b.dataset.view === "library"){ showLibrary(); } else { show(b.dataset.view); }
}); });
on("go-new", function(){ show("new"); });
on("menu-btn", function(){ $("sidebar").classList.toggle("open"); });
on("back-to-list", function(){ show("my"); });
on("btn-clear", function(){ ["f-title","f-notes"].forEach(function(id){$(id).value="";}); });

function renderCount(){ var n=loadLectures().length; $("count-badge").textContent = n?("("+n+")"):""; }
function renderAiStatus(){
  var s=loadSettings();
  var ok = !!(s.endpoint || s.key);
  $("ai-status-home").innerHTML = ok
    ? '<p><span class="badge ok">خدمة الذكاء الاصطناعي مفعّلة ✓</span></p>'
    : '<p><span class="badge warn">خدمة الذكاء الاصطناعي غير مفعّلة — فعّليها من الإعدادات</span></p>';
}

/* ---------- بناء موجّه التوليد (يُرسل للخادم الوسيط) ---------- */
function buildPrompt(d){
  return "أنت مساعد علمي للداعية. أعدّ مسودة محاضرة دعوية باللغة العربية وفق البيانات التالية:\n"
  + "العنوان: "+d.title+"\nالفئة المستهدفة: "+d.audience+"\nالمدة: "+d.duration+" دقيقة\nنوع اللقاء: "+d.type+"\nأسلوب العرض: "+d.style+"\nملاحظات الداعية: "+(d.notes||"لا يوجد")+"\n\n"
  + "المطلوب مسودة منظمة تحتوي حصرًا على هذه الأقسام العشرة بالترتيب:\n"
  + "1) مقدمة جذابة مرتبطة بالموضوع 2) أهداف المحاضرة 3) المحاور الرئيسية والفرعية 4) الآيات القرآنية المناسبة مع اسم السورة ورقم الآية 5) الأحاديث النبوية مع التخريج وبيان الدرجة 6) أقوال العلماء المعتبرين (ابن تيمية، ابن القيم، ابن باز، ابن عثيمين وغيرهم) مع الإحالة للمصادر الأصلية 7) شرح مبسط لكل محور 8) أمثلة واقعية وتطبيقات عملية مناسبة للجمهور ("+d.audience+") 9) أسئلة تفاعلية للحاضرات 10) خاتمة مؤثرة بالتوصيات.\n\n"
  + "قواعد صارمة:\n"
  + "- اعتمد على القرآن والسنة الصحيحة فقط. لا تخترع حديثًا ولا قولًا ولا مرجعًا.\n"
  + "- أي حديث أو أثر أو قول عالم لست متأكدًا من نصه أو تخريجه أو مصدره ضع بعده مباشرة: «يحتاج إلى مراجعة».\n"
  + "- لا تذكر قصصًا مكذوبة ولا أحاديث ضعيفة دون بيان ضعفها.\n"
  + "- راعِ مدة "+d.duration+" دقيقة في حجم المحتوى ووزّع الوقت على المحاور.\n"
  + "- الأسلوب: "+d.style+".";
}

/* ---------- هيكل فارغ (ليس محتوى وهميًا) ---------- */
function buildSkeleton(d){
  return "عنوان المحاضرة: "+d.title+"\n"
  + "الفئة: "+d.audience+" | المدة: "+d.duration+" دقيقة | النوع: "+d.type+" | الأسلوب: "+d.style+"\n"
  + (d.notes ? "ملاحظات الداعية: "+d.notes+"\n" : "")
  + "\n— — — مسودة هيكلية فارغة (أُنشئت محليًا لعدم تفعيل خدمة الذكاء الاصطناعي — ليست محتوى جاهزًا) — — —\n\n"
  + "1) المقدمة الجذابة:\n[اكتبي مقدمة مرتبطة بموضوع: "+d.title+"]\n\n"
  + "2) أهداف المحاضرة:\n- [الهدف الأول]\n- [الهدف الثاني]\n- [الهدف الثالث]\n\n"
  + "3) المحاور الرئيسية والفرعية (موزعة على "+d.duration+" دقيقة):\n- المحور الأول: [.....] (الزمن المقترح: ...)\n- المحور الثاني: [.....]\n- المحور الثالث: [.....]\n\n"
  + "4) الآيات القرآنية المناسبة:\n[أضيفي الآية بنصها مع اسم السورة ورقمها بعد التحقق من المصحف — يحتاج إلى مراجعة]\n\n"
  + "5) الأحاديث النبوية:\n[أضيفي الحديث بنصه مع التخريج وبيان الدرجة من مصدر موثوق — يحتاج إلى مراجعة]\n\n"
  + "6) أقوال العلماء المعتبرين:\n[أضيفي القول مع الإحالة للمصدر الأصلي (ابن تيمية/ابن القيم/ابن باز/ابن عثيمين...) — يحتاج إلى مراجعة]\n\n"
  + "7) شرح مبسط لكل محور:\n[اشرحي كل محور بأسلوب "+d.style+" مناسب لـ "+d.audience+"]\n\n"
  + "8) أمثلة واقعية وتطبيقات عملية ("+d.audience+"):\n- [مثال/تطبيق 1]\n- [مثال/تطبيق 2]\n\n"
  + "9) أسئلة تفاعلية للحاضرات:\n- [سؤال 1]\n- [سؤال 2]\n\n"
  + "10) الخاتمة المؤثرة والتوصيات:\n[أبرز الرسائل + توصية عملية واحدة على الأقل]\n";
}

/* ---------- التوليد ---------- */
$("btn-generate").addEventListener("click", async function(){
  var d = {
    title: $("f-title").value.trim(),
    audience: $("f-audience").value,
    duration: $("f-duration").value,
    type: $("f-type").value,
    style: $("f-style").value,
    notes: $("f-notes").value.trim()
  };
  var box = $("gen-status"); box.innerHTML = "";
  if(!d.title){ box.innerHTML = '<div class="status-err"> فضلًا أدخلي عنوان المحاضرة أولًا.</div>'; return; }
  var s = loadSettings();
  var btn = $("btn-generate");

  // لا توجد خدمة مفعّلة → رسالة واضحة + خيار هيكل فارغ معلن
  if(!s.endpoint && !s.key){
    box.innerHTML = '<div class="status-err"><b>⚠️ خدمة الذكاء الاصطناعي غير مفعّلة.</b><br>'
    + 'زر «إعداد المحاضرة» لا يعرض نصوصًا جاهزة حفاظًا على الأمانة العلمية.<br>'
    + 'فعّلي الخدمة من صفحة <b>الإعدادات</b> (رابط الخادم الوسيط)، ثم عودي للتوليد.<br><br>'
    + '<button id="btn-skel" class="btn-line">إنشاء هيكل فارغ قابل للتعبئة (ليس محتوى جاهزًا)</button></div>';
    $("btn-skel").addEventListener("click", function(){
      openAsNew(d, buildSkeleton(d), true);
    });
    return;
  }

  btn.disabled = true; btn.textContent = "جارٍ إعداد المحاضرة... ⏳";
  box.innerHTML = '<div class="status-warn">يتم التواصل مع خدمة الذكاء الاصطناعي... قد يستغرق ذلك نصف دقيقة.</div>';
  try{
    var text = "";
    if(s.endpoint){
      var r = await fetch(s.endpoint, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ title:d.title, audience:d.audience, duration:d.duration, type:d.type, style:d.style, notes:d.notes, model:(s.model||""), prompt: buildPrompt(d) })
      });
      if(!r.ok) throw new Error("استجابة الخادم: "+r.status);
      var j = await r.json();
      text = j.text || j.content || j.result || "";
      if(!text) throw new Error("الخادم لم يُرجع نصًا (توقّعنا حقل text في JSON).");
    } else {
      // تجربة محلية مباشرة (OpenAI-compatible) — على مسؤولية المستخدم
      var base = (s.base||"https://api.openai.com/v1").replace(/\/$/,"");
      var r2 = await fetch(base+"/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+s.key},
        body: JSON.stringify({ model:(s.model||"gpt-4o-mini"), messages:[{role:"system",content:"أنت مساعد علمي للداعية ملتزم بالسنة الصحيحة وعدم اختلاق المراجع."},{role:"user",content:buildPrompt(d)}], temperature:0.5 })
      });
      if(!r2.ok) throw new Error("استجابة المزوّد: "+r2.status);
      var j2 = await r2.json();
      text = (j2.choices && j2.choices[0] && j2.choices[0].message && j2.choices[0].message.content) || "";
      if(!text) throw new Error("لم يصل نص من المزوّد.");
    }
    openAsNew(d, text, /يحتاج إلى مراجعة/.test(text));
    box.innerHTML = '<div class="status-ok">تم إعداد المسودة بنجاح. راجعي الأدلة قبل الإلقاء.</div>';
  }catch(e){
    box.innerHTML = '<div class="status-err"><b>تعذّر التوليد:</b> '+esc(e.message)
    + '<br>تحققي من الإعدادات والاتصال. لم يتم عرض أي محتوى بديل مختلق.</div>';
  }finally{
    btn.disabled = false; btn.textContent = "إعداد المحاضرة ✨";
  }
});

var currentId = null;
function openAsNew(d, body, needsReview){
  var arr = loadLectures();
  var item = { id:uid(), title:d.title, audience:d.audience, duration:d.duration, type:d.type, style:d.style, notes:d.notes||"", body:body, brief:"", createdAt:Date.now(), updatedAt:Date.now(), needsReview:!!needsReview };
  arr.unshift(item); saveLectures(arr);
  openLecture(item.id);
  toast("تم إنشاء المسودة وحفظها محليًا");
}
function openLecture(id){
  var arr=loadLectures(); var it=arr.find(function(x){return x.id===id;});
  if(!it) return;
  currentId=id;
  $("ed-title").textContent=it.title;
  $("ed-meta").textContent = it.type+" • "+it.audience+" • "+it.duration+" دقيقة • "+it.style+" • آخر تحديث: "+fmtDate(it.updatedAt);
  $("ed-body").value=it.body;
  $("brief-wrap").classList.add("hidden"); $("brief-out").textContent="";
  if(it.brief){ $("brief-out").textContent=it.brief; $("brief-wrap").classList.remove("hidden"); }
  $("review-flag").innerHTML = it.needsReview
    ? '<p><span class="badge warn">⚠️ تحتوي المسودة على مواضع «يحتاج إلى مراجعة» — تحققي من الأدلة قبل الإلقاء</span></p>'
    : "";
  show("editor");
}

/* ---------- محاضراتي: عرض + بحث ---------- */
function renderList(q){
  q=(q||"").trim();
  var arr=loadLectures();
  if(q) arr=arr.filter(function(x){ return (x.title+x.body+(x.notes||"")).includes(q); });
  var box=$("lecture-list");
  if(!arr.length){ box.innerHTML='<div class="empty">لا توجد محاضرات '+(q?'مطابقة للبحث':'محفوظة بعد')+'. ابدئي من «محاضرة جديدة».</div>'; return; }
  box.innerHTML="";
  arr.forEach(function(it){
    var div=document.createElement("div"); div.className="lecture-item";
    div.innerHTML='<div><h4>'+esc(it.title)+'</h4><div class="meta">'+esc(it.type)+' • '+esc(it.audience)+' • '+esc(it.duration)+' دقيقة • '+fmtDate(it.updatedAt)
      +(it.needsReview?' • <span class="badge warn">يحتاج إلى مراجعة</span>':'')+'</div></div>';
    var btns=document.createElement("div"); btns.className="row-btns";
    [["فتح","btn-line btn-sm",function(){openLecture(it.id);}],
     ["نسخ","btn-line btn-sm",function(){navigator.clipboard.writeText(it.title+"\n\n"+it.body);toast("تم النسخ");}],
     ["حذف","btn-danger btn-sm",function(){if(confirm("حذف هذه المحاضرة؟")){saveLectures(loadLectures().filter(function(x){return x.id!==it.id;}));renderList($("search").value||"");toast("تم الحذف");}}]
    ].forEach(function(cfg){
      var b=document.createElement("button"); b.className=cfg[0]==="حذف"?"btn-danger btn-sm":"btn-line btn-sm"; b.textContent=cfg[0];
      b.addEventListener("click",cfg[2]); btns.appendChild(b);
    });
    div.appendChild(btns); box.appendChild(div);
  });
}
$("search").addEventListener("input", function(){ renderList(this.value); });
$("btn-export-all").addEventListener("click", function(){
  var blob=new Blob([JSON.stringify(loadLectures(),null,2)],{type:"application/json"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="zad-lectures-backup.json"; a.click();
  toast("تم تنزيل النسخة الاحتياطية");
});

/* ---------- المحرر: حفظ/نسخ/تصدير/مختصر ---------- */
$("btn-save").addEventListener("click", function(){
  var arr=loadLectures(); var it=arr.find(function(x){return x.id===currentId;}); if(!it) return;
  it.body=$("ed-body").value; it.updatedAt=Date.now();
  it.needsReview = /يحتاج إلى مراجعة/.test(it.body) || /\[.+\]/.test(it.body);
  saveLectures(arr); openLecture(currentId); toast("تم الحفظ ✓");
});
$("btn-copy").addEventListener("click", function(){ navigator.clipboard.writeText($("ed-title").textContent+"\n\n"+$("ed-body").value); toast("تم نسخ المحتوى"); });
$("btn-word").addEventListener("click", function(){
  var title=$("ed-title").textContent, meta=$("ed-meta").textContent;
  var html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"></head><body dir="rtl">'
    +'<h1>'+esc(title)+'</h1><p>'+esc(meta)+'</p><pre style="font-family:Arial;white-space:pre-wrap">'+esc($("ed-body").value)+'</pre></body></html>';
  var blob=new Blob(["\ufeff"+html],{type:"application/msword"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=title+".doc"; a.click();
  toast("تم تصدير Word");
});
$("btn-print").addEventListener("click", function(){
  $("print-area").innerHTML = "<h1>"+esc($("ed-title").textContent)+"</h1><p>"+esc($("ed-meta").textContent)+"</p><hr>"+esc($("ed-body").value).replace(/\n/g,"<br>");
  window.print();
});
$("btn-del").addEventListener("click", function(){
  if(!confirm("حذف هذه المحاضرة نهائيًا؟")) return;
  saveLectures(loadLectures().filter(function(x){return x.id!==currentId;})); currentId=null; show("my");
});
$("btn-brief").addEventListener("click", function(){
  var body=$("ed-body").value;
  var lines=body.split("\n").map(function(l){return l.trim();}).filter(Boolean);
  var heads=lines.filter(function(l){return /^\d+[).\-.]\s|^[-•*]\s|^#{1,3}\s/.test(l) || l.length<90;}).slice(0,30);
  if(heads.length<5) heads=lines.slice(0,20);
  var brief="نقاط الإلقاء — "+$("ed-title").textContent+"\n("+ $("ed-meta").textContent +")\n\n"
    + heads.map(function(h){return "• "+h.replace(/^#{1,3}\s*/,"");}).join("\n")
    + "\n\n• ذكّري بالأدلة بنصّها المحقق\n• اختمي بتوصية عملية واحدة";
  $("brief-out").textContent=brief; $("brief-wrap").classList.remove("hidden");
  var arr=loadLectures(); var it=arr.find(function(x){return x.id===currentId;});
  if(it){ it.brief=brief; it.updatedAt=Date.now(); saveLectures(arr); }
  toast("تم إنشاء النسخة المختصرة");
});
$("btn-copy-brief").addEventListener("click", function(){ navigator.clipboard.writeText($("brief-out").textContent); toast("تم نسخ النقاط"); });

/* ---------- الإعدادات ---------- */
function fillSettings(){ var s=loadSettings(); $("s-endpoint").value=s.endpoint||""; $("s-model").value=s.model||""; $("s-key").value=s.key||""; $("s-base").value=s.base||""; }
$("btn-save-settings").addEventListener("click", function(){
  saveSettings({ endpoint:$("s-endpoint").value.trim(), model:$("s-model").value.trim(), key:$("s-key").value.trim(), base:$("s-base").value.trim() });
  $("settings-status").innerHTML='<div class="status-ok">تم حفظ الإعدادات محليًا في متصفحكِ.</div>'; renderAiStatus(); toast("تم الحفظ");
});
$("btn-test-ai").addEventListener("click", async function(){
  var s={ endpoint:$("s-endpoint").value.trim(), model:$("s-model").value.trim(), key:$("s-key").value.trim(), base:$("s-base").value.trim() };
  var box=$("settings-status"); box.innerHTML='<div class="status-warn">جارٍ اختبار الاتصال...</div>';
  try{
    if(s.endpoint){
      var r=await fetch(s.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({test:true,model:s.model||""})});
      if(!r.ok) throw new Error("الخادم ردّ بالحالة "+r.status);
      box.innerHTML='<div class="status-ok">الاتصال بالخادم الوسيط ناجح ✓</div>';
    } else if(s.key){
      var base=(s.base||"https://api.openai.com/v1").replace(/\/$/,"");
      var r2=await fetch(base+"/models",{headers:{"Authorization":"Bearer "+s.key}});
      if(!r2.ok) throw new Error("تعذّر التحقق من المفتاح ("+r2.status+")");
      box.innerHTML='<div class="status-ok">المفتاح يعمل ✓ (للتجربة المحلية فقط — انقليه لخادم وسيط عند النشر)</div>';
    } else box.innerHTML='<div class="status-err">لا توجد خدمة مفعّلة. أدخلي رابط الخادم الوسيط أولًا.</div>';
  }catch(e){ box.innerHTML='<div class="status-err">فشل الاختبار: '+esc(e.message)+'</div>'; }
});

/* ---------- تهيئة ---------- */
renderCount(); fillSettings(); renderAiStatus(); renderList(""); show("home");

/* ========================================================================
   المكتبة الدعوية الذكية — Phase 1 (بدون مساعد ذكاء اصطناعي أو استخراج PDF)
   ======================================================================== */
var LS_LIB_SOURCES = "zad_library_sources_v1";
var LS_LIB_TOPICS = "zad_library_topics_v1";

function loadLibrarySources(){ try{ return JSON.parse(localStorage.getItem(LS_LIB_SOURCES)||"[]"); }catch(e){ return []; } }
function saveLibrarySources(a){ localStorage.setItem(LS_LIB_SOURCES, JSON.stringify(a)); }
function loadLibraryTopics(){ try{ return JSON.parse(localStorage.getItem(LS_LIB_TOPICS)||"[]"); }catch(e){ return []; } }
function saveLibraryTopics(a){ localStorage.setItem(LS_LIB_TOPICS, JSON.stringify(a)); }

var libState = {
  view: "sources", // "sources" | "topics"
  sectionFilter: "",
  typeFilter: "",
  favOnly: false,
  search: "",
  editingSourceId: null,
  editingTopicId: null,
  addToLectureTarget: null, // {type:"source"|"topic", id}
  addToLectureItem: null
};

/* ---------- التنقل للمكتبة ---------- */
crumbMap.library = "المكتبة الدعوية";

function showLibrary(){
  show("library");
  renderLibraryCategories();
  renderLibraryRecent();
  renderLibrarySources();
  renderLibraryTopics();
}

function renderLibraryCategories(){
  var cats = [
    { key:"القرآن الكريم والتفسير", label:"📖 القرآن الكريم والتفسير" },
    { key:"السنة النبوية وشروح الأحاديث", label:"🕋 السنة النبوية وشروح الأحاديث" },
    { key:"العقيدة والتوحيد", label:"🌟 العقيدة والتوحيد" },
    { key:"الفقه والأحكام الشرعية", label:"⚖️ الفقه والأحكام الشرعية" },
    { key:"التربية الإيمانية والسلوك", label:"🌱 التربية الإيمانية والسلوك" },
    { key:"أقوال العلماء والفوائد العلمية", label:"👨‍🏫 أقوال العلماء والفوائد العلمية" },
    { key:"الموضوعات الدعوية المعاصرة", label:"📢 الموضوعات الدعوية المعاصرة" }
  ];
  var box = $("lib-categories");
  box.innerHTML = "";
  cats.forEach(function(c){
    var el = document.createElement("div");
    el.className = "category-card" + (libState.sectionFilter === c.key ? " active" : "");
    el.textContent = c.label;
    el.onclick = function(){
      libState.sectionFilter = (libState.sectionFilter === c.key) ? "" : c.key;
      renderLibraryCategories();
      renderLibrarySources();
    };
    box.appendChild(el);
  });
}

function renderLibraryRecent(){
  var box = $("lib-recent");
  var sources = loadLibrarySources();
  var topics = loadLibraryTopics();
  var all = [];
  sources.forEach(function(s){ all.push({ type:"source", item:s, ts:s.updatedAt || s.createdAt }); });
  topics.forEach(function(t){ all.push({ type:"topic", item:t, ts:t.updatedAt || t.createdAt }); });
  all.sort(function(a,b){ return b.ts - a.ts; });
  all = all.slice(0, 5);
  if(!all.length){ box.innerHTML = '<div class="empty">لا توجد مواد تم استخدامها سابقًا بعد.</div>'; return; }
  box.innerHTML = "";
  all.forEach(function(entry){
    var div = document.createElement("div");
    div.className = "library-item";
    var it = entry.item;
    var meta = entry.type === "source"
      ? (it.author ? it.author + " • " : "") + it.type + " • " + it.section
      : (it.axes && it.axes.length ? it.axes.length + " محاور" : "") + " • موضوع";
    div.innerHTML =
      '<div><h4>' + esc(it.title) + '</h4><div class="source-meta">' + esc(meta) + '</div></div>' +
      '<div class="row-btns">' +
      '<button class="btn-line btn-sm" onclick="libOpenItem(\'' + entry.type + '\',\'' + it.id + '\')">فتح</button>' +
      '<button class="btn-line btn-sm" onclick="libAddToLecture(\'' + entry.type + '\',\'' + it.id + '\')">إضافة إلى محاضرة</button>' +
      '</div>';
    box.appendChild(div);
  });
}

function renderLibrarySources(){
  var box = $("lib-sources-list");
  var sources = loadLibrarySources();
  var q = libState.search.toLowerCase();
  sources = sources.filter(function(s){
    var matchText = (s.title + " " + (s.author||"") + " " + (s.notes||"") + " " + (s.keywords||"") + " " + (s.quotedText||"")).toLowerCase();
    var textOk = !q || matchText.includes(q);
    var sectionOk = !libState.sectionFilter || s.section === libState.sectionFilter;
    var typeOk = !libState.typeFilter || s.type === libState.typeFilter;
    var favOk = !libState.favOnly || s.favorite;
    return textOk && sectionOk && typeOk && favOk;
  });
  sources.sort(function(a,b){ return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
  if(!sources.length){ box.innerHTML = '<div class="empty">لا توجد مصادر مطابقة. أضيفي مصدرًا جديدًا لتبدأ.</div>'; return; }
  box.innerHTML = "";
  sources.forEach(function(s){
    var div = document.createElement("div");
    div.className = "library-item";
    var meta = (s.author ? esc(s.author) + " • " : "") + esc(s.type) + " • " + esc(s.section);
    if(s.volume || s.page) meta += " • الجزء: " + esc(s.volume||"") + " صفحة: " + esc(s.page||"");
    div.innerHTML =
      '<div><h4>' + esc(s.title) + '</h4><div class="source-meta">' + meta + '</div>' +
      (s.quotedText ? '<div class="source-body">' + esc(s.quotedText) + '</div>' : '') +
      '</div>' +
      '<div class="row-btns">' +
      '<span class="fav-star ' + (s.favorite ? "filled" : "") + '" title="المفضلة" onclick="libToggleFavSource(\'' + s.id + '\')">' + (s.favorite ? "★" : "☆") + '</span>' +
      '<button class="btn-line btn-sm" onclick="libEditSource(\'' + s.id + '\')">تعديل</button>' +
      '<button class="btn-line btn-sm" onclick="libAddToLecture(\'source\',\'' + s.id + '\')">إضافة إلى محاضرة</button>' +
      '<button class="btn-danger btn-sm" onclick="libDeleteSource(\'' + s.id + '\')">حذف</button>' +
      '</div>';
    box.appendChild(div);
  });
}

function renderLibraryTopics(){
  var box = $("lib-topics-list");
  var topics = loadLibraryTopics();
  var q = libState.search.toLowerCase();
  topics = topics.filter(function(t){
    var matchText = (t.title + " " + (t.idea||"") + " " + (t.reflections||"")).toLowerCase();
    return !q || matchText.includes(q);
  });
  topics.sort(function(a,b){ return (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt); });
  if(!topics.length){ box.innerHTML = '<div class="empty">لا توجد ملفات موضوعات بعد. أنشئي ملفًا جديدًا.</div>'; return; }
  box.innerHTML = "";
  topics.forEach(function(t){
    var axesCount = t.axes ? t.axes.length : 0;
    var evidencesCount = t.evidences ? t.evidences.length : 0;
    var linkedCount = t.sourceIds ? t.sourceIds.length : 0;
    var div = document.createElement("div");
    div.className = "topic-item";
    div.innerHTML =
      '<div><h4>' + esc(t.title) + '</h4><div class="source-meta">' +
      axesCount + ' محاور • ' + evidencesCount + ' أدلة • ' + linkedCount + ' مصدر مرتبط' +
      '</div><div class="topic-body">' + esc((t.idea||"").substring(0,120)) + (t.idea && t.idea.length>120?"...":"") + '</div></div>' +
      '<div class="row-btns">' +
      '<button class="btn-line btn-sm" onclick="libOpenItem(\'topic\',\'' + t.id + '\')">فتح</button>' +
      '<button class="btn-line btn-sm" onclick="libCreateLectureFromTopic(\'' + t.id + '\')">إنشاء محاضرة من هذا الموضوع</button>' +
      '<button class="btn-line btn-sm" onclick="libEditTopic(\'' + t.id + '\')">تعديل</button>' +
      '<button class="btn-danger btn-sm" onclick="libDeleteTopic(\'' + t.id + '\')">حذف</button>' +
      '</div>';
    box.appendChild(div);
  });
}

/* ---------- محرر المصدر ---------- */
function libOpenSourceEditor(id){
  libState.editingSourceId = id;
  $("view-library").classList.add("hidden");
  $("view-library-source-editor").classList.remove("hidden");
  $("lib-source-editor-title").textContent = id ? "تعديل المصدر" : "إضافة مصدر جديد";
  $("lib-btn-delete-source").classList.toggle("hidden", !id);
  $("lib-source-id").value = id || "";
  ["lib-source-title","lib-source-author","lib-source-link","lib-source-volume","lib-source-page","lib-source-quoted","lib-source-notes","lib-source-keywords"].forEach(function(fid){
    $(fid).value = "";
  });
  $("lib-source-type").value = "كتاب";
  $("lib-source-section").value = "الفقه والأحكام الشرعية";
  if(id){
    var s = loadLibrarySources().find(function(x){ return x.id === id; });
    if(s){
      $("lib-source-title").value = s.title||"";
      $("lib-source-author").value = s.author||"";
      $("lib-source-type").value = s.type||"كتاب";
      $("lib-source-section").value = s.section||"الفقه والأحكام الشرعية";
      $("lib-source-link").value = s.link||"";
      $("lib-source-volume").value = s.volume||"";
      $("lib-source-page").value = s.page||"";
      $("lib-source-quoted").value = s.quotedText||"";
      $("lib-source-notes").value = s.notes||"";
      $("lib-source-keywords").value = s.keywords||"";
    }
  }
  $("lib-source-status").innerHTML = "";
  window.scrollTo(0,0);
}

function libSaveSource(){
  var id = $("lib-source-id").value.trim();
  var s = {
    id: id || uid(),
    title: $("lib-source-title").value.trim(),
    author: $("lib-source-author").value.trim(),
    type: $("lib-source-type").value,
    section: $("lib-source-section").value,
    link: $("lib-source-link").value.trim(),
    volume: $("lib-source-volume").value.trim(),
    page: $("lib-source-page").value.trim(),
    quotedText: $("lib-source-quoted").value.trim(),
    notes: $("lib-source-notes").value.trim(),
    keywords: $("lib-source-keywords").value.trim(),
    favorite: id ? (loadLibrarySources().find(function(x){return x.id===id;})||{}).favorite : false,
    createdAt: id ? (loadLibrarySources().find(function(x){return x.id===id;})||{}).createdAt : Date.now(),
    updatedAt: Date.now()
  };
  if(!s.title){ $("lib-source-status").innerHTML = '<div class="status-err"> فضلًا أدخل عنوان المصدر.</div>'; return; }
  var arr = loadLibrarySources();
  var idx = arr.findIndex(function(x){ return x.id === s.id; });
  if(idx >= 0) arr[idx] = s; else arr.push(s);
  saveLibrarySources(arr);
  showLibrary();
  toast(id ? "تم تعديل المصدر ✓" : "تم إضافة المصدر ✓");
}

function libDeleteSource(id){
  if(!confirm("هل أنت متأكدة من حذف هذا المصدر؟")) return;
  var arr = loadLibrarySources().filter(function(x){ return x.id !== id; });
  saveLibrarySources(arr);
  // أيضاً احذف الربط من المواضيع
  var topics = loadLibraryTopics();
  topics.forEach(function(t){
    if(t.sourceIds) t.sourceIds = t.sourceIds.filter(function(sid){ return sid !== id; });
  });
  saveLibraryTopics(topics);
  showLibrary();
  toast("تم حذف المصدر ✓");
}

function libToggleFavSource(id){
  var arr = loadLibrarySources();
  var s = arr.find(function(x){ return x.id === id; });
  if(s){ s.favorite = !s.favorite; saveLibrarySources(arr); renderLibrarySources(); }
}

/* ---------- محرر ملف الموضوع ---------- */
function libOpenTopicEditor(id){
  libState.editingTopicId = id;
  $("view-library").classList.add("hidden");
  $("view-library-topic-editor").classList.remove("hidden");
  $("lib-topic-editor-title").textContent = id ? "تعديل ملف الموضوع" : "ملف موضوع دعوي جديد";
  $("lib-btn-delete-topic").classList.toggle("hidden", !id);
  $("lib-topic-id").value = id || "";
  $("lib-topic-title").value = "";
  $("lib-topic-idea").value = "";
  $("lib-topic-goals").value = "";
  $("lib-topic-reflections").value = "";
  $("lib-topic-axes-container").innerHTML = "";
  $("lib-topic-evidences-container").innerHTML = "";
  $("lib-topic-sources-list").innerHTML = "";
  $("lib-topic-status").innerHTML = "";
  if(id){
    var t = loadLibraryTopics().find(function(x){ return x.id === id; });
    if(t){
      $("lib-topic-title").value = t.title||"";
      $("lib-topic-idea").value = t.idea||"";
      $("lib-topic-goals").value = t.goals||"";
      $("lib-topic-reflections").value = t.reflections||"";
      // المحاور
      (t.axes||[]).forEach(function(axis){
        libAddAxisRow(axis.title, axis.sub||[]);
      });
      // الأدلة
      (t.evidences||[]).forEach(function(ev){
        libAddEvidenceRow(ev.type, ev.text, ev.source, ev.page);
      });
      // المصادر المرتبطة
      renderLinkedSources(t.sourceIds||[]);
    }
  } else {
    libAddAxisRow("", []);
    libAddEvidenceRow("verse", "", "", "");
  }
  window.scrollTo(0,0);
}

function libAddAxisRow(title, subs){
  var container = $("lib-topic-axes-container");
  var div = document.createElement("div");
  div.className = "topic-axis-card card";
  div.innerHTML =
    '<div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">' +
    '<input class="inp" style="flex:2;" placeholder="عنوان المحور الرئيسي..." value="' + esc(title) + '">' +
    '<input class="inp" style="flex:3;" placeholder="المحاور الفرعية مفصولة بفواصل..." value="' + esc((subs||[]).join(", ")) + '">' +
    '<button class="btn-danger btn-sm" onclick="this.closest(\'.topic-axis-card\').remove()">حذف المحور</button>' +
    '</div>';
  container.appendChild(div);
}

function libAddEvidenceRow(type, text, source, page){
  var container = $("lib-topic-evidences-container");
  var typeLabel = { verse:"آية قرآنية", hadith:"حديث نبوي", quote:"نقل علمي" }[type] || "نقل علمي";
  var div = document.createElement("div");
  div.className = "card";
  div.style.padding = "12px";
  div.style.display = "flex";
  div.style.gap = "8px";
  div.style.flexWrap = "wrap";
  div.style.alignItems = "center";
  div.innerHTML =
    '<select class="sel" style="width:110px;">' +
    '<option value="verse"' + (type==="verse"?" selected":"") + '>آية قرآنية</option>' +
    '<option value="hadith"' + (type==="hadith"?" selected":"") + '>حديث نبوي</option>' +
    '<option value="quote"' + (type==="quote"?" selected":"") + '>نقل علمي</option>' +
    '</select>' +
    '<input class="inp" style="flex:2;" placeholder="نص الدليل..." value="' + esc(text) + '">' +
    '<input class="inp" style="flex:1;" placeholder="المصدر" value="' + esc(source) + '">' +
    '<input class="inp" style="flex:1;" placeholder="الصفحة" value="' + esc(page) + '">' +
    '<button class="btn-danger btn-sm" style="padding:4px 8px; font-size:12px;" onclick="this.closest(\'.card\').remove()">حذف</button>';
  container.appendChild(div);
}

function renderLinkedSources(sourceIds){
  var box = $("lib-topic-sources-list");
  var all = loadLibrarySources();
  var linked = all.filter(function(s){ return sourceIds.includes(s.id); });
  if(!linked.length){ box.innerHTML = '<div class="empty" style="padding:12px;">لا توجد مصادر مرتبطة بعد.</div>'; return; }
  box.innerHTML = "";
  linked.forEach(function(s){
    var div = document.createElement("div");
    div.className = "library-item";
    div.style.marginBottom = "8px";
    div.setAttribute("data-source-id", s.id);
    div.innerHTML =
      '<div><h4 style="font-size:14px;">' + esc(s.title) + '</h4><div class="source-meta">' + esc(s.type) + " • " + esc(s.section) + '</div></div>' +
      '<div class="row-btns">' +
      '<button class="btn-line btn-sm" onclick="libUnlinkTopicSource(\'' + s.id + '\')">فك الربط</button>' +
      '</div>';
    box.appendChild(div);
  });
}

function libLinkTopicSource(){
  var topicId = $("lib-topic-id").value;
  var topic = loadLibraryTopics().find(function(x){ return x.id === topicId; });
  if(!topic) return;
  var allSources = loadLibrarySources();
  var available = allSources.filter(function(s){ return !topic.sourceIds || !topic.sourceIds.includes(s.id); });
  if(!available.length){ toast("جميع المصادر مرتبطة بالفعل بهذا الموضوع"); return; }
  // إظهار قائمة بسيطة للاختيار - نأخذ أول متاح للتبسيط، أو يمكن تحسينه لاحقًا
  var s = available[0];
  if(confirm("ربط المصدر: " + s.title + "؟")){
    if(!topic.sourceIds) topic.sourceIds = [];
    topic.sourceIds.push(s.id);
    var arr = loadLibraryTopics();
    var idx = arr.findIndex(function(x){ return x.id === topic.id; });
    if(idx >= 0) arr[idx] = topic;
    saveLibraryTopics(arr);
    renderLinkedSources(topic.sourceIds);
  }
}

function libUnlinkTopicSource(sourceId){
  var topic = loadLibraryTopics().find(function(x){ return x.id === $("lib-topic-id").value; });
  if(!topic) return;
  topic.sourceIds = (topic.sourceIds||[]).filter(function(sid){ return sid !== sourceId; });
  var arr = loadLibraryTopics();
  var idx = arr.findIndex(function(x){ return x.id === topic.id; });
  if(idx >= 0) arr[idx] = topic;
  saveLibraryTopics(arr);
  renderLinkedSources(topic.sourceIds);
}

function libSaveTopic(){
  var id = $("lib-topic-id").value.trim();
  var title = $("lib-topic-title").value.trim();
  if(!title){ $("lib-topic-status").innerHTML = '<div class="status-err"> فضلًا أدخل عنوان الموضوع.</div>'; return; }
  var axes = [];
  $("lib-topic-axes-container").querySelectorAll(".topic-axis-card").forEach(function(card){
    var inputs = card.querySelectorAll("input");
    var mainTitle = inputs[0].value.trim();
    var subs = inputs[1] ? inputs[1].value.split(",").map(function(x){ return x.trim(); }).filter(Boolean) : [];
    if(mainTitle) axes.push({ title: mainTitle, sub: subs });
  });
  var evidences = [];
  $("lib-topic-evidences-container").querySelectorAll("div.card").forEach(function(card){
    var sel = card.querySelector("select");
    var inputs = card.querySelectorAll("input");
    evidences.push({ type: sel.value, text: inputs[0].value.trim(), source: inputs[1]?.value.trim()||"", page: inputs[2]?.value.trim()||"" });
  });
  // جمع معرفات المصادر المرتبطة من البطاقات المعروضة
  var sourceIds = [];
  $("lib-topic-sources-list").querySelectorAll(".library-item[data-source-id]").forEach(function(item){
    sourceIds.push(item.getAttribute("data-source-id"));
  });
  var t = {
    id: id || uid(),
    title: title,
    idea: $("lib-topic-idea").value.trim(),
    goals: $("lib-topic-goals").value.trim(),
    axes: axes,
    evidences: evidences,
    sourceIds: sourceIds,
    reflections: $("lib-topic-reflections").value.trim(),
    createdAt: id ? (loadLibraryTopics().find(function(x){ return x.id === id; })||{}).createdAt : Date.now(),
    updatedAt: Date.now()
  };
  var arr = loadLibraryTopics();
  var idx = arr.findIndex(function(x){ return x.id === t.id; });
  if(idx >= 0) arr[idx] = t; else arr.push(t);
  saveLibraryTopics(arr);
  showLibrary();
  toast(id ? "تم تعديل ملف الموضوع ✓" : "تم إنشاء ملف الموضوع ✓");
}

function libDeleteTopic(id){
  if(!confirm("هل أنت متأكدة من حذف ملف الموضوع؟")) return;
  var arr = loadLibraryTopics().filter(function(x){ return x.id !== id; });
  saveLibraryTopics(arr);
  showLibrary();
  toast("تم حذف ملف الموضوع ✓");
}

function libEditSource(id){ libOpenSourceEditor(id); }
function libEditTopic(id){ libOpenTopicEditor(id); }
function libOpenItem(type, id){
  if(type === "source") libOpenSourceEditor(id);
  else libOpenTopicEditor(id);
}

/* ---------- البحث والفلترة ---------- */
$("lib-search").addEventListener("input", function(){
  libState.search = this.value;
  renderLibrarySources();
  renderLibraryTopics();
});
$("lib-filter-section").addEventListener("change", function(){
  libState.sectionFilter = this.value;
  renderLibraryCategories();
  renderLibrarySources();
});
$("lib-filter-type").addEventListener("change", function(){
  libState.typeFilter = this.value;
  renderLibrarySources();
});
$("lib-btn-fav-only").addEventListener("click", function(){
  libState.favOnly = !libState.favOnly;
  this.classList.toggle("active", libState.favOnly);
  renderLibrarySources();
});

/* ---------- أزرار الإجراءات ---------- */
on("lib-btn-add-source", function(){ libOpenSourceEditor(null); });
on("lib-btn-add-topic", function(){ libOpenTopicEditor(null); });
on("lib-back-to-library", showLibrary);
on("lib-topic-back-to-library", showLibrary);
on("lib-btn-save-source", libSaveSource);
on("lib-btn-cancel-source", showLibrary);
on("lib-btn-delete-source", function(){ if($("lib-source-id").value) libDeleteSource($("lib-source-id").value); });
on("lib-btn-save-topic", libSaveTopic);
on("lib-btn-cancel-topic", showLibrary);
on("lib-btn-delete-topic", function(){ if($("lib-topic-id").value) libDeleteTopic($("lib-topic-id").value); });
on("lib-btn-add-axis", function(){ libAddAxisRow("", []); });
on("lib-btn-add-evidence", function(){ libAddEvidenceRow("verse", "", "", ""); });
on("lib-btn-link-source", libLinkTopicSource);

/* ---------- إضافة إلى محاضرة ---------- */
function libAddToLecture(type, id){
  libState.addToLectureTarget = { type: type, id: id };
  var item = type === "source" ? loadLibrarySources().find(function(x){ return x.id === id; }) : loadLibraryTopics().find(function(x){ return x.id === id; });
  libState.addToLectureItem = item;
  $("view-library").classList.add("hidden");
  $("view-library-add-to-lecture").classList.remove("hidden");
  var info = $("lib-addlect-item-info");
  if(type === "source"){
    info.innerHTML = '<div style="font-weight:700; color:var(--olive-dark);">' + esc(item.title) + '</div>' +
      '<div style="font-size:13px; color:var(--muted);">' + esc(item.type) + " • " + esc(item.section) + (item.author?" • " + esc(item.author):"") + '</div>';
  } else {
    info.innerHTML = '<div style="font-weight:700; color:var(--olive-dark);">' + esc(item.title) + '</div>' +
      '<div style="font-size:13px; color:var(--muted);">ملف موضوع دعوي • ' + (item.axes?item.axes.length:0) + ' محاور • ' + (item.evidences?item.evidences.length:0) + ' أدلة</div>';
  }
  renderAddToLectureList();
  $("lib-addlect-status").innerHTML = "";
}

function renderAddToLectureList(){
  var sel = $("lib-addlect-lecture");
  sel.innerHTML = '<option value="">اختر محاضرة...</option>';
  loadLectures().forEach(function(l){
    var opt = document.createElement("option");
    opt.value = l.id;
    opt.textContent = l.title + " (" + l.type + " • " + l.duration + " دقيقة)";
    sel.appendChild(opt);
  });
}

function libConfirmAddToLecture(){
  var lectureId = $("lib-addlect-lecture").value;
  if(!lectureId){ $("lib-addlect-status").innerHTML = '<div class="status-err"> فضلًا اختري محاضرة.</div>'; return; }
  var item = libState.addToLectureItem;
  var type = libState.addToLectureTarget.type;
  var content = "";
  if(type === "source"){
    content = "\n\n--- من المكتبة الدعوية: " + esc(item.title) + " ---\n";
    content += "المؤلف: " + esc(item.author||"غير محدد") + "\n";
    content += "النوع: " + esc(item.type) + " • القسم: " + esc(item.section) + "\n";
    if(item.link) content += "الرابط: " + esc(item.link) + "\n";
    if(item.volume || item.page) content += "الجزء: " + esc(item.volume||"") + " • الصفحة: " + esc(item.page||"") + "\n";
    content += "النص المقتبس:\n" + esc(item.quotedText) + "\n";
    if(item.notes) content += "ملاحظاتي: " + esc(item.notes) + "\n";
    if(item.keywords) content += "كلمات مفتاحية: " + esc(item.keywords) + "\n";
  } else {
    content = "\n--- من ملف الموضوع: " + esc(item.title) + " ---\n";
    content += "فكرة الموضوع: " + esc(item.idea||"") + "\n";
    content += "الأهداف: " + esc(item.goals||"") + "\n";
    if(item.axes && item.axes.length){
      content += "المحاور:\n";
      item.axes.forEach(function(a, i){
        content += (i+1) + "- " + a.title + (a.sub && a.sub.length? " (فرعيين: " + a.sub.join(", ") + ")" : "") + "\n";
      });
    }
    if(item.evidences && item.evidences.length){
      content += "الأدلة:\n";
      item.evidences.forEach(function(e){
        content += "- " + e.text + " — المصدر: " + esc(e.source) + " صفحة: " + esc(e.page) + "\n";
      });
    }
    if(item.reflections) content += "تأملاتي: " + esc(item.reflections) + "\n";
  }
  var arr = loadLectures();
  var idx = arr.findIndex(function(x){ return x.id === lectureId; });
  if(idx >= 0){
    arr[idx].body = (arr[idx].body||"") + content;
    arr[idx].updatedAt = Date.now();
    arr[idx].needsReview = /يحتاج إلى مراجعة/.test(arr[idx].body) || /\[.+\]/.test(arr[idx].body);
    saveLectures(arr);
  }
  showLibrary();
  toast("تمت إضافة المادة إلى المحاضرة ✓");
}

function libCreateLectureFromTopic(){
  var item = libState.addToLectureItem;
  if(!item || libState.addToLectureTarget.type !== "topic"){
    $("lib-addlect-status").innerHTML = '<div class="status-err"> هذه الوظيفة لملفات الموضوعات فقط.</div>'; return;
  }
  var content = "عنوان المحاضرة: " + esc(item.title) + "\n";
  content += "فكرة الموضوع: " + esc(item.idea||"") + "\n";
  content += "الأهداف: " + esc(item.goals||"") + "\n\n";
  if(item.axes && item.axes.length){
    content += "المحاور:\n";
    item.axes.forEach(function(a, i){
      content += (i+1) + "- " + a.title + "\n";
      if(a.sub && a.sub.length) a.sub.forEach(function(s){ content += "   • " + s + "\n"; });
    });
    content += "\n";
  }
  if(item.evidences && item.evidences.length){
    content += "الأدلة العلمية:\n";
    item.evidences.forEach(function(e){
      content += "- " + e.text + " — " + esc(e.source) + " (صفحة " + esc(e.page) + ")\n";
    });
    content += "\n";
  }
  if(item.reflections) content += "تأملات وفوائد:\n" + esc(item.reflections) + "\n\n";
  content += "⚠️ يرجى مراجعة جميع الأدلة والتخريجات قبل الإلقاء.";
  var d = {
    title: item.title,
    audience: "عامة الناس",
    duration: "30",
    type: "محاضرة",
    style: "علمي تأصيلي",
    notes: ""
  };
  var existing = loadLectures();
  var newItem = {
    id: uid(),
    title: d.title,
    audience: d.audience,
    duration: d.duration,
    type: d.type,
    style: d.style,
    notes: d.notes,
    body: content,
    brief: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    needsReview: true
  };
  existing.unshift(newItem);
  saveLectures(existing);
  showLibrary();
  toast("تم إنشاء مسودة محاضرة جديدة من الموضوع ✓");
}

on("lib-addlect-back", showLibrary);
on("lib-btn-confirm-add", libConfirmAddToLecture);
on("lib-btn-create-new-lecture", libCreateLectureFromTopic);
on("lib-btn-cancel-add", showLibrary);
})();
