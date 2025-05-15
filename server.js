// ===== server.js =====
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

const AUTHOR = "Agata Ogrodnik";
const startTime = new Date().toISOString();

console.log(`[START] App started at ${startTime}`);
console.log(`[INFO] Author: ${AUTHOR}`);
console.log(`[INFO] Listening on port ${PORT}`);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/weather", async (req, res) => {
  const { country, city } = req.body;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!city || !country) {
    return res.status(400).json({ error: "Missing city or country" });
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&units=metric&appid=${apiKey}`
    );
    const data = await response.json();

    if (data.cod !== 200) {
      return res.status(data.cod).json({ error: data.message });
    }

    const weather = {
      temperature: data.main.temp,
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind: data.wind.speed
    };

    res.json(weather);
  } catch (error) {
    res.status(500).json({ error: "Error fetching weather data" });
  }
});

app.listen(PORT);
