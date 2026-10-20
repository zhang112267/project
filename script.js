/*import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const participant = {
    nickname: "",
    answers: {},
    fomoScore: 0,
    currentDay: 1, 
    completedDays: [],
    dailyStatus: {},      // 記錄每天 Achieve 還是 Not Achieve
    dailyCompletionDates: {}, // 記錄每一天是在哪個「日期」完成的 (防止同一天重複刷)
    reflections: {}, 
    reflection: ""
};

const missions = {
    1: { title: "Day 1: 30-Min Offline Before Bed", desc: "Put your phone away and stay offline for 30 minutes before sleep.", type: "timer", duration: 30 },
    2: { title: "Day 2: Notification Detox", desc: "Turn off all non-essential social media notifications for the entire day.", type: "fullday" },
    3: { title: "Day 3: Phone-Free Meal", desc: "Eat at least one meal completely phone-free and taste your food mindfully.", type: "fullday" },
    4: { title: "Day 4: Mindful Walk", desc: "Take a 20-minute walk outside without listening to music or podcasts.", type: "timer", duration: 20 },
    5: { title: "Day 5: Feed Cleanse", desc: "Unfollow or mute toxic social feeds that trigger anxiety.", type: "fullday" },
    6: { title: "Day 6: 120-Min Deep Offline Hobby", desc: "Spend 120 minutes (2 hours) engaged in a completely offline hobby (reading, drawing, guitar, sports).", type: "timer", duration: 120 },
    7: { title: "Day 7: JOMO Reflection", desc: "Write down your 7-day digital transformation reflection and celebrate your freedom on a paper and bring it to 11Ai classroom.", type: "fullday" }
};

window.startAssessment = function() {
    const nickInput = document.getElementById("nickname-input").value.trim();
    if (!nickInput) {
        alert("Please enter your nickname first!");
        return;
    }
    participant.nickname = nickInput;
    document.getElementById("step-nickname").classList.add("hidden");
    document.getElementById("step-questionnaire").classList.remove("hidden");
}

window.selectOption = function(questionNum, score, element) {
    participant.answers[questionNum] = score;
    const group = element.closest('.options-grid');
    group.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}

window.submitAssessment = async function() {
    if (Object.keys(participant.answers).length < 5) {
        alert("Please answer all 5 questions before submitting!");
        return;
    }

    participant.fomoScore = Object.values(participant.answers).reduce((a, b) => a + b, 0);

    let levelTitle = "";
    let levelDesc = "";

    if (participant.fomoScore >= 20) {
        levelTitle = "🔥 Deeply FOMO (High Anxiety)";
        levelDesc = "Your digital dependency is quite high. You frequently check feeds and experience strong peer pressure. This makes you an ideal candidate for the JOMO Lab 7-day transformation challenge!";
    } else if (participant.fomoScore >= 12) {
        levelTitle = "⚡ Moderate FOMO (Balanced State)";
        levelDesc = "You experience normal levels of social media anxiety. While you manage your daily tasks, notifications still occasionally disrupt your deep focus and peace of mind.";
    } else {
        levelTitle = "🌿 JOMO Master (Mindful & Free)";
        levelDesc = "Amazing! You have strong boundaries with technology and rarely get affected by social media pressure. You can use this challenge to deepen your offline mindfulness.";
    }

    document.getElementById("res-nickname").innerText = participant.nickname;
    document.getElementById("res-level").innerText = levelTitle;
    document.getElementById("res-description").innerText = levelDesc;

    document.getElementById("step-questionnaire").classList.add("hidden");
    document.getElementById("step-result").classList.remove("hidden");

    try {
        await addDoc(collection(db, "jomoBaselines"), {
            nickname: participant.nickname,
            fomoScore: participant.fomoScore,
            answers: participant.answers,
            timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
        });
    } catch (error) {
        console.error("Firebase sync error:", error);
    }
}

window.enterChallengePhase = function() {
    document.getElementById("step-result").classList.add("hidden");
    document.getElementById("step-challenge").classList.remove("hidden");
    updateChallengeUI();
    updateScoreDisplay();
}

window.acceptTask = function() {
    if (participant.currentDay > 1) {
        const reflectionText = document.getElementById("daily-pre-reflection").value.trim();
        if (!reflectionText) {
            alert("Please write down what you felt or improved before starting today's task! (中英文皆可)");
            return;
        }
        participant.reflections[participant.currentDay] = reflectionText;
    }

    document.getElementById("task-pre-reflection-box").classList.add("hidden");
    document.getElementById("task-active-box").classList.remove("hidden");
}

let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const btn = document.getElementById("timer-btn");
    btn.disabled = true;
    btn.innerText = "Challenge in Progress...";

    const currentMission = missions[participant.currentDay];
    const minutesAllowed = currentMission.duration || 30;
    
    // 計算目標結束的毫秒數 (支援 Day 6 的 120 分鐘)
    targetTimestamp = Date.now() + minutesAllowed * 60 * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        let remainingSeconds = Math.ceil((targetTimestamp - now) / 1000);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            displayTime(0);
            triggerAchievePrompt();
        } else {
            displayTime(remainingSeconds);
        }
    }, 1000);
}


window.skipTimerForDemo = function() {
    if (timerInterval) clearInterval(timerInterval);
    triggerAchievePrompt();
}

window.completeFullDayTask = function() {
    triggerAchievePrompt();
}

function triggerAchievePrompt() {
    document.getElementById("task-active-box").classList.add("hidden");
    document.getElementById("task-achieve-prompt-box").classList.remove("hidden");
}

// 選擇結果並套用「一天只能完成一個挑戰」的日期防堵鎖
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("zh-TW"); // 取得今天的日期字串 (例如 2026/10/20)

    // 檢查今天是否已經完成過其他挑戰了
    const lastCompletedDate = Object.values(participant.dailyCompletionDates).pop();
    if (lastCompletedDate === todayDateStr) {
        alert("⏳ Daily Limit Reached: You can only complete ONE challenge per day! Please come back tomorrow for the next mission.");
        // 重設介面讓使用者休息
        document.getElementById("task-achieve-prompt-box").classList.add("hidden");
        document.getElementById("daily-mission-card").classList.add("hidden");
        return;
    }

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; // 記錄完成日期

    if (status === "Achieve") {
        if (!participant.completedDays.includes(participant.currentDay)) {
            participant.completedDays.push(participant.currentDay);
        }
    }

    alert(`Day ${participant.currentDay} recorded as: ${status} on ${todayDateStr}!`);

    document.getElementById("task-achieve-prompt-box").classList.add("hidden");

    if (participant.currentDay < 7) {
        participant.currentDay++;
        resetTaskUI();
        updateChallengeUI();
    } else {
        document.getElementById("daily-mission-card").classList.add("hidden");
        document.getElementById("master-badge-box").classList.remove("hidden");
    }
    updateScoreDisplay();
    renderHistoryLog(); // 重新渲染歷史完成清單
}

function resetTaskUI() {
    const display = document.getElementById("timer-display");
    if (display) display.innerText = "30:00";
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Start Timer Challenge";
    }
}

function updateChallengeUI() {
    const mission = missions[participant.currentDay];
    if (mission) {
        document.getElementById("mission-title").innerText = mission.title;
        document.getElementById("mission-desc").innerText = mission.desc;

        const timerSection = document.getElementById("timer-section");
        const fulldaySection = document.getElementById("fullday-section");

        if (mission.type === "timer") {
            timerSection.classList.remove("hidden");
            fulldaySection.classList.add("hidden");
            btnTextUpdate(mission.duration);
        } else {
            timerSection.classList.add("hidden");
            fulldaySection.classList.remove("hidden");
        }
    }

    const preBox = document.getElementById("task-pre-reflection-box");
    const activeBox = document.getElementById("task-active-box");
    const preInput = document.getElementById("daily-pre-reflection");

    if (participant.currentDay > 1) {
        preBox.classList.remove("hidden");
        activeBox.classList.add("hidden");
        if (preInput) preInput.value = "";
    } else {
        preBox.classList.add("hidden");
        activeBox.classList.remove("hidden");
    }
}

function btnTextUpdate(mins) {
    const btn = document.getElementById("timer-btn");
    if (btn) btn.innerText = `Start ${mins}-Min Offline Challenge`;
    const disp = document.getElementById("timer-display");
    if (disp) disp.innerText = mins < 10 ? `0${mins}:00` : `${mins}:00`;
}

function updateScoreDisplay() {
    const completedCount = participant.completedDays.length;
    const scoreText = `Score: ${completedCount}/7`;
    
    const scoreEl = document.getElementById("score-display-text");
    if (scoreEl) scoreEl.innerText = scoreText;

    const totalDays = 7;
    const percentage = Math.round((completedCount / totalDays) * 100);
    const bar = document.getElementById("challenge-progress-bar");
    const text = document.getElementById("challenge-progress-text");
    if (bar) bar.style.width = percentage + "%";
    if (text) text.innerText = `Completed ${completedCount} of ${totalDays} days (${percentage}%) | ${scoreText}`;
}

// 渲染歷史完成清單（讓使用者知道自己在幾號完成了什麼任務、結果為何）
function renderHistoryLog() {
    let historyBox = document.getElementById("history-log-container");
    if (!historyBox) {
        // 如果 HTML 還沒有容器，動態幫它建一個在挑戰卡片下方
        historyBox = document.createElement("div");
        historyBox.id = "history-log-container";
        historyBox.style.cssText = "margin-top: 25px; text-align: left; background: rgba(15,23,42,0.4); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);";
        document.getElementById("step-challenge").appendChild(historyBox);
    }

    let html = `<h4 style="margin-top:0; color: var(--accent); font-size: 1rem;">📜 Your Challenge History Log</h4>`;
    const completedDaysKeys = Object.keys(participant.dailyCompletionDates);

    if (completedDaysKeys.length === 0) {
        html += `<p style="font-size:0.85rem; color: var(--text-secondary); margin:0;">No completed tasks yet.</p>`;
    } else {
        html += `<ul style="padding-left: 20px; margin: 5px 0 0 0; font-size: 0.9rem; color: #cbd5e1;">`;
        for (let day of completedDaysKeys) {
            const dateStr = participant.dailyCompletionDates[day];
            const status = participant.dailyStatus[day];
            const statusColor = status === "Achieve" ? "#34d399" : "#38bdf8";
            html += `<li style="margin-bottom: 6px;"><b>[${dateStr}]</b> Day ${day} - <span style="color:${statusColor}; font-weight:bold;">${status}</span></li>`;
        }
        html += `</ul>`;
    }
    historyBox.innerHTML = html;
}

window.saveReflection = async function() {
    const text = document.getElementById("reflection-input").value.trim();
    if (!text) {
        alert("Please write something before saving!");
        return;
    }
    participant.reflection = text;

    try {
        await addDoc(collection(db, "jomoReflections"), {
            nickname: participant.nickname,
            reflection: participant.reflection,
            dailyStatus: participant.dailyStatus,
            dailyCompletionDates: participant.dailyCompletionDates,
            dailyReflections: participant.reflections,
            completedDaysCount: participant.completedDays.length,
            timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
        });
        alert("Your reflection and history log have been successfully saved to the cloud!");
    } catch (error) {
        console.error("Firebase reflection sync error:", error);
    }
}
// 請求瀏覽器發送通知的權限
window.requestNotificationPermission = async function() {
    if (!("Notification" in window)) {
        console.log("This browser does not support desktop notification");
        return;
    }
    
    if (Notification.permission === "granted") {
        console.log("Notification permission already granted.");
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            new Notification("🌿 JOMO Lab", {
                body: "Notifications enabled successfully! We will keep you updated on your digital detox journey.",
                icon: ""
            });
        }
    }
}
// A. 通知使用者：可以接收新任務了！
window.notifyTaskAvailable = function(dayNum) {
    // 1. 瀏覽器系統通知
    if (Notification.permission === "granted") {
        new Notification("🌿 JOMO Lab - New Mission", {
            body: `Day ${dayNum} challenge is now available! Click to start your mindful detox.`,
        });
    }
    
    // 2. 網頁內建的提示彈窗（雙重保險，100% 顯示）
    alert(`📢 Notification: Day ${dayNum} challenge is ready for you to accept!`);
}

// B. 通知使用者：任務已圓滿完成！
window.notifyTaskCompleted = function(dayNum) {
    // 1. 瀏覽器系統通知
    if (Notification.permission === "granted") {
        new Notification("🎉 JOMO Lab - Mission Accomplished", {
            body: `Amazing job! You have successfully completed Day ${dayNum} challenge.`,
        });
    }
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


    // 2. 網頁內建的提示彈窗
    alert(`🎉 Success: Your Day ${dayNum} task has been successfully completed and recorded!`);
}*/
// 網頁開啟時，檢查有沒有之前存的進度
// 🌿 網頁一打開時，自動讀取並恢復進度與畫面
window.addEventListener("DOMContentLoaded", () => {
    const savedDay = localStorage.getItem("jomo_currentDay");
    const savedNickname = localStorage.getItem("jomo_nickname");
    
    if (savedDay && savedNickname) {
        // 1. 恢復資料
        participant.nickname = savedNickname;
        participant.currentDay = parseInt(savedDay);
        participant.completedDays = JSON.parse(localStorage.getItem("jomo_completedDays")) || [];
        participant.dailyStatus = JSON.parse(localStorage.getItem("jomo_dailyStatus")) || {};

        // 2. 直接隱藏前面的步驟，切換到挑戰畫面！
        document.getElementById("step-nickname").classList.add("hidden");
        document.getElementById("step-questionnaire").classList.add("hidden");
        document.getElementById("step-result").classList.add("hidden");
        document.getElementById("step-challenge").classList.remove("hidden");

        // 3. 更新介面與歷史紀錄
        updateChallengeUI();
        updateScoreDisplay();
        renderHistoryLog();
    }
});


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const participant = {
    nickname: "",
    answers: {},
    fomoScore: 0,
    currentDay: 1, 
    completedDays: [],
    dailyStatus: {},      
    dailyCompletionDates: {}, 
    reflections: {}, 
    reflection: ""
};

