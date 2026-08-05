function switchMiniGame(subGame) {
    currentMiniGame = subGame;

    const btnVocab = document.getElementById("game-subtab-vocab");
    const btnMath = document.getElementById("game-subtab-math");
    const btnStory = document.getElementById("game-subtab-story");
    const vocabContainer = document.getElementById("game-vocab-container");
    const mathContainer = document.getElementById("game-math-container");
    const storyContainer = document.getElementById("game-story-container");
    const langSwitchBox = document.getElementById("lang-switch-box");

    const activeClass = "flex-1 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition";
    const inactiveClass = "flex-1 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition";

    btnVocab.className = inactiveClass; btnMath.className = inactiveClass; btnStory.className = inactiveClass;
    vocabContainer.classList.add("hidden"); vocabContainer.classList.remove("flex");
    mathContainer.classList.add("hidden"); mathContainer.classList.remove("flex");
    storyContainer.classList.add("hidden"); storyContainer.classList.remove("flex");
    langSwitchBox.classList.add("hidden");

    if (subGame === 'vocab') {
        btnVocab.className = activeClass;
        vocabContainer.classList.remove("hidden"); vocabContainer.classList.add("flex");
        langSwitchBox.classList.remove("hidden");
    } else if (subGame === 'math') {
        btnMath.className = activeClass;
        mathContainer.classList.remove("hidden"); mathContainer.classList.add("flex");
        generateMathPuzzle();
    } else if (subGame === 'story') {
        btnStory.className = activeClass;
        storyContainer.classList.remove("hidden"); storyContainer.classList.add("flex");
        initStoryTabState();
    }
    checkDailyLimitStatus();
}

function switchSubjectMode(mode) {
    subjectMode = mode;
    const enBtn = document.getElementById("mode-en-btn");
    const thBtn = document.getElementById("mode-th-btn");

    if (mode === 'EN') {
        enBtn.className = "px-2.5 py-1 rounded-xl text-xs font-black bg-white text-indigo-900 shadow transition";
        thBtn.className = "px-2.5 py-1 rounded-xl text-xs font-black text-white hover:bg-white/20 transition";
    } else {
        thBtn.className = "px-2.5 py-1 rounded-xl text-xs font-black bg-white text-indigo-900 shadow transition";
        enBtn.className = "px-2.5 py-1 rounded-xl text-xs font-black text-white hover:bg-white/20 transition";
    }

    currentIndex = 0; setCorrectAnswers = 0;
    if (isFirebaseActive) { initFirebase(); } 
    else {
        const localData = localStorage.getItem(`kids_vocab_${subjectMode.toLowerCase()}_data`);
        rawVocabList = localData ? JSON.parse(localData) : (mode === 'EN' ? [...defaultVocabEN] : [...defaultVocabTH]);
        filterVocabForUser(); updateCard();
    }
}

function filterVocabForUser() {
    if (isParentUser || !currentUser) {
        filteredVocabList = [...rawVocabList];
    } else {
        filteredVocabList = rawVocabList.filter(item => {
            if (!item.assignees || item.assignees.length === 0) return true;
            return item.assignees.includes(currentUser);
        });
    }
    shuffleArray(filteredVocabList);
}

function saveToStorage() { 
    if (isFirebaseActive) {
        const { set } = window.firebaseModules;
        const currentDbRef = subjectMode === 'EN' ? dbRefVocabEN : dbRefVocabTH;
        if (currentDbRef) set(currentDbRef, rawVocabList);
    } else {
        localStorage.setItem(`kids_vocab_${subjectMode.toLowerCase()}_data`, JSON.stringify(rawVocabList)); 
    }
}

function renderSpelledLetters(word) {
    if (!word) return '';
    return word.split('').map(char => {
        if (char === ' ') return '<span class="letter-space"></span>';
        return `<span class="letter-box">${char.toUpperCase()}</span>`;
    }).join('');
}

function renderBlankLetters(word) {
    if (!word) return '';
    return word.split('').map(char => {
        if (char === ' ') return '<span class="letter-space"></span>';
        return `<span class="blank-box"></span>`;
    }).join('');
}

function updateCard() {
    if (!filteredVocabList || filteredVocabList.length === 0) {
        document.getElementById("card-word-main").innerHTML = "ไม่มีคำศัพท์";
        document.getElementById("card-word-sub").innerText = "กรุณาเพิ่มคำศัพท์ใหม่";
        return;
    }
    if (currentIndex >= filteredVocabList.length) currentIndex = 0;
    const item = filteredVocabList[currentIndex];
    isFlipped = false;
    document.getElementById("card-inner").classList.remove("card-flipped");

    const emojiEl = document.getElementById("card-emoji");
    const imgEl = document.getElementById("card-img");
    const emojiBackEl = document.getElementById("card-emoji-back");
    const imgBackEl = document.getElementById("card-img-back");

    if (item.image) {
        [emojiEl, emojiBackEl].forEach(el => el.classList.add("hidden"));
        [imgEl, imgBackEl].forEach(el => { el.classList.remove("hidden"); el.src = item.image; });
    } else {
        [imgEl, imgBackEl].forEach(el => el.classList.add("hidden"));
        [emojiEl, emojiBackEl].forEach(el => { el.classList.remove("hidden"); el.innerText = item.emoji || "💡"; });
    }

    if (subjectMode === 'EN') {
        document.getElementById("card-word-main").innerHTML = renderSpelledLetters(item.en);
        document.getElementById("card-word-sub").innerText = item.th;
        document.getElementById("card-phonetic").innerText = `[ ${item.phonetic || item.th} ]`;
    } else {
        document.getElementById("card-word-main").innerHTML = renderSpelledLetters(item.th);
        document.getElementById("card-word-sub").innerText = item.en !== item.th ? item.en : "คำภาษาไทย";
        document.getElementById("card-phonetic").innerText = `[ ${item.phonetic || item.th} ]`;
    }

    const spellEmoji = document.getElementById("spell-card-emoji");
    const spellImg = document.getElementById("spell-card-img");
    if (item.image) {
        spellEmoji.classList.add("hidden"); spellImg.classList.remove("hidden"); spellImg.src = item.image;
    } else {
        spellImg.classList.add("hidden"); spellEmoji.classList.remove("hidden"); spellEmoji.innerText = item.emoji || "💡";
    }

    if (subjectMode === 'EN') {
        document.getElementById("spell-card-title").innerText = item.th;
        document.getElementById("spell-card-subtitle").innerHTML = renderBlankLetters(item.en);
        document.getElementById("spell-input").placeholder = "พิมพ์คำศัพท์ภาษาอังกฤษ...";
    } else {
        document.getElementById("spell-card-title").innerText = item.en;
        document.getElementById("spell-card-subtitle").innerHTML = renderBlankLetters(item.th);
        document.getElementById("spell-input").placeholder = "พิมพ์คำภาษาไทย...";
    }

    const posInSet = (currentIndex % 5) + 1;
    const currentSetNum = Math.floor(currentIndex / 5) + 1;
    document.getElementById("set-progress-text").innerText = `ชุดที่ ${currentSetNum} (คำที่ ${posInSet}/5)`;
    document.getElementById("spell-input").value = "";
    document.getElementById("speech-status").innerText = "";
    checkDailyLimitStatus();
}

