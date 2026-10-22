// ==========================================
// 1. 參與者與全域狀態資料結構
// ==========================================
let participant = {
    nickname: "",
    currentDay: 1,
    completedDays: [],
    dailyStatus: {},
    dailyCompletionDates: {},
    lastCompletedDate: ""
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

        checkDayLockStatus();

        // 如果之前已經填過名字並進入挑戰，才幫你直接回到挑戰畫面
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
// 3. 第一步：使用者輸入名字後，進入問卷畫面（不跳過問卷！）
// ==========================================
window.startChallengeSession = function() {
    const nicknameInput = document.getElementById("nickname-input");
    if (nicknameInput && nicknameInput.value.trim() !== "") {
        participant.nickname = nicknameInput.value.trim();
        localStorage.setItem("jomo_nickname", participant.nickname);
        
        // 隱藏暱稱輸入畫面，顯示問卷畫面
        const stepNickname = document.getElementById("step-nickname");
        const stepQuestionnaire = document.getElementById("step-questionnaire");
        
        if (stepNickname) stepNickname.classList.add("hidden");
        if (stepQuestionnaire) stepQuestionnaire.classList.remove("hidden");
        
    } else {
        alert("請輸入你的暱稱或代號才能開始挑戰喔！");
    }
};

// ==========================================
// 4. 第二步：使用者填完問卷後，才正式進入挑戰畫面 (startAssessment)
// ==========================================
window.startAssessment = function() {
    // 這裡可以加上問卷驗證（如果需要的話），然後正式切換到挑戰介面
    localStorage.setItem("jomo_currentDay", participant.currentDay);

    const stepQuestionnaire = document.getElementById("step-questionnaire");
    const stepResult = document.getElementById("step-result");
    const stepChallenge = document.getElementById("step-challenge");

    if (stepQuestionnaire) stepQuestionnaire.classList.add("hidden");
    if (stepResult) stepResult.classList.add("hidden");
    if (stepChallenge) stepChallenge.classList.remove("hidden");

    if (typeof updateChallengeUI === 'function') updateChallengeUI();
    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    if (typeof renderHistoryLog === 'function') renderHistoryLog();

    console.log("問卷完成，正式進入挑戰！使用者：", participant.nickname);
};

// ==========================================
// 5. 嚴格時間檢查：確保「隔一天」才能進行下一個挑戰
// ==========================================
function checkDayLockStatus() {
    const todayStr = new Date().toDateString(); 
    
    if (participant.lastCompletedDate === todayStr) {
        const timerBtn = document.getElementById("timer-btn");
        if (timerBtn) {
            timerBtn.disabled = true;
            timerBtn.innerText = "今日挑戰已完成，請明天再來！";
        }
    }
}

// ==========================================
// 6. 任務計時器邏輯 (支援 Day 6 的 120 分鐘，無任何 Skip 漏洞)
// ==========================================
let timerInterval = null;
let targetTimestamp = null; 

window.startOfflineTimer = function() {
    const todayStr = new Date().toDateString();
    
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
// 7. 任務結果提交 (記錄完成日期、推進天數、同步反思)
// ==========================================
window.submitDayResult = function(status) {
    const todayDateStr = new Date().toLocaleDateString("zh-TW"); 
    const todayServerStr = new Date().toDateString();

    participant.dailyStatus[participant.currentDay] = status;
    participant.dailyCompletionDates[participant.currentDay] = todayDateStr; 
    participant.lastCompletedDate = todayServerStr; 

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

    localStorage.setItem("jomo_currentDay", participant.currentDay);
    localStorage.setItem("jomo_completedDays", JSON.stringify(participant.completedDays));
    localStorage.setItem("jomo_dailyStatus", JSON.stringify(participant.dailyStatus));
    localStorage.setItem("jomo_lastCompletedDate", participant.lastCompletedDate);
};

// ==========================================
// 8. 雲端同步函式
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
// ==========================================
// 8. 數位焦慮問卷與計分系統 (讓問卷有分數與結果)
// ==========================================
window.submitQuestionnaire = function() {
    // 範例：抓取問卷選項的分數（假設你的問卷有給予分數的 radio 或 checkbox）
    // 這裡會依據使用者的選擇計算出一個初始的「數位焦慮指數」或分數
    let totalScore = 0;
    
    // 假設你的問卷選項有 class="q-input" 或類似的選取項目
    const questionnaireInputs = document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked');
    
    questionnaireInputs.forEach(input => {
        // 如果選項有帶分數值，加總進去（預設沒填寫就給基本分）
        totalScore += parseInt(input.value) || 5;
    });

    // 把分數存進全域變數或本地儲存
    participant.initialScore = totalScore;
    localStorage.setItem("jomo_initialScore", totalScore);

    // 切換畫面：從問卷畫面 (step-questionnaire) 轉到 結果畫面 (step-result) 或直接進挑戰
    const stepQuestionnaire = document.getElementById("step-questionnaire");
    const stepResult = document.getElementById("step-result");
    const stepChallenge = document.getElementById("step-challenge");

    if (stepQuestionnaire) stepQuestionnaire.classList.add("hidden");
    
    // 如果你們有「結果頁面」讓大家看測驗分析，就先顯示結果頁；如果沒有，直接進挑戰
    if (stepResult) {
        stepResult.classList.remove("hidden");
        // 把分數渲染到結果畫面上
        const resultScoreText = document.getElementById("result-score-text");
        if (resultScoreText) {
            resultScoreText.innerText = `你的數位焦慮指數：${totalScore} 分`;
        }
    } else if (stepChallenge) {
        stepChallenge.classList.remove("hidden");
    }

    if (typeof updateScoreDisplay === 'function') updateScoreDisplay();
    console.log("問卷已提交，計算得分：", totalScore);
};

// 更新畫面上分數顯示的標準函式
window.updateScoreDisplay = function() {
    const scoreVal = document.getElementById("score-val");
    if (scoreVal) {
        // 總分 = 問卷初始分數 + 完成天數獲得的分數
        const initial = parseInt(localStorage.getItem("jomo_initialScore")) || 0;
        const taskBonus = participant.completedDays.length * 10;
        scoreVal.innerText = initial + taskBonus;
    }
};
