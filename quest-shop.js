function saveParentQuestsToStorage() {
    if (isFirebaseActive && dbRefParentQuests) {
        const { set } = window.firebaseModules;
        set(dbRefParentQuests, parentQuestsList);
    } else {
        localStorage.setItem("kids_parent_quests", JSON.stringify(parentQuestsList));
    }
    renderParentQuestsList();
}

function createNewParentQuest() {
    const title = document.getElementById("new-quest-title").value.trim();
    const stars = parseInt(document.getElementById("new-quest-stars").value, 10);
    const assignPoon = document.getElementById("quest-assign-poon").checked;
    const assignPloern = document.getElementById("quest-assign-ploern").checked;

    if (!title || isNaN(stars) || stars <= 0) { alert("กรุณากรอกชื่อภารกิจและจำนวนดาวให้ถูกต้องครับ"); return; }

    const assignees = [];
    if (assignPoon) assignees.push("พูน");
    if (assignPloern) assignees.push("เพลิน");

    const newQuest = { id: Date.now().toString(), title: title, stars: stars, assignees: assignees, lastAssignedAt: Date.now() };
    parentQuestsList.push(newQuest);
    saveParentQuestsToStorage();

    document.getElementById("new-quest-title").value = "";
    document.getElementById("new-quest-stars").value = "";
    alert(`สร้างภารกิจ "${title}" สำเร็จ!`);
}

function deleteParentQuest(id) {
    const quest = parentQuestsList.find(q => q.id === id);
    if (!quest) return;

    if (confirm(`คุณต้องการลบภารกิจ "${quest.title}" ใช่หรือไม่?`)) {
        parentQuestsList = parentQuestsList.filter(q => q.id !== id);
        if (isFirebaseActive && dbRefNotify) {
            const { ref, remove } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            notificationsList.forEach(n => {
                if (n.type === 'SUBMIT_QUEST' && n.details && n.details.questTitle === quest.title) {
                    remove(ref(db, `kids_notifications/${n.id || n.timestamp}`));
                }
            });
        } else {
            notificationsList = notificationsList.filter(n => !(n.type === 'SUBMIT_QUEST' && n.details && n.details.questTitle === quest.title));
        }
        saveParentQuestsToStorage();
    }
}

function openAssignModal(questId) {
    const quest = parentQuestsList.find(q => q.id === questId);
    if (!quest) return;
    document.getElementById("assign-quest-id").value = quest.id;
    document.getElementById("assign-quest-title").innerText = quest.title;

    const assignees = quest.assignees || ["พูน", "เพลิน"];
    document.getElementById("reassign-poon").checked = assignees.includes("พูน");
    document.getElementById("reassign-ploern").checked = assignees.includes("เพลิน");
    document.getElementById("assign-quest-modal").classList.remove("hidden");
}

function closeAssignModal() { document.getElementById("assign-quest-modal").classList.add("hidden"); }

function saveQuestAssignment() {
    const id = document.getElementById("assign-quest-id").value;
    const quest = parentQuestsList.find(q => q.id === id);
    if (!quest) return;

    const assignPoon = document.getElementById("reassign-poon").checked;
    const assignPloern = document.getElementById("reassign-ploern").checked;

    const newAssignees = [];
    if (assignPoon) newAssignees.push("พูน");
    if (assignPloern) newAssignees.push("เพลิน");

    quest.assignees = newAssignees;
    quest.lastAssignedAt = Date.now();

    if (isFirebaseActive && dbRefNotify) {
        const { ref, remove } = window.firebaseModules;
        const db = window.firebaseModules.getDatabase();
        notificationsList.forEach(n => {
            if (n.type === 'SUBMIT_QUEST' && n.details && n.details.questTitle === quest.title) {
                remove(ref(db, `kids_notifications/${n.id || n.timestamp}`));
            }
        });
    } else {
        notificationsList = notificationsList.filter(n => !(n.type === 'SUBMIT_QUEST' && n.details && n.details.questTitle === quest.title));
    }
    saveParentQuestsToStorage();
    closeAssignModal();
    alert(`แจกภารกิจ "${quest.title}" ให้เด็กๆ เรียบร้อยแล้ว! ✨`);
}