function checkSpellingAnswer() {
    if (filteredVocabList.length === 0) return;
    if (!isParentUser && isDailyLimitEnabled && todayPlayedRounds >= dailyLimitRounds) {
        alert(`🛑 หนูเล่นครบโควต้ารวม ${dailyLimitRounds} รอบประจำวันแล้วนะ พักสายตาก่อนแล้วมาเล่นใหม่พรุ่งนี้นะครับ!`); return;
    }

    const inputVal = document.getElementById("spell-input").value.trim().toLowerCase();
    const currentItem = filteredVocabList[currentIndex];
    const targetVal = (subjectMode === 'EN' ? currentItem.en : currentItem.th).trim().toLowerCase();
    if (!inputVal) { alert("กรุณาพิมพ์สะกดคำก่อนนะครับ!"); return; }

    const cleanedInput = inputVal.replace(/[\s\-]/g, '');
    const cleanedTarget = targetVal.replace(/[\s\-]/g, '');

    if (cleanedInput === cleanedTarget) {
        alert(`🎉 ถูกต้องแล้วครับเก่งมาก! ${currentItem.en} = ${currentItem.th}`);
        setCorrectAnswers += 1;
        const isEndOfSet = ((currentIndex + 1) % 5 === 0) || (currentIndex === filteredVocabList.length - 1);
        if (isEndOfSet) {
            if (setCorrectAnswers >= 5 || setCorrectAnswers === (filteredVocabList.length % 5)) { triggerCompletionModal(); } 
            else { alert(`จบชุดแล้ว! ท่องถูกไป ${setCorrectAnswers}/5 คำ (พยายามอีกนิดเพื่อเก็บ 1 ดาวนะครับ)`); setCorrectAnswers = 0; nextCard(); }
        } else { nextCard(); }
    } else { alert(`❌ ยังไม่ถูกต้อง ลองใหม่อีกครั้งนะครับ!`); }
}

function flipCard() { if (filteredVocabList.length === 0) return; isFlipped = !isFlipped; document.getElementById("card-inner").classList.toggle("card-flipped", isFlipped); }
function nextCard() { if (filteredVocabList.length === 0) return; currentIndex = (currentIndex + 1) % filteredVocabList.length; updateCard(); }
function prevCard() { if (filteredVocabList.length === 0) return; currentIndex = (currentIndex - 1 + filteredVocabList.length) % filteredVocabList.length; updateCard(); }
function addStar() { if (filteredVocabList.length === 0) return; nextCard(); }

function speakCurrentWord() {
    if (filteredVocabList.length === 0) return;
    const item = filteredVocabList[currentIndex];
    let rawText = isFlipped ? item.th : item.en;
    let lang = isFlipped ? 'th-TH' : 'en-US';
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(rawText);
        utterance.lang = lang; utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    }
}

function speakCurrentWordPrompt() {
    if (!filteredVocabList || filteredVocabList.length === 0) return;
    const item = filteredVocabList[currentIndex];
    let rawText = subjectMode === 'EN' ? item.en : item.th;
    let lang = subjectMode === 'EN' ? 'en-US' : 'th-TH';
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(rawText);
        utterance.lang = lang; utterance.rate = 0.85; utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
    } else { alert("เบราว์เซอร์นี้ยังไม่รองรับระบบอ่านออกเสียงครับ"); }
}

function triggerCompletionModal() {
    totalStars += 1;
    saveUserStars();
    addEXPToUser(100);
    incrementTodayRounds();
    document.getElementById("summary-total-count").innerText = "5 / 5 คำ";
    document.getElementById("summary-stars-earned").innerText = "⭐ 1 ดวง";
    document.getElementById("summary-stars-earned").className = "text-sm text-amber-500 font-bold";
    document.getElementById("summary-exp-earned").innerText = "+100 EXP ✨";
    document.getElementById("summary-saved-badge").innerText = "✅ บันทึกดาวสะสมและแจ้งเตือนคุณพ่อคุณแม่เรียบร้อย!";
    document.getElementById("summary-saved-badge").className = "bg-emerald-50 text-emerald-800 text-xs font-bold p-2.5 rounded-xl border border-emerald-200";
    document.getElementById("completion-subtitle").innerText = `🎉 น้อง${currentUser || 'เด็กๆ'} ท่องถูกครบชุด 5 คำแล้ว!`;
    document.getElementById("completion-modal").classList.remove("hidden");

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`เก่งมากเลยครับ ${currentUser || ''} ตอบถูกครบ 5 คำ รับไปเลย 1 ดาว และ 100 EXP`);
        utterance.lang = 'th-TH'; window.speechSynthesis.speak(utterance);
    }
    sendInAppNotification('COMPLETED_SET', { setNum: Math.floor(currentIndex / 5) + 1 });
}