const missions = {
    1: { title: "Day 1: 30-Min Offline Before Bed", desc: "Put your phone away and stay offline for 30 minutes before sleep.", type: "timer", duration: 30 },
    2: { title: "Day 2: Notification Detox", desc: "Turn off all non-essential social media notifications for the entire day.", type: "fullday" },
    3: { title: "Day 3: Phone-Free Meal", desc: "Eat at least one meal completely phone-free and taste your food mindfully.", type: "fullday" },
    4: { title: "Day 4: Mindful Walk", desc: "Take a 20-minute walk outside without listening to music or podcasts.", type: "timer", duration: 20 },
    5: { title: "Day 5: Feed Cleanse", desc: "Unfollow or mute toxic social feeds that trigger anxiety.", type: "fullday" },
    6: { title: "Day 6: 120-Min Deep Offline Hobby", desc: "Spend 120 minutes (2 hours) engaged in a completely offline hobby (reading, drawing, guitar, sports).", type: "timer", duration: 120 },
    7: { title: "Day 7: JOMO Reflection", desc: "Write down your 7-day digital transformation reflection and celebrate your freedom on a paper and bring it to 11Ai classroom.", type: "fullday" }
};

window.startAssessment = function() {
    const nickInput = document.getElementById("nickname-input").value.trim();
    if (!nickInput) {
        alert("Please enter your nickname first!");
        return;
    }
    participant.nickname = nickInput;
    
    // 請求瀏覽器通知權限
    requestNotificationPermission();

    document.getElementById("step-nickname").classList.add("hidden");
    document.getElementById("step-questionnaire").classList.remove("hidden");
}