function renderParentQuestsList() {
    const container = document.getElementById("parent-quests-list");
    if (!container) return;

    let filteredQuests = parentQuestsList;
    if (!isParentUser && currentUser) {
        filteredQuests = parentQuestsList.filter(q => {
            const assignees = q.assignees || ["พูน", "เพลิน"];
            const isForUser = assignees.includes(currentUser);
            if (!isForUser) return false;

            const existingPending = notificationsList.find(n => 
                n.type === 'SUBMIT_QUEST' && n.user === currentUser && n.details && n.details.questTitle === q.title && n.status === 'pending'
            );
            if (existingPending) return true;

            const lastApproved = notificationsList.find(n => 
                n.type === 'SUBMIT_QUEST' && n.user === currentUser && n.details && n.details.questTitle === q.title && n.status === 'approved'
            );
            if (lastApproved && q.lastAssignedAt && lastApproved.timestamp < q.lastAssignedAt) return true;
            if (lastApproved && !q.lastAssignedAt) return false;
            return true;
        });
    }

    if (!filteredQuests || filteredQuests.length === 0) {
        container.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">ยังไม่มีภารกิจค้างส่ง</div>`;
        return;
    }

    container.innerHTML = filteredQuests.map(q => {
        let actionButtonHtml = '';
        if (isParentUser) {
            actionButtonHtml = `
                <button onclick="openAssignModal('${q.id}')" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2 rounded-xl text-xs font-bold border border-indigo-200 flex items-center gap-1">🎯 Assign</button>
                <button onclick="deleteParentQuest('${q.id}')" class="bg-rose-50 text-rose-700 hover:bg-rose-100 p-2 rounded-xl text-xs font-bold border border-rose-200">🗑️ ลบ</button>
            `;
        } else {
            const existingNotify = notificationsList.find(n => n.type === 'SUBMIT_QUEST' && n.user === currentUser && n.details && n.details.questTitle === q.title && n.status === 'pending');
            if (existingNotify) {
                actionButtonHtml = `<span class="bg-amber-100 text-amber-800 font-bold py-1.5 px-2.5 rounded-xl text-[11px] border border-amber-200">⏳ รอพ่อนะ/แม่พัด ตรวจ</span>`;
            } else {
                actionButtonHtml = `<button onclick="submitParentQuestForCheck('${q.title}', ${q.stars})" class="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs shadow-xs">กดส่งภารกิจ ✨</button>`;
            }
        }
        return `
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center shadow-2xs">
                <div>
                    <div class="font-bold text-slate-800 text-xs mb-1 font-kids">${q.title}</div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">รางวัล ⭐ ${q.stars} ดวง</span>
                        <span class="text-[10px] text-slate-400 font-bold">🎯 ${q.assignees && q.assignees.length > 0 ? q.assignees.join(', ') : 'ทุกคน'}</span>
                    </div>
                </div>
                <div class="flex items-center gap-1.5">${actionButtonHtml}</div>
            </div>`;
    }).join('');
}

function submitParentQuestForCheck(questTitle, stars) {
    if (confirm(`คุณได้ทำภารกิจ "${questTitle}" เรียบร้อยแล้ว และต้องการส่งให้ พ่อนะ / แม่พัด ตรวจใช่ไหมครับ?`)) {
        sendInAppNotification('SUBMIT_QUEST', { questTitle: questTitle, starsReward: stars });
        renderParentQuestsList();
        alert(`ส่งภารกิจ "${questTitle}" ถึงพ่อนะและแม่พัดเพื่อตรวจเรียบร้อยแล้วครับ! ✨`);
    }
}

function saveRewardsToStorage() {
    if (isFirebaseActive && dbRefRewards) {
        const { set } = window.firebaseModules;
        set(dbRefRewards, rewardsList);
    } else {
        localStorage.setItem("kids_rewards_list", JSON.stringify(rewardsList));
    }
    renderRewardsList();
}

function addNewRewardItem() {
    const name = document.getElementById("new-reward-name").value.trim();
    const stars = parseInt(document.getElementById("new-reward-stars").value, 10);
    if (!name || isNaN(stars) || stars <= 0) { alert("กรุณากรอกชื่อรางวัลและจำนวนดาวให้ถูกต้องครับ"); return; }
    rewardsList.push({ id: Date.now().toString(), name: name, stars: stars });
    saveRewardsToStorage();
    document.getElementById("new-reward-name").value = "";
    document.getElementById("new-reward-stars").value = "";
    alert(`เพิ่มรางวัล "${name}" เรียบร้อยแล้ว!`);
}

