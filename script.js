// ==========================================
// 1. Global State Data Structure
// ==========================================
let participant = {
    nickname: "",
    classSeat: "",
    currentDay: 1,
    completedDays: [],
    dailyStatus: {},
    dailyCompletionDates: {},
    dailyStartTimes: {}, // 紀錄每一天的開始時間
    lastCompletedDate: "",
    initialScore: 0
};

const WEB_APP_URL = ""; // 請填入你的 Apps Script 網址

// 10 Deep Digital Anxiety Assessment Questions
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

// 7-Day Challenge Missions Database
const missions = {
    1: { title: "Day 1: Screen Time Audit", desc: "Check your screen time. Identify the two apps where you waste the most time.", duration: 0 },
    2: { title: "Day 2: Notification-Free Dinner", desc: "Put your phone on airplane mode or silent and place it out of sight. Enjoy a completely screen-free dinner and mindfully taste your food.", duration: 30 },
    3: { title: "Day 3: Offline Bedtime Hour", desc: "Do not look at your phone for one hour before going to sleep. Let your mind wind down naturally.", duration: 60 },
    4: { title: "Day 4: Social Media Cleanup", desc: "Clean up your social media by unfollowing accounts and pages that do not bring positive value or energy to you.", duration: 45 },
    5: { title: "Day 5: Real-World Social Day", desc: "Arrange a face-to-face deep conversation with a family member or friend, keeping both phones placed face down.", duration: 45 },
    6: { title: "Day 6: 120-Min Deep Digital Detox", desc: "Engage in 120 minutes of complete offline focus. Put away your phone and fully immerse yourself in a physical hobby (e.g., reading, drawing, exercising, or playing an instrument).", duration: 120 },
    7: { title: "Day 7: JOMO Core Reflection Summary", desc: "Reflect on the changes over these 7 days and write down your new insights and long-term plan for a minimalist digital life.", duration: 30 }
};

// ==========================================
// 2. Automatic State Restoration & Timing
// ==========================================
let timerInterval = null;

window.addEventListener("DOMContentLoaded", () => {
    const savedNickname = localStorage.getItem("jomo_nickname");
    const savedInitialScore = localStorage.getItem("jomo_initialScore");
    const savedDay = localStorage.getItem("jomo_currentDay");
    const savedClassSeat = localStorage.getItem("jomo_classSeat");

    generateQuestionnaireHTML();

    if (savedNickname && savedInitialScore) {
        participant.nickname = savedNickname;
        participant.initialScore = parseInt(savedInitialScore);
        participant.classSeat = savedClassSeat || "";
        
        if (savedDay) {
            participant.currentDay = parseInt(savedDay);
            participant.completedDays = JSON.parse(localStorage.getItem("jomo_completedDays")) || [];
            participant.dailyStatus = JSON.parse(localStorage.getItem("jomo_dailyStatus")) || {};
            participant.dailyStartTimes = JSON.parse(localStorage.getItem("jomo_dailyStartTimes")) || {};
            participant.lastCompletedDate = localStorage.getItem("jomo_lastCompletedDate") || "";
        }

        document.getElementById("step-nickname").classList.add("hidden");
        document.getElementById("step-questionnaire").classList.add("hidden");
        document.getElementById("step-result").classList.add("hidden");
        
        if (participant.completedDays.includes(7) || participant.currentDay > 7) {
            show11AiPage();
        } else {
            document.getElementById("step-challenge").classList.remove("hidden");
            updateChallengeUI();
            updateScoreDisplay();
            renderHistoryLog();
            checkDayLockStatus();
            
            // 記錄當前挑戰開始時間（若尚未記錄）
            if (!participant.dailyStartTimes[participant.currentDay]) {
                participant.dailyStartTimes[participant.currentDay] = new Date().toLocaleTimeString();
                localStorage.setItem("jomo_dailyStartTimes", JSON.stringify(participant.dailyStartTimes));
            }

            if (participant.currentDay > 1) {
                restoreTimerState();
            }
        }
    } 
    else if (savedNickname) {
        document.getElementById("step-nickname").classList.add("hidden");
        document.getElementById("step-questionnaire").classList.remove("hidden");
    }
});

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
// 3. Flow Control
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
            alert(`Question ${i + 1} has not been answered. Please answer all questions!`);
            return;
        }
        totalScore += parseInt(selected.value);
    }

    participant.initialScore = totalScore;
    localStorage.setItem("jomo_initialScore", totalScore);

    document.getElementById("step-questionnaire").classList.add("hidden");
    document.getElementById("step-result").classList.remove("hidden");

    let analysisText = `Your Initial Digital Anxiety Score: ${totalScore} / 40 pts.<br><br>`;
    if (totalScore >= 30) {
        analysisText += "🔥 <strong>Status Analysis: High Digital Dependency.</strong> You need the JOMO plan to reclaim your life control!";
    } else if (totalScore >= 20) {
        analysisText += "⚠️ <strong>Status Analysis: Moderate Digital Interruption.</strong> Moderate detoxing will significantly boost focus.";
    } else {
        analysisText += "✨ <strong>Status Analysis: Good Digital Control.</strong> You manage your time well and can use this plan to deepen your inner peace.";
    }
    document.getElementById("result-score-text").innerHTML = analysisText;
};

