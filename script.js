// ==========================================
// 1. Global State Data Structure
// ==========================================
let participant = {
    nickname: "",
    currentDay: 1,
    completedDays: [],
    dailyStatus: {},
    dailyCompletionDates: {},
    lastCompletedDate: "",
    initialScore: 0
};

// Optional Google Sheets Apps Script URL
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw8F1jKlDnoMKkVGB-3RUsNkfrvZ3s0pDN0FWy3wBnS_WXdSzvThpnKWwSqAyeXTZjT/exec"; 

// 10 Deep Digital Anxiety Assessment Questions (English)
const questionsList = [
    "1. Do you feel strong anxiety, emptiness, or restlessness when your phone is not around or you have no internet access?",
    "2. Do you frequently engage in late-night mindless \"doomscrolling,\" severely compressing your sleep time?",
    "3. Do you experience FOMO (Fear of Missing Out) when seeing exciting updates shared by friends or influencers?",
    "4. Are you accustomed to checking messages during meals, gatherings, or walks, unable to focus on present interactions?",
    "5. When your phone notification goes off, do you immediately drop what you are doing to check it?",
    "6. Do you often feel your brain is overloaded with short videos, news, or social media feeds, making deep thinking difficult?",
    "7. Have you tried to quit a social media app or reduce screen time, only to fail within a day?",
    "8. Do you feel your reliance on digital devices has negatively affected your studies, creativity, or relationships?",
    "9. Are checking your phone the first thing you do when waking up and the last thing before sleeping?",
    "10. Do you yearn to regain control over your life and experience the peace of JOMO (Joy of Missing Out)?"
];

// 7-Day Challenge Missions Database (English, including Day 6 120-min deep focus)
const missions = {
    1: { title: "Day 1: Screen Time Audit", desc: "Check your phone screen time and unlock frequency. Identify the 2 apps where you waste the most time and record them.", duration: 30 },
    2: { title: "Day 2: Notification-Free Dinner", desc: "Put your phone on airplane mode or silent and place it out of sight. Enjoy a completely screen-free dinner and mindfully taste your food.", duration: 30 },
    3: { title: "Day 3: Offline Morning Hour", desc: "Do not touch your phone for the first hour after waking up. Start your morning with hydration, stretching, or reading instead.", duration: 30 },
    4: { title: "Day 4: Social Media Cleanup", desc: "Clean up your social media by unfollowing accounts and pages that do not bring positive value or energy to you.", duration: 45 },
    5: { title: "Day 5: Real-World Social Day", desc: "Arrange a face-to-face deep conversation with a family member or friend, keeping both phones placed face down.", duration: 45 },
    6: { title: "Day 6: 120-Min Deep Digital Detox", desc: "Engage in 120 minutes of complete offline focus. Put away your phone and fully immerse yourself in a physical hobby (e.g., reading, drawing, exercising, or playing an instrument).", duration: 120 },
    7: { title: "Day 7: JOMO Core Reflection Summary", desc: "Reflect on the changes over these 7 days and write down your new insights and long-term plan for a minimalist digital life.", duration: 30 }
};

// ==========================================
// 2. Automatic State Restoration on Load
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    const savedNickname = localStorage.getItem("jomo_nickname");
    const savedDay = localStorage.getItem("jomo_currentDay");

    generateQuestionnaireHTML();

    if (savedNickname) {
        participant.nickname = savedNickname;
        participant.initialScore = parseInt(localStorage.getItem("jomo_initialScore")) || 0;
        
        if (savedDay) {
            participant.currentDay = parseInt(savedDay);
            participant.completedDays = JSON.parse(localStorage.getItem("jomo_completedDays")) || [];
            participant.dailyStatus = JSON.parse(localStorage.getItem("jomo_dailyStatus")) || {};
            participant.lastCompletedDate = localStorage.getItem("jomo_lastCompletedDate") || "";
        }

        // Switch directly to challenge dashboard
        document.getElementById("step-nickname").classList.add("hidden");
        document.getElementById("step-questionnaire").classList.add("hidden");
        document.getElementById("step-result").classList.add("hidden");
        document.getElementById("step-challenge").classList.remove("hidden");

        updateChallengeUI();
        updateScoreDisplay();
        renderHistoryLog();
        
        console.log(`Welcome back, ${savedNickname}! Current progress: Day ${participant.currentDay}`);
    }
});