function deleteRewardItem(id) {
    if (confirm("คุณต้องการลบของรางวัลนี้ใช่หรือไม่?")) {
        rewardsList = rewardsList.filter(r => r.id !== id);
        saveRewardsToStorage();
    }
}

function switchRewardTab(tab) {
    const shopBtn = document.getElementById("shop-tab-btn");
    const invBtn = document.getElementById("inventory-tab-btn");
    const shopView = document.getElementById("reward-shop-view");
    const invView = document.getElementById("reward-inventory-view");
    if (tab === 'shop') {
        shopBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition";
        invBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition";
        shopView.classList.remove("hidden"); invView.classList.add("hidden");
    } else {
        invBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs transition";
        shopBtn.className = "flex-1 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition";
        invView.classList.remove("hidden"); shopView.classList.add("hidden");
        renderUserInventory();
    }
}

function renderRewardsList() {
    const container = document.getElementById("rewards-list-container");
    if (!rewardsList || rewardsList.length === 0) {
        container.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">ยังไม่มีรายการของรางวัล</div>`;
        return;
    }
    container.innerHTML = rewardsList.map(r => `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex justify-between items-center shadow-2xs">
            <div>
                <div class="font-bold text-slate-800 text-xs font-kids">${r.name}</div>
                <div class="text-[10px] text-amber-600 font-bold">ใช้ ${r.stars} ดาว ⭐</div>
            </div>
            <div class="flex items-center gap-1.5">
                ${isParentUser ? `<button onclick="deleteRewardItem('${r.id}')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 p-2 rounded-xl text-xs font-bold border border-rose-200">🗑️ ลบ</button>` : `<button onclick="requestReward('${r.name}', ${r.stars})" class="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow-xs">กดส่งคำขอแลก ✨</button>`}
            </div>
        </div>`).join('');
}

function requestReward(rewardName, starsReq) {
    if (totalStars < starsReq) { alert(`ดาวสะสมไม่พอครับ! ต้องการ ${starsReq} ดาว (ตอนนี้มี ${totalStars} ดาว)`); return; }
    if (confirm(`คุณต้องการใช้ ${starsReq} ดาว เพื่อส่งคำขอแลก "${rewardName}" ถึงพ่อนะ และ แม่พัด ใช่ไหมครับ?`)) {
        totalStars -= starsReq;
        saveUserStars();
        sendInAppNotification('REQUEST_REWARD', { rewardName: rewardName, starsUsed: starsReq });
        alert(`ส่งคำขอแลก "${rewardName}" ถึงพ่อนะและแม่พัดแล้วครับ! รอคุณพ่อคุณแม่ออนุมัตินะครับ ✨`);
    }
}

function addRewardToUserInventory(userName, rewardName) {
    const item = { invId: Date.now().toString(), name: rewardName, date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), timestamp: Date.now() };
    if (isFirebaseActive) {
        const { push, ref } = window.firebaseModules;
        const db = window.firebaseModules.getDatabase();
        push(ref(db, `user_inventory/${userName}`), item);
    } else {
        const localKey = `user_inventory_${userName}`;
        const currentInv = JSON.parse(localStorage.getItem(localKey) || "[]");
        currentInv.unshift(item);
        localStorage.setItem(localKey, JSON.stringify(currentInv));
    }
    loadUserStars();
}

function deleteInventoryItemDirectly(ownerChild, invId) {
    const targetItem = userInventoryList.find(x => x.invId === invId);
    const actualOwner = ownerChild || (targetItem ? targetItem.owner : currentUser);
    if (!actualOwner) return;

    if (confirm(`ลบของรางวัลนี้ออกจากกระเป๋าของน้อง ${actualOwner} ใช่ไหมครับ?`)) {
        const localIdToRemove = targetItem ? (targetItem.originalInvId || invId) : invId;
        const localKey = `user_inventory_${actualOwner}`;
        let currentInv = JSON.parse(localStorage.getItem(localKey) || "[]");
        currentInv = currentInv.filter(x => x.invId !== localIdToRemove && x.invId !== invId);
        localStorage.setItem(localKey, JSON.stringify(currentInv));
        userInventoryList = userInventoryList.filter(x => x.invId !== invId);
        renderUserInventory();
        if (isFirebaseActive) {
            const { ref, remove } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            remove(ref(db, `user_inventory/${actualOwner}/${invId}`));
        }
    }
}