function restartSession() {
    document.getElementById("completion-modal").classList.add("hidden");
    if (currentMiniGame === 'math') { mathQuestionIndex = 1; generateMathPuzzle(); } 
    else if (currentMiniGame === 'story') { openStoryCreator(); } 
    else { setCorrectAnswers = 0; shuffleArray(filteredVocabList); currentIndex = 0; updateCard(); }
}

function openAddModal() {
    if (!isParentUser) return;
    document.getElementById("modal-title").innerText = `เพิ่มคำศัพท์ใหม่ (${subjectMode}) 📝`;
    document.getElementById("edit-index").value = "-1";
    document.getElementById("vocab-form").reset();
    document.getElementById("assign-poon").checked = true;
    document.getElementById("assign-ploern").checked = true;
    document.getElementById("input-img").value = ""; 
    document.getElementById("img-preview-container").classList.add("hidden");
    currentResizedBase64 = null;
    document.getElementById("add-modal").classList.remove("hidden");
}

function editCurrentCard() {
    if (!isParentUser || filteredVocabList.length === 0) return;
    const item = filteredVocabList[currentIndex];
    const rawIndex = rawVocabList.findIndex(x => x === item || (x.en === item.en && x.th === item.th));
    if (rawIndex === -1) return;
    document.getElementById("modal-title").innerText = "แก้ไขคำศัพท์ ✏️";
    document.getElementById("edit-index").value = rawIndex;
    document.getElementById("input-en").value = item.en;
    document.getElementById("input-th").value = item.th;
    document.getElementById("input-phonetic").value = item.phonetic || item.th;
    document.getElementById("input-img").value = ""; 
    const assignees = item.assignees || ["พูน", "เพลิน"];
    document.getElementById("assign-poon").checked = assignees.includes("พูน");
    document.getElementById("assign-ploern").checked = assignees.includes("เพลิน");

    if (item.image) {
        currentResizedBase64 = item.image;
        document.getElementById("img-preview").src = item.image;
        document.getElementById("img-preview-container").classList.remove("hidden");
        document.getElementById("img-size-info").innerText = "รูปภาพเดิม";
    } else {
        currentResizedBase64 = null;
        document.getElementById("img-preview-container").classList.add("hidden");
    }
    document.getElementById("add-modal").classList.remove("hidden");
}

function deleteCurrentCard() {
    if (!isParentUser || filteredVocabList.length === 0) return;
    const item = filteredVocabList[currentIndex];
    const rawIndex = rawVocabList.findIndex(x => x === item || (x.en === item.en && x.th === item.th));
    if (rawIndex === -1) return;

    if (confirm(`คุณต้องการลบคำศัพท์ "${item.en}" (${item.th}) ใช่หรือไม่?`)) {
        rawVocabList.splice(rawIndex, 1);
        saveToStorage(); filterVocabForUser();
        if (currentIndex >= filteredVocabList.length) currentIndex = Math.max(0, filteredVocabList.length - 1);
        updateCard();
    }
}

function closeModal() {
    document.getElementById("add-modal").classList.add("hidden");
    document.getElementById("vocab-form").reset();
    document.getElementById("input-img").value = ""; 
    document.getElementById("img-preview-container").classList.add("hidden");
    currentResizedBase64 = null;
    const btn = document.getElementById("ai-btn");
    btn.disabled = false; btn.innerHTML = `<i data-lucide="sparkles" class="w-3 h-3"></i> แปล Gemini ✨`; btn.classList.remove('opacity-70');
    lucide.createIcons();
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!isParentUser) return;
    const editIndex = parseInt(document.getElementById("edit-index").value, 10);
    const en = document.getElementById("input-en").value.trim();
    const th = document.getElementById("input-th").value.trim();
    const phonetic = document.getElementById("input-phonetic").value.trim() || th;
    const assignees = [];
    if (document.getElementById("assign-poon").checked) assignees.push("พูน");
    if (document.getElementById("assign-ploern").checked) assignees.push("เพลิน");

    if (!en || !th) return;
    const vocabItem = { en, th, phonetic, emoji: "✨", image: currentResizedBase64, assignees: assignees };
    if (editIndex >= 0 && editIndex < rawVocabList.length) rawVocabList[editIndex] = vocabItem;
    else rawVocabList.push(vocabItem);

    saveToStorage(); filterVocabForUser(); closeModal();
    currentIndex = filteredVocabList.findIndex(x => x.en === en && x.th === th);
    if (currentIndex === -1) currentIndex = 0;
    updateCard();
}

async function askGeminiAI() {
    const enInput = document.getElementById("input-en").value.trim();
    const thInput = document.getElementById("input-th").value.trim();
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) { alert("กรุณาแจ้งพ่อนะหรือแม่พัดให้ช่วยตั้งค่า Gemini API Key ก่อนครับ"); return; }

    let prompt = "";
    if (subjectMode === 'EN') {
        if (!enInput) { alert("กรุณาใส่คำศัพท์ภาษาอังกฤษก่อนครับ"); return; }
        prompt = `แปลคำศัพท์ภาษาอังกฤษสำหรับเด็ก คำว่า "${enInput}" เป็นภาษาไทย และขอ "คำอ่านทับศัพท์เสียงอ่านภาษาอังกฤษเป็นภาษาไทย" ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น: {"th": "คำแปลไทย", "phonetic": "คำอ่านทับศัพท์ไทย"}`;
    } else {
        if (!thInput) { alert("กรุณาใส่คำศัพท์ภาษาไทยก่อนครับ"); return; }
        prompt = `แปลคำศัพท์ภาษาไทยสำหรับเด็ก คำว่า "${thInput}" เป็นภาษาอังกฤษ และขอ "คำอ่านภาษาไทยแบบเว้นวรรคให้อ่านง่ายสำหรับเด็ก" ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น: {"en": "English Word", "phonetic": "คำ-อ่าน-ไทย"}`;
    }

    const btn = document.getElementById("ai-btn");
    btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> Gemini กำลังสร้าง...`; btn.classList.add('opacity-70');
    const textUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(textUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1 } }) });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
        if (subjectMode === 'EN') {
            if (result.th) document.getElementById("input-th").value = result.th;
            if (result.phonetic) document.getElementById("input-phonetic").value = result.phonetic;
        } else {
            if (result.en) document.getElementById("input-en").value = result.en;
            if (result.phonetic) document.getElementById("input-phonetic").value = result.phonetic;
        }
    } catch (error) { alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI: " + (error.message || "กรุณาตรวจสอบ API Key")); } 
    finally { btn.disabled = false; btn.innerHTML = `<i data-lucide="sparkles" class="w-3 h-3"></i> แปล Gemini ✨`; btn.classList.remove('opacity-70'); lucide.createIcons(); }
}

function openGeminiForImage() {
    const targetWord = document.getElementById("input-en").value.trim() || document.getElementById("input-th").value.trim();
    if (!targetWord) { alert("กรุณาพิมพ์คำศัพท์ก่อนครับ"); return; }
    const imagePrompt = `วาดรูปภาพการ์ตูนน่ารักๆ สำหรับเด็ก ของคำว่า "${targetWord}" ลายเส้นคลีนๆ 2D vector clipart พื้นหลังสีขาว isolated **ข้อสำคัญ: ห้ามใส่ตัวอักษร ข้อความ หรือคำศัพท์ใดๆ ลงในภาพเด็ดขาด (No text, no letters, no words)**`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(imagePrompt).then(() => {
            alert(`ก๊อปปี้คำสั่งเจนรูปแล้ว!\n\nกำลังเปิด Gemini... เมื่อถึงหน้าเว็บ ให้กด "วาง (Paste)" เพื่อเจนรูปได้เลยครับ`);
            window.open("https://gemini.google.com/app", "_blank");
        }).catch(() => { window.open("https://gemini.google.com/app", "_blank"); });
    } else { window.open("https://gemini.google.com/app", "_blank"); }
}

function processResizedBase64(base64Src) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement("canvas");
        const maxDim = 300; let width = img.width, height = img.height;
        if (width > height) { if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; } } 
        else { if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        currentResizedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        const previewImg = document.getElementById("img-preview");
        previewImg.src = currentResizedBase64;
        document.getElementById("img-preview-container").classList.remove("hidden");
        document.getElementById("img-size-info").innerText = `เตรียมรูปเรียบร้อย ✨ (${width}x${height}px, ~${Math.round((currentResizedBase64.length * (3/4)) / 1024)}KB)`;
    };
    img.src = base64Src;
}

function previewAndResizeImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { processResizedBase64(e.target.result); };
    reader.readAsDataURL(file);
}

let mathDifficulty = 'easy'; let mathQuestionIndex = 1; let mathInitialNumbers = []; let mathCurrentNumbers = []; let mathTargetNumber = 0; let mathSelectedNum1Idx = null; let mathSelectedOp = null; let mathSelectedNum2Idx = null;

function setMathDifficulty(diff) {
    mathDifficulty = diff;
    const easyBtn = document.getElementById("math-diff-easy"), medBtn = document.getElementById("math-diff-medium"), hardBtn = document.getElementById("math-diff-hard"), diffTag = document.getElementById("math-diff-tag");
    const activeClass = "flex-1 py-1 rounded-xl text-[11px] font-black text-white shadow-xs transition ", inactiveClass = "flex-1 py-1 rounded-xl text-[11px] font-black text-slate-600 hover:bg-slate-200 transition";
    easyBtn.className = inactiveClass; medBtn.className = inactiveClass; hardBtn.className = inactiveClass;

    if (diff === 'easy') { easyBtn.className = activeClass + "bg-emerald-500"; diffTag.innerText = "บวกลบ (4 ตัว)"; diffTag.className = "text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-kids"; } 
    else if (diff === 'medium') { medBtn.className = activeClass + "bg-indigo-500"; diffTag.innerText = "บวกลบคูณหาร (4 ตัว)"; diffTag.className = "text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-full font-kids"; } 
    else { hardBtn.className = activeClass + "bg-rose-500"; diffTag.innerText = "บวกลบคูณหาร (5 ตัว)"; diffTag.className = "text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full font-kids"; }
    mathQuestionIndex = 1; generateMathPuzzle();
}

function generateMathPuzzle() {
    let count = mathDifficulty === 'hard' ? 5 : 4, allowMulDiv = mathDifficulty !== 'easy';
    let nums = [];
    for (let i = 0; i < count; i++) { nums.push(Math.floor(Math.random() * 9) + 1); }
    let tempNums = [...nums], ops = allowMulDiv ? ['+', '-', '*', '/'] : ['+', '-'];
    while (tempNums.length > 1) {
        let num1 = tempNums.splice(Math.floor(Math.random() * tempNums.length), 1)[0];
        let num2 = tempNums.splice(Math.floor(Math.random() * tempNums.length), 1)[0];
        let op = ops[Math.floor(Math.random() * ops.length)], res = 0;
        if (op === '+') res = num1 + num2; else if (op === '-') res = Math.abs(num1 - num2); else if (op === '*') res = num1 * num2; else if (op === '/') { if (num2 !== 0 && num1 % num2 === 0) res = num1 / num2; else res = num1 + num2; }
        tempNums.push(res);
    }
    mathTargetNumber = tempNums[0];
    if (mathTargetNumber <= 0 || mathTargetNumber > 100) { generateMathPuzzle(); return; }
    mathInitialNumbers = [...nums]; mathCurrentNumbers = [...nums];
    resetMathSelection(); renderMathBoard();
}

function renderMathBoard() {
    document.getElementById("math-target-number").innerText = mathTargetNumber;
    document.getElementById("math-progress-text").innerText = `ข้อที่: ${mathQuestionIndex} / 5`;
    document.getElementById("math-numbers-left-tag").innerText = `เหลือ ${mathCurrentNumbers.length} ตัว`;

    const mulBtn = document.getElementById("math-op-mul"), divBtn = document.getElementById("math-op-div");
    if (mathDifficulty === 'easy') { mulBtn.classList.add("hidden"); divBtn.classList.add("hidden"); } else { mulBtn.classList.remove("hidden"); divBtn.classList.remove("hidden"); }

    const container = document.getElementById("math-numbers-container");
    container.innerHTML = "";
    mathCurrentNumbers.forEach((num, index) => {
        const btn = document.createElement("button");
        btn.className = `w-11 h-11 rounded-full font-bold text-base text-white shadow-xs flex items-center justify-center bubble-btn font-kids `;
        if (mathSelectedNum1Idx === index || mathSelectedNum2Idx === index) btn.className += "bg-indigo-600 ring-2 ring-indigo-300 scale-105";
        else btn.className += "bg-indigo-500 hover:bg-indigo-600";
        btn.innerText = num; btn.onclick = () => selectMathNumber(index);
        container.appendChild(btn);
    });
    updateMathFormulaDisplay();
}

function selectMathNumber(index) {
    if (mathSelectedNum1Idx === null) mathSelectedNum1Idx = index;
    else if (mathSelectedNum1Idx === index) { mathSelectedNum1Idx = null; mathSelectedOp = null; mathSelectedNum2Idx = null; } 
    else if (mathSelectedOp === null) mathSelectedNum1Idx = index;
    else if (mathSelectedNum2Idx === index) mathSelectedNum2Idx = null;
    else mathSelectedNum2Idx = index;
    renderMathBoard();
}

function selectMathOperator(op) {
    if (mathSelectedNum1Idx === null) { alert("กรุณาแตะเลือกตัวเลขแรกก่อนครับ!"); return; }
    mathSelectedOp = op; renderMathBoard();
}

function updateMathFormulaDisplay() {
    const formulaEl = document.getElementById("math-formula-text");
    let num1Str = mathSelectedNum1Idx !== null ? mathCurrentNumbers[mathSelectedNum1Idx] : "";
    let opStr = mathSelectedOp !== null ? mathSelectedOp : "";
    let num2Str = mathSelectedNum2Idx !== null ? mathCurrentNumbers[mathSelectedNum2Idx] : "";
    if (!num1Str) { formulaEl.innerText = "แตะตัวเลขและเครื่องหมายเพื่อผสม"; formulaEl.className = "text-slate-400 font-bold text-xs"; } 
    else { formulaEl.innerText = `${num1Str} ${opStr} ${num2Str}`.trim(); formulaEl.className = "text-indigo-950 font-bold text-2xl tracking-wider font-kids"; }
}

function executeMathCombination() {
    if (!isParentUser && isDailyLimitEnabled && todayPlayedRounds >= dailyLimitRounds) { alert(`🛑 หนูเล่นครบโควต้ารวม ${dailyLimitRounds} รอบประจำวันแล้วนะ พักสายตาก่อนแล้วมาเล่นใหม่พรุ่งนี้นะครับ!`); return; }
    if (mathSelectedNum1Idx === null || mathSelectedOp === null || mathSelectedNum2Idx === null) { alert("กรุณาเลือก [ตัวเลขที่ 1] [เครื่องหมาย] และ [ตัวเลขที่ 2] ให้ครบก่อนผสมครับ!"); return; }

    let n1 = mathCurrentNumbers[mathSelectedNum1Idx], n2 = mathCurrentNumbers[mathSelectedNum2Idx], result = 0;
    if (mathSelectedOp === '+') result = n1 + n2; else if (mathSelectedOp === '-') result = Math.abs(n1 - n2); else if (mathSelectedOp === '×') result = n1 * n2; else if (mathSelectedOp === '÷') { if (n2 === 0 || n1 % n2 !== 0) { alert("หารไม่ลงตัวหรือไม่สามารถหารด้วย 0 ได้ครับ!"); return; } result = n1 / n2; }

    let firstIdx = Math.max(mathSelectedNum1Idx, mathSelectedNum2Idx), secondIdx = Math.min(mathSelectedNum1Idx, mathSelectedNum2Idx);
    mathCurrentNumbers.splice(firstIdx, 1); mathCurrentNumbers.splice(secondIdx, 1); mathCurrentNumbers.push(result);
    resetMathSelection(); renderMathBoard(); checkMathWinCondition();
}

function checkMathWinCondition() {
    if (mathCurrentNumbers[0] === mathTargetNumber) {
        if (mathCurrentNumbers.length === 1) {
            setTimeout(() => {
                alert("🎉 ถูกต้องแล้วเก่งมากครับ! ใช้ตัวเลขครบทุกตัวและผสมได้เป้าหมายพอดี!");
                if (mathQuestionIndex >= 5) triggerMathCompletionModal(); else { mathQuestionIndex++; generateMathPuzzle(); }
            }, 150);
        } else { setTimeout(() => { alert(`💡 ได้ผลลัพธ์เท่ากับ ${mathTargetNumber} แล้วก็จริง... แต่ยังเหลือตัวเลขอีก ${mathCurrentNumbers.length - 1} ตัว!\n\nกติกาบังคับให้ต้องใช้ตัวเลข "ครบทุกตัว" ถึงจะผ่านนะครับ ลองผสมต่อดูนะ!`); }, 100); }
    }
}

function resetMathSelection() { mathSelectedNum1Idx = null; mathSelectedOp = null; mathSelectedNum2Idx = null; }
function resetCurrentMathQuestion() { mathCurrentNumbers = [...mathInitialNumbers]; resetMathSelection(); renderMathBoard(); }
function skipMathQuestion() { if (confirm("ต้องการข้ามข้อนี้ใช่หรือไม่?")) generateMathPuzzle(); }

function triggerMathCompletionModal() {
    totalStars += 1; saveUserStars(); addEXPToUser(100); incrementTodayRounds(); mathQuestionIndex = 1;
    document.getElementById("summary-total-count").innerText = "5 / 5 ข้อ";
    document.getElementById("summary-stars-earned").innerText = "⭐ 1 ดวง";
    document.getElementById("summary-stars-earned").className = "text-sm text-amber-500 font-bold";
    document.getElementById("summary-exp-earned").innerText = "+100 EXP ✨";
    document.getElementById("summary-saved-badge").innerText = "✅ บันทึกดาวสะสมและแจ้งเตือนคุณพ่อคุณแม่เรียบร้อย!";
    document.getElementById("summary-saved-badge").className = "bg-emerald-50 text-emerald-800 text-xs font-bold p-2.5 rounded-xl border border-emerald-200";
    document.getElementById("completion-subtitle").innerText = `🎉 เล่นเกมคิดเลขผสมคำตอบถูกครบ 5 ข้อแล้ว!`;
    document.getElementById("completion-modal").classList.remove("hidden");
    sendInAppNotification('COMPLETED_MATH', { diff: mathDifficulty, score: 5 });
}

let selectedStoryHero = 'พูนและเพลิน', selectedStoryTheme = 'อวกาศ', selectedStoryPet = 'หุ่นยนต์จิ๋ว', selectedStoryLang = 'TH', generatedStoryData = null, currentStoryPage = 0, cameraMediaStream = null;

function initStoryTabState() { selectStoryLang('TH'); selectStoryHero(currentUser === 'เพลิน' ? 'เพลิน' : 'พูน'); selectStoryTheme('อวกาศ'); selectStoryPet('หุ่นยนต์จิ๋ว'); openStoryCreator(); }
function openStoryCreator() { closeCameraForStory(); document.getElementById("story-creator-box").classList.remove("hidden"); document.getElementById("story-reader-box").classList.add("hidden"); document.getElementById("story-reader-box").classList.remove("flex"); }

function selectStoryLang(lang) {
    selectedStoryLang = lang;
    document.getElementById("story-lang-th").className = lang === 'TH' ? "flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs transition" : "flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 transition";
    document.getElementById("story-lang-en").className = lang === 'EN' ? "flex-1 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs transition" : "flex-1 py-1.5 rounded-lg text-xs font-bold text-slate-700 transition";
}

function selectStoryHero(hero) {
    selectedStoryHero = hero;
    const normal = "p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex flex-col items-center transition", active = "p-2.5 rounded-2xl border-2 border-indigo-500 bg-indigo-50 flex flex-col items-center transition shadow-xs scale-105";
    document.getElementById("story-hero-poon").className = hero === 'พูน' ? active : normal;
    document.getElementById("story-hero-ploern").className = hero === 'เพลิน' ? active : normal;
    document.getElementById("story-hero-both").className = hero === 'พูนและเพลิน' ? active : normal;
}

function selectStoryTheme(theme) {
    selectedStoryTheme = theme;
    const normal = "p-2 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-bold text-slate-700", active = "p-2 rounded-xl border-2 border-indigo-500 bg-indigo-50 flex items-center gap-2 text-xs font-bold text-indigo-900 shadow-xs scale-105";
    document.getElementById("story-theme-space").className = theme === 'อวกาศ' ? active : normal;
    document.getElementById("story-theme-magic").className = theme === 'เมืองเวทมนตร์' ? active : normal;
    document.getElementById("story-theme-dino").className = theme === 'ดินแดนไดโนเสาร์' ? active : normal;
    document.getElementById("story-theme-ocean").className = theme === 'เมืองใต้ทะเล' ? active : normal;
}

function selectStoryPet(pet) {
    selectedStoryPet = pet;
    const normal = "p-2 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center text-xs font-bold text-slate-700", active = "p-2 rounded-xl border-2 border-indigo-500 bg-indigo-50 flex flex-col items-center transition shadow-xs scale-105";
    document.getElementById("story-pet-dog").className = pet === 'เจ้าหมาน้อย' ? active : normal;
    document.getElementById("story-pet-robot").className = pet === 'หุ่นยนต์จิ๋ว' ? active : normal;
    document.getElementById("story-pet-cat").className = pet === 'เจ้าแมวเหมียว' ? active : normal;
}

async function generateAIStory() {
    if (!isParentUser && isDailyLimitEnabled && todayPlayedRounds >= dailyLimitRounds) { alert(`🛑 หนูเล่นครบโควต้ารวม ${dailyLimitRounds} รอบประจำวันแล้วครับ! พักสายตาก่อนแล้วมาเล่นใหม่พรุ่งนี้นะครับ 🎈`); return; }
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) { alert("กรุณาให้คุณพ่อคุณแม่ช่วยตั้งค่า Gemini API Key ให้ก่อนสร้างนิทานครับ!"); return; }

    const btnGen = document.getElementById("btn-generate-story");
    btnGen.disabled = true; btnGen.innerHTML = `<span class="spinner"></span> Gemini AI กำลังแต่งเกมนิทาน...`;

    let langInstruction = selectedStoryLang === 'EN' ? "Write the story in SIMPLE EASY ENGLISH for kids." : "แต่งนิทานเป็นภาษาไทยที่อ่านง่าย สนุกสนานสำหรับเด็ก";
    const prompt = `แต่งนิทานสนุกๆ สไตล์ Scavenger Hunt ตามล่าหาไอเทมจริงรอบบ้าน ความยาว 10 หน้า พอดีสำหรับเด็ก:
ตัวละครหลัก: ${selectedStoryHero} | สถานที่ผจญภัย: ${selectedStoryTheme} | เพื่อนร่วมทาง: ${selectedStoryPet} | ภาษา: ${langInstruction}
กฎสำคัญสำหรับระบบถ่ายรูปหาของ (Item Hunt):
- ในหน้า 2, 4, 6, 8 จะต้องเป็นหน้าที่มี "ภารกิจถ่ายรูปหาไอเทมจริงรอบบ้าน"
- ให้สุ่มสิ่งของในบ้านที่มีความหลากหลาย จากคลังตัวอย่างต่อไปนี้: [แก้วน้ำ, ช้อน, หมอน, ผ้าเช็ดหน้า, ร่ม, หูฟัง, นาฬิกา, ขวดน้ำ, หวี, ส้ม, กล้วย, แอปเปิ้ล, ขนม, กล่องนม, ดินสอ, ยางลบ, ไม้บรรทัด, สีไม้, สมุด, กรรไกรป้าน, รองเท้า, ถุงเท้า, หมวก, แว่นตา, ตุ๊กตา, รถของเล่น, บล็อกตัวต่อ, ลูกบอล]
- ห้ามเลือกสิ่งของซ้ำกัน
- กำหนดค่า "targetItemTH" (ชื่อภาษาไทย) และ "targetItemEN" (ชื่อภาษาอังกฤษ)
ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น (ห้ามมี markdown):
{"title": "ชื่อเรื่องนิทาน", "pages": [{"page": 1, "text": "...", "emoji": "🚀"}, {"page": 2, "text": "...", "emoji": "🔍", "isItemHunt": true, "targetItemTH": "แก้วน้ำ", "targetItemEN": "water cup"}]}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.85 } }) });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        generatedStoryData = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());
        currentStoryPage = 0; renderStoryPage();
        document.getElementById("story-creator-box").classList.add("hidden");
        document.getElementById("story-reader-box").classList.remove("hidden");
        document.getElementById("story-reader-box").classList.add("flex");
    } catch (error) { alert("ไม่สามารถสร้างนิทานได้: " + (error.message || "กรุณาแจ้งพ่อนะหรือแม่พัดให้ตรวจสอบการตั้งค่าครับ")); } 
    finally { btnGen.disabled = false; btnGen.innerHTML = `✨ เนรมิตเกมนิทานถ่ายรูปส่องของ 📸`; }
}