// 請求瀏覽器通知權限
async function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
    }
}

window.selectOption = function(questionNum, score, element) {
    participant.answers[questionNum] = score;
    const group = element.closest('.options-grid');
    group.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
}
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


window.submitAssessment = async function() {
    if (Object.keys(participant.answers).length < 5) {
        alert("Please answer all 5 questions before submitting!");
        return;
    }

    participant.fomoScore = Object.values(participant.answers).reduce((a, b) => a + b, 0);

    let levelTitle = "";
    let levelDesc = "";

    if (participant.fomoScore >= 20) {
        levelTitle = "🔥 Deeply FOMO (High Anxiety)";
        levelDesc = "Your digital dependency is quite high. You frequently check feeds and experience strong peer pressure. This makes you an ideal candidate for the JOMO Lab 7-day transformation challenge!";
    } else if (participant.fomoScore >= 12) {
        levelTitle = "⚡ Moderate FOMO (Balanced State)";
        levelDesc = "You experience normal levels of social media anxiety. While you manage your daily tasks, notifications still occasionally disrupt your deep focus and peace of mind.";
    } else {
        levelTitle = "🌿 JOMO Master (Mindful & Free)";
        levelDesc = "Amazing! You have strong boundaries with technology and rarely get affected by social media pressure. You can use this challenge to deepen your offline mindfulness.";
    }

    document.getElementById("res-nickname").innerText = participant.nickname;
    document.getElementById("res-level").innerText = levelTitle;
    document.getElementById("res-description").innerText = levelDesc;

    document.getElementById("step-questionnaire").classList.add("hidden");
    document.getElementById("step-result").classList.remove("hidden");

    try {
        await addDoc(collection(db, "jomoBaselines"), {
            nickname: participant.nickname,
            fomoScore: participant.fomoScore,
            answers: participant.answers,
            timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
        });
    } catch (error) {
        console.error("Firebase sync error:", error);
    }
}