function useInventoryItem(ownerChild, invId) {
    const targetItem = userInventoryList.find(x => x.invId === invId);
    const actualOwner = ownerChild || (targetItem ? targetItem.owner : currentUser);
    if (!actualOwner) return;

    if (confirm("คุณใช้งานรางวัลนี้แล้วใช่ไหมครับ?")) {
        const localIdToRemove = targetItem ? (targetItem.originalInvId || invId) : invId;
        const localKey = `user_inventory_${actualOwner}`;
        let currentInv = JSON.parse(localStorage.getItem(localKey) || "[]");
        currentInv = currentInv.filter(x => x.invId !== localIdToRemove && x.invId !== invId);
        localStorage.setItem(localKey, JSON.stringify(currentInv));
        userInventoryList = userInventoryList.filter(x => x.invId !== invId);
        renderUserInventory();
        if (isFirebaseActive) {
            const { ref, remove } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            remove(ref(db, `user_inventory/${actualOwner}/${invId}`));
        }
    }
}

function renderUserInventory() {
    const container = document.getElementById("inventory-list-container");
    if (!container) return;
    if (!userInventoryList || userInventoryList.length === 0) {
        container.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">ยังไม่มีของรางวัลในกระเป๋า</div>`;
        return;
    }
    container.innerHTML = userInventoryList.map(item => `
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 flex justify-between items-center shadow-2xs">
            <div>
                <div class="font-bold text-emerald-950 text-xs font-kids">${item.name}</div>
                <div class="text-[9px] font-bold text-emerald-700">${isParentUser ? `<span class="text-indigo-800 font-bold">🎒 ของ: น้อง${item.owner} | </span>` : ''}อนุมัติเมื่อ ${item.date}</div>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="useInventoryItem('${item.owner}', '${item.invId}')" class="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1 px-2.5 rounded-xl text-[11px] shadow-2xs">✨ ใช้แล้ว</button>
                ${isParentUser ? `<button onclick="deleteInventoryItemDirectly('${item.owner}', '${item.invId}')" class="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold p-1 rounded-xl text-[11px] border border-rose-200">🗑️ ลบ</button>` : ''}
            </div>
        </div>`).join('');
}

function sendInAppNotification(type, details) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const newNotify = { type: type, user: currentUser || 'ผู้ปกครอง', subject: subjectMode === 'EN' ? 'ภาษาอังกฤษ 🇬🇧' : 'ภาษาไทย 🇹🇭', details: details, status: 'pending', time: `${dateStr} • ${timeStr}`, timestamp: Date.now() };

    if (isFirebaseActive && dbRefNotify) {
        const { push } = window.firebaseModules;
        push(dbRefNotify, newNotify);
    } else {
        notificationsList.unshift(newNotify);
        renderNotifications();
    }
}

function deleteNotification(notifyId) {
    if (confirm("ต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?")) {
        notificationsList = notificationsList.filter(n => (n.id || n.timestamp.toString()) !== notifyId.toString());
        renderNotifications();
        if (isFirebaseActive && dbRefNotify) {
            const { ref, remove } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            remove(ref(db, `kids_notifications/${notifyId}`));
        }
    }
}

function clearAllNotifications() {
    if (confirm("คุณต้องการลบประวัติคำขอและการแจ้งเตือนทั้งหมดใช่หรือไม่?")) {
        notificationsList = [];
        renderNotifications();
        if (isFirebaseActive && dbRefNotify) {
            const { set } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            set(dbRefNotify, null);
        }
    }
}

function autoCleanupOldNotifications() {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const oldItems = notificationsList.filter(n => (now - (n.timestamp || 0)) > TWO_DAYS_MS);
    if (oldItems.length > 0) {
        oldItems.forEach(item => {
            const itemKey = item.id || item.timestamp;
            if (isFirebaseActive) {
                const { ref, remove } = window.firebaseModules;
                const db = window.firebaseModules.getDatabase();
                remove(ref(db, `kids_notifications/${itemKey}`));
            }
        });
        notificationsList = notificationsList.filter(n => (now - (n.timestamp || 0)) <= TWO_DAYS_MS);
    }
}

function renderNotifications() {
    autoCleanupOldNotifications();
    const listEl = document.getElementById("notify-list");
    const parentActionsBox = document.getElementById("notify-parent-actions");

    if (parentActionsBox) {
        if (isParentUser && notificationsList.length > 0) parentActionsBox.classList.remove("hidden");
        else parentActionsBox.classList.add("hidden");
    }

    if (!listEl) return;
    if (notificationsList.length === 0) {
        listEl.innerHTML = `<div class="text-center text-xs text-slate-400 py-8">ยังไม่มีรายการแจ้งเตือนล่าสุด</div>`;
        return;
    }

    const avatars = { 'พ่อนะ': '👨‍💼', 'แม่พัด': '👩‍💼', 'พูน': '👦', 'เพลิน': '👧' };
    listEl.innerHTML = notificationsList.map(n => {
        const isPending = n.status === 'pending';
        const itemKey = n.id || n.timestamp;
        const deleteBtnHtml = `<button onclick="deleteNotification('${itemKey}')" class="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 px-2 py-0.5 rounded-lg font-bold border border-rose-200 ml-auto active:scale-95 transition">🗑️ ลบ</button>`;

        if (n.type === 'MANUAL_STAR_ADJUST') {
            return `<div class="p-3 ${n.details.change > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'} rounded-2xl border flex items-start gap-2.5 shadow-2xs relative">
                <span class="text-2xl bg-white p-1.5 rounded-xl border border-slate-200">${avatars[n.user] || '👨‍💼'}</span>
                <div class="flex-1">
                    <div class="flex justify-between items-center mb-0.5"><span class="font-bold text-xs ${n.details.change > 0 ? 'text-emerald-950' : 'text-rose-950'} font-kids">${n.details.change > 0 ? '⭐ ปรับเพิ่มดาว!' : '🔻 ถูกลดดาว!'}</span><span class="text-[9px] font-bold text-slate-400">${n.time}</span></div>
                    <p class="text-[11px] font-bold text-slate-700">${n.user} ได้${n.details.change > 0 ? 'เพิ่มดาวให้' : 'ลดดาว'} น้อง <span class="text-indigo-800 font-bold">${n.details.childName}</span> จำนวน <span class="font-bold ${n.details.change > 0 ? 'text-emerald-600' : 'text-rose-600'}">${Math.abs(n.details.change)} ดาว</span></p>
                    <p class="text-[10px] text-slate-500 font-medium mt-0.5">เหตุผล: "${n.details.reason}"</p>
                </div>${deleteBtnHtml}</div>`;
        } else if (n.type === 'REQUEST_REWARD') {
            return `<div class="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col gap-2 shadow-2xs">
                <div class="flex items-start gap-2.5"><span class="text-2xl bg-white p-1.5 rounded-xl border border-indigo-100">${avatars[n.user] || '👦'}</span><div class="flex-1">
                    <div class="flex justify-between items-center mb-0.5"><span class="font-bold text-xs text-indigo-950 font-kids">🎁 คำขอแลกรางวัล!</span><span class="text-[9px] font-bold text-slate-400">${n.time}</span></div>
                    <p class="text-[11px] text-slate-700 font-bold">น้อง <span class="text-indigo-700 font-bold">${n.user}</span> ขอแลก: <span class="text-emerald-700 font-bold">${n.details.rewardName}</span> (ใช้ ${n.details.starsUsed} ดาว)</p>
                </div></div>
                ${isParentUser && isPending ? `
                    <div class="flex gap-1.5 mt-1 border-t border-indigo-100 pt-2">
                        <button onclick="approveReward('${itemKey}', '${n.user}', '${n.details.rewardName}', ${n.details.starsUsed}, true)" class="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-1 rounded-xl text-[11px] shadow-2xs">✅ อนุมัติรางวัล</button>
                        <button onclick="approveReward('${itemKey}', '${n.user}', '${n.details.rewardName}', ${n.details.starsUsed}, false)" class="bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 font-bold py-1 px-2.5 rounded-xl text-[11px] border border-rose-200">❌ ปฏิเสธ</button>
                    </div>` : `
                    <div class="flex justify-between items-center text-[10px] font-bold bg-white/80 p-1 rounded-lg ${n.status === 'approved' ? 'text-emerald-700' : n.status === 'rejected' ? 'text-rose-600' : 'text-indigo-800'}">
                        <span>Status: ${n.status === 'approved' ? '✅ อนุมัติและย้ายไปกระเป๋าแล้ว' : n.status === 'rejected' ? '❌ คำขอถูกปฏิเสธ' : '⏳ รอพ่อนะ/แม่พัด อนุมัติ'}</span>${deleteBtnHtml}
                    </div>`}</div>`;
        } else if (n.type === 'SUBMIT_QUEST') {
            return `<div class="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col gap-2 shadow-2xs">
                <div class="flex items-start gap-2.5"><span class="text-2xl bg-white p-1.5 rounded-xl border border-indigo-100">${avatars[n.user] || '👦'}</span><div class="flex-1">
                    <div class="flex justify-between items-center mb-0.5"><span class="font-bold text-xs text-indigo-950 font-kids">📋 ส่งตรวจภารกิจ!</span><span class="text-[9px] font-bold text-slate-400">${n.time}</span></div>
                    <p class="text-[11px] text-slate-700 font-bold">น้อง <span class="text-indigo-700 font-bold">${n.user}</span> ส่งภารกิจ: <span class="text-emerald-700 font-bold">${n.details.questTitle}</span> (รับ ⭐ ${n.details.starsReward} ดาว)</p>
                </div></div>
                ${isParentUser && isPending ? `
                    <div class="flex gap-1.5 mt-1 border-t border-indigo-100 pt-2">
                        <button onclick="approveParentQuest('${itemKey}', '${n.user}', ${n.details.starsReward}, true)" class="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-1 rounded-xl text-[11px] shadow-2xs">✅ ตรวจผ่าน (แจก ⭐ ${n.details.starsReward} ดาว)</button>
                        <button onclick="approveParentQuest('${itemKey}', '${n.user}', ${n.details.starsReward}, false)" class="bg-rose-50 text-rose-700 hover:bg-rose-100 active:scale-95 font-bold py-1 px-2.5 rounded-xl text-[11px] border border-rose-200">❌ ไม่ผ่าน</button>
                    </div>` : `
                    <div class="flex justify-between items-center text-[10px] font-bold bg-white/80 p-1 rounded-lg ${n.status === 'approved' ? 'text-emerald-700' : n.status === 'rejected' ? 'text-rose-600' : 'text-indigo-800'}">
                        <span>Status: ${n.status === 'approved' ? '✅ ตรวจผ่านแล้ว! ได้รับดาวเรียบร้อย' : n.status === 'rejected' ? '❌ ไม่ผ่าน' : '⏳ รอพ่อนะ/แม่พัด ตรวจ'}</span>${deleteBtnHtml}
                    </div>`}</div>`;
        } else {
            return `<div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5 shadow-2xs">
                <span class="text-2xl bg-white p-1.5 rounded-xl border border-slate-200">${avatars[n.user] || '👦'}</span><div class="flex-1">
                <div class="flex justify-between items-center mb-0.5"><span class="font-bold text-xs text-slate-800 font-kids">${n.user} ทำกิจกรรมสำเร็จ! 🎉</span><span class="text-[9px] font-bold text-slate-400">${n.time}</span></div>
                <p class="text-[11px] text-slate-600 font-medium">ได้รับ <span class="font-bold text-amber-500">⭐ 1 ดวง</span></p></div>${deleteBtnHtml}</div>`;
        }
    }).join('');
}

