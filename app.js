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
  ["home","new","my","settings","editor"].forEach(function(v){ var s=$("view-"+v); if(s) s.classList.add("hidden"); });
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
document.querySelectorAll(".nav-item").forEach(function(b){ b.addEventListener("click", function(){ show(b.dataset.view); }); });
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
})();
