import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 8080;
const WEBEX_TOKEN = process.env.WEBEX_BOT_TOKEN;
const WEBEX_BOT_ID = process.env.WEBEX_BOT_ID;
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN;

console.log("=== BOT INICIANDO ===");

// ========================
// Función real Railway
// ========================
async function obtenerConsumoRailway() {
   console.log(">>> COMANDO CONSUMO DETECTADO");
  const query = {
    query: `
      query {
        me {
          projects {
            name
            environments {
              name
              usage {
                cpu
                memory
                network
              }
            }
          }
        }
      }
    `
  };

  const response = await axios.post(
    "https://backboard.railway.app/graphql",
    query,
    {
      headers: {
        Authorization: `Bearer ${RAILWAY_TOKEN}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.data.me.projects;
}

// ========================
// Webhook Webex
// ========================
app.post("/webex", async (req, res) => {
  try {
    const event = req.body;
	console.log("=== WEBHOOK RECIBIDO ===");
	console.log(JSON.stringify(req.body, null, 2));
    console.log("EVENTO:", JSON.stringify(event));

    // Evitar loop
    if (event.actorId === WEBEX_BOT_ID) {
      return res.sendStatus(200);
    }

    if (!event.data || !event.data.id) {
      return res.sendStatus(200);
    }
	
	if (text.toLowerCase().includes("consumo")) {
    console.log(">>> COMANDO CONSUMO DETECTADO");
	}


    // Obtener mensaje real
    const msg = await axios.get(
      `https://webexapis.com/v1/messages/${event.data.id}`,
      {
        headers: {
          Authorization: `Bearer ${WEBEX_TOKEN}`
        }
      }
    );

    const texto = msg.data.text.toLowerCase();
    console.log("MENSAJE REAL:", texto);

    let respuesta = "Comandos disponibles:\n- consumo\n- status";

    // ========================
    // COMANDO CONSUMO
    // ========================
  if (text.includes("consumo")) {
	     console.log(">>> COMANDO CONSUMO DETECTADO");
    await fetch("https://webexapis.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.WEBEX_TOKEN}`
      },
      body: JSON.stringify({
        roomId: msgData.roomId,
        text: "📊 Consultando consumos en Railway..."
      })
    });
  }


    // ========================
    // Enviar respuesta
    // ========================
    await axios.post(
      "https://webexapis.com/v1/messages",
      {
        roomId: event.data.roomId,
        text: respuesta
      },
      {
        headers: {
          Authorization: `Bearer ${WEBEX_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("ERROR:", error.response?.data || error.message);
    res.sendStatus(500);
  }
});

// ========================
app.listen(PORT, () => {
  console.log(`Bot escuchando en puerto ${PORT}`);
});
