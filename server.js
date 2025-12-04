import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let lastData = {};
let lastTimestamp = 0;

// ESP’ye toggle komutu gönderecek WebSocket clientları
function sendToggleToESP(){
  wss.clients.forEach(client=>{
    if(client.readyState===1) client.send("TOGGLE_RELAY");
  });
}

// Data endpoint
app.post("/api/data", (req,res)=>{
  lastData = req.body||{};
  lastTimestamp = Date.now();
  const msg = JSON.stringify({ type:"update", data:lastData, ts:lastTimestamp });
  wss.clients.forEach(c=>{ if(c.readyState===1) c.send(msg); });
  res.json({status:"ok"});
});

app.get("/api/last", (req,res)=>res.json({data:lastData, ts:lastTimestamp}));

// Röle toggle endpoint
app.post("/api/toggle",(req,res)=>{
  sendToggleToESP();
  res.json({status:"ok"});
});

wss.on("connection", ws=>{
  ws.send(JSON.stringify({type:"init", data:lastData, ts:lastTimestamp}));
});

setInterval(()=>{
  if(Date.now()-lastTimestamp>10000){
    const msg = JSON.stringify({type:"offline", data:null, ts:lastTimestamp});
    wss.clients.forEach(c=>{ if(c.readyState===1) c.send(msg); });
  }
},3000);

const PORT = process.env.PORT||10000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
