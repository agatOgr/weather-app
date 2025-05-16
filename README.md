# weather-app


## Opis projektu

Jest to prosta aplikacja webowa stworzona w technologii Node.js z użyciem frameworka Express, umożliwiająca użytkownikowi wybór kraju i miasta z predefiniowanej listy oraz pobranie aktualnych danych pogodowych z API OpenWeatherMap. Aplikacja została zaprojektowana do działania w środowisku kontenerowym. Obraz aplikacji budowany jest przy użyciu zoptymalizowanego pliku Dockerfile w technice wieloetapowego budowania.

## Struktura oraz zawartość plików projektu

```
weather-app/
├── Dockerfile
├── package.json
├── server.js
├── public/
│   └── index.html
└── alpine-minirootfs-3.21.3-aarch64.tar
```

### server.js - serwer aplikacji

```
const express = require("express");          // Import biblioteki Express
const fetch = require("node-fetch");         // Import funkcji do wykonywania zapytań HTTP
const path = require("path");                // Import narzędzi ścieżkowych (do obsługi plików statycznych)
const app = express();                       // Tworzenie aplikacji Express
const PORT = process.env.PORT || 3000;       // Port aplikacji (domyślnie 3000 lub z ENV)

const AUTHOR = "Agata Ogrodnik";             // Autor aplikacji
const startTime = new Date().toISOString();  // Czas uruchomienia aplikacji

// Logowanie wymaganych informacji do konsoli
console.log(`[START] App started at ${startTime}`);
console.log(`[INFO] Author: ${AUTHOR}`);
console.log(`[INFO] Listening on port ${PORT}`);

// Middleware do obsługi JSON i plików statycznych
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Endpoint POST do pobierania danych pogodowych
app.post("/weather", async (req, res) => {
  const { country, city } = req.body;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!city || !country) {
    return res.status(400).json({ error: "Missing city or country" });
  }

  try {
    // Zapytanie do API OpenWeatherMap
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&units=metric&appid=${apiKey}`
    );
    const data = await response.json();

    if (data.cod !== 200) {
      return res.status(data.cod).json({ error: data.message });
    }

    // Przetwarzanie danych pogodowych
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

// Uruchomienie serwera
app.listen(PORT);

```

### public/index.html - interfejs użytkownika

```
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <title>Pogoda</title>
  <style>
    body { font-family: sans-serif; max-width: 500px; margin: 40px auto; }
    label, select, button { display: block; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>Sprawdź pogodę</h1>

  <!-- Wybór kraju -->
  <label for="country">Wybierz kraj:</label>
  <select id="country">
    <option value="PL">Polska</option>
    <option value="DE">Niemcy</option>
    <option value="FR">Francja</option>
  </select>

  <!-- Wybór miasta -->
  <label for="city">Wybierz miasto:</label>
  <select id="city">
    <option value="Warszawa">Warszawa</option>
    <option value="Kraków">Kraków</option>
    <option value="Gdańsk">Gdańsk</option>
  </select>

  <button id="check">Pokaż pogodę</button>

  <!-- Miejsce na wynik -->
  <div id="result"></div>

  <script>
    // Lista miast zależna od wybranego kraju
    const countryToCities = {
      PL: ["Warszawa", "Kraków", "Gdańsk"],
      DE: ["Berlin", "Monachium", "Hamburg"],
      FR: ["Paryż", "Lyon", "Marsylia"]
    };

    // Aktualizacja miast po zmianie kraju
    document.getElementById("country").addEventListener("change", function () {
      const cities = countryToCities[this.value];
      const citySelect = document.getElementById("city");
      citySelect.innerHTML = "";
      cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
      });
    });

    // Obsługa kliknięcia przycisku
    document.getElementById("check").addEventListener("click", async () => {
      const country = document.getElementById("country").value;
      const city = document.getElementById("city").value;

      // Wysłanie zapytania do backendu
      const res = await fetch("/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, city })
      });

      const data = await res.json();
      const out = document.getElementById("result");

      if (data.error) {
        out.innerHTML = `<p style='color:red'>Błąd: ${data.error}</p>`;
      } else {
        out.innerHTML = `
          <p><strong>Temperatura:</strong> ${data.temperature}°C</p>
          <p><strong>Opis:</strong> ${data.description}</p>
          <p><strong>Wilgotność:</strong> ${data.humidity}%</p>
          <p><strong>Wiatr:</strong> ${data.wind} m/s</p>`;
      }
    });
  </script>