window.enterChallengePhase = function() {
    document.getElementById("step-result").classList.add("hidden");
    document.getElementById("step-challenge").classList.remove("hidden");
    updateChallengeUI();
    updateScoreDisplay();
}

window.acceptTask = function() {
    if (participant.currentDay > 1) {
        const reflectionText = document.getElementById("daily-pre-reflection").value.trim();
        if (!reflectionText) {
            alert("Please write down what you felt or improved before starting today's task! (中英文皆可)");
            return;
        }
        participant.reflections[participant.currentDay] = reflectionText;
    }

    document.getElementById("task-pre-reflection-box").classList.add("hidden");
    document.getElementById("task-active-box").classList.remove("hidden");
}

let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const btn = document.getElementById("timer-btn");
    btn.disabled = true;
    btn.innerText = "Challenge in Progress...";

    const currentMission = missions[participant.currentDay];
    const minutesAllowed = currentMission.duration || 30;
    
    // 計算目標結束的毫秒數 (支援 Day 6 的 120 分鐘)
    targetTimestamp = Date.now() + minutesAllowed * 60 * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        let remainingSeconds = Math.ceil((targetTimestamp - now) / 1000);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            displayTime(0);
            triggerAchievePrompt();
        } else {
            displayTime(remainingSeconds);
        }
    }, 1000);
}

