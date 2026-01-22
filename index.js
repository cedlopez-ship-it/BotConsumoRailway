import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const WEBEX_TOKEN = process.env.WEBEX_BOT_TOKEN;
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;

// Endpoint que Webex llamará (webhook)
app.post("/webex", async (req, res) => {
  try {
    const { data } = req.body;
    const messageId = data.id;
    const roomId = data.roomId;

    // Obtener el texto real del mensaje
    const msgRes = await axios.get(
      `https://webexapis.com/v1/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${WEBEX_TOKEN}`
        }
      }
    );

    const text = msgRes.data.text || "";

    if (text.startsWith("/consumo")) {
      const usage = await getRailwayUsage();
      await sendWebexMessage(roomId, usage);
    }

    if (text.startsWith("/status")) {
      const status = await getRailwayStatus();
      await sendWebexMessage(roomId, status);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err.message);
    res.sendStatus(500);
  }
});

// Función: consulta consumo Railway
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

  const projects = res.data.data.me.projects;

  let msg = "📊 Consumo Railway\n\n";

  projects.forEach(p => {
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

// Función: estado servicios
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

// Enviar mensaje a Webex
async function sendWebexMessage(roomId, text) {
  await axios.post(
    "https://webexapis.com/v1/messages",
    {
      roomId,
      text
    },
    {
      headers: {
        Authorization: `Bearer ${WEBEX_TOKEN}`
      }
    }
  );
}

// Puerto Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot Webex escuchando en puerto", PORT);
});