function renderStoryPage() {
    if (!generatedStoryData || !generatedStoryData.pages) return;
    const pageData = generatedStoryData.pages[currentStoryPage];
    document.getElementById("story-title-display").innerText = generatedStoryData.title || "นิทาน AI";
    document.getElementById("story-page-indicator").innerText = `หน้า ${currentStoryPage + 1} / ${generatedStoryData.pages.length}`;
    document.getElementById("story-text-display").innerText = pageData.text;
    document.getElementById("story-image-emoji").innerText = pageData.emoji || "📖";

    const btnPrev = document.getElementById("btn-prev-story"), btnNext = document.getElementById("btn-next-story"), missionBox = document.getElementById("story-item-mission-box");
    btnPrev.disabled = currentStoryPage === 0; btnPrev.style.opacity = currentStoryPage === 0 ? "0.5" : "1";

    if (pageData.isItemHunt && !pageData.isPassed) {
        document.getElementById("story-item-target-text").innerText = selectedStoryLang === 'EN' ? `Mission Target: ${pageData.targetItemEN}` : `ต้องถ่ายรูป: ${pageData.targetItemTH}`;
        missionBox.classList.remove("hidden"); btnNext.classList.add("hidden"); 
    } else {
        missionBox.classList.add("hidden"); btnNext.classList.remove("hidden");
        if (currentStoryPage === generatedStoryData.pages.length - 1) {
            btnNext.innerText = selectedStoryLang === 'EN' ? "Victory & Finish! 🏆" : "พิชิตเกมอ่านจบแล้ว! 🏆";
            btnNext.className = "bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-xs flex items-center gap-1 animate-bounce";
        } else {
            btnNext.innerText = selectedStoryLang === 'EN' ? "Next →" : "ถัดไป →";
            btnNext.className = "bg-indigo-600 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-xs flex items-center gap-1";
        }
    }
}

