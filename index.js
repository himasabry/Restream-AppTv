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
    "[0:v][1:v]overlay=W-w-10:10",

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

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
