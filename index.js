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
    const event = req.body;
    console.log("EVENTO:", JSON.stringify(event));

    if (event.actorId === process.env.WEBEX_BOT_ID) {
      console.log("Ignorado: mensaje del bot");
      return res.sendStatus(200);
    }

    if (!event.data || !event.data.id || !event.data.roomId) {
      console.log("Evento inválido");
      return res.sendStatus(200);
    }

    const message = await axios.get(
      `https://webexapis.com/v1/messages/${event.data.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}`
        }
      }
    );

    console.log("MENSAJE:", message.data.text);

    const text = message.data.text.toLowerCase();

    if (text.includes("\\status") || text.includes("status")) {
      console.log("Comando STATUS detectado");

      await axios.post(
        "https://webexapis.com/v1/messages",
        {
          roomId: event.data.roomId,
          text: "🚀 Bot activo y funcionando en Railway"
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}`
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("ERROR REAL:", error.response?.data || error.message);
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
