import express from "express";
import { spawn } from "child_process";

const app = express();

let ffmpegProcesses = {};
let restartTimers = {};
let viewers = {};
let viewerIntervals = {};

// 🎯 القنوات
const channels = {
  ch4k: {
    input: "https://super.hima-sabry2015.workers.dev/ch/bmax1_1080/index.m3u8",
    output: "rtmp://rtmp.livepeer.com/live/758d-vhe5-kbzu-802d"
  },

  ch1: {
    input: "https://pub-b6a2e12c8294473a88fb9c317217dbbc.r2.dev/BMax1.m3u8",
    output: "rtmp://rtmp.livepeer.com/live/6ce1-v2hu-38fu-awwa"
  },

  ch2: {
    input: "https://ostora-tv.hima-sabry2015.workers.dev/super/play.m3u8?id=158517&cat=7215",
    output: "rtmp://rtmp.livepeer.com/live/5716-lclm-8mhs-hd0n"
  },

  ch3: {
    input: "https://streem.rodoye.com/live/rodo/max_3/index.m3u8",
    output: "rtmp://rtmp.livepeer.com/live/stream-key-3"
  },

  ch4: {
    input: "https://streem.rodoye.com/live/rodo/max_4/index.m3u8",
    output: "rtmp://rtmp.livepeer.com/live/stream-key-4"
  }
};

// 🛡️ حماية
process.on("uncaughtException", err => console.log("🔥 Error:", err));
process.on("unhandledRejection", err => console.log("🔥 Rejection:", err));

// 🌐 Home
app.get("/", (req, res) => {
  res.send("🚀 Stable Restream Running on Fly.io");
});

app.get("/health", (req, res) => res.send("OK"));


// 🔥 تشغيل FFmpeg (نسخة ثابتة)
function startFFmpeg(id) {
  const ch = channels[id];
  if (!ch) return;

  console.log(`▶ Starting ${id}`);

  const ffmpeg = spawn("ffmpeg", [
    "-re",

    // 🔥 مهم جدًا للاستقرار
    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "5",

    "-fflags", "+genpts+discardcorrupt",
    "-flags", "low_delay",

    "-i", ch.input,

    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",
    "-b:v", "1000k",
    "-maxrate", "1000k",
    "-bufsize", "2000k",
    "-r", "25",

    "-c:a", "aac",
    "-b:a", "96k",

    "-f", "flv",
    ch.output
  ]);

  ffmpeg.stderr.on("data", d => {
    console.log(`[${id}] ${d.toString()}`);
  });

  ffmpeg.on("exit", code => {
    console.log(`❌ ${id} exited ${code}`);

    delete ffmpegProcesses[id];

    // 🔄 Auto restart بعد 3 ثواني
    restartTimers[id] = setTimeout(() => {
      console.log(`🔄 Restarting ${id}`);
      startFFmpeg(id);
    }, 3000);
  });

  ffmpegProcesses[id] = ffmpeg;
}


// ▶️ Start
app.get("/start", (req, res) => {
  const id = req.query.id;

  if (!id) return res.send("❌ missing id");
  if (!channels[id]) return res.send("❌ channel not found");
  if (ffmpegProcesses[id]) return res.send("⚠️ already running");

  startFFmpeg(id);

  // 👁️ fake viewers (كما هو عندك)
  viewers[id] = Math.floor(Math.random() * 10) + 3;

  if (viewerIntervals[id]) clearInterval(viewerIntervals[id]);

  viewerIntervals[id] = setInterval(() => {
    if (!viewers[id]) return;
    let change = Math.floor(Math.random() * 3) - 1;
    viewers[id] = Math.max(1, viewers[id] + change);
  }, 4000);

  res.send(`✅ Channel ${id} started`);
});


// 🛑 Stop
app.get("/stop", (req, res) => {
  const id = req.query.id;

  if (ffmpegProcesses[id]) {
    ffmpegProcesses[id].kill("SIGKILL");
    delete ffmpegProcesses[id];
  }

  if (restartTimers[id]) {
    clearTimeout(restartTimers[id]);
    delete restartTimers[id];
  }

  viewers[id] = 0;

  if (viewerIntervals[id]) {
    clearInterval(viewerIntervals[id]);
    delete viewerIntervals[id];
  }

  res.send(`🛑 Channel ${id} stopped`);
});


// 📊 Status
app.get("/status", (req, res) => {
  const result = {};

  for (const id in channels) {
    result[id] = {
      active: !!ffmpegProcesses[id],
      viewers: viewers[id] || 0
    };
  }

  res.json(result);
});


// 📡 Dashboard
app.get("/dashboard", (req, res) => {
  res.send(`
<html>
<body style="background:#111;color:#fff;font-family:Arial;padding:20px">

<h2>📡 Stable Restream Dashboard</h2>

<div id="list"></div>

<script>
async function load(){
  const r = await fetch('/status');
  const d = await r.json();

  document.getElementById('list').innerHTML =
    Object.keys(d).map(ch =>
      "<div style='margin:10px;padding:10px;background:#222'>" +
      "<h3>" + ch + " - " + (d[ch].active ? "🟢 LIVE" : "🔴 OFF") + "</h3>" +
      "<p>👁️ Viewers: " + d[ch].viewers + "</p>" +
      "<a href='/start?id="+ch+"'>Start</a> | " +
      "<a href='/stop?id="+ch+"'>Stop</a>" +
      "</div>"
    ).join('');
}
load();
setInterval(load,3000);
</script>

</body>
</html>
  `);
});


// 🚀 Fly.io port fix
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port", PORT);
});
