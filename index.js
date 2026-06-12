import express from "express";
import { spawn } from "child_process";

const app = express();

let ffmpegProcesses = {};

const channels = {
  ch4k: {
    input: "https://super.hima-sabry2015.workers.dev/ch/bmax1_1080/index.m3u8",
    streamKey: "758d-vhe5-kbzu-802d",
    logo: "logo4k.png"
  },

  ch1: {
    input: "https://pub-b6a2e12c8294473a88fb9c317217dbbc.r2.dev/BMax1.m3u8",
    streamKey: "6ce1-v2hu-38fu-awwa",
    logo: "logo1.png"
  },

  ch2: {
    input: "https://ostora-tv.hima-sabry2015.workers.dev/super/play.m3u8?id=158517&cat=7215",
    streamKey: "5716-lclm-8mhs-hd0n",
    logo: "logo22.png"
  }
};

app.get("/", (req, res) => {
  res.send("🚀 Restream System Running");
});

app.get("/health", (req, res) => {
  res.send("OK");
});

function startChannel(id) {
  const ch = channels[id];

  if (!ch) return;
  if (ffmpegProcesses[id]) return;

  const output = `rtmp://rtmp.livepeer.com/live/${ch.streamKey}`;

  const ffmpeg = spawn("ffmpeg", [
    "-re",

    "-reconnect", "1",
    "-reconnect_streamed", "1",
    "-reconnect_delay_max", "5",

    "-i", ch.input,
    "-i", ch.logo,

    "-filter_complex",
    "[0:v]scale=1280:720,setsar=1[base];[base][1:v]overlay=W-w-5:5",

    "-c:v", "libx264",
    "-preset", "veryfast",
    "-tune", "zerolatency",

    "-c:a", "aac",
    "-b:a", "128k",

    "-f", "flv",
    output
  ]);

  ffmpeg.stderr.on("data", (data) => {
    console.log(`[${id}] ${data}`);
  });

  ffmpeg.on("exit", (code) => {
    console.log(`❌ ${id} exited ${code}`);
    delete ffmpegProcesses[id];

    setTimeout(() => {
      startChannel(id);
    }, 5000);
  });

  ffmpegProcesses[id] = ffmpeg;
}

app.get("/start", (req, res) => {
  const id = req.query.id;

  if (!channels[id]) {
    return res.send("❌ channel not found");
  }

  startChannel(id);

  res.send(`✅ ${id} started`);
});

app.get("/stop", (req, res) => {
  const id = req.query.id;

  if (ffmpegProcesses[id]) {
    ffmpegProcesses[id].kill("SIGKILL");
    delete ffmpegProcesses[id];
  }

  res.send(`🛑 ${id} stopped`);
});

app.get("/status", (req, res) => {
  const result = {};

  for (const id in channels) {
    result[id] = {
      active: !!ffmpegProcesses[id]
    };
  }

  res.json(result);
});
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Restream Dashboard</title>

<style>
*{
  margin:0;
  padding:0;
  box-sizing:border-box;
}

body{
  background:#0f172a;
  color:white;
  font-family:Arial,sans-serif;
  padding:20px;
}

h1{
  text-align:center;
  margin-bottom:20px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(300px,1fr));
  gap:15px;
}

.card{
  background:#1e293b;
  border-radius:15px;
  padding:20px;
}

.live{
  color:#22c55e;
  font-weight:bold;
}

.offline{
  color:#ef4444;
  font-weight:bold;
}

.btn{
  border:none;
  padding:10px 15px;
  border-radius:8px;
  cursor:pointer;
  color:white;
  margin-right:5px;
}

.start{
  background:#16a34a;
}

.stop{
  background:#dc2626;
}

.refresh{
  background:#2563eb;
}

.top{
  text-align:center;
  margin-bottom:20px;
}
</style>
</head>
<body>

<h1>📡 Restream Dashboard</h1>

<div class="top">
<button class="btn refresh" onclick="loadData()">🔄 Refresh</button>
</div>

<div id="channels" class="grid"></div>

<script>

async function loadData(){

  const res = await fetch('/status');
  const data = await res.json();

  let html = '';

  Object.keys(data).forEach(id => {

    const status = data[id].active
      ? '<span class="live">🟢 LIVE</span>'
      : '<span class="offline">🔴 OFFLINE</span>';

    html += \`
      <div class="card">

        <h2>\${id}</h2>

        <p style="margin:10px 0;">
          Status: \${status}
        </p>

        <button
          class="btn start"
          onclick="window.location='/start?id=\${id}'">
          ▶ Start
        </button>

        <button
          class="btn stop"
          onclick="window.location='/stop?id=\${id}'">
          ⏹ Stop
        </button>

      </div>
    \`;
  });

  document.getElementById("channels").innerHTML = html;
}

loadData();

setInterval(loadData, 5000);

</script>

</body>
</html>
  `);
});
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
