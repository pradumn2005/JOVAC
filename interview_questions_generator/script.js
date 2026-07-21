const generateBtn = document.getElementById("generateBtn");
const submitBtn = document.getElementById("submitBtn");
const nextBtn = document.getElementById("nextBtn");

const topic = document.getElementById("topic");
const difficulty = document.getElementById("difficulty");
const count = document.getElementById("count");

const loading = document.getElementById("loading");
const quiz = document.getElementById("quiz");

const API_KEY = "";

let questions = [];
let currentQuestion = 0;
let score = 0;
let selectedOption = "";

generateBtn.addEventListener("click", generateQuiz);

async function generateQuiz() {

    quiz.innerHTML = "";
    loading.innerHTML = "";

    const userTopic = topic.value.trim();

    if (userTopic === "") {
        alert("Enter Topic");
        return;
    }

    const prompt = `
Generate ${count.value} ${difficulty.value} multiple choice interview questions on ${userTopic}.

Return ONLY JSON.

Example:

[
{
"question":"What is JavaScript?",
"options":[
"Programming Language",
"Database",
"Operating System",
"Compiler"
],
"answer":"Programming Language",
"explanation":"JavaScript is a programming language used for web development."
}
]

Do not write markdown.
Do not use \`\`\`.
Only return JSON.
`;

    loading.innerHTML = "Generating Questions...";

    try {

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const result = await response.json();

        loading.innerHTML = "";

        if (!response.ok) {
            quiz.innerHTML = result.error.message;
            return;
        }

        let text = result.candidates[0].content.parts[0].text.trim();

        text = text.replace(/```json/g, "");
        text = text.replace(/```/g, "");

        questions = JSON.parse(text);

        currentQuestion = 0;
        score = 0;

        displayQuestion();

    }
    catch (err) {

        loading.innerHTML = "";
        quiz.innerHTML = err.message;

    }

}

function displayQuestion() {

    selectedOption = "";

    const q = questions[currentQuestion];

    quiz.innerHTML = `
    
    <div class="question-card">

        <h2>
        Question ${currentQuestion + 1}/${questions.length}
        </h2>

        <h3>${q.question}</h3>

        ${q.options.map(option => `

        <label class="option">

        <input
        type="radio"
        name="answer"
        value="${option}"
        >

        ${option}

        </label>

        `).join("")}

        <div id="result"></div>

    </div>

    `;

    document
        .querySelectorAll("input[name='answer']")
        .forEach((radio) => {

            radio.addEventListener("change", function () {

                selectedOption = this.value;

            });

        });

    submitBtn.style.display = "inline-block";
    nextBtn.style.display = "none";

}

submitBtn.addEventListener("click", submitAnswer);
nextBtn.addEventListener("click", nextQuestion);

function submitAnswer() {

    if (selectedOption === "") {
        alert("Please select an option.");
        return;
    }

    const q = questions[currentQuestion];
    const result = document.getElementById("result");

    const radios = document.querySelectorAll("input[name='answer']");

    radios.forEach(radio => {

        radio.disabled = true;

        if (radio.value === q.answer) {

            radio.parentElement.style.background = "#d4edda";
            radio.parentElement.style.border = "2px solid green";

        }

        if (radio.checked && radio.value !== q.answer) {

            radio.parentElement.style.background = "#f8d7da";
            radio.parentElement.style.border = "2px solid red";

        }

    });

    if (selectedOption === q.answer) {

        score++;

        result.innerHTML = `
            <div style="color:green;margin-top:20px;">
                <h3>✅ Correct!</h3>
                <p>${q.explanation}</p>
            </div>
        `;

    } else {

        result.innerHTML = `
            <div style="color:red;margin-top:20px;">
                <h3>❌ Wrong!</h3>

                <p><strong>Correct Answer:</strong> ${q.answer}</p>

                <p>${q.explanation}</p>
            </div>
        `;

    }

    submitBtn.style.display = "none";
    nextBtn.style.display = "inline-block";

}

function nextQuestion() {

    currentQuestion++;

    if (currentQuestion < questions.length) {

        displayQuestion();

    } else {

        showFinalScore();

    }

}

function showFinalScore() {

    let message = "";

    const percentage = Math.round((score / questions.length) * 100);

    if (percentage >= 80) {

        message = "🏆 Excellent!";

    } else if (percentage >= 60) {

        message = "👍 Good Job!";

    } else if (percentage >= 40) {

        message = "🙂 Keep Practicing!";

    } else {

        message = "💪 Don't Give Up!";
    }

    quiz.innerHTML = `
    
    <div class="question-card">

        <h1>Quiz Completed 🎉</h1>

        <h2>Your Score</h2>

        <h1>${score} / ${questions.length}</h1>

        <h2>${percentage}%</h2>

        <h2>${message}</h2>

        <br>

        <button id="restartBtn">
            Generate New Quiz
        </button>

    </div>

    `;

    submitBtn.style.display = "none";
    nextBtn.style.display = "none";

    document
        .getElementById("restartBtn")
        .addEventListener("click", () => {

            quiz.innerHTML = "";

        });

}