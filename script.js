// ==========================================
// 1. 參與者與全域狀態資料結構
// ==========================================
let participant = {
    nickname: "",
    currentDay: 1,
    completedDays: [],
    dailyStatus: {},
    dailyCompletionDates: {}
};

// 💡 如果未來有串接 Google 試算表 Apps Script，請將網址貼在下方引號內；若暫時只要單機版可留空
const WEB_APP_URL = ""; 

// ==========================================
// 2. 網頁載入自動復原機制 (防止 F5 重新整理或關閉分頁後歸零)
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
        }

        // 自動隱藏前置步驟，直接切換到挑戰介面
        const stepNickname = document.getElementById("step-nickname");
        const stepQuestionnaire = document.getElementById("step-questionnaire");
        const stepResult = document.getElementById("step-result");
        const stepChallenge = document.getElementById("step-challenge");

        if (stepNickname) stepNickname.classList.add("hidden");
        if (stepQuestionnaire) stepQuestionnaire.classList.add("hidden");
        if (stepResult) stepResult.classList.add("hidden");
        if (stepChallenge) stepChallenge.classList.remove("hidden");

        // 重新整理後更新畫面上的各項數值與清單
        if (typeof updateChallengeUI === 'function') updateChallengeUI();
        if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
        if (typeof renderHistoryLog === 'function') renderHistoryLog();
        
        console.log(`歡迎回來，${savedNickname}！已自動恢復至第 ${participant.currentDay} 天`);
    }
});

// ==========================================
// 3. 暱稱輸入與挑戰開始
// ==========================================
window.startChallengeSession = function() {
    const nicknameInput = document.getElementById("nickname-input");
    if (nicknameInput && nicknameInput.value.trim() !== "") {
        participant.nickname = nicknameInput.value.trim();
        
        // 首次登入寫入本地儲存
        localStorage.setItem("jomo_nickname", participant.nickname);
        localStorage.setItem("jomo_currentDay", participant.currentDay);
        
        // 切換畫面至挑戰主頁
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
// 4. 任務計時器邏輯 (支援一般任務與 Day 6 的 120 分鐘深度專注)
// ==========================================
let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const btn = document.getElementById("timer-btn");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Challenge in Progress...";
    }

    // 讀取當天任務設定的時長（預設 30 分鐘）
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
// 5. 任務結果提交 (記錄成果、更新畫面、儲存狀態與反思)
// ==========================================
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("zh-TW"); 

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 

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

    // 取得使用者的改善反思心得
    const reflectionInput = document.getElementById("reflection-input");
    const reflectionText = reflectionInput ? reflectionInput.value : "";

    // 嘗試同步至雲端後台
    sendDataToCloud(participant.nickname, participant.currentDay, status, reflectionText);

    // 進入下一天或完成 7 天總挑戰
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

    // 將最新進度安全寫入瀏覽器本地儲存
    localStorage.setItem("jomo_currentDay", participant.currentDay);
    localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
    localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));
};

// ==========================================
// 6. 雲端同步函式 (串接 Google 試算表)
// ==========================================
async function sendDataToCloud(nickname, day, status, reflection) {
    if (!WEB_APP_URL) {
        console.log("提示：目前未設定雲端 API 網址，資料僅存於本機。");
        return;
    }

    const payload = {
        nickname: nickname,
        day: day,
        status: status,
        reflection: reflection
    };

    try {
        await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        console.log("數據已成功發送至雲端後台！");
    } catch (error) {
        console.error("雲端傳送發生錯誤：", error);
    }
}
