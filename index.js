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
if (text.includes("consumo")) {
  console.log("Entro a Consumo");

  let reply = "📊 Consumo Railway:\n\n";

  const query = `
    query {
      me {
        projects {
          edges {
            node {
              name
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

app.listen(PORT, () => {
  console.log(`Bot escuchando en puerto ${PORT}`);
});
