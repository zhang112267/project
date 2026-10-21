// ==========================================
// 1. 參與者與全域狀態資料結構
// ==========================================
let participant = {
    nickname: "",
    currentDay: 1,
    completedDays: [],
    dailyStatus: {},
    dailyCompletionDates: {},
    lastCompletedDate: "" // 記錄上次完成任務的日期，用來限制「隔天才解鎖」
};

const WEB_APP_URL = ""; // 若有串接 Google 試算表可填入

// ==========================================
// 2. 網頁載入自動復原機制 (防止重新整理歸零)
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    const savedNickname = localStorage.getItem("jomo_nickname");
    const savedDay = localStorage.getItem("jomo_currentDay");

    if (savedNickname) {
        participant.nickname = savedNickname;
        if (savedDay) {
            participant.currentDay = parseInt(savedDay);
            participant.completedDays = JSON.parse(localStorage.getItem("jomo_completedDays")) || [];
            participant.dailyStatus = JSON.parse(localStorage.getItem("jomo_dailyStatus")) || {};
            participant.lastCompletedDate = localStorage.getItem("jomo_lastCompletedDate") || "";
        }

        // 檢查今天是否已經完成過今日挑戰，或者是否能進入
        checkDayLockStatus();

        // 自動隱藏前置步驟，切換到挑戰介面
        const stepNickname = document.getElementById("step-nickname");
        const stepQuestionnaire = document.getElementById("step-questionnaire");
        const stepResult = document.getElementById("step-result");
        const stepChallenge = document.getElementById("step-challenge");

        if (stepNickname) stepNickname.classList.add("hidden");
        if (stepQuestionnaire) stepQuestionnaire.classList.add("hidden");
        if (stepResult) stepResult.classList.add("hidden");
        if (stepChallenge) stepChallenge.classList.remove("hidden");

        if (typeof updateChallengeUI === 'function') updateChallengeUI();
        if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
        if (typeof renderHistoryLog === 'function') renderHistoryLog();
        
        console.log(`歡迎回來，${savedNickname}！目前進度：第 ${participant.currentDay} 天`);
    }
});

// ==========================================
// 3. 暱稱輸入與挑戰開始
// ==========================================
window.startChallengeSession = function() {
    const nicknameInput = document.getElementById("nickname-input");
    if (nicknameInput && nicknameInput.value.trim() !== "") {
        participant.nickname = nicknameInput.value.trim();
        
        localStorage.setItem("jomo_nickname", participant.nickname);
        localStorage.setItem("jomo_currentDay", participant.currentDay);
        
        const stepNickname = document.getElementById("step-nickname");
        const stepChallenge = document.getElementById("step-challenge");
        if (stepNickname) stepNickname.classList.add("hidden");
        if (stepChallenge) stepChallenge.classList.remove("hidden");
        
        if (typeof updateChallengeUI === 'function') updateChallengeUI();
    } else {
        alert("請輸入你的暱稱或代號才能開始挑戰喔！");
    }
};

// ==========================================
// 4. 嚴格時間檢查：確保「隔一天」才能進行下一個挑戰
// ==========================================
function checkDayLockStatus() {
    const todayStr = new Date().toDateString(); // 取得今天的日期字串 (例如 "Wed Oct 21 2026")
    
    // 如果今天已經完成過當前天數的任務，鎖定按鈕並提示明天再來
    if (participant.lastCompletedDate === todayStr) {
        const timerBtn = document.getElementById("timer-btn");
        if (timerBtn) {
            timerBtn.disabled = true;
            timerBtn.innerText = "今日挑戰已完成，請明天再來！";
        }
    }
}

// ==========================================
// 5. 任務計時器邏輯 (支援 Day 6 的 120 分鐘深度專注，無任何 Skip)
// ==========================================
let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const todayStr = new Date().toDateString();
    
    // 嚴格阻擋：如果今天已經完成過，不能重複執行
    if (participant.lastCompletedDate === todayStr) {
        alert("你今天已經完成過挑戰了！依照規則，必須等到明天才能解鎖下一個挑戰喔！");
        return;
    }

    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Challenge in Progress...";
    }

    const minutesAllowed = (typeof missions !== 'undefined' && missions[participant.currentDay]) ? (missions[participant.currentDay].duration || 30) : 30;
    targetTimestamp = Date.now() + minutesAllowed * 60 * 1000;

    timerInterval = setInterval(() => {
        const now = Date.now();
        let remainingSeconds = Math.ceil((targetTimestamp - now) / 1000);

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            displayTime(0);
            if (typeof triggerAchievePrompt === 'function') {
                triggerAchievePrompt();
            }
        } else {
            displayTime(remainingSeconds);
        }
    }, 1000);
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
// 6. 任務結果提交 (記錄完成日期、推進天數、同步反思)
// ==========================================
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("zh-TW"); 
    const todayServerStr = new Date().toDateString();

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 
    participant.lastCompletedDate = todayServerStr; // 鎖定今天，強制隔天才可進行下一天

    if (status === "Achieve") {
        if (!participant.completedDays.includes(participant.currentDay)) {
            participant.completedDays.push(participant.currentDay);
        }
    }

    if (typeof notifyTaskCompleted === 'function') {
        notifyTaskCompleted(participant.currentDay);
    }

    const promptBox = document.getElementById("task-achieve-prompt-box");
    if (promptBox) promptBox.classList.add("hidden");

    const reflectionInput = document.getElementById("reflection-input");
    const reflectionText = reflectionInput ? reflectionInput.value : "";

    sendDataToCloud(participant.nickname, participant.currentDay, status, reflectionText);

    // 進入下一天或完成總挑戰
    if (participant.currentDay < 7) {
        participant.currentDay++;
        if (typeof resetTaskUI === 'function') resetTaskUI();
        if (typeof updateChallengeUI === 'function') updateChallengeUI();
    } else {
        const dailyCard = document.getElementById("daily-mission-card");
        const badgeBox = document.getElementById("master-badge-box");
        if (dailyCard) dailyCard.classList.add("hidden");
        if (badgeBox) badgeBox.classList.remove("hidden");
    }

    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (typeof renderHistoryLog === 'function') renderHistoryLog(); 

    // 寫入 localStorage 永久保存
    localStorage.setItem("jomo_currentDay", participant.currentDay);
    localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
    localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));
    localStorage.setItem("jomo_lastCompletedDate", participant.lastCompletedDate);
};

// ==========================================
// 7. 雲端同步函式
// ==========================================
async function sendDataToCloud(nickname, day, status, reflection) {
    if (!WEB_APP_URL) return;

    const payload = { nickname, day, status, reflection };

    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
    } catch (error) {
        console.error("雲端傳送錯誤：", error);
    }
}