</body>
</html>

```

### package.json – metadane projektu

```
{
  "name": "weather-app",               // Nazwa projektu
  "version": "1.0.0",                  // Wersja aplikacji
  "description": "Aplikacja pogodowa",// Krótki opis
  "main": "server.js",                 // Plik wejściowy aplikacji
  "scripts": {
    "start": "node server.js"         // Skrypt startowy
  },
  "author": "Agata Ogrodnik",         // Autor aplikacji
  "dependencies": {
    "express": "^4.18.2",             // Serwer HTTP
    "node-fetch": "^2.6.1"            // Do wykonywania zapytań HTTP
  }
}

```

### Dockerfile – budowanie obrazu kontenera

```
# --------- ETAP 1: Budowanie aplikacji w lekkim środowisku ----------
FROM scratch AS app_build

# Dodanie obrazu Alpine jako mini-rootfs
ADD alpine-minirootfs-3.21.3-aarch64.tar /

# Instalacja Node.js i npm oraz utworzenie użytkownika node
RUN ["/bin/sh", "-c", "\
    apk update && \
    apk upgrade && \
    apk add --no-cache nodejs npm && \
    addgroup -S node && adduser -S node -G node \
"]

WORKDIR /home/node/app

# Kopiowanie plików projektu i zmiana właściciela
COPY --chown=node:node package.json .
COPY --chown=node:node server.js .
COPY --chown=node:node public ./public

# Instalacja zależności
RUN npm install

# --------- ETAP 2: Finalny obraz aplikacji ----------
FROM node:22-alpine3.19

# Informacja o autorze (zgodna z OCI)
LABEL org.opencontainers.image.authors="Agata Ogrodnik"

WORKDIR /home/node/app

# Kopiowanie aplikacji z etapu build
COPY --from=app_build /home/node/app .

# Wystawienie portu TCP
EXPOSE 3000

# HEALTHCHECK do sprawdzania dostępności aplikacji
HEALTHCHECK --interval=5s --timeout=3s --start-period=3s --retries=2 \
  CMD wget -q --spider http://localhost:3000/ || exit 1

# Uruchomienie serwera
CMD ["node", "server.js"]

```
## Polecenia 

#### Budowa obrazu kontenera

```
docker build -t weather-app .
```

<img width="1041" alt="image" src="https://github.com/user-attachments/assets/0fc3cafc-ec53-4d73-9b8c-ec401c9978a0" />

<img width="989" alt="image" src="https://github.com/user-attachments/assets/ac484f17-4d32-46f8-89a9-00739fe37120" />


#### Uruchomienie kontenera

```
docker run -d -p 3000:3000 \
  --name pogoda \
  -e OPENWEATHER_API_KEY=3183f82e063f384b802d392f4f610a16 \
  weather-app
```
<img width="619" alt="image" src="https://github.com/user-attachments/assets/f3015134-2b7c-49f9-a344-98581cf61538" />

<img width="1037" alt="image" src="https://github.com/user-attachments/assets/672ab684-dd19-416f-82b6-427ac505fbac" />


#### Sposób uzyskania logów

Aplikacja po uruchomieniu wypisuje podstawowe informacje diagnostyczne do standardowego wyjścia (stdout) za pomocą polecenia console.log(). Logowane dane to: data i godzina uruchomienia aplikacji (App started at ...), imię i nazwisko autora (Author: Agata Ogrodnik), numer portu, na którym aplikacja nasłuchuje (Listening on port ...).

Logi zostały odczytane za pomocą polecenia:

```
docker logs pogoda
```

<img width="504" alt="image" src="https://github.com/user-attachments/assets/4a6a9121-4866-414c-9786-7cafd463a67d" />

#### Sprawdzenia, ile warstw posiada zbudowany obraz oraz jaki jest rozmiar obrazu

```
docker image inspect weather-app --format='Liczba warstw: {{len .RootFS.Layers}}'
```

```
docker image inspect weather-app --format='Rozmiar obrazu: {{.Size}} bajtów'
```

<img width="950" alt="image" src="https://github.com/user-attachments/assets/c14bfe00-f1d3-415c-8dc4-839e99518ead" />


## Poprawność działania przeglądarki

<img width="1145" alt="image" src="https://github.com/user-attachments/assets/5bffc44a-8939-4721-b82b-8f9dfb92932a" />



<img width="587" alt="image" src="https://github.com/user-attachments/assets/99143a2e-8e69-4413-9bf9-3fb1bb8e8bcf" />