window.startAssessment = function() {
    localStorage.setItem("jomo_currentDay", participant.currentDay);
    
    // 記錄第一天的開始時間
    if (!participant.dailyStartTimes[1]) {
        participant.dailyStartTimes[1] = new Date().toLocaleTimeString();
        localStorage.setItem("jomo_dailyStartTimes", JSON.stringify(participant.dailyStartTimes));
    }

    document.getElementById("step-result").classList.add("hidden");
    document.getElementById("step-challenge").classList.remove("hidden");

    updateChallengeUI();
    updateScoreDisplay();
    renderHistoryLog();
    checkDayLockStatus();
};

// ==========================================
// 4. Background-Resilient Timer & Day Lock Rules
// ==========================================
function checkDayLockStatus() {
    const todayStr = new Date().toDateString();
    const btn = document.getElementById("timer-btn");
    
    if (participant.lastCompletedDate === todayStr) {
        if (btn) {
            btn.disabled = true;
            btn.innerText = "Completed Today - Next Unlock Tomorrow";
        }
    }
}

window.startOfflineTimer = function() {
    const todayStr = new Date().toDateString();
    if (participant.lastCompletedDate === todayStr) {
        alert("You have already completed today's challenge! Please wait until tomorrow for the next challenge.");
        return;
    }

    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Challenge in Progress...";
    }

    const missionInfo = missions[participant.currentDay] || { duration: 30 };
    const durationMs = missionInfo.duration * 60 * 1000;
    const targetTimestamp = Date.now() + durationMs;

    localStorage.setItem("jomo_targetTimestamp", targetTimestamp);
    localStorage.setItem("jomo_activeDay", participant.currentDay);

    runTimerLoop(targetTimestamp);
};

function restoreTimerState() {
    const targetTimestamp = localStorage.getItem("jomo_targetTimestamp");
    const activeDay = localStorage.getItem("jomo_activeDay");

    if (targetTimestamp && parseInt(activeDay) === participant.currentDay) {
        const remainingMs = parseInt(targetTimestamp) - Date.now();
        if (remainingMs > 0) {
            const btn = document.getElementById("timer-btn");
            if (btn) {
                btn.disabled = true;
                btn.innerText = "Challenge in Progress...";
            }
            runTimerLoop(parseInt(targetTimestamp));
        } else {
            finishTimerSequence();
        }
    }
}

function runTimerLoop(targetTimestamp) {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        const now = Date.now();
        let remainingSeconds = Math.ceil((targetTimestamp - now) / 1000);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            localStorage.removeItem("jomo_targetTimestamp");
            displayTime(0);
            finishTimerSequence();
        } else {
            displayTime(remainingSeconds);
        }
    }, 1000);
}

function finishTimerSequence() {
    displayTime(0);
    const completionSection = document.getElementById("completion-section");
    if (completionSection) {
        completionSection.classList.remove("hidden");
    }
}

window.skipTimer = function() {
    if (timerInterval) clearInterval(timerInterval);
    localStorage.removeItem("jomo_targetTimestamp");
    displayTime(0);
    finishTimerSequence();
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
// 5. Task Submission & Timing Capture
// ==========================================
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("en-US"); 
    const todayServerStr = new Date().toDateString();
    const endTime = new Date().toLocaleTimeString(); // 捕捉結束時間
    const startTime = participant.dailyStartTimes[participant.currentDay] || "N/A"; // 取得開始時間

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 
    participant.lastCompletedDate = todayServerStr;

    const reflectionInput = document.getElementById("reflection-input");
    let reflectionText = "";

    if (status === "Achieve") {
        reflectionText = reflectionInput ? reflectionInput.value.trim() : "";
        if (!reflectionText) {
            alert("Please provide your response before completing the challenge!");
            return;
        }
        if (!participant.completedDays.includes(participant.currentDay)) {
            participant.completedDays.push(participant.currentDay);
        }
    } else {
        reflectionText = "Failed";
    }

    // 將開始時間、結束時間與回答一併傳送到 Google 試算表
    sendDataToCloud(
        participant.nickname, 
        participant.initialScore, 
        participant.classSeat, 
        participant.currentDay, 
        status, 
        reflectionText, 
        startTime, 
        endTime
    );

    if (reflectionInput) reflectionInput.value = ""; 
    const completionSection = document.getElementById("completion-section");
    if (completionSection) completionSection.classList.add("hidden");

    if (participant.currentDay < 7) {
        participant.currentDay++;
        // 記錄下一天的開始時間
        participant.dailyStartTimes[participant.currentDay] = new Date().toLocaleTimeString();
        localStorage.setItem("jomo_dailyStartTimes", JSON.stringify(participant.dailyStartTimes));
        updateChallengeUI();
    } else {
        show11AiPage();
    }

    updateScoreDisplay();
    renderHistoryLog(); 
    checkDayLockStatus();

    localStorage.setItem("jomo_currentDay", participant.currentDay);
    localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
    localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));
    localStorage.setItem("jomo_lastCompletedDate", participant.lastCompletedDate);
    localStorage.removeItem("jomo_targetTimestamp");
    localStorage.removeItem("jomo_activeDay");
};