// Dynamically generate 10 questionnaire options
function generateQuestionnaireHTML() {
    const container = document.getElementById("questions-container");
    if (!container) return;
    
    let html = "";
    questionsList.forEach((q, index) => {
        html += `
            <div class="question-box">
                <p><strong>${q}</strong></p>
                <div class="options">
                    <label><input type="radio" name="q${index}" value="1" required> 1 pt - Never</label>
                    <label><input type="radio" name="q${index}" value="2"> 2 pts - Rarely</label>
                    <label><input type="radio" name="q${index}" value="3"> 3 pts - Often</label>
                    <label><input type="radio" name="q${index}" value="4"> 4 pts - Always</label>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ==========================================
// 3. Step-by-Step Flow Control
// ==========================================
window.startChallengeSession = function() {
    const nicknameInput = document.getElementById("nickname-input");
    if (nicknameInput && nicknameInput.value.trim() !== "") {
        participant.nickname = nicknameInput.value.trim();
        localStorage.setItem("jomo_nickname", participant.nickname);
        
        document.getElementById("step-nickname").classList.add("hidden");
        document.getElementById("step-questionnaire").classList.remove("hidden");
    } else {
        alert("Please enter your nickname or handle to start!");
    }
};

window.submitQuestionnaire = function() {
    let totalScore = 0;
    for (let i = 0; i < 10; i++) {
        const selected = document.querySelector(`input[name="q${i}"]:checked`);
        if (!selected) {
            alert(`Question ${i + 1} has not been answered. Please answer all questions to ensure analysis accuracy!`);
            return;
        }
        totalScore += parseInt(selected.value);
    }

    participant.initialScore = totalScore;
    localStorage.setItem("jomo_initialScore", totalScore);

    document.getElementById("step-questionnaire").classList.add("hidden");
    document.getElementById("step-result").classList.remove("hidden");

    let analysisText = `Your Initial Digital Anxiety Score: ${totalScore} / 40 pts.<br>`;
    if (totalScore >= 30) {
        analysisText += "🔥 Status Analysis: High Digital Dependency. You frequently feel hijacked by notifications and desperately need the JOMO plan to reclaim control!";
    } else if (totalScore >= 20) {
        analysisText += "⚠️ Status Analysis: Moderate Digital Interruption. Your life is occasionally disrupted by notifications. Moderate detoxing will significantly boost focus.";
    } else {
        analysisText += "✨ Status Analysis: Good Digital Control. You manage your time well and can use this plan to deepen your inner peace.";
    }
    document.getElementById("result-score-text").innerHTML = analysisText;
};

window.startAssessment = function() {
    localStorage.setItem("jomo_currentDay", participant.currentDay);

    document.getElementById("step-result").classList.add("hidden");
    document.getElementById("step-challenge").classList.remove("hidden");

    updateChallengeUI();
    updateScoreDisplay();
    renderHistoryLog();
};

// ==========================================
// 4. Countdown Timer & Skip Test Feature
// ==========================================
let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Challenge in Progress...";
    }

    const missionInfo = missions[participant.currentDay] || { duration: 30 };
    const minutesAllowed = missionInfo.duration;
    
    targetTimestamp = Date.now() + minutesAllowed * 60 * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        let remainingSeconds = Math.ceil((targetTimestamp - now) / 1000);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            displayTime(0);
            alert("Congratulations on completing today's timer challenge! Please write your reflection and submit below.");
        } else {
            displayTime(remainingSeconds);
        }
    }, 1000);
};

window.skipTimer = function() {
    if (timerInterval) clearInterval(timerInterval);
    displayTime(0);
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Start Timer Challenge";
    }
    alert("[Test Mode] Successfully skipped timer wait!");
};

function displayTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    hours = hours < 10 ? "0" + hours : hours;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;

    const display = document.getElementById("timer-display");
    if (display) {
        if (hours > 0) {
            display.innerText = `${hours}:${minutes}:${seconds}`;
        } else {
            display.innerText = `${minutes}:${seconds}`;
        }
    }
}

// ==========================================
// 5. Task Submission & UI Updates
// ==========================================
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("en-US"); 

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 

    if (status === "Achieve") {
        if (!participant.completedDays.includes(participant.currentDay)) {
            participant.completedDays.push(participant.currentDay);
        }
    }

    const reflectionInput = document.getElementById("reflection-input");
    const reflectionText = reflectionInput ? reflectionInput.value : "";

    sendDataToCloud(participant.nickname, participant.currentDay, status, reflectionText);

    if (reflectionInput) reflectionInput.value = ""; 

    if (participant.currentDay < 7) {
        participant.currentDay++;
        timerInfoReset();
    } else {
        alert("Amazing job! You have fully completed the 7-Day JOMO Digital Detox Challenge!");
    }

    updateChallengeUI();
    updateScoreDisplay();
    renderHistoryLog(); 

    localStorage.setItem("jomo_currentDay", participant.currentDay);
    localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
    localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));
};

function timerInfoReset() {
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Start Timer Challenge";
    }
    displayTime(missions[participant.currentDay] ? missions[participant.currentDay].duration * 60 : 1800);
}

window.updateChallengeUI = function() {
    const titleEl = document.getElementById("challenge-title");
    const descEl = document.getElementById("mission-desc");
    const mission = missions[participant.currentDay];

    if (mission) {
        if (titleEl) titleEl.innerText = mission.title;
        if (descEl) descEl.innerText = mission.desc;
        displayTime(mission.duration * 60);
    }
};

window.updateScoreDisplay = function() {
    const scoreVal = document.getElementById("score-val");
    if (scoreVal) {
        const taskBonus = participant.completedDays.length * 15;
        scoreVal.innerText = participant.initialScore + taskBonus;
    }
};

window.renderHistoryLog = function() {
    const logBox = document.getElementById("history-log-box");
    if (!logBox) return;

    if (participant.completedDays.length === 0) {
        logBox.innerHTML = `<p class="log-item">No completion records yet</p>`;
        return;
    }

    let html = "";
    participant.completedDays.forEach(day => {
        const dateStr = participant.dailyCompletionDates[day] || "Recent";
        html += `<p class="log-item">✅ [${dateStr}] ${missions[day] ? missions[day].title : 'Day ' + day} - Achieved</p>`;
    });
    logBox.innerHTML = html;
};

// ==========================================
// 6. Cloud Sync Function (Google Sheets)
// ==========================================
async function sendDataToCloud(nickname, day, status, reflection) {
    if (!WEB_APP_URL) {
        console.log("Running in standalone mode (Cloud Apps Script URL not set)");
        return;
    }

    const payload = { nickname, day, status, reflection };

    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        console.log("Data successfully sent to cloud!");
    } catch (error) {
        console.error("Cloud transmission failed:", error);
    }
}