function approveParentQuest(notifyId, userName, starsReward, isApproved) {
    if (isApproved) {
        if (isFirebaseActive) {
            const { ref, get, set } = window.firebaseModules;
            const db = window.firebaseModules.getDatabase();
            const userStarRef = ref(db, `user_stars/${userName}`);
            get(userStarRef).then(snapshot => { set(userStarRef, (snapshot.val() || 0) + starsReward); });
            const userExpRef = ref(db, `user_exp/${userName}`);
            get(userExpRef).then(snapshot => { set(userExpRef, (snapshot.val() || 0) + (starsReward * 100)); });
        } else {
            const localStarKey = `total_stars_${userName}`;
            localStorage.setItem(localStarKey, (parseInt(localStorage.getItem(localStarKey) || "0", 10) + starsReward).toString());
            const localExpKey = `user_exp_${userName}`;
            localStorage.setItem(localExpKey, (parseInt(localStorage.getItem(localExpKey) || "0", 10) + (starsReward * 100)).toString());
            if (userName === currentUser) {
                totalStars += starsReward;
                document.getElementById("score").innerText = totalStars;
                currentChildEXP += (starsReward * 100);
                updateUserLevelAndAvatarDisplay();
            }
        }
        alert(`ตรวจผ่านแล้ว! เพิ่ม ⭐ ${starsReward} ดาว และ +${starsReward * 100} EXP ให้น้อง ${userName} เรียบร้อยครับ`);
    } else { alert(`ปฏิเสธภารกิจเรียบร้อยแล้ว`); }

    if (isFirebaseActive && dbRefNotify) {
        const { ref, update } = window.firebaseModules;
        const db = window.firebaseModules.getDatabase();
        update(ref(db, `kids_notifications/${notifyId}`), { status: isApproved ? 'approved' : 'rejected' });
    } else {
        const item = notificationsList.find(x => x.id === notifyId || x.timestamp.toString() === notifyId.toString());
        if (item) item.status = isApproved ? 'approved' : 'rejected';
        renderNotifications(); renderParentQuestsList();
    }
}

