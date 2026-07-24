require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const PORT = process.env.PORT || 3000;

// ================================
// Middleware
// ================================

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// ================================
// Gemini
// ================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

// ================================
// Weather API
// ================================

app.get("/api/weather", async (req, res) => {

    try {

        const city = req.query.city;

        const url =
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`;

        const response = await axios.get(url);

        const weather = response.data;

        res.json({

            success: true,

            city: weather.name,

            temperature: weather.main.temp,

            feelsLike: weather.main.feels_like,

            humidity: weather.main.humidity,

            wind: weather.wind.speed,

            description: weather.weather[0].description,

            icon: weather.weather[0].icon

        });

    }

    catch (err) {

        res.json({

            success: false,

            message: "City not found."

        });

    }

});

// ================================
// News API
// ================================

app.get("/api/news", async (req, res) => {

    try {

        const city = req.query.city || "India";

        const url =
            `https://newsapi.org/v2/everything?q=${city}&pageSize=5&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`;

        const response = await axios.get(url);

        res.json({

            articles: response.data.articles

        });

    }

    catch (err) {

        res.status(500).json({

            articles: []

        });

    }

});

// ================================
// AI Route
// ================================

app.post("/api/ai", async (req, res) => {

    try {

        const {

            question,

            weather,

            news

        } = req.body;

        const prompt = `

You are an AI Weather & News Assistant.

Current Weather:

${JSON.stringify(weather, null, 2)}

Latest News:

${JSON.stringify(news, null, 2)}

User Question:

${question}

Answer in simple English.
Keep answer short.
`;

        const result = await model.generateContent(prompt);

        const answer = result.response.text();

        res.json({

            answer

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            answer: "AI is currently unavailable."

        });

    }

});

// ================================

app.listen(PORT, () => {

    console.log(`Server running on http://localhost:${PORT}`);

});