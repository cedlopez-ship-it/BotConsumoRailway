import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const WEBEX_TOKEN = process.env.WEBEX_BOT_TOKEN;
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL;

const WEBHOOK_NAME = "Railway Bot Webhook";
const WEBHOOK_URL = `${PUBLIC_URL}/webex`;

/* ============================
   AUTO CREAR WEBHOOK WEBEX
============================ */
async function ensureWebhook() {
  const headers = {
    Authorization: `Bearer ${WEBEX_TOKEN}`
  };

  // Listar webhooks existentes
  const res = await axios.get(
    "https://webexapis.com/v1/webhooks",
    { headers }
  );

  const exists = res.data.items.find(
    w => w.targetUrl === WEBHOOK_URL
  );

  if (exists) {
    console.log("Webhook ya existe:", exists.id);
    return;
  }

  // Crear webhook
  await axios.post(
    "https://webexapis.com/v1/webhooks",
    {
      name: WEBHOOK_NAME,
      targetUrl: WEBHOOK_URL,
      resource: "messages",
      event: "created",
      filter: "mentionedPeople=me"
    },
    { headers }
  );

  console.log("Webhook creado automáticamente");
}

/* ============================
   ENDPOINT WEBEX
============================ */
app.post("/webex", async (req, res) => {
  try {
    const { data } = req.body;
    const messageId = data.id;
    const roomId = data.roomId;

    const msgRes = await axios.get(
      `https://webexapis.com/v1/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${WEBEX_TOKEN}`
        }
      }
    );

    const text = msgRes.data.text || "";

    if (text.includes("/consumo")) {
      const usage = await getRailwayUsage();
      await sendWebexMessage(roomId, usage);
    }

    if (text.includes("/status")) {
      const status = await getRailwayStatus();
      await sendWebexMessage(roomId, status);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error webhook:", err.message);
    res.sendStatus(500);
  }
});

/* ============================
   RAILWAY FUNCTIONS
============================ */
async function getRailwayUsage() {
  const query = `
  query {
    me {
      projects {
        name
        services {
          name
          metrics {
            cpu
            memory
            network
          }
        }
      }
    }
  }`;

  const res = await axios.post(
    "https://backboard.railway.app/graphql/v2",
    { query },
    {
      headers: {
        Authorization: `Bearer ${RAILWAY_TOKEN}`
      }
    }
  );

  let msg = "📊 Consumo Railway\n\n";

  res.data.data.me.projects.forEach(p => {
    msg += `Proyecto: ${p.name}\n`;
    p.services.forEach(s => {
      msg += ` - ${s.name}\n`;
      msg += `   CPU: ${s.metrics?.cpu || 0}\n`;
      msg += `   RAM: ${s.metrics?.memory || 0}\n`;
      msg += `   NET: ${s.metrics?.network || 0}\n`;
    });
    msg += "\n";
  });

  return msg;
}

async function getRailwayStatus() {
  const query = `
  query {
    me {
      projects {
        name
        services {
          name
          deployments(last: 1) {
            status
          }
        }
      }
    }
  }`;

  const res = await axios.post(
    "https://backboard.railway.app/graphql/v2",
    { query },
    {
      headers: {
        Authorization: `Bearer ${RAILWAY_TOKEN}`
      }
    }
  );

  let msg = "🟢 Estado Railway\n\n";

  res.data.data.me.projects.forEach(p => {
    msg += `Proyecto: ${p.name}\n`;
    p.services.forEach(s => {
      msg += ` - ${s.name}: ${s.deployments[0]?.status || "N/A"}\n`;
    });
    msg += "\n";
  });

  return msg;
}

/* ============================
   WEBEX SEND
============================ */
async function sendWebexMessage(roomId, text) {
  await axios.post(
    "https://webexapis.com/v1/messages",
    { roomId, text },
    {
      headers: {
        Authorization: `Bearer ${WEBEX_TOKEN}`
      }
    }
  );
}

/* ============================
   START SERVER
============================ */
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log("Bot escuchando en puerto", PORT);
  await ensureWebhook();   // ← magia DevOps real
});