window.skipTimerForDemo = function() {
    if (timerInterval) clearInterval(timerInterval);
    triggerAchievePrompt();
}

window.completeFullDayTask = function() {
    triggerAchievePrompt();
}

function triggerAchievePrompt() {
    document.getElementById("task-active-box").classList.add("hidden");
    document.getElementById("task-achieve-prompt-box").classList.remove("hidden");
}

// 選擇結果（已移除一天只能玩一次的限制，可以連續測試）
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("zh-TW"); 

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 

    if (status === "Achieve") {
        if (!participant.completedDays.includes(participant.currentDay)) {
            participant.completedDays.push(participant.currentDay);
        }
    }

    // 觸發任務完成通知
    notifyTaskCompleted(participant.currentDay);

    document.getElementById("task-achieve-prompt-box").classList.add("hidden");

    if (participant.currentDay < 7) {
        participant.currentDay++;
        resetTaskUI();
        updateChallengeUI();
    } else {
        document.getElementById("daily-mission-card").classList.add("hidden");
        document.getElementById("master-badge-box").classList.remove("hidden");
    }
    updateScoreDisplay();
    renderHistoryLog(); 
    // 自動把目前的進度存到瀏覽器裡
localStorage.setItem("jomo_currentDay", participant.currentDay);
localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));

}

// 發送任務完成通知函式
function notifyTaskCompleted(dayNum) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🎉 JOMO Lab - Mission Accomplished", {
            body: `Amazing job! You have successfully completed Day ${dayNum} challenge.`,
        });
    }
    alert(`🎉 Success: Day ${dayNum} task recorded as finished!`);
}

function resetTaskUI() {
    const display = document.getElementById("timer-display");
    if (display) display.innerText = "30:00";
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = false;
        btn.innerText = "Start Timer Challenge";
    }
}

