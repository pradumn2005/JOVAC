const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");

const temp = document.getElementById("temp");
const cityName = document.getElementById("cityName");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const feelsLike = document.getElementById("feelsLike");
const weatherIcon = document.getElementById("weatherIcon");

const newsContainer = document.getElementById("newsContainer");

const aiQuestion = document.getElementById("aiQuestion");
const askAI = document.getElementById("askAI");
const aiResponse = document.getElementById("aiResponse");

let latestWeather = null;
let latestNews = [];

// ===============================
// Search Weather + News
// ===============================

searchBtn.addEventListener("click", () => {

    const city = cityInput.value.trim();

    if (!city) {
        alert("Please enter a city.");
        return;
    }

    loadWeather(city);
    loadNews(city);

});

cityInput.addEventListener("keypress", (e) => {

    if (e.key === "Enter") {

        searchBtn.click();

    }

});

// ===============================
// Weather
// ===============================

async function loadWeather(city) {

    try {

        const res = await fetch(`/api/weather?city=${city}`);

        const data = await res.json();

        if (!data.success) {

            alert(data.message);

            return;
        }

        latestWeather = data;

        temp.innerText = `${Math.round(data.temperature)}°C`;

        cityName.innerText = data.city;

        description.innerText = data.description;

        humidity.innerText = `${data.humidity}%`;

        wind.innerText = `${data.wind} km/h`;

        feelsLike.innerText = `${Math.round(data.feelsLike)}°C`;

        weatherIcon.src =
            `https://openweathermap.org/img/wn/${data.icon}@2x.png`;

    } catch (err) {

        console.log(err);

        alert("Weather API Error");

    }

}

// ===============================
// News
// ===============================

async function loadNews(city) {

    try {

        newsContainer.innerHTML =
            "<p class='loading'>Loading News...</p>";

        const res = await fetch(`/api/news?city=${city}`);

        const data = await res.json();

        latestNews = data.articles;

        newsContainer.innerHTML = "";

        if (latestNews.length === 0) {

            newsContainer.innerHTML =
                "<p>No News Found.</p>";

            return;

        }

        latestNews.forEach(article => {

            newsContainer.innerHTML += `

            <div class="news-item">

                <h3>${article.title}</h3>

                <p>${article.description || ""}</p>

                <a href="${article.url}" target="_blank">

                    Read More →

                </a>

            </div>

            `;

        });

    }

    catch (err) {

        console.log(err);

        newsContainer.innerHTML =
            "<p>Unable to fetch news.</p>";

    }

}

// ===============================
// AI Assistant
// ===============================

askAI.addEventListener("click", async () => {

    const question = aiQuestion.value.trim();

    if (!question) {

        alert("Ask something.");

        return;

    }

    aiResponse.innerHTML = "Thinking...";

    try {

        const res = await fetch("/api/ai", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify({

                question,

                weather: latestWeather,

                news: latestNews

            })

        });

        const data = await res.json();

        aiResponse.innerHTML = data.answer;

    }

    catch (err) {

        console.log(err);

        aiResponse.innerHTML =

            "Something went wrong.";

    }

});

// ===============================
// Default City
// ===============================

window.onload = () => {

    loadWeather("Delhi");

    loadNews("India");

};