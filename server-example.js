// خادم وسيط آمن — يحفظ مفتاح API بعيدًا عن المتصفح
// التشغيل:  npm i express cors openai
// ثم:  OPENAI_API_KEY=sk-... node server-example.js
// ثم ضعي في إعدادات الموقع: http://localhost:3001/api/generate
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.MODEL || "gpt-4o-mini";

app.post("/api/generate", async (req, res) => {
  try {
    if (req.body && req.body.test) return res.json({ ok: true });
    const { title, audience, duration, type, style, notes, model, prompt } = req.body || {};
    if (!title || !prompt) return res.status(400).json({ error: "title and prompt required" });
    const completion = await client.chat.completions.create({
      model: model || MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: "أنت مساعد علمي للداعية. تعتمد القرآن والسنة الصحيحة، ولا تخترع حديثًا ولا قولًا ولا مرجعًا. ما لم تتحقق منه ضع بعده «يحتاج إلى مراجعة». تجنّب القصص المكذوبة والأحاديث الضعيفة غير المبينة." },
        { role: "user", content: prompt }
      ]
    });
    const text = completion.choices?.[0]?.message?.content || "";
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "generation failed" });
  }
});

app.listen(3001, () => console.log("Zad proxy on http://localhost:3001/api/generate"));