function updateChallengeUI() {
    const mission = missions[participant.currentDay];
    if (mission) {
        document.getElementById("mission-title").innerText = mission.title;
        document.getElementById("mission-desc").innerText = mission.desc;

        const timerSection = document.getElementById("timer-section");
        const fulldaySection = document.getElementById("fullday-section");

        if (mission.type === "timer") {
            timerSection.classList.remove("hidden");
            fulldaySection.classList.add("hidden");
            btnTextUpdate(mission.duration);
        } else {
            timerSection.classList.add("hidden");
            fulldaySection.classList.remove("hidden");
        }
    }

    const preBox = document.getElementById("task-pre-reflection-box");
    const activeBox = document.getElementById("task-active-box");
    const preInput = document.getElementById("daily-pre-reflection");

    if (participant.currentDay > 1) {
        preBox.classList.remove("hidden");
        activeBox.classList.add("hidden");
        if (preInput) preInput.value = "";
    } else {
        preBox.classList.add("hidden");
        activeBox.classList.remove("hidden");
    }
}

function btnTextUpdate(mins) {
    const btn = document.getElementById("timer-btn");
    if (btn) btn.innerText = `Start ${mins}-Min Offline Challenge`;
    const disp = document.getElementById("timer-display");
    if (disp) disp.innerText = mins < 10 ? `0${mins}:00` : `${mins}:00`;
}

function updateScoreDisplay() {
    const completedCount = participant.completedDays.length;
    const scoreText = `Score: ${completedCount}/7`;
    
    const scoreEl = document.getElementById("score-display-text");
    if (scoreEl) scoreEl.innerText = scoreText;

    const totalDays = 7;
    const percentage = Math.round((completedCount / totalDays) * 100);
    const bar = document.getElementById("challenge-progress-bar");
    const text = document.getElementById("challenge-progress-text");
    if (bar) bar.style.width = percentage + "%";
    if (text) text.innerText = `Completed ${completedCount} of ${totalDays} days (${percentage}%) | ${scoreText}`;
}

function renderHistoryLog() {
    let historyBox = document.getElementById("history-log-container");
    if (!historyBox) {
        historyBox = document.createElement("div");
        historyBox.id = "history-log-container";
        historyBox.style.cssText = "margin-top: 25px; text-align: left; background: rgba(15,23,42,0.4); padding: 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);";
        document.getElementById("step-challenge").appendChild(historyBox);
    }

    let html = `<h4 style="margin-top:0; color: var(--accent); font-size: 1rem;">📜 Your Challenge History Log</h4>`;
    const completedDaysKeys = Object.keys(participant.dailyCompletionDates);

    if (completedDaysKeys.length === 0) {
        html += `<p style="font-size:0.85rem; color: var(--text-secondary); margin:0;">No completed tasks yet.</p>`;
    } else {
        html += `<ul style="padding-left: 20px; margin: 5px 0 0 0; font-size: 0.9rem; color: #cbd5e1;">`;
        for (let day of completedDaysKeys) {
            const dateStr = participant.dailyCompletionDates[day];
            const status = participant.dailyStatus[day];
            const statusColor = status === "Achieve" ? "#34d399" : "#38bdf8";
            html += `<li style="margin-bottom: 6px;"><b>[${dateStr}]</b> Day ${day} - <span style="color:${statusColor}; font-weight:bold;">${status}</span></li>`;
        }
        html += `</ul>`;
    }
    historyBox.innerHTML = html;
}

window.saveReflection = async function() {
    const text = document.getElementById("reflection-input").value.trim();
    if (!text) {
        alert("Please write something before saving!");
        return;
    }
    participant.reflection = text;

    try {
        await addDoc(collection(db, "jomoReflections"), {
            nickname: participant.nickname,
            reflection: participant.reflection,
            dailyStatus: participant.dailyStatus,
            dailyCompletionDates: participant.dailyCompletionDates,
            dailyReflections: participant.reflections,
            completedDaysCount: participant.completedDays.length,
            timestamp: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
        });
        alert("Your reflection and history log have been successfully saved to the cloud!");
    } catch (error) {
        console.error("Firebase reflection sync error:", error);
    }
}