async function startCameraForStory() {
    const pageData = generatedStoryData.pages[currentStoryPage];
    document.getElementById("camera-target-name").innerText = selectedStoryLang === 'EN' ? pageData.targetItemEN : pageData.targetItemTH;
    document.getElementById("story-reader-box").classList.add("hidden");
    document.getElementById("story-camera-box").classList.remove("hidden");
    document.getElementById("story-camera-box").classList.add("flex");
    try {
        cameraMediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        document.getElementById("camera-stream").srcObject = cameraMediaStream;
    } catch (err) { alert("ไม่สามารถเปิดกล้องได้ กรุณากดอนุญาตให้สิทธิ์ใช้งานกล้องกับแอปพลิเคชันครับ"); closeCameraForStory(); }
}

function closeCameraForStory() {
    if (cameraMediaStream) { cameraMediaStream.getTracks().forEach(track => track.stop()); cameraMediaStream = null; }
    const camBox = document.getElementById("story-camera-box");
    if (camBox) { camBox.classList.add("hidden"); camBox.classList.remove("flex"); }
    const readerBox = document.getElementById("story-reader-box");
    if (readerBox && generatedStoryData) readerBox.classList.remove("hidden");
}

async function captureAndAnalyzeStoryImage() {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (!apiKey) { alert("กรุณาแจ้งพ่อนะหรือแม่พัดให้ช่วยตั้งค่า Gemini API Key ก่อนครับ"); return; }

    const videoEl = document.getElementById("camera-stream"), btnPhoto = document.getElementById("btn-take-photo"), loadingBox = document.getElementById("camera-loading");
    btnPhoto.disabled = true; btnPhoto.classList.add("opacity-50"); loadingBox.classList.remove("hidden");

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth || 640; canvas.height = videoEl.videoHeight || 480;
    canvas.getContext("2d").drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const base64Data = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
    const targetItemName = generatedStoryData.pages[currentStoryPage].targetItemTH;

    const prompt = `วิเคราะห์รูปภาพนี้อย่างละเอียดและตรงไปตรงมา: ในรูปภาพนี้มีสิ่งของหรือวัตถุที่ตรงกับ หรือใกล้เคียงกับคำว่า "${targetItemName}" หรือไม่? ตอบกลับเป็น JSON รูปแบบนี้เท่านั้น: {"found": true/false, "detected_object": "ระบุสิ่งที่เห็นในภาพเป็นภาษาไทย", "comment": "คำชมเชยสั้นๆ เหมาะสำหรับเด็ก"}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Data } }] }] }) });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim());

        if (result.found) {
            alert(`🎉 ถูกต้องแล้วครับเก่งมากๆ! AI ตรวจเจอ ${result.detected_object} แล้ว!\n\n💬 ${result.comment}`);
            generatedStoryData.pages[currentStoryPage].isPassed = true;
            closeCameraForStory(); currentStoryPage++; renderStoryPage();
        } else { alert(`❌ AI เห็นเป็น "${result.detected_object || 'ยังไม่ชัดเจน'}" ยังไม่ตรงกับ ${targetItemName} ครับ ลองขยับส่องให้ชัดเจนแล้วถ่ายใหม่อีกครั้งนะ!`); }
    } catch (err) { alert("เกิดข้อผิดพลาดในการวิเคราะห์รูปภาพ: " + (err.message || "กรุณาตรวจสอบการเชื่อมต่อ")); } 
    finally { btnPhoto.disabled = false; btnPhoto.classList.remove("opacity-50"); loadingBox.classList.add("hidden"); }
}

function nextStoryPage() {
    if (!generatedStoryData) return;
    if (currentStoryPage < generatedStoryData.pages.length - 1) { currentStoryPage++; renderStoryPage(); } 
    else { triggerStoryCompletionModal(); }
}

function prevStoryPage() { if (currentStoryPage > 0) { currentStoryPage--; renderStoryPage(); } }

function speakStoryPageText() {
    if (!generatedStoryData || !generatedStoryData.pages) return;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(generatedStoryData.pages[currentStoryPage].text);
        utterance.lang = selectedStoryLang === 'EN' ? 'en-US' : 'th-TH'; utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
    }
}

function triggerStoryCompletionModal() {
    incrementTodayRounds(); totalStars += 1; saveUserStars(); addEXPToUser(150);
    document.getElementById("summary-stars-earned").innerText = "⭐ 1 ดวง";
    document.getElementById("summary-stars-earned").className = "text-sm text-amber-500 font-bold";
    document.getElementById("summary-exp-earned").innerText = `+150 EXP ✨ (พิชิตภารกิจส่องถ่ายรูปสำเร็จครบหมด)`;
    document.getElementById("summary-saved-badge").innerText = "✅ บันทึกดาวสะสมและแจ้งเตือนคุณพ่อคุณแม่เรียบร้อย!";
    document.getElementById("summary-saved-badge").className = "bg-emerald-50 text-emerald-800 text-xs font-bold p-2.5 rounded-xl border border-emerald-200";

    sendInAppNotification('COMPLETED_STORY', { title: generatedStoryData.title, lang: selectedStoryLang });
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const msg = selectedStoryLang === 'EN' ? `Awesome job ${currentUser || ''}! You found all items and completed the adventure story!` : `เก่งมากเลยครับ ${currentUser || ''} ถ่ายรูปส่องตามหาไอเทมครบทุกภารกิจ พิชิตเกมนิทานจบ 10 หน้า รับไปเลย 1 ดาว`;
        const utterance = new SpeechSynthesisUtterance(msg); utterance.lang = selectedStoryLang === 'EN' ? 'en-US' : 'th-TH';
        window.speechSynthesis.speak(utterance);
    }

    document.getElementById("summary-total-count").innerText = "พิชิตเกมนิทานถ่ายรูป AI!";
    document.getElementById("completion-subtitle").innerText = `🎉 น้อง${currentUser || 'เด็กๆ'} ถ่ายรูปหาไอเทมอ่านนิทานเรื่อง "${generatedStoryData.title}" จบเรียบร้อย!`;
    document.getElementById("completion-modal").classList.remove("hidden");
}