function approveReward(notifyId, userName, rewardName, starsUsed, isApproved) {
    if (isApproved) {
        addRewardToUserInventory(userName, rewardName);
        alert(`อนุมัติรางวัล "${rewardName}" ให้น้อง ${userName} เรียบร้อยแล้ว! (ย้ายเข้ากระเป๋าของน้องแล้ว)`);
    } else { alert(`ปฏิเสธคำขอเรียบร้อยแล้ว`); }

    if (isFirebaseActive && dbRefNotify) {
        const { ref, update } = window.firebaseModules;
        const db = window.firebaseModules.getDatabase();
        update(ref(db, `kids_notifications/${notifyId}`), { status: isApproved ? 'approved' : 'rejected' });
    } else {
        const item = notificationsList.find(x => x.id === notifyId || x.timestamp.toString() === notifyId.toString());
        if (item) item.status = isApproved ? 'approved' : 'rejected';
        renderNotifications();
    }
}

function adjustChildStars(isAdding) {
    const targetChild = document.getElementById("manage-star-child").value;
    const starCount = parseInt(document.getElementById("manage-star-count").value, 10);
    const reason = document.getElementById("manage-star-reason").value.trim() || (isAdding ? "รางวัลพิเศษ" : "ถูกหักดาว");

    if (isNaN(starCount) || starCount <= 0) { alert("กรุณากรอกจำนวนดาวให้ถูกต้องครับ"); return; }
    const changeAmount = isAdding ? starCount : -starCount;

    if (isFirebaseActive) {
        const { ref, get, set } = window.firebaseModules;
        const db = window.firebaseModules.getDatabase();
        const starRef = ref(db, `user_stars/${targetChild}`);
        get(starRef).then(snapshot => {
            const newStars = Math.max(0, (snapshot.val() || 0) + changeAmount);
            set(starRef, newStars);
            sendInAppNotification('MANUAL_STAR_ADJUST', { childName: targetChild, change: changeAmount, reason: reason });
            alert(`${isAdding ? 'เพิ่ม' : 'ลด'}ดาวให้น้อง ${targetChild} จำนวน ${starCount} ดวง เรียบร้อยแล้ว! (ดาวคงเหลือ: ${newStars})`);
        });
    } else {
        const localKey = `total_stars_${targetChild}`;
        const newStars = Math.max(0, parseInt(localStorage.getItem(localKey) || "0", 10) + changeAmount);
        localStorage.setItem(localKey, newStars.toString());
        if (targetChild === currentUser) { totalStars = newStars; document.getElementById("score").innerText = totalStars; }
        sendInAppNotification('MANUAL_STAR_ADJUST', { childName: targetChild, change: changeAmount, reason: reason });
        alert(`${isAdding ? 'เพิ่ม' : 'ลด'}ดาวให้น้อง ${targetChild} จำนวน ${starCount} ดวง เรียบร้อยแล้ว! (ดาวคงเหลือ: ${newStars})`);
    }
    document.getElementById("manage-star-count").value = "";
    document.getElementById("manage-star-reason").value = "";
}

function openNotifyModal() {
    document.getElementById("notify-badge").classList.add("hidden");
    document.getElementById("notify-dot").classList.add("hidden");
    renderNotifications();
    document.getElementById("notify-modal").classList.remove("hidden");
}
function closeNotifyModal() { document.getElementById("notify-modal").classList.add("hidden"); }