function show11AiPage() {
    const challengeDiv = document.getElementById("step-challenge");
    if (challengeDiv) challengeDiv.classList.add("hidden");
    
    const finalPage = document.getElementById("step-11ai");
    if (finalPage) finalPage.classList.remove("hidden");
}

window.submitFinalClassSeat = function() {
    const levelSelect = document.getElementById("school-level-select");
    const classSeatInput = document.getElementById("class-seat-input");
    
    if (classSeatInput && classSeatInput.value.trim() !== "") {
        const selectedLevel = levelSelect ? levelSelect.value : "Senior High";
        participant.classSeat = `${selectedLevel} - ${classSeatInput.value.trim()}`;
        localStorage.setItem("jomo_classSeat", participant.classSeat);

        sendDataToCloud(
            participant.nickname, 
            participant.initialScore, 
            participant.classSeat, 
            participant.currentDay, 
            "Completed 11愛", 
            "Final Setup", 
            "N/A", 
            "N/A"
        );
        alert("Class & Seat Number successfully saved and submitted!");
    } else {
        alert("Please enter your seat number/class info!");
    }
};

window.updateChallengeUI = function() {
    const titleEl = document.getElementById("challenge-title");
    const descEl = document.getElementById("mission-desc");
    const timerDisplay = document.getElementById("timer-display");
    const timerBtn = document.getElementById("timer-btn");
    const skipBtn = document.querySelector(".btn-skip");
    const completionSection = document.getElementById("completion-section");
    const inputLabel = document.getElementById("input-label");
    const reflectionInput = document.getElementById("reflection-input");

    const mission = missions[participant.currentDay];

    if (mission) {
        if (titleEl) titleEl.innerText = mission.title;
        if (descEl) descEl.innerText = mission.desc;
        
        if (reflectionInput) reflectionInput.value = "";

        if (participant.currentDay === 1) {
            if (timerDisplay) timerDisplay.classList.add("hidden");
            if (timerBtn) timerBtn.classList.add("hidden");
            if (skipBtn) timerBtn.classList.add("hidden");
            if (completionSection) completionSection.classList.remove("hidden");
            if (inputLabel) inputLabel.innerText = "✍️ Enter the two apps where you waste the most time:";
            if (reflectionInput) reflectionInput.placeholder = "e.g., Instagram, TikTok...";
        } else {
            if (timerDisplay) timerDisplay.classList.remove("hidden");
            if (timerBtn) {
                timerBtn.classList.remove("hidden");
                timerBtn.disabled = false;
                timerBtn.innerText = "Start Timer Challenge";
            }
            if (skipBtn) skipBtn.classList.remove("hidden");
            if (completionSection) completionSection.classList.add("hidden");

            if (participant.currentDay === 2) {
                if (inputLabel) inputLabel.innerText = "✍️ How do you feel after today's challenge?";
                if (reflectionInput) reflectionInput.placeholder = "Describe your feelings after the notification-free dinner...";
            } else if (participant.currentDay === 3) {
                if (inputLabel) inputLabel.innerText = "✍️ Did you sleep better? How was your sleep?";
                if (reflectionInput) reflectionInput.placeholder = "Describe your sleep quality after avoiding phone before bed...";
            } else if (participant.currentDay === 7) {
                if (inputLabel) inputLabel.innerText = "✍️ JOMO Core Reflection & Summary:";
                if (reflectionInput) reflectionInput.placeholder = "Reflect on your 7-day journey and long-term plan...";
            } else {
                if (inputLabel) inputLabel.innerText = "✍️ What did you do today during this challenge?";
                if (reflectionInput) reflectionInput.placeholder = "Describe what you did during this offline period...";
            }

            if (!localStorage.getItem("jomo_targetTimestamp")) {
                displayTime(mission.duration * 60);
            }
        }
    }
};

window.updateScoreDisplay = function() {
    const scoreVal = document.getElementById("score-val");
    if (scoreVal) {
        const challengeScore = participant.completedDays.length * 15;
        scoreVal.innerText = challengeScore;
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
async function sendDataToCloud(nickname, initialScore, classSeat, day, status, reflection, startTime, endTime) {
    if (!WEB_APP_URL) {
        console.log("Running in standalone mode (Cloud Apps Script URL not set)");
        return;
    }

    const payload = { nickname, initialScore, classSeat, day, status, reflection, startTime, endTime };

    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        console.log("Data successfully sent to cloud with timestamps!");
    } catch (error) {
        console.error("Cloud transmission failed:", error);
    }
}
