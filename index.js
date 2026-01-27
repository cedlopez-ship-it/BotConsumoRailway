import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 8080;
const WEBEX_TOKEN = process.env.WEBEX_BOT_TOKEN;
const WEBEX_BOT_ID = process.env.WEBEX_BOT_ID;
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;

console.log("=== BOT INICIANDO ===");

// Webhook Webex

app.get("/", (req, res) => {
  res.send("OK");
});
app.post("/webex", async (req, res) => {
  try {
    const event = req.body;

    // Ignorar mensajes del propio bot
    if (event.actorId === WEBEX_BOT_ID) {
      return res.sendStatus(200);
    }

    if (!event.data?.id) return res.sendStatus(200);

    // Obtener mensaje real
    const msg = await axios.get(
      `https://webexapis.com/v1/messages/${event.data.id}`,
      {
        headers: {
          Authorization: `Bearer ${WEBEX_TOKEN}`
        }
      }
    );

    const text = msg.data.text.toLowerCase();
    console.log("MENSAJE REAL:", text);

    // Comando consumo
    if (text.includes("consumo")) {
      const reply = "🚆 Railway está activo.\n(La consulta real vendrá aquí)";
      
	  const query = `
    query {
      me {
        projects {
          edges {
            node {
              name
              environments {
                edges {
                  node {
                    name
                    serviceInstances {
                      edges {
                        node {
                          usage {
                            computeTime
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const railwayRes = await axios.post(
    "https://backboard.railway.app/graphql/v2",
    { query },
    {
      headers: {
        Authorization: `Bearer ${process.env.RAILWAY_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  const projects = railwayRes.data.data.me.projects.edges;

  let reply = "📊 Consumo Railway:\n\n";

  for (const p of projects) {
    reply += `• ${p.node.name}\n`;
  }
      await axios.post(
        "https://webexapis.com/v1/messages",
        {
          roomId: event.data.roomId,
          text: reply
        },
        {
          headers: {
            Authorization: `Bearer ${WEBEX_TOKEN}`,
            "Content-Type": "application/json"
          }
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("ERROR:", error.message);
    res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`Bot escuchando en puerto ${PORT}`);
});
