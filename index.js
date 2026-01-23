import express from "express";
import axios from "axios";

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");

const app = express();
app.use(express.json());

const WEBEX_TOKEN = process.env.WEBEX_BOT_TOKEN;
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;
const PUBLIC_URL = process.env.PUBLIC_URL;

const WEBHOOK_NAME = "Railway Bot Webhook";
const WEBHOOK_URL = `${PUBLIC_URL}/webex`;

console.log("🔥 BOT INICIADO - VERSION DEBUG");

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

    // Anti-loop
    if (event.actorId === process.env.WEBEX_BOT_ID) {
      return res.sendStatus(200);
    }

    if (!event.data || !event.data.id || !event.data.roomId) {
      return res.sendStatus(200);
    }

    // 1. Obtener mensaje real
    const message = await axios.get(
      `https://webexapis.com/v1/messages/${event.data.id}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}`
        }
      }
    );

    console.log("MENSAJE REAL:", message.data.text);

    const text = message.data.text.toLowerCase();

    // 2. Comando \status
    if (text.includes("\\status") || text.includes("status")) {
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
	
	// 2. Procesar comando
	const text = msg.data.text
	  .toLowerCase()
	  .replace("railwaywebex", "")
	  .trim();
	  
	console.log("COMANDO LIMPIO:", text);
    if (text === "consumo") {
		 console.log("CONSUMO:", message.data.text);

      // 3. CONSULTA A RAILWAY (aquí)
      const railway = await axios.post(
        "https://backboard.railway.app/graphql/v2",
        {
          query: `
          query {
            me {
              projects {
                name
                usage {
                  current {
                    totalCostUsd
                  }
                }
              }
            }
          }`
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.RAILWAY_TOKEN}`
          }
        }
      );

      const proyectos = railway.data.data.me.projects;

      let respuesta = "📊 Consumo Railway:\n\n";

      proyectos.forEach(p => {
        respuesta += `• ${p.name}: $${p.usage.current.totalCostUsd}\n`;
      });

      // 4. Responder a Webex
      await axios.post(
        "https://webexapis.com/v1/messages",
        {
          roomId: event.data.roomId,
          text: respuesta
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WEBEX_TOKEN}`
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
  console.error("ERROR COMPLETO:", error.response?.data || error);
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
