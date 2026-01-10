console.log("🚀 ЗАПУСК MAIN.JS v6.5 (FIX: SYNTAX ERROR)...");

// 1. FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyC9yg8btLOjJXAa36S785xsopsbf6Tgn_8",
    authDomain: "base-73318.firebaseapp.com",
    projectId: "base-73318",
    storageBucket: "base-73318.firebasestorage.app",
    messagingSenderId: "977548673552",
    appId: "1:977548673552:web:68bc3212e280f055a70095",
    measurementId: "G-CEZJ84T1KC"
};

let db = null;
let auth = null;
let userId = null;

try {
    if (typeof firebase !== 'undefined') {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        auth = firebase.auth();
        console.log("✅ FIREBASE OK");

        auth.signInAnonymously().catch(console.error);
        auth.onAuthStateChanged((user) => {
            if (user) {
                userId = user.uid;
                const el = document.getElementById('ui-user-id');
                if (el) el.value = userId;

                checkMail();

                // 🔥 ОБНОВЛЯЕМ ВРЕМЯ ВХОДА В КЛАНЕ
                if (st.clanId) {
                    db.collection('clans').doc(st.clanId).update({
                        [`membersInfo.${userId}.n`]: st.nickname, // Обновляем ник (если сменил)
                        [`membersInfo.${userId}.lastLogin`]: Date.now() // Время входа
                    }).catch(e => console.log("Login update skip"));
                } // Проверка почты

                // --- 🔥 ФИКС: СЛУШАЕМ ИЗМЕНЕНИЯ ПРОФИЛЯ (ВСТУПЛЕНИЕ/КИК) ---аа
                db.collection('users').doc(userId).onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();

                        // Проверяем, изменился ли клан
                        // (если в базе есть clanId, а у нас нет, или наоборот)
                        const serverClanId = data.clanId || null;

                        if (st.clanId !== serverClanId) {
                            console.log("🔄 Статус клана изменился!", serverClanId);

                            st.clanId = serverClanId; // Обновляем переменную
                            save(); // Сохраняем в память

                            // Если мы сейчас смотрим на вкладку КЛАН, обновляем её
                            const clanScreen = document.getElementById('screen-clan');
                            if (clanScreen && clanScreen.style.display !== 'none') {
                                window.renderClanScreen();
                            }

                            // Уведомление
                            if (serverClanId) showNotice("Вас приняли в клан!", "success");
                            else showNotice("Вы покинули клан.", "error");
                        }
                    }
                });
                // -----------------------------------------------------------

            }
        });
    } else {
        console.warn("⚠️ FIREBASE NOT LOADED");
    }
} catch (e) { console.error("Firebase Error:", e); }
const DIVINE_COSTS = { 'jjk': 20000, 'op': 50000, 'jojo': 80000 };

const SAVE_KEY = 'pixrpg_save_WIPE_v1'; // Любое новое имя
const SAVE_VERSION = 3;

// 2. STATE & DBs
let st = {
    nickname: 'Hero', gold: 100, gems: 0, soulCrystals: 0, prestige: 0,
    heroes: { 'itadori': { lvl: 1, exp: 0, stars: 1, upgrades: 0, duplicates: 0 } },
    squad: ['itadori'], floors: { 'jjk': 1, 'op': 1, 'jojo': 1 },
    curFloor: 1,
    riftFloor: 1,
    arenaRank: 1000, arenaWins: 0,
    runPerks_jjk: [], runPerks_op: [], runPerks_jojo: [], runPerks_ut: [], runPerks_dr: [],
    upgrades: { goldMult: 0, xpMult: 0, atk: 0, hp: 0, crit: 0 },
    world: 'jjk', maxTowerFloor: 1, lastSentFloor: 0, codesUsed: [],
    quests: { kills: 0, summons: 0, damage: 0, clicks: 0, deaths: 0, perfectQTE: 0, soulTrials: 0 },
    savedSquads: [{}, {}, {}], // 🔥 FIX: 3 слота для сохранения отрядов
    prevWorldNum: 1, // 🔥 FIX: Для отслеживания разблокировок
    claimedQuests: [],
    unlockedTitles: [],
    currentTitle: "",
    ver: SAVE_VERSION
};

// --- ОБНОВИТЬ В MAIN.JS ---

// БАЗА КВЕСТОВ (Исправлены названия валют)
const QUESTS_DB = [
    { id: 'kill_50', desc: 'Устранить 50 угроз', type: 'kills', target: 50, rew: { t: 'gems', v: 100 } },
    { id: 'kill_500', desc: 'Зачистка: 500 врагов', type: 'kills', target: 500, rew: { t: 'gems', v: 500 } },
    { id: 'summon_50', desc: 'Призыв: 50 героев', type: 'summons', target: 50, rew: { t: 'gold', v: 5000 } },
    { id: 'summon_200', desc: 'Армия: 200 призывов', type: 'summons', target: 200, rew: { t: 'gems', v: 300 } },
    { id: 'dmg_100k', desc: 'Нанести 100k урона', type: 'damage', target: 100000, rew: { t: 'gems', v: 150 } },
    { id: 'dmg_10m', desc: 'Нанести 10M урона', type: 'damage', target: 10000000, rew: { t: 'title', v: 'Разрушитель' } }
];

// БАЗА АЧИВОК (Переработана последняя + 5 новых с уникальными цветами)
const ACHIEVEMENTS_DB = [
    { id: 'mugiwara', name: 'Настойчивость', desc: 'Нажать на башню 100 раз', cond: (s) => s.quests.clicks >= 100, title: 'Искатель', color: '#3b82f6' },
    { id: 'weakling', name: 'Путь самурая', desc: 'Проиграть 10 раз', cond: (s) => s.quests.deaths >= 10, title: 'Выживший', color: '#6b7280' },
    { id: 'rich', name: 'Капитал', desc: 'Накопить 100.000 золота', cond: (s) => s.gold >= 100000, title: 'Магнат', color: '#fbbf24' },
    { id: 'shaman', name: 'Магическая Битва', desc: 'Иметь 4 героя из JJK в отряде', cond: (s) => countWorldHeroes('jjk') >= 4, title: 'Шаман', color: '#8b5cf6' },
    { id: 'divine_pow', name: 'Божественное Вмешательство', desc: 'Получить DIVINE героя', cond: (s) => hasDivineHero(s), title: 'Превосходство', color: '#e879f9' },
    { id: 'god_slayer', name: 'Повелитель Океана', desc: 'Победить Левиафана (100 эт. Разлома)', cond: (s) => s.riftFloor > 100, title: 'ВЛАДЫКА', color: '#06b6d4' }, // 🔥 FIX: Переработана
    { id: 'arena_master', name: 'Гладиатор', desc: 'Выиграть 100 арен', cond: (s) => s.arenaWins >= 100, title: 'Чемпион', color: '#ef4444' }, // Новая
    { id: 'collector', name: 'Коллекционер', desc: 'Открыть 50 героев', cond: (s) => Object.keys(s.heroes || {}).length >= 50, title: 'Собиратель', color: '#22c55e' }, // Новая
    { id: 'perfectionist', name: 'Перфекционист', desc: '100 идеальных QTE', cond: (s) => (s.quests.perfectQTE || 0) >= 100, title: 'Мастер', color: '#f97316' }, // Новая
    { id: 'prestige_king', name: 'Король Престижа', desc: 'Престиж 10 раз', cond: (s) => s.prestige >= 10, title: 'Бессмертный', color: '#c084fc' }, // Новая
    { id: 'soul_master', name: 'Повелитель Душ', desc: 'Пройди все испытания душ', cond: (s) => (s.quests.soulTrials || 0) >= 7, title: 'Душа', color: '#ec4899' } // Новая
];

let battle = { active: false, mode: 'tower', turn: 'player', enemies: [], team: {}, turnId: null, phase: 'idle', processing: false, targetIdx: 0, activeSynergies: [], teamGauge: 0, turnCount: 0 };
let pendingAct = null; let pendingIdx = -1;
let selectedHeroId = null;
let isMusicOn = false;
let currentHeroFilter = 'all';

// --- ИСПРАВЛЕННАЯ СИСТЕМА УВЕДОМЛЕНИЙ (FIX: STACKING) ---
// --- ВСТАВИТЬ В MAIN.JS ВМЕСТО СТАРОЙ showNotice ---

function showNotice(msg, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Поднял выше (top: 10%), чтобы не закрывало кнопки ресурсов
        container.style.cssText = "position:fixed; top:10%; left:50%; transform:translateX(-50%); z-index:99999; display:flex; flex-direction:column; gap:5px; pointer-events:none; width:90%; max-width:400px;";
        document.body.appendChild(container);
    }

    // 🔥 ФИКС: Оставляем только 2 последних уведомления, чтобы не спамить
    while (container.children.length >= 2) {
        container.firstChild.remove();
    }

    const el = document.createElement('div');

    let bg = 'rgba(20, 20, 25, 0.95)';
    let border = '#444';
    let icon = 'ℹ️';

    if (type === 'success') { bg = 'rgba(10, 40, 20, 0.95)'; border = '#4ade80'; icon = '✅'; }
    if (type === 'error') { bg = 'rgba(40, 10, 10, 0.95)'; border = '#ef4444'; icon = '❌'; }
    if (type === 'gold') { bg = 'rgba(40, 30, 5, 0.95)'; border = '#fbbf24'; icon = '💰'; }
    if (type === 'level') { bg = 'rgba(30, 10, 40, 0.95)'; border = '#c084fc'; icon = '🆙'; }
    if (type === 'warning') { bg = 'rgba(40, 30, 5, 0.95)'; border = '#f59e0b'; icon = '⚠️'; }

    el.style.cssText = `
        background: ${bg}; 
        border-left: 4px solid ${border}; 
        color: #fff; 
        padding: 10px 15px; 
        border-radius: 4px; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.8); 
        font-family: 'Press Start 2P', cursive; 
        font-size: 0.6rem; 
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: toast-in 0.2s ease-out;
        pointer-events: auto;
    `;

    el.innerHTML = `<span style="font-size:1rem">${icon}</span><span>${msg}</span>`;
    container.appendChild(el);

    // 🔥 ФИКС: Удаление через 1.5 секунды (было 3.0)
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        el.style.transition = 'all 0.2s';
        setTimeout(() => {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 200);
    }, 1500);
}

// Вспомогательная функция для мгновенной очистки
function clearAllNotices() {
    const container = document.getElementById('toast-container');
    if (container) container.innerHTML = '';
}
// --- ВСТАВИТЬ В MAIN.JS (НОВАЯ ФУНКЦИЯ) ---

function clearVisualEffects() {
    const app = document.querySelector('.app');
    if (app) {
        // Удаляем все классы эффектов, которые могли зависнуть
        app.classList.remove(
            'ut-mode',
            'glitch-mode',
            'darker-yet-darker',
            'time-stop',
            'invert-screen',
            'flash-red'
        );
    }
    // Также сбрасываем фильтры на фоне, если они были наложены через JS
    const bg = document.getElementById('bg-layer');
    if (bg) bg.style.filter = '';
}

function showConfirm(msg, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10000';
    overlay.innerHTML = `
        <div class="modal-box glass" style="text-align:center; max-width:300px;">
            <div style="font-size:3rem; margin-bottom:10px;">⚠️</div>
            <div style="margin-bottom:20px; color:var(--text-main); font-weight:bold;">${msg}</div>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="conf-yes" class="btn-main" style="background:#ef4444; flex:1;">СБРОСИТЬ</button>
                <button id="conf-no" class="btn-main" style="background:#333; flex:1;">ОТМЕНА</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('conf-yes').onclick = () => { overlay.remove(); callback(true); };
    document.getElementById('conf-no').onclick = () => { overlay.remove(); callback(false); };
}

// --- СИСТЕМА ПРОГРЕССА ---
function track(type, amount = 1) {
    if (!st.quests) st.quests = { kills: 0, summons: 0, damage: 0, clicks: 0, deaths: 0 };
    if (!st.quests[type]) st.quests[type] = 0;
    st.quests[type] += amount;
    checkAchievements();
}

window.evolveHero = () => {
    const id = selectedHeroId;
    if (id !== 'itadori') return;

    // Requirements
    const kills = st.quests.kills || 0;
    const bosses = st.quests.bossKills || 0;

    if (kills < 100 || bosses < 1) return showNotice("Не выполнены условия!", "error");

    // Evolve
    if (!st.heroes[id].form) {
        st.heroes[id].form = 'itadori_shrine';
        save();
        showNotice("ЭВОЛЮЦИЯ! Итадори пробудился!", "success");
        openHero(id); // Reload modal
        // Force update visual in squad
        updateUI();
    }
};

function checkAchievements() {
    let changed = false;
    if (!st.unlockedTitles) st.unlockedTitles = [];
    ACHIEVEMENTS_DB.forEach(ach => {
        if (!st.unlockedTitles.includes(ach.title) && ach.cond(st)) {
            st.unlockedTitles.push(ach.title);
            const color = ach.color || '#fbbf24';
            showNotice(`🏆 Ачивка: ${ach.name}\n💎 Титул "${ach.title}" получен!`, 'gold');
            // 🔥 FIX: Визуальный эффект для титула
            const titleEl = document.getElementById('ui-title-display');
            if (titleEl) {
                titleEl.style.color = color;
                titleEl.style.textShadow = `0 0 10px ${color}`;
                titleEl.classList.add('crit-flash');
                setTimeout(() => titleEl.classList.remove('crit-flash'), 1000);
            }
            changed = true;
        }
    });
    if (changed) save();
}

function countWorldHeroes(world) {
    let count = 0;
    st.squad.forEach(id => { if (window.DB[id] && window.DB[id].w === world) count++; });
    return count;
}

function hasDivineHero(s) {
    return Object.keys(s.heroes).some(k => window.DB[k] && window.DB[k].r === 'Divine' && s.heroes[k].stars > 0);
}

function safeDisplay(id, val) { const el = document.getElementById(id); if (el) el.style.display = val; }

// --- СМЕНА МИРА ---
// В main.js обновите setWorld:

function setWorld(w) {
    // Добавляем 'ut' и 'dr' в список разрешенных
    if (!['jjk', 'op', 'jojo', 'ut', 'dr'].includes(w)) w = 'jjk';

    // Проверка престижа (Например, UT доступен с 3 престижа, DR с 4)
    if (w === 'op' && st.prestige < 1) return showNotice("Нужен 1 Престиж!", 'error');
    if (w === 'jojo' && st.prestige < 2) return showNotice("Нужно 2 Престижа!", 'error');
    if (w === 'ut' && st.prestige < 3) return showNotice("Нужно 3 Престижа для Undertale!", 'error');
    if (w === 'dr' && st.prestige < 4) return showNotice("Нужно 4 Престижа для Deltarune!", 'error');

    st.world = w;
    st.curFloor = st.floors[w] || 1;

    const titles = { 'jjk': 'Башня Проклятий', 'op': 'Grand Line', 'jojo': 'Bizarre Adventure', 'ut': 'Подземелье', 'dr': 'Темный Мир' };
    const icons = { 'jjk': '🗼', 'op': '🌊', 'jojo': '⭐', 'ut': '❤️', 'dr': '🌀' };

    const elName = document.getElementById('tower-name');
    if (elName) elName.innerText = titles[w] || 'Башня';
    const elIcon = document.getElementById('tower-icon');
    if (elIcon) elIcon.innerText = icons[w] || '🗼';

    // Инициализация перков для UT и DR, если их нет
    if (!st.runPerks_ut) st.runPerks_ut = [];
    if (!st.runPerks_dr) st.runPerks_dr = [];
    // Инициализация этажей для UT и DR
    if (!st.floors.ut) st.floors.ut = 1;
    if (!st.floors.dr) st.floors.dr = 1;

    updateUI();
    updateAtmosphere();
    save();
}

// 3. INIT FUNCTION
function init() {
    console.log("Инициализация...");
    if (!window.DB) return alert("ОШИБКА: База данных не загружена!");

    // === INJECT CSS ANIMATIONS FOR TOASTS ===
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes toast-in { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
    `;
    document.head.appendChild(styleSheet);

    // === AUTO-INJECT MAX BUTTONS ===
    setTimeout(() => {
        const summonBtns = document.querySelectorAll('button[onclick*="summonBanner"]');
        summonBtns.forEach(btn => {
            if (btn.nextElementSibling && btn.nextElementSibling.innerText.includes("MAX")) return;

            const match = btn.getAttribute('onclick').match(/'([^']+)'/);
            if (match) {
                const bid = match[1];
                const maxBtn = document.createElement('button');
                maxBtn.className = "btn-main btn-purple";
                maxBtn.style.marginTop = "8px";
                maxBtn.style.width = "100%";
                maxBtn.style.fontSize = "0.8rem";
                maxBtn.innerText = "MAX (На все)";
                maxBtn.onclick = (e) => { e.stopPropagation(); window.summonBanner(bid, true); };

                if (btn.parentNode) btn.parentNode.appendChild(maxBtn);
            }
        });
    }, 1000);

    let s = localStorage.getItem(SAVE_KEY);
    if (s) {
        try {
            let loaded = JSON.parse(s);
            // FIX 3: WIPE / VERSION CHECK
            if (!loaded.ver || loaded.ver < SAVE_VERSION) {
                console.log("⚠️ Old save version detected. Wiping local data.");
                localStorage.removeItem(SAVE_KEY);
                st.ver = SAVE_VERSION; // Reset state to defaults
                save(); // Save fresh state
            } else {
                st = { ...st, ...loaded };
            }
        } catch (e) { console.error(e) }
    }
    // --- ВСТАВИТЬ ВНУТРИ ФУНКЦИИ init(), ПОСЛЕ ЗАГРУЗКИ СОХРАНЕНИЯ ---

    if (!st.welcomeSeen) {
        // Создаем приветственное окно (Вариант 2: Стартап)
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000';

        overlay.innerHTML = `
        <div class="modal-box glass" style="max-width:400px; text-align:center; border: 1px solid var(--color-gold);">
            <h2 style="color:var(--color-gem); margin-bottom:10px;">👋 Приветствуем тебя! </h2>
            <div style="font-size:3rem; margin:10px 0;">🚀</div>
            <p style="font-size:0.8rem; line-height:1.5; text-align:left; margin-bottom:15px; color:#ddd;">
                Добро пожаловать в <b>BRUHK Inc.</b>! Мы здесь не просто работаем, мы меняем историю. И ты — часть этого грандиозного плана!<br><br>
                Вселенная дала сбой, и только <b>Охотники</b> (это ты!) могут его починить.<br><br>
                <b>ЧТО НУЖНО ДЕЛАТЬ?</b><br>
                1. Собери команду мечты.<br>
                2. Уничтожай монстров (баги реальности).<br>
                3. Доберись до вершины каждой из башен!.<br><br>
                <i>Не волнуйся о рисках — наша страховка покрывает любые несчастные случаи, включая распыление на атомы. Твой потенциал безграничен, и мы поможем его... извлечь.</i>
            </p>
            <button class="btn-main" onclick="this.closest('.overlay').remove(); window.completeWelcome();">ПОГНАЛИ! ⚔️</button>
        </div>
    `;
        document.body.appendChild(overlay);
    }

    // Добавь эту функцию в любое место файла (можно в самый конец main.js)
    window.completeWelcome = () => {
        st.welcomeSeen = true;
        save(); // Запоминаем, что игрок уже видел приветствие

        // (Опционально) Звук подтверждения
        // const audio = new Audio('music/ui_accept.mp3'); audio.play().catch(()=>{});
    };
    // === ЧИСТКА БИТЫХ ДАННЫХ ===
    let cleaned = false;
    for (let id in st.heroes) {
        if (!window.DB[id]) {
            delete st.heroes[id];
            cleaned = true;
        }
    }
    const squadBefore = st.squad.length;
    st.squad = st.squad.filter(id => window.DB[id]);
    if (st.squad.length !== squadBefore) cleaned = true;

    if (st.squad.length === 0) {
        const firstHero = Object.keys(window.DB)[0] || 'itadori';
        if (window.DB[firstHero]) {
            st.squad = [firstHero];
            if (!st.heroes[firstHero]) st.heroes[firstHero] = { lvl: 1, stars: 1, duplicates: 0 };
            cleaned = true;
        }
    }
    if (cleaned) save();

    if (!st.floors) st.floors = { 'jjk': 1, 'op': 1, 'jojo': 1 };
    if (!st.riftFloor) st.riftFloor = 1;
    if (!st.world) st.world = 'jjk';
    if (!st.quests) st.quests = { kills: 0, summons: 0, damage: 0, clicks: 0, deaths: 0 };
    if (!st.claimedQuests) st.claimedQuests = [];
    if (!st.unlockedTitles) st.unlockedTitles = [];
    if (!st.arenaRank) st.arenaRank = 1000;

    if (st.shards !== undefined) delete st.shards;

    for (let id in window.DB) {
        if (!st.heroes[id]) {
            st.heroes[id] = { lvl: 1, exp: 0, stars: 0, upgrades: 0, duplicates: 0 };
        }
    }
    // --- ВНУТРИ init() ---

    // 1. СЛУШАЕМ МИРОВОГО БОССА (FIX: Обработка удаления)
    db.collection('world_boss').doc('current').onSnapshot((doc) => {
        if (doc.exists) {
            // Босс есть — обновляем данные
            window.BOSS_DATA = doc.data();
        } else {
            // 🔥 ВАЖНО: Если документ удален (сброс), очищаем переменную!
            // Раньше тут ничего не было, поэтому игра "помнила" старого босса вечно
            window.BOSS_DATA = null;
        }

        // Всегда обновляем UI, даже если босс удален
        updateUI();

        // Обновляем ХП в бою, если мы деремся
        if (battle.active && battle.mode === 'raid' && battle.enemies[0] && window.BOSS_DATA) {
            const data = window.BOSS_DATA;
            const boss = battle.enemies[0];
            if (data.id === battle.raidKey) {
                boss.hp = data.hp;
                boss.max = data.max;
                if (data.dead && boss.hp > 0) {
                    boss.hp = 0;
                    showNotice("☠️ БОСС ПОВЕРЖЕН!", 'success');
                    setTimeout(win, 1000);
                }
                renderBattle();
            }
        }
    });

    setWorld(st.world);
    updateUI();
    updateAtmosphere();
    if (!document.getElementById('modal-perks')) createPerkModal();

    document.body.addEventListener('click', () => {
        const audio = document.getElementById('bgm');
        if (audio && audio.paused && isMusicOn) audio.play().catch(e => { });
    }, { once: true });

    // --- ФИКС: ПАУЗА МУЗЫКИ ПРИ СВОРАЧИВАНИИ ---
    document.addEventListener("visibilitychange", () => {
        const audio = document.getElementById('bgm');
        if (document.hidden) {
            // Если вкладка скрыта/свернута - пауза
            audio.pause();
        } else {
            // Если вернулись и музыка была включена (isMusicOn) - играем
            if (isMusicOn) {
                audio.play().catch(e => console.log(e));
                updateAtmosphere(); // На всякий случай обновляем трек
            }
        }
    });
    // ... внутри function init() ...

    // ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА ПРИ ЗАПУСКЕ
    if (st.clanId) {
        console.log("⚡ Клан найден при старте:", st.clanId);
        // Если ID есть, сразу запускаем отрисовку и подписку
        setTimeout(() => {
            renderClanScreen();
        }, 1000); // Небольшая задержка, чтобы HTML успел прогрузиться
        setTimeout(() => {
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.style.opacity = '0';
                loader.style.transition = 'opacity 0.5s';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        }, 500);
    }
    window.switchTab('home', document.getElementById('nav-home'));
    save();
    renderSavedSquads();
}

// --- ВСТАВИТЬ В MAIN.JS (ЗАМЕНИТЬ СТАРУЮ updateUI) ---

function updateUI() {
    document.getElementById('ui-gold').innerText = st.gold;
    document.getElementById('ui-gems').innerText = st.gems;
    const elGold = document.getElementById('ui-gold'); if (elGold) elGold.innerText = st.gold;
    const elGems = document.getElementById('ui-gems'); if (elGems) elGems.innerText = st.gems;
    const elSouls = document.getElementById('ui-souls'); if (elSouls) elSouls.innerText = st.soulCrystals || 0;
    const elPrestige = document.getElementById('ui-prestige-lvl'); if (elPrestige) elPrestige.innerText = `(P-${st.prestige})`;

    const elNick = document.getElementById('ui-nickname-display');
    const elTitle = document.getElementById('ui-title-display');
    if (elNick) elNick.innerText = st.nickname || "HERO";
    if (elTitle) elTitle.innerText = st.currentTitle ? `[${st.currentTitle}]` : "";

    const elRank = document.getElementById('arena-rank'); if (elRank) elRank.innerText = st.arenaRank || 1000;
    const elWins = document.getElementById('arena-wins'); if (elWins) elWins.innerText = st.arenaWins || 0;

    st.curFloor = st.floors[st.world] || 1;
    const elMenuFloor = document.getElementById('menu-floor'); if (elMenuFloor) elMenuFloor.innerText = st.curFloor;

    // Отрисовка отряда на главном экране
    const hList = document.getElementById('home-squad-list');
    if (hList) {
        hList.innerHTML = '';
        st.squad.forEach(id => {
            const d = window.DB[id];
            if (d) hList.innerHTML += `<div class="squad-thumb glass" style="font-size:2rem">${d.v}</div>`;
        });
    }

    // 🔥 FIX: Реорганизация вкладок по разблокировке миров
    // Мир 1: только башня, магазин, персы
    // Мир 2: добавляется Левиафан и Колизей
    // Мир 3: добавляется Гильдия
    // Мир 4: добавляется Испытание Души

    const currentWorldNum = st.world === 'jjk' ? 1 : (st.world === 'op' ? 2 : (st.world === 'jojo' ? 3 : 4));
    // 🔥 ФИКС: Учитываем престиж для постоянной разблокировки
    const unlockedLevel = Math.max(st.prestige + 1, currentWorldNum);

    const prevWorldNum = st.prevWorldNum || 1;

    // 🔥 FIX: Отслеживание показанных уведомлений
    if (!st.shownUnlocks) st.shownUnlocks = {};

    // Вкладка "Доп режимы" (разблокируется со 2-го мира или 1 престижа)
    const navModes = document.getElementById('nav-modes');
    const tabModes = document.getElementById('tab-modes');
    if (navModes && tabModes) {
        if (unlockedLevel >= 2) {
            if (currentWorldNum >= 2 && prevWorldNum < 2 && !st.shownUnlocks.modes) {
                showNotice("🎮 Разблокированы Доп Режимы!\n🌊 Разлом Левиафана\n⚔️ Колизей", 'level');
                st.shownUnlocks.modes = true;
                save();
            }
            navModes.style.display = 'flex';
            // Показываем Левиафан и Колизей
            const riftContainer = document.getElementById('mode-rift-container');
            const arenaContainer = document.getElementById('mode-arena-container');
            if (riftContainer) riftContainer.style.display = 'flex';
            if (arenaContainer) arenaContainer.style.display = 'flex';
            if (document.getElementById('rift-floor-display')) {
                document.getElementById('rift-floor-display').innerText = st.riftFloor || 1;
            }
        } else {
            navModes.style.display = 'none';
        }
    }

    // Вкладка "Гильдия" (разблокируется с 3-го мира или 2 престижа)
    const navClan = document.getElementById('nav-clan');
    if (navClan) {
        if (unlockedLevel >= 3 && currentWorldNum >= 3 && prevWorldNum < 3 && !st.shownUnlocks.clan) {
            showNotice("🏰 Разблокирована Гильдия!\n☠️ Рейд Босс доступен", 'level');
            st.shownUnlocks.clan = true;
            save();
        }
        navClan.style.display = unlockedLevel >= 3 ? 'flex' : 'none';
    }

    // Испытание Души (разблокируется с 4-го мира или 3 престижа)
    const soulContainer = document.getElementById('mode-soul-container');
    if (soulContainer) {
        if (unlockedLevel >= 4 && currentWorldNum >= 4 && prevWorldNum < 4 && !st.shownUnlocks.soul) {
            showNotice("❤️ Разблокировано Испытание Души!", 'level');
            st.shownUnlocks.soul = true;
            save();
        }
        soulContainer.style.display = unlockedLevel >= 4 ? 'flex' : 'none';
    }

    // Рейд Босс (разблокируется с 3-го уровня прогресса)
    const raidContainer = document.getElementById('mode-raid-container');
    if (raidContainer) {
        raidContainer.style.display = unlockedLevel >= 3 ? 'flex' : 'none';
    }

    st.prevWorldNum = currentWorldNum;

    // Отрисовка списка героев (Вкладка Герои)
    const hl = document.getElementById('heroes-list');
    if (hl) {
        hl.innerHTML = '';
        let keys = Object.keys(window.DB);

        // 1. Сортировка (Выбитые -> По уровню)
        keys.sort((a, b) => {
            const hA = st.heroes[a] || { stars: 0 };
            const hB = st.heroes[b] || { stars: 0 };
            // Сначала те, у кого есть звезды (выбитые)
            if (hA.stars > 0 && hB.stars === 0) return -1;
            if (hA.stars === 0 && hB.stars > 0) return 1;
            return 0;
        });

        for (let k of keys) {
            const d = window.DB[k]; // База данных
            if (!d) continue;

            // Пропускаем врагов (они не персонажи игрока)
            if (['poppup', 'jigsawry', 'rudinn_guard', 'hathy'].includes(k)) continue;

            // Инициализируем персонажа, если его нет
            if (!st.heroes[k]) st.heroes[k] = { stars: 0, lvl: 1, exp: 0, duplicates: 0, upgrades: 0 };
            const h = st.heroes[k];

            // 2. ФИЛЬТРАЦИЯ (ВКЛАДКИ)
            if (currentHeroFilter !== 'all') {
                // Если фильтр это класс (tank, mage...)
                if (['tank', 'fighter', 'assassin', 'mage', 'support'].includes(currentHeroFilter)) {
                    const role = d.role || 'fighter';
                    if (role !== currentHeroFilter) continue;
                }
                // Если фильтр это мир (jjk, op, jojo, ut, dr...)
                else {
                    if (d.w !== currentHeroFilter) continue;
                }
            }

            const isUnlocked = h.stars > 0;

            // Скрываем эксклюзивных/секретных, если они не выбиты (чтобы не спойлерить)
            if ((d.exclusive || d.hidden) && !isUnlocked) continue;

            // 3. ОТРИСОВКА
            if (isUnlocked) {
                // === ПЕРСОНАЖ ОТКРЫТ ===
                const isInSquad = st.squad.includes(k);
                const roleKey = d.role || 'fighter';
                const classIcon = window.CLASSES && window.CLASSES[roleKey] ? window.CLASSES[roleKey].i : '';

                // Цвет имени от редкости
                let nameColor = '#fff';
                if (d.r === 'Rare') nameColor = '#3b82f6';
                if (d.r === 'Legendary') nameColor = '#fbbf24';
                if (d.r === 'Mythic') nameColor = '#ef4444';
                if (d.r === 'Divine') nameColor = '#e879f9';

                let borderStyle = isInSquad ? 'border-color: var(--color-gold); box-shadow: 0 0 10px var(--color-gold);' : '';

                hl.innerHTML += `
                <div class="hero-card" style="${borderStyle}" onclick="openHero('${k}')">
                    ${isInSquad ? '<div class="hero-card-squad"></div>' : ''}
                    <div class="class-badge">${classIcon}</div>
                    <div class="hero-card-lvl">Lv.${h.lvl}</div>
                    <div class="hero-card-img">${d.v}</div>
                    <div class="hero-card-name" style="color:${nameColor}">${d.n}</div>
                    <div style="position:absolute; bottom:16px; right:2px; font-size:0.5rem; color:gold;">${"⭐".repeat(h.stars)}</div>
                </div>`;
            } else {
                // === ПЕРСОНАЖ НЕ ВЫБИТ (ЗНАК ВОПРОСА) ===
                hl.innerHTML += `
                <div class="hero-card locked">
                    <div class="hero-card-img">❓</div>
                    <div class="hero-card-name">???</div>
                </div>`;
            }
        }
    }

    // Логика кнопки Рейда
    const raidBtn = document.getElementById('btn-main-raid');
    const raidStatus = document.getElementById('raid-btn-status');

    if (raidBtn && raidStatus) {
        raidBtn.style.filter = "none";
        if (!st.clanId) {
            raidBtn.style.filter = "grayscale(1)";
            raidStatus.innerText = "Нужен Клан!";
        } else if (window.BOSS_DATA === undefined) {
            raidStatus.innerText = "Загрузка...";
        } else if (!window.BOSS_DATA) {
            if (window.raidTimerInterval) clearInterval(window.raidTimerInterval);
            raidStatus.innerText = "⚠️ ГОТОВ К СПАВНУ";
            raidStatus.style.color = "#fbbf24";
            raidBtn.onclick = window.startRaidBattle;
        } else if (window.BOSS_DATA.dead) {
            const now = Date.now();
            if (now < window.BOSS_DATA.respawnTime) {
                raidBtn.style.filter = "grayscale(1)";
                raidBtn.onclick = () => showNotice("Ждите восстановления босса!", "error");
                window.startRaidTimer(window.BOSS_DATA.respawnTime);
            } else {
                if (window.raidTimerInterval) clearInterval(window.raidTimerInterval);
                raidStatus.innerText = "⚠️ БОСС ВОЗРОДИЛСЯ!";
                raidStatus.style.color = "#fbbf24";
                raidBtn.onclick = window.startRaidBattle;
            }
        } else {
            if (window.raidTimerInterval) clearInterval(window.raidTimerInterval);
            const hpPct = Math.floor((window.BOSS_DATA.hp / window.BOSS_DATA.max) * 100);
            raidStatus.innerText = `🔥 БОСС: ${hpPct}% HP`;
            raidStatus.style.color = "#ef4444";
            raidBtn.onclick = window.startRaidBattle;
        }
    }
}
// --- БАЛАНС: РАСЧЕТ СТОИМОСТИ ---

// 1. Стоимость повышения уровня (за Души)
// Формула: База * (Уровень ^ 1.4)
// Пример: 1 ур = 50 душ, 50 ур = 12,000 душ, 100 ур = 315,000 душ
window.getLevelCost = (lvl) => {
    const baseCost = 50;
    // Чем больше степень (1.4), тем жестче цена на высоких уровнях
    return Math.floor(baseCost * Math.pow(lvl, 1.4));
};

// 2. Стоимость повышения Звезд (за Алмазы)
// Формула: 100 * (3 ^ (Звезды - 1))
// Пример: 1->2 (100💎), 2->3 (300💎), 3->4 (900💎), 4->5 (2700💎)
window.getStarCost = (stars) => {
    const baseGemCost = 100;
    // Каждая следующая звезда стоит в 3 раза дороже предыдущей
    return Math.floor(baseGemCost * Math.pow(3, stars - 1));
};

// --- ADMIN FUNCTIONS ---
window.adminWipe = async () => {
    if (!db) return showNotice("No DB!", 'error');
    const id = document.getElementById('adm-wipe-id').value.trim();
    if (!id) return showNotice("Enter ID!", 'error');
    if (!confirm("Удалить сохранение игрока " + id + "?")) return;
    try {
        await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('cloud_saves').doc(id).delete();
        showNotice("WIPED!", 'success');
    } catch (e) { showNotice(e.message, 'error'); }
};

window.adminFullWipe = async () => {
    if (!db) return showNotice("No DB!", 'error');
    if (!confirm("⚠️ ВНИМАНИЕ! ЭТО УДАЛИТ ВСЕ СОХРАНЕНИЯ ВСЕХ ИГРОКОВ И ЛИДЕРБОРДЫ. ВЫ УВЕРЕНЫ?!")) return;

    try {
        const root = db.collection('artifacts').doc('base-73318').collection('public').doc('data');
        const lb1 = await root.collection('leaderboard_jjk').get(); lb1.forEach(doc => doc.ref.delete());
        const lb2 = await root.collection('leaderboard_op').get(); lb2.forEach(doc => doc.ref.delete());
        const lb3 = await root.collection('leaderboard_jojo').get(); lb3.forEach(doc => doc.ref.delete());
        const saves = await root.collection('cloud_saves').get(); saves.forEach(doc => doc.ref.delete());
        const arena = await root.collection('arena_squads').get(); arena.forEach(doc => doc.ref.delete());
        showNotice("SERVER WIPED!", 'success');
    } catch (e) { showNotice("Wipe Error: " + e.message, 'error'); }
};

window.adminEdit = async () => {
    if (!db) return showNotice("No DB!", 'error');
    const id = document.getElementById('adm-edit-id').value.trim();
    const type = document.getElementById('adm-edit-type').value;
    const val = parseInt(document.getElementById('adm-edit-val').value);
    if (!id || isNaN(val)) return showNotice("Invalid inputs!", 'error');
    try {
        const ref = db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('cloud_saves').doc(id);
        const doc = await ref.get();
        if (doc.exists) {
            let data = JSON.parse(doc.data().data);
            if (!data[type]) data[type] = 0;
            data[type] += val;
            await ref.set({ data: JSON.stringify(data), ts: Date.now() });
            showNotice(`Added ${val} ${type} to ${id}`, 'success');
        } else showNotice("Player not found!", 'error');
    } catch (e) { showNotice(e.message, 'error'); }
};

window.adminMail = async () => {
    if (!db) return showNotice("No DB!", 'error');
    const target = document.getElementById('adm-mail-id').value.trim();
    const msg = document.getElementById('adm-mail-msg').value;
    const type = document.getElementById('adm-mail-type').value;
    const val = document.getElementById('adm-mail-val').value;

    if (!target || !msg) return showNotice("Missing fields!", 'error');

    try {
        await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('mail').add({
            target: target, msg: msg, type: type, value: (type === 'hero' ? val : parseInt(val)), ts: Date.now()
        });
        showNotice("Mail sent!", 'success');
    } catch (e) { showNotice(e.message, 'error'); }
};

// --- GACHA SYSTEM ---
const BANNERS = {
    'bronze': { cost: 100, curr: 'gold', rates: { 'Common': 60, 'Rare': 30, 'Special': 10 } },
    'silver': { cost: 1000, curr: 'gold', rates: { 'Rare': 50, 'Special': 35, 'Legendary': 15 } },
    'gold': { cost: 100, curr: 'gems', rates: { 'Special': 40, 'Legendary': 40, 'Mythic': 20 } }
};

function weightedRandom(rates) {
    let sum = 0; const r = Math.random() * 100;
    for (let rarity in rates) { sum += rates[rarity]; if (r <= sum) return rarity; }
    return 'Common';
}

window.summonBanner = (bannerId, isMax = false) => {
    const b = BANNERS[bannerId]; if (!b) return;

    const currentCurrency = st[b.curr] || 0;

    let amount = 1;
    let maxCanBuy = Math.floor(currentCurrency / b.cost);

    if (isMax) {
        if (maxCanBuy < 1) return showNotice(`Не хватает валюты!`, 'error');
        amount = maxCanBuy;
        // REMOVED LIMIT: amount no longer capped at 100
    } else {
        if (currentCurrency < b.cost) return showNotice(`Не хватает валюты!`, 'error');
    }

    const totalCost = amount * b.cost;
    st[b.curr] -= totalCost;
    track('summons', amount);

    const pool = Object.keys(window.DB).filter(k =>
        window.DB[k].w === st.world &&
        window.DB[k].r !== 'Divine' &&
        !window.DB[k].exclusive
    );

    if (pool.length === 0) return showNotice("В этом мире пока нет героев!", 'error');

    // FIX 1: MAX SUMMON SUMMARY (LOGIC)
    if (isMax && amount > 1) {
        let stats = {}; // { 'HeroName': { count: 0, isNew: false } }

        for (let i = 0; i < amount; i++) {
            const rarity = weightedRandom(b.rates);
            const rarityPool = pool.filter(k => window.DB[k].r === rarity);
            let finalId = rarityPool.length > 0 ? rarityPool[Math.floor(Math.random() * rarityPool.length)] : pool[Math.floor(Math.random() * pool.length)];

            if (!window.DB[finalId]) continue;

            const hName = window.DB[finalId].n;
            if (!stats[hName]) stats[hName] = { count: 0, isNew: false };

            if (!st.heroes[finalId]) st.heroes[finalId] = { lvl: 1, stars: 0, duplicates: 0 };

            if (st.heroes[finalId].stars === 0) {
                st.heroes[finalId].stars = 1;
                stats[hName].isNew = true;
            } else {
                st.heroes[finalId].duplicates++;
                stats[hName].count++;
            }
        }

        // Build readable list
        let msg = `<div style="text-align:left; padding:10px;"><b>Результат (${amount} шт.):</b><br>`;
        for (let name in stats) {
            let line = `• ${name}`;
            if (stats[name].isNew) line += ` <span style="color:#4ade80; font-weight:bold;">NEW!</span>`;
            if (stats[name].count > 0) line += ` (${stats[name].count} дублей)`;
            msg += line + "<br>";
        }
        msg += "</div>";

        document.getElementById('summon-log').innerHTML = msg;
        safeDisplay('modal-summon', 'flex');

    } else {
        // Standard single pull logic
        let historyLog = "";
        for (let i = 0; i < amount; i++) {
            const rarity = weightedRandom(b.rates);
            const rarityPool = pool.filter(k => window.DB[k].r === rarity);
            let finalId = rarityPool.length > 0 ? rarityPool[Math.floor(Math.random() * rarityPool.length)] : pool[Math.floor(Math.random() * pool.length)];

            if (!window.DB[finalId]) continue;

            if (!st.heroes[finalId]) st.heroes[finalId] = { lvl: 1, stars: 0, duplicates: 0 };
            let isNew = false;
            if (st.heroes[finalId].stars === 0) { st.heroes[finalId].stars = 1; isNew = true; } else { st.heroes[finalId].duplicates++; }

            const d = window.DB[finalId];
            historyLog += `<div style="margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                <span style="font-size:1.5rem">${d.v}</span> 
                <span class="r-${d.r}">${d.n}</span> 
                ${isNew ? '✨' : `(Дубль)`}
            </div>`;
        }
        document.getElementById('summon-log').innerHTML = historyLog;
        safeDisplay('modal-summon', 'flex');
    }

    save(); updateUI();
};

window.summonDivine = () => {
    const cost = DIVINE_COSTS[st.world] || 999999;

    // 1. Проверка валюты
    if ((st.soulCrystals || 0) < cost) return showNotice(`Нужно ${cost} Кристаллов Душ!`, 'error');

    // 2. Формируем список доступных богов ЭТОГО мира, которых У НАС НЕТ
    const worldGods = Object.keys(window.DB).filter(k =>
        window.DB[k].w === st.world &&
        window.DB[k].r === 'Divine' &&
        (!st.heroes[k] || st.heroes[k].stars === 0) // Только если нет или скрыт
    );

    if (worldGods.length === 0) return showNotice("Вы уже собрали всех богов этого мира!", 'success');

    if (!confirm(`Потратить ${cost} кристаллов на ПРИЗЫВ БОГА (${st.world.toUpperCase()})?`)) return;

    // Списываем
    st.soulCrystals -= cost;

    // Выбираем случайного из доступных
    const winId = worldGods[Math.floor(Math.random() * worldGods.length)];
    const d = window.DB[winId];

    // Выдаем сразу MAX (5 звезд, 100 уровень)
    if (!st.heroes[winId]) st.heroes[winId] = { lvl: 100, stars: 5, duplicates: 0 };
    else { st.heroes[winId].stars = 5; st.heroes[winId].lvl = 100; }

    track('summons', 1);
    save(); updateUI();
    showNotice(`✨ БОЖЕСТВЕННАЯ СИЛА! ${d.n} присоединился!`, 'level');
    openHero(winId);
};

// --- НОВАЯ СИСТЕМА ПРОКАЧКИ ---

window.upgradeHero = () => {
    if (!selectedHeroId) return;
    const h = st.heroes[selectedHeroId];

    // Считаем цену (ДУШИ)
    const cost = getLevelCost(h.lvl);

    if ((st.soulCrystals || 0) >= cost) {
        st.soulCrystals -= cost;
        h.lvl++;

        save();
        updateUI();
        openHero(selectedHeroId); // Обновляем окно и цену
        showNotice(`Уровень ${h.lvl}! -${cost} 👻`, 'success');
    } else {
        showNotice(`Нужно ${cost} душ!`, 'error');
    }
};

/* --- ЗАМЕНИТЬ В main.js --- */

/* --- ЗАМЕНИТЬ В main.js --- */

window.promoteHero = () => {
    if (!selectedHeroId) return;
    const h = st.heroes[selectedHeroId];

    // Лимит звезд: 10
    if (h.stars >= 10) return showNotice("Максимум звезд (10)!", 'error');

    // ФОРМУЛА ЦЕНЫ: 100 * Текущие Звезды
    // 1->2 = 100 💎, 2->3 = 200 💎 ... 9->10 = 900 💎
    const cost = h.stars * 100;

    if (st.gems >= cost) {
        if (!confirm(`Повысить звездность за ${cost} 💎?`)) return;

        st.gems -= cost;
        h.stars++;

        save();
        updateUI();
        openHero(selectedHeroId); // Обновляем инфо в окне
        showNotice(`Герой вознесся до ${h.stars}⭐!`, 'success');
    } else {
        showNotice(`Нужно ${cost} алмазов!`, 'error');
    }
};


// --- PVP SYSTEM ---
window.registerArena = async () => {
    if (!db || !userId) return showNotice("Нет сети!", 'error');
    const squadData = st.squad.map(id => {
        const s = getStats(id);
        return { id: id, hp: s.hp, atk: s.atk, stars: s.stars, lvl: s.lvl };
    });
    try {
        await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('arena_squads').doc(userId).set({
            name: st.nickname, rank: st.arenaRank || 1000, squad: JSON.stringify(squadData), ts: Date.now()
        });
        showNotice("Отряд сохранен на сервере!", 'success');
    } catch (e) { showNotice("Ошибка: " + e.message, 'error'); }
};

window.findMatch = async () => {
    if (!db) return showNotice("Нет сети!", 'error');
    safeDisplay('screen-menu', 'none');
    try {
        const snap = await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('arena_squads').limit(10).get();
        const docs = [];
        snap.forEach(d => { if (d.id !== userId) docs.push(d.data()); });
        if (docs.length === 0) {
            safeDisplay('screen-menu', 'flex');
            return showNotice("Нет противников на арене!", 'error');
        }
        const enemy = docs[Math.floor(Math.random() * docs.length)];
        startPvP(enemy);
    } catch (e) { showNotice(e.message, 'error'); safeDisplay('screen-menu', 'flex'); }
};

function startPvP(enemyData) {
    battle.mode = 'pvp';
    startBattle(1, enemyData);
}


// --- КВЕСТЫ UI ---
function openQuests() { safeDisplay('modal-quests', 'flex'); switchQuestTab('quests'); }

function switchQuestTab(tab, btn) {
    document.querySelectorAll('.quest-tab-content').forEach(e => e.style.display = 'none');
    document.querySelectorAll('#modal-quests .tab-btn').forEach(e => e.classList.remove('active'));
    document.getElementById('quest-content-' + tab).style.display = 'block';
    if (btn) btn.classList.add('active');
    if (tab === 'quests') renderQuests(); else renderAchievements();
}

function renderQuests() {
    const list = document.getElementById('quest-content-quests'); list.innerHTML = '';
    QUESTS_DB.forEach(q => {
        const cur = st.quests[q.type] || 0; const isClaimed = st.claimedQuests.includes(q.id); const isDone = cur >= q.target; const pct = Math.min(100, (cur / q.target) * 100);
        let btnHtml = isClaimed ? `<span style="color:#aaa">✅</span>` : (isDone ? `<button class="btn-small" style="background:#4ade80; color:#000" onclick="window.claimQuest('${q.id}')">ЗАБРАТЬ</button>` : `<span style="font-size:0.7rem; color:#aaa">${cur}/${q.target}</span>`);
        let rewText = q.rew.t === 'title' ? `Титул "${q.rew.v}"` : `${q.rew.v} ${q.rew.t === 'gold' ? '💰' : '💎'}`;
        list.innerHTML += `<div class="card glass" style="flex-direction:column; align-items:flex-start; opacity:${isClaimed ? 0.5 : 1}"><div style="display:flex; justify-content:space-between; width:100%"><div style="font-weight:bold; color:var(--color-gold)">${q.desc}</div>${btnHtml}</div><div style="font-size:0.7rem; color:var(--color-gem)">Награда: ${rewText}</div><div class="quest-bar"><div class="quest-fill" style="width:${pct}%"></div></div></div>`;
    });
}

function claimQuest(qid) {
    if (st.claimedQuests.includes(qid)) return;
    const q = QUESTS_DB.find(x => x.id === qid); if (!q) return;
    st.claimedQuests.push(qid);
    if (q.rew.t === 'gold') st.gold += q.rew.v;
    if (q.rew.t === 'gems') st.gems += q.rew.v;
    if (q.rew.t === 'title') { if (!st.unlockedTitles.includes(q.rew.v)) st.unlockedTitles.push(q.rew.v); showNotice(`Получен титул: ${q.rew.v}`, 'level'); }
    else showNotice("Награда получена!", 'gold');
    save(); openQuests(); updateUI();
}

function renderAchievements() {
    const list = document.getElementById('quest-content-achievements'); list.innerHTML = '';
    ACHIEVEMENTS_DB.forEach(ach => {
        const isUnlocked = st.unlockedTitles.includes(ach.title);
        list.innerHTML += isUnlocked ? `<div class="card glass" style="border-color:var(--color-gold);"><div style="font-weight:bold;">${ach.name}</div><div style="font-size:0.7rem; color:#aaa">${ach.desc}</div><div style="color:var(--color-shard); font-size:0.7rem;">Титул: ${ach.title}</div></div>` : `<div class="card glass"><div class="achievement-hidden">Секрет</div><div style="font-size:0.7rem;">???</div></div>`;
    });
}

function trackClick(item) {
    if (item === 'tower') {
        track('clicks');
        const el = document.getElementById('tower-icon');
        el.style.transform = "scale(0.9)";
        setTimeout(() => el.style.transform = "scale(1)", 100);
    }
}

// --- ФУНКЦИИ ИГРЫ ---
function openAltar() { renderAltar(); safeDisplay('modal-altar', 'flex'); }
function renderAltar() {
    const list = document.getElementById('altar-list'); if (!list) return; list.innerHTML = '';
    const upgrades = [
        { id: 'goldMult', n: 'Жадность', d: '+10% Золота', max: 10, cost: (l) => (l + 1) * 10 },
        { id: 'xpMult', n: 'Мудрость', d: '+10% Опыта', max: 10, cost: (l) => (l + 1) * 10 },
        { id: 'atk', n: 'Сила Предков', d: '+1% Атаки', max: 999, cost: (l) => (l + 1) * 5 },
        { id: 'hp', n: 'Живучесть', d: '+1% HP', max: 999, cost: (l) => (l + 1) * 5 },
        { id: 'crit', n: 'Мастерство', d: '+1% Крит', max: 20, cost: (l) => (l + 1) * 50 }
    ];
    if (!st.upgrades) st.upgrades = { goldMult: 0, xpMult: 0, atk: 0, hp: 0, crit: 0 };
    upgrades.forEach(u => {
        const lvl = st.upgrades[u.id] || 0; const price = u.cost(lvl); const isMax = lvl >= u.max;
        const btnHtml = isMax ? `<button class="btn-main" disabled style="opacity:0.5">МАКС</button>` : `<button class="btn-main btn-purple" onclick="buyAltarUpgrade('${u.id}')">${price} 🔮</button>`;
        list.innerHTML += `<div class="card glass" style="margin-bottom:5px;"><div style="text-align:left; flex:1"><div style="color:var(--color-shard)"><b>${u.n}</b> (Ур. ${lvl})</div><div style="font-size:0.7rem; color:#aaa">${u.d}</div></div>${btnHtml}</div>`;
    });
    const ac = document.getElementById('altar-crystals'); if (ac) ac.innerText = st.soulCrystals || 0;

    // 🔥 НОВОЕ: Показываем прогноз награды за Престиж
    const prestigeRewardEl = document.getElementById('prestige-reward-preview');
    if (prestigeRewardEl) {
        const projectedReward = calculatePrestigeReward();
        prestigeRewardEl.innerText = `Престиж даст: ${projectedReward} 👻`;
        prestigeRewardEl.style.color = projectedReward > 0 ? '#c084fc' : '#666';
    }
}

function buyAltarUpgrade(id) {
    const upgrades = { 'goldMult': (l) => (l + 1) * 10, 'xpMult': (l) => (l + 1) * 10, 'atk': (l) => (l + 1) * 5, 'hp': (l) => (l + 1) * 5, 'crit': (l) => (l + 1) * 50 };
    const maxLevels = { goldMult: 10, xpMult: 10, crit: 20, atk: 999, hp: 999 };
    const lvl = st.upgrades[id] || 0;
    if (lvl >= maxLevels[id]) return;
    const cost = upgrades[id](lvl);
    if ((st.soulCrystals || 0) < cost) return showNotice("Не хватает Кристаллов Душ!", 'error');
    st.soulCrystals -= cost; st.upgrades[id] = lvl + 1;
    save(); renderAltar(); updateUI();
}

function createPerkModal() {
    const div = document.createElement('div');
    div.id = 'modal-perks'; div.className = 'overlay';
    div.innerHTML = `<div class="modal-box glass"><h2 style="color:var(--color-shard)">ВЫБЕРИ ДАР</h2><div id="perk-options" style="display:flex; flex-direction:column; gap:10px;"></div></div>`;
    document.body.appendChild(div);
}

function showPerkSelection() {
    const pool = window.PERKS_DB || [];
    const options = [];

    // Определяем текущий список перков в зависимости от мира
    const currentPerks = (st.world === 'jjk' ? st.runPerks_jjk : (st.world === 'op' ? st.runPerks_op : st.runPerks_jojo));

    // Фильтруем пул: убираем уникальные, если уже есть, и лимитированные
    const validPool = pool.filter(p => {
        const count = currentPerks.filter(x => x === p.id).length;

        // Если перк уникальный и уже есть - убираем из пула
        if (p.unique && count >= 1) return false;

        // Лимиты для стакаемых перков
        if (p.id === 'gold' && count >= 10) return false;

        return true;
    });

    if (validPool.length === 0) {
        showNotice("Все доступные дары уже собраны!", 'success');
        safeDisplay('modal-win', 'flex');
        return;
    }

    // --- ФИКС: Исключаем дубликаты при выборе ---
    // Создаем временную копию пула
    let tempPool = [...validPool];

    // Выбираем до 3 случайных перков
    for (let i = 0; i < 3; i++) {
        if (tempPool.length > 0) {
            const randIdx = Math.floor(Math.random() * tempPool.length);
            const picked = tempPool[randIdx];

            options.push(picked);

            // Удаляем выбранный перк из временного пула, чтобы он не выпал снова в этом же окне
            tempPool.splice(randIdx, 1);
        }
    }

    const cont = document.getElementById('perk-options');
    cont.innerHTML = '';

    options.forEach(p => {
        const el = document.createElement('div');
        el.className = 'card glass';
        el.style.cursor = 'pointer';
        el.onclick = () => selectPerk(p.id);

        // Цвета редкости: 1=Белый, 2=Синий, 3=Золотой
        let nameColor = '#fff';
        let borderColor = 'transparent';
        if (p.r === 2) { nameColor = '#3b82f6'; borderColor = 'rgba(59, 130, 246, 0.4)'; }
        if (p.r === 3) { nameColor = '#fbbf24'; borderColor = 'rgba(251, 191, 36, 0.4)'; }

        el.style.border = `2px solid ${borderColor}`;

        el.innerHTML = `
            <div class="perk-icon">${p.i}</div>
            <div class="perk-info">
                <div class="perk-name" style="color:${nameColor}">${p.n}</div>
                <div class="perk-desc">${p.d}</div>
            </div>
        `;
        cont.appendChild(el);
    });

    safeDisplay('modal-perks', 'flex');
}

function selectPerk(pid) {
    if (st.world === 'jjk') st.runPerks_jjk.push(pid); else if (st.world === 'op') st.runPerks_op.push(pid); else st.runPerks_jojo.push(pid);
    safeDisplay('modal-perks', 'none'); /* safeDisplay('modal-win', 'flex'); */ save();
}

function recycleDuplicates() {
    let gained = 0; const rates = { 'Common': 1, 'Rare': 5, 'Special': 15, 'Legendary': 50, 'Mythic': 200 };
    for (let k in st.heroes) {
        if (!window.DB[k]) continue;

        if (st.heroes[k].duplicates > 0) {
            let r = window.DB[k].r;
            if (rates[r]) { gained += st.heroes[k].duplicates * rates[r]; st.heroes[k].duplicates = 0; }
        }
    }
    if (gained === 0) return showNotice("Нет дубликатов!", 'error');
    st.soulCrystals = (st.soulCrystals || 0) + gained;
    save(); updateUI(); showNotice(`Переплавлено в ${gained} Кристаллов Душ!`, 'success');
}


// Вспомогательная: Расчет награды за престиж
function calculatePrestigeReward() {
    let total = 0;
    for (let id in st.heroes) {
        const h = st.heroes[id];
        const lvl = h.lvl || 1;

        // 🔥 НОВАЯ ФОРМУЛА: Плавная кривая с убывающей доходностью
        // reward = 20 * lvl^1.5
        // Примеры: Lvl 50 = ~7k, Lvl 100 = ~20k, Lvl 200 = ~56k
        const reward = Math.floor(20 * Math.pow(lvl, 1.5));
        total += reward;
    }
    return total;
}

function doPrestige() {
    let req = (st.prestige + 1) * 100;
    // Ослабим требование для теста, если нужно, или оставим как есть
    if (st.maxTowerFloor < req) return showNotice(`Нужен ${req} этаж!`, 'error');

    const reward = calculatePrestigeReward();

    // Показываем прогноз
    if (confirm(`ПРЕСТИЖ: Сброс мира!\n\nВы получите: ${reward} 👻 Кристаллов Душ\n(Зависит от уровней героев. Качайте новичков выгодно!)\n\nСбросить прогресс?`)) {

        // 1. Выдача награды
        st.soulCrystals = (st.soulCrystals || 0) + reward;

        st.prestige++;
        st.maxTowerFloor = 1;
        st.curFloor = 1;
        // Сброс этажей
        st.floors = { 'jjk': 1, 'op': 1, 'jojo': 1, 'ut': 1 };
        // Сброс перков (ВАЖНО!)
        st.runPerks_jjk = [];
        st.runPerks_op = [];
        st.runPerks_jojo = [];
        st.runPerks_ut = [];

        // Сброс уровней героев
        for (let k in st.heroes) if (st.heroes[k].stars > 0) st.heroes[k].lvl = 1;

        save(); updateUI();
        showNotice(`ПРЕСТИЖ! Получено ${reward} Душ!`, 'level'); // Используем тип level для фиолетового цвета

        // Возвращаем в первый мир
        setWorld('jjk');
    }
}

function checkCode() {
    const val = document.getElementById('inp-code').value;

    if (val === 'admin:1234') {
        safeDisplay('modal-settings', 'none');
        // safeDisplay('admin-panel', 'flex'); <- БЫЛО
        document.getElementById('admin-panel').classList.add('active'); // <- СТАЛО (для CSS)
        document.getElementById('admin-panel').style.display = 'flex'; // На всякий случай
        fetchLeaderboard(st.world, true);
    }
    else if (val === 'ENTRY17') {
        st.heroes['gaster'] = { lvl: 66, stars: 6, duplicates: 0 };
        save(); showNotice("🖐️ DARKER YET DARKER", 'error');
    }
    else if (val === 'START2025' && !st.codesUsed.includes('START2025')) {
        st.gold += 5000; st.gems += 500; st.codesUsed.push('START2025');
        save(); updateUI(); showNotice("Код активирован!", 'success');
    }
    else if (val === 'ULTI' && !st.codesUsed.includes('ULTI')) {
        // --- ФИКС: ---
        if (!st.heroes['ulti']) st.heroes['ulti'] = { lvl: 1, stars: 0, duplicates: 0 };

        // Если герой был скрыт (0 звезд), выдаем звезду, чтобы он появился в меню
        if (st.heroes['ulti'].stars === 0) st.heroes['ulti'].stars = 1;
        else st.heroes['ulti'].duplicates++; // Иначе (если уже есть) даем дубликат

        st.codesUsed.push('ULTI');
        save(); updateUI(); showNotice("Получена Ульти!", 'level');
    }
    else if (val === 'GODMODE') {
        st.prestige = Math.max(st.prestige, 100);
        st.gold = 999999999;
        st.gems = 999999999;
        st.soulCrystals = 999999999;

        if (window.DB) {
            for (let id in window.DB) {
                if (!st.heroes[id]) st.heroes[id] = { lvl: 1, stars: 0, duplicates: 0 };
                st.heroes[id].stars = 5;
                st.heroes[id].lvl = 100;
            }
        }
        st.floors = { 'jjk': 100, 'op': 100, 'jojo': 100 };
        st.maxTowerFloor = 1000;

        save(); updateUI();
        showNotice("⚡ РЕЖИМ БОГА АКТИВИРОВАН! ⚡", 'success');
        document.getElementById('modal-settings').style.display = 'none';
    }
    else if (val === 'KRYPTON' && !st.codesUsed.includes('KRYPTON')) {
        if (!st.heroes['superman']) st.heroes['superman'] = { lvl: 100, stars: 0, duplicates: 0 };

        if (st.heroes['superman'].stars === 0) {
            st.heroes['superman'].stars = 5;
            st.heroes['superman'].lvl = 100;
        } else {
            st.heroes['superman'].duplicates++;
        }

        st.codesUsed.push('KRYPTON');

        // --- ФИКС: ПЕРЕКЛЮЧАЕМ ФИЛЬТР, ЧТОБЫ ГЕРОЯ БЫЛО ВИДНО ---
        currentHeroFilter = 'all'; // Сбрасываем фильтр на "ВСЕ"
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        document.querySelector('.btn-filter').classList.add('active'); // Делаем кнопку активной

        save(); updateUI();

        showNotice("Человек из Стали прибыл!", 'level');
        openHero('superman');
    }
    else if (val === 'ALLTITLES' && !st.codesUsed.includes('ALLTITLES')) {
        st.unlockedTitles = ['Искатель', 'Выживший', 'Магнат', 'Шаман', 'Превосходство', 'Легенда', 'Разрушитель', 'ВЛАДЫКА'];
        st.codesUsed.push('ALLTITLES');
        save(); updateUI(); showNotice("Все титулы разблокированы!", 'success');
    }
    else if (val === 'KING_OF_TITLES' && !st.codesUsed.includes('KING_OF_TITLES')) {
        const allTitles = new Set(['ВЛАДЫКА']);
        QUESTS_DB.forEach(q => { if (q.rew.t === 'title') allTitles.add(q.rew.v); });
        ACHIEVEMENTS_DB.forEach(a => { if (a.title) allTitles.add(a.title); });
        st.unlockedTitles = Array.from(allTitles);
        st.codesUsed.push('KING_OF_TITLES');
        save(); updateUI(); showNotice("Все титулы разблокированы!", 'success');
    }
    else if (val === 'SKIBIDI' && !st.codesUsed.includes('SKIBIDI')) {
        if (!st.heroes['skibidi']) st.heroes['skibidi'] = { lvl: 100, stars: 5, duplicates: 0 };
        else { st.heroes['skibidi'].lvl = 100; st.heroes['skibidi'].stars = 5; }

        st.codesUsed.push('SKIBIDI');
        save(); updateUI(); showNotice("Skibidi Dop Dop Yes Yes!", 'level');
        if (window.openHero) openHero('skibidi');
    }
}

async function fetchLeaderboard(mode, isAdmin = false) {
    if (!db) return showNotice("Нет сети!", 'error');
    const list = document.getElementById(isAdmin ? 'admin-list' : 'lb-content');
    list.innerHTML = "Загрузка...";
    if (!isAdmin) safeDisplay('modal-leaderboard', 'flex');

    let coll = 'leaderboard_' + mode;
    if (mode === 'arena') coll = 'arena_squads';

    try {
        const snap = await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection(coll).get();
        let docs = [];
        snap.forEach(doc => { docs.push(doc.data()); });

        docs.sort((a, b) => {
            let valA = (mode === 'arena') ? (a.rank || 0) : (a.floor || 0);
            let valB = (mode === 'arena') ? (b.rank || 0) : (b.floor || 0);
            return valB - valA;
        });

        // --- ИЗМЕНЕНИЕ: БЕРЕМ ТОЛЬКО ТОП-10 ---
        docs = docs.slice(0, 10);

        let html = '';
        docs.forEach((d, i) => {
            let score = (mode === 'arena') ? d.rank : d.floor;
            // 🔥 FIX: Красивое отображение титулов с эмодзи
            let titleHtml = '';
            if (d.title) {
                const titleEmojis = {
                    'Искатель': '🔍', 'Выживший': '🛡️', 'Магнат': '💰', 'Шаман': '🔮',
                    'Божество': '✨', 'Легенда': '⭐', 'Разрушитель': '💥', 'ВЛАДЫКА': '👑',
                    'Бессмертный': '💀', 'Душа': '❤️'
                };
                const emoji = titleEmojis[d.title] || '🏆';
                titleHtml = `<span style="color:#c084fc; font-size:0.7rem; text-shadow: 1px 1px 2px #000;">${emoji} [${d.title}] </span>`;
            }
            html += `<div class="lb-row"><div class="lb-rank">#${i + 1}</div><div class="lb-name">${titleHtml}${d.name || 'Anon'}</div><div class="lb-score">${score}</div></div>`;
        });

        if (html === '') html = 'Пусто';
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = "Ошибка загрузки: " + e.message; console.error(e);
    }
}




async function checkMail() {
    if (!userId || !db) return;
    try {
        const q = db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('mail').where('target', '==', userId);
        const snap = await q.get();
        snap.forEach(async (doc) => {
            const data = doc.data();
            let msg = `🎁 ПОДАРОК! +${data.value} ${data.type}`;
            if (data.type === 'gems') st.gems += data.value;
            if (data.type === 'gold') st.gold += data.value;
            if (data.type === 'hero') {
                if (!st.heroes[data.value]) st.heroes[data.value] = { lvl: 1, stars: 1, duplicates: 0 };
                else st.heroes[data.value].duplicates++;
                const heroName = window.DB[data.value] ? window.DB[data.value].n : 'Неизвестный';
                msg = `🎁 ГЕРОЙ: ${heroName}`;
            }
            showNotice(msg, 'gold');
            save(); updateUI();
            await doc.ref.delete();
        });
    } catch (e) { console.error(e); }
}

// --- НОВАЯ ФОРМУЛА СТАТОВ v7.0 (Классы + Аномалии) ---
function getStats(id) {
    const h = st.heroes[id];
    const d = window.DB[id];
    // Проверяем форму
    const baseData = (h.form && window.DB_FORMS && window.DB_FORMS[h.form]) ? window.DB_FORMS[h.form] : (window.DB[h.form] || d);

    if (!d || !h) return { hp: 100, atk: 10, stars: 1, lvl: 1, startUlt: 0 };

    // 1. ОПРЕДЕЛЯЕМ КЛАСС
    const roleKey = baseData.role || d.role || 'fighter';
    const classConfig = window.CLASSES ? window.CLASSES[roleKey] : { hp: 1, atk: 1 };

    // 2. БАЗА (100 HP / 10 ATK)
    const BASE_HP = 100;
    const BASE_ATK = 10;

    // 3. МНОЖИТЕЛИ
    const rMult = window.RARITY_MULTS[d.r] || 1;
    const cHpMult = classConfig.hp || 1;
    const cAtkMult = classConfig.atk || 1;
    const wMult = (battle.active && battle.mode === 'rift') ? 1.0 : (window.WORLD_MULTS[d.w] || 1.0);
    const lvlMult = 1 + (h.lvl - 1) * 0.1;
    const starMult = 1 + (h.stars - 1) * 0.5;

    // Алтарь и Клан
    const altarAtk = 1 + (st.upgrades.atk || 0) * 0.01;
    const altarHp = 1 + (st.upgrades.hp || 0) * 0.01;

    // 🔥 FIX: Увеличиваем ХП для редкостей начиная с Legendary
    let hpMultiplier = 1.0;
    if (d.r === 'Legendary') hpMultiplier = 1.5;
    else if (d.r === 'Mythic') hpMultiplier = 2.0;
    else if (d.r === 'Divine') hpMultiplier = 3.0;

    // ИТОГ
    let hp = Math.floor(BASE_HP * rMult * cHpMult * wMult * lvlMult * starMult * altarHp * hpMultiplier);
    let atk = Math.floor(BASE_ATK * rMult * cAtkMult * wMult * lvlMult * starMult * altarAtk);

    // --- ПАССИВКИ КЛАССОВ ---
    let crit = (st.upgrades.crit || 0);
    let evade = 0;
    let startUlt = 0;

    if (roleKey === 'assassin') { crit += 20; evade += 10; }
    if (roleKey === 'mage') startUlt += 1;

    // --- АНОМАЛИИ РАЗЛОМА ---
    if (battle.active && battle.mode === 'rift' && battle.anomaly) {
        const a = battle.anomaly;
        if (a === 'glass') { hp = Math.floor(hp * 0.5); atk = Math.floor(atk * 1.5); } // Стекло
        if (a === 'giant') { hp = Math.floor(hp * 2.0); atk = Math.floor(atk * 0.7); } // Гигант
        if (a === 'chaos') { let temp = hp; hp = atk * 10; atk = Math.floor(temp / 10); } // Хаос
    }

    // --- ВНУТРИ main.js -> getStats(id) ---

    // ... (весь код расчета hp и atk) ...

    // Перки
    const berserkCount = countPerks('berserk');
    if (berserkCount > 0) { atk *= (1 + 0.2 * berserkCount); hp = Math.floor(hp * Math.pow(0.9, berserkCount)); }
    const stoneCount = countPerks('stone');
    if (stoneCount > 0) { hp = Math.floor(hp * (1 + 0.15 * stoneCount)); }

    // === ФИКС ДЛЯ САНСА (Пункт 1) ===
    if (id === 'sans') {
        hp = 1; // Всегда 1 ХП
        // Опционально: можно дать ему огромный уворот, если его нет в базе
        if (!h.stats) h.stats = {}; // Защита от ошибки
        evade = 100; // 100% Уворот (механика игры сама решит, пробьют его или нет)
    }

    return {
        hp: Math.floor(hp), atk: Math.floor(atk),
        stars: h.stars, lvl: h.lvl, startUlt: startUlt,
        role: roleKey, crit: crit, evade: evade
    };
}

function countPerks(pid) {
    // Если режим НЕ обычная башня — перков нет
    if (battle.mode !== 'tower') return 0;

    let list = [];
    if (st.world === 'jjk') list = st.runPerks_jjk;
    else if (st.world === 'op') list = st.runPerks_op;
    else if (st.world === 'jojo') list = st.runPerks_jojo;
    else if (st.world === 'ut') list = st.runPerks_ut;

    return (list || []).filter(p => p === pid).length;
}

/* --- ЗАМЕНИТЬ window.openHero В MAIN.JS --- */

window.openHero = (id) => {
    selectedHeroId = id; // Важно для работы кнопок прокачки
    st.curHeroId = id;   // Для совместимости

    const h = st.heroes[id];
    const d = window.DB[id];

    if (!d || !h) return showNotice("Герой не найден!", 'error');

    // Безопасное получение статов
    const s = window.getStats ? window.getStats(id) : { hp: 100, atk: 10 };

    const nextLvlCost = window.getLevelCost ? window.getLevelCost(h.lvl) : Math.floor(h.lvl * 150);
    const starCost = h.stars * 100; // Цена в алмазах (100, 200, 300...)

    const modal = document.getElementById('modal-hero');
    if (!modal) return;

    // Находим контейнер внутри модалки
    const box = modal.querySelector('.glass');

    // --- ГЕНЕРАЦИЯ СКИЛЛОВ ---
    let skillsHtml = '';
    let acts = d.act;
    // Проверка на форму (трансформацию)
    if (h.form && window.DB_FORMS && window.DB_FORMS[h.form]) {
        acts = window.DB_FORMS[h.form].act;
    } else if (h.form && window.DB[h.form]) {
        acts = window.DB[h.form].act;
    } else if (h.form && window.DB[h.form]) {
        acts = window.DB[h.form].act;
    }

    if (acts) {
        acts.forEach(act => {
            let tIcon = act.t === 'atk' ? '⚔️' : (act.t === 'heal' ? '💚' : (act.t === 'ult' ? '🌟' : '🛡️'));
            skillsHtml += `
                <div style="background:rgba(255,255,255,0.05); padding:6px; margin-bottom:4px; border-radius:4px;">
                    <div style="font-size:0.6rem; color:#fbbf24; display:flex; justify-content:space-between;">
                        <span>${tIcon} ${act.n}</span>
                        <span>${act.c ? 'MP:' + act.c : ''}</span>
                    </div>
                    <div style="font-size:0.55rem; color:#ccc; margin-top:2px;">${act.d}</div>
                </div>`;
        });
    }

    const roleName = window.CLASSES && window.CLASSES[d.role] ? window.CLASSES[d.role].n : 'Боец';

    // --- ОТРИСОВКА (НОВЫЙ ДИЗАЙН) ---
    box.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; border-bottom:1px solid #444; padding-bottom:10px;">
            <div style="font-size:2.5rem;" class="${h.form ? 'transformed' : ''}">${d.v}</div>
            <div style="flex:1; text-align:left;">
                <div style="color:var(--color-gold); font-size:0.9rem; font-weight:bold;">${d.n}</div>
                <div style="font-size:0.6rem; color:#888;">${d.r} | ${roleName}</div>
            </div>
            <div style="text-align:right;">
                <div style="font-size:0.7rem; color:gold;">${"⭐".repeat(h.stars)}</div>
                <div style="font-size:0.7rem;">LVL ${h.lvl}</div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; font-size:0.7rem; margin-bottom:10px; background:#222; padding:5px; border-radius:5px;">
            <div style="color:#ef4444;">❤️ HP: ${Math.floor(s.hp)}</div>
            <div style="color:#facc15;">⚔️ ATK: ${Math.floor(s.atk)}</div>
        </div>

        <div style="display:flex; gap:5px; margin-bottom:15px;">
            <button class="btn-main" style="flex:1; font-size:0.6rem; padding:8px;" onclick="window.upgradeHero('${id}')">
                LVL UP<br><span style="color:#c084fc">👻 ${nextLvlCost}</span>
            </button>
            
            <button class="btn-main" style="flex:1; font-size:0.6rem; padding:8px; ${h.stars >= 10 ? 'opacity:0.5; pointer-events:none;' : ''}" onclick="window.promoteHero()">
                ${h.stars >= 10 ? 'MAX ⭐' : `STAR UP<br><span style="color:#22d3ee">💎 ${starCost}</span>`}
            </button>
        </div>

        ${(id === 'itadori' && !h.form) ? `
        <div style="margin-bottom:15px;">
            <button class="btn-main" style="width:100%; background: linear-gradient(45deg, #ef4444, #7f1d1d); border:1px solid #ff0000; box-shadow: 0 0 10px #ff0000;" onclick="window.evolveHero()">
                🧬 ЭВОЛЮЦИЯ <span style="font-size:0.6rem">(${st.quests.kills || 0}/100 💀, ${st.quests.bossKills || 0}/1 👹)</span>
            </button>
        </div>` : ''}

        <div style="max-height:180px; overflow-y:auto; margin-bottom:15px; border:1px solid #333; padding:5px; text-align:left;">
            ${skillsHtml}
        </div>

        <div style="display:flex; gap:10px;">
            <button id="btn-squad-action" class="btn-main" style="flex:2; font-size:0.7rem;" onclick="window.toggleSquad('${id}')">
                ${st.squad.includes(id) ? 'УБРАТЬ ИЗ ОТРЯДА' : 'В ОТРЯД'}
            </button>
            <button class="btn-main btn-danger" style="flex:1; font-size:0.7rem;" onclick="safeDisplay('modal-hero', 'none')">
                ЗАКРЫТЬ
            </button>
        </div>
    `;

    // Красим кнопку если в отряде
    if (st.squad.includes(id)) {
        const btn = box.querySelector('#btn-squad-action');
        if (btn) btn.style.background = '#dc2626'; // Красный цвет
    }

    safeDisplay('modal-hero', 'flex');
};

// Создаем алиас, чтобы старые вызовы тоже работали
window.openHeroInfo = window.openHero;

// === NEW: SYNERGIES MENU ===
window.openSynergiesMenu = () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';

    let html = `<div class="modal-box glass" style="max-height:80vh; overflow-y:auto; width:90%; max-width:500px;">
        <h2 style="color:var(--color-gold); margin-bottom:15px;">📚 КОЛЛЕКЦИЯ СВЯЗЕЙ</h2>
        <div style="display:flex; flex-direction:column; gap:10px;">`;

    // Подсчет текущих тегов для подсветки
    let counts = {};
    st.squad.forEach(id => {
        const w = window.DB[id] ? window.DB[id].w : null;
        if (w) counts[w] = (counts[w] || 0) + 1;
    });

    window.SYNERGIES.forEach(syn => {
        let active = false;
        if (syn.ids) active = syn.ids.every(reqId => st.squad.includes(reqId));
        else if (syn.tag && syn.count) if ((counts[syn.tag] || 0) >= syn.count) active = true;

        let border = active ? '2px solid #4ade80' : '1px solid #333';
        let bg = active ? 'rgba(74, 222, 128, 0.1)' : 'rgba(0,0,0,0.3)';
        let icon = active ? '✅' : '🔒';

        let reqText = "";
        if (syn.tag) reqText = `Нужно: ${syn.count} героев из ${syn.tag.toUpperCase()}`;
        if (syn.ids) {
            let names = syn.ids.map(id => window.DB[id] ? window.DB[id].n : id).join(', ');
            reqText = `Герои: ${names}`;
        }

        html += `
        <div style="border:${border}; background:${bg}; padding:10px; border-radius:5px; text-align:left;">
            <div style="font-weight:bold; color:${active ? '#fff' : '#888'}; display:flex; justify-content:space-between;">
                <span>${syn.n}</span>
                <span>${icon}</span>
            </div>
            <div style="font-size:0.75rem; color:#aaa; margin-top:5px;">${syn.desc}</div>
            <div style="font-size:0.6rem; color:#666; margin-top:5px; font-style:italic;">${reqText}</div>
        </div>`;
    });

    html += `</div>
        <button class="btn-main" style="margin-top:20px; width:100%;" onclick="this.closest('.overlay').remove()">ЗАКРЫТЬ</button>
    </div>`;

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
};

// === NEW: UNLOCK POPUP ===
window.showUnlockPopup = (title, msg) => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10001';

    overlay.innerHTML = `
        <div class="modal-box glass" style="text-align:center; border: 2px solid var(--color-gold); animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div style="font-size:4rem; margin-bottom:10px;">🔓</div>
            <div style="color:var(--color-gold); font-size:1.5rem; font-weight:bold; margin-bottom:10px;">${title}</div>
            <div style="color:#fff; margin-bottom:20px;">${msg}</div>
            <button class="btn-main" onclick="this.closest('.overlay').remove()">ПОГНАЛИ!</button>
        </div>
    `;
    document.body.appendChild(overlay);
};
// FIX: SQUAD CHANGE & RESET (Пункт 2)
// --- ВСТАВИТЬ В MAIN.JS ---

function toggleSquad(id) {
    // Проверка прогресса (чтобы предупредить о сбросе)
    let hasProgress = (st.floors[st.world] > 1) ||
        (st.riftFloor > 1) ||
        (st.world === 'jjk' && st.runPerks_jjk && st.runPerks_jjk.length > 0) ||
        (st.world === 'op' && st.runPerks_op && st.runPerks_op.length > 0) ||
        (st.world === 'jojo' && st.runPerks_jojo && st.runPerks_jojo.length > 0) ||
        (st.world === 'ut' && st.runPerks_ut && st.runPerks_ut.length > 0);

    const doChange = () => {
        // --- ЛОГИКА ГАСТЕРА ---

        // СЦЕНАРИЙ 1: ВЫБИРАЕМ ГАСТЕРА
        if (id === 'gaster') {
            // Гастер всегда встает один, удаляя остальных
            st.squad = ['gaster'];

            save(); updateUI(); openHero(id);
            showNotice("☝︎ DARKER YET DARKER...", 'error');
            if (window.updateAtmosphere) window.updateAtmosphere();
            return;
        }

        // СЦЕНАРИЙ 2: ГАСТЕР УЖЕ В ОТРЯДЕ (Выбираем кого-то другого)
        if (st.squad.includes('gaster')) {
            // Гастер уходит, новый герой встает на его место
            st.squad = [id];

            save(); updateUI(); openHero(id);
            if (window.updateAtmosphere) window.updateAtmosphere();
            return;
        }

        // --- ОБЫЧНАЯ ЛОГИКА (Если Гастера нет) ---
        const idx = st.squad.indexOf(id);

        if (idx > -1) {
            // Герой уже в отряде -> Убираем
            if (st.squad.length > 1) {
                st.squad.splice(idx, 1);
            } else {
                showNotice("В отряде должен быть хотя бы 1 герой!", 'error');
                return;
            }
        } else {
            // Героя нет -> Добавляем
            let limit = 4; // Лимит отряда

            if (st.squad.length >= limit) {
                st.squad.shift(); // Удаляем первого, если перебор
                st.squad.push(id);
            } else {
                st.squad.push(id);
            }
        }

        save(); updateUI(); openHero(id);
    };

    // Окно подтверждения сброса прогресса
    if (hasProgress) {
        showConfirm("Смена состава сбросит ЭТАЖ. Продолжить?", (yes) => {
            if (yes) {
                st.floors[st.world] = 1; st.curFloor = 1; st.riftFloor = 1;
                st.runPerks_jjk = []; st.runPerks_op = []; st.runPerks_jojo = []; st.runPerks_ut = [];
                doChange();
            }
        });
    } else {
        doChange();
    }
}

// --- БОЙ ---
window.startSoulTrial = () => {
    // 🔥 FIX: Счетчик испытаний души для ачивки
    if (!st.quests.soulTrials) st.quests.soulTrials = 0;
    st.quests.soulTrials++;
    // Выбираем случайную душу
    const keys = Object.keys(window.SOULS_DB);
    const randKey = keys[Math.floor(Math.random() * keys.length)];

    battle.mode = 'soul_trial';
    battle.soul = randKey; // Запоминаем текущую душу
    battle.soulData = {
        lastMove: null, // Для Оранжевой души
        charge: 0,      // Для Голубой души
        turnCount: 0    // Для Синей души
    };

    // Запускаем бой (уровень врагов зависит от престижа или макс этажа)
    const lvl = Math.max(1, Math.floor(st.maxTowerFloor / 2));
    startBattle(lvl);

    // Показываем уведомление о правилах
    const s = window.SOULS_DB[randKey];
    setTimeout(() => {
        alert(`❤️ ДУША: ${s.n}\n\n📜 ПРАВИЛО: ${s.desc}`);
    }, 100);

    // Визуальное обновление интерфейса
    const ind = document.getElementById('turn-indicator');
    if (ind) {
        ind.style.backgroundColor = s.color;
        ind.innerText = s.n;
    }
};

function startRift() {
    battle.mode = 'rift';
    startBattle(st.riftFloor);
}
// --- ВХОД В РЕЙД (ВЫЗЫВАЕТСЯ КНОПКОЙ ИЗ МЕНЮ) ---
window.tryEnterRaid = () => {
    // 1. Проверка на клан
    if (!st.clanId) {
        showNotice("Сначала вступи в отряд!", "error");
        window.switchTab('clan', document.getElementById('nav-clan'));
        return;
    }

    // 2. Проверка таймера
    const state = getRaidState();
    if (!state.isActive) {
        const m = Math.ceil(state.timeLeft / 60000);
        showNotice(`Босс спит! Жди ${m} мин.`, "error");
        return;
    }

    // 3. Старт
    startRaidBattle();
};
// --- БАЗА ВРАГОВ И РОЛЕЙ ---
function getRandomRole(world) {
    const roles = [
        { id: 'norm', w: 50 }, // Обычный (50% шанс)
        { id: 'healer', w: 20 }, // Хилер (20%)
        { id: 'tank', w: 20 },   // Танк (20%)
        { id: 'vamp', w: 10 }    // Вампир (10%)
    ];

    // Выбор с весами
    let total = roles.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total;
    let selected = 'norm';
    for (let i = 0; i < roles.length; i++) {
        r -= roles[i].w;
        if (r <= 0) { selected = roles[i].id; break; }
    }

    // Настройки для каждого мира
    const db = {
        'jjk': {
            'norm': { vis: '👻', name: 'Проклятие', hpMult: 1, atkMult: 1, role: 'norm' },
            'healer': { vis: '🦌', name: 'Шикигами', hpMult: 0.8, atkMult: 0.7, role: 'healer' },
            'tank': { vis: '🗿', name: 'Голем', hpMult: 1.5, atkMult: 0.6, role: 'tank' },
            'vamp': { vis: '🦟', name: 'Рой', hpMult: 0.9, atkMult: 1.2, role: 'vamp' }
        },
        'op': {
            'norm': { vis: '🏴‍☠️', name: 'Пират', hpMult: 1, atkMult: 1, role: 'norm' },
            'healer': { vis: '💉', name: 'Док', hpMult: 0.8, atkMult: 0.7, role: 'healer' },
            'tank': { vis: '🛡️', name: 'Бронник', hpMult: 1.4, atkMult: 0.7, role: 'tank' },
            'vamp': { vis: '🦈', name: 'Рыбочеловек', hpMult: 1.1, atkMult: 1.1, role: 'vamp' }
        },
        'jojo': {
            'norm': { vis: '🦇', name: 'Вампир', hpMult: 1, atkMult: 1, role: 'norm' },
            'healer': { vis: '🍝', name: 'Повар', hpMult: 0.9, atkMult: 0.6, role: 'healer' },
            'tank': { vis: '🧊', name: 'Лед', hpMult: 1.4, atkMult: 0.8, role: 'tank' },
            'vamp': { vis: '🎭', name: 'Маска', hpMult: 1.0, atkMult: 1.3, role: 'vamp' }
        },
        'rift': {
            'norm': { vis: '🐟', name: 'Рыба-глюк', hpMult: 1, atkMult: 1, role: 'norm' },
            'healer': { vis: '🪼', name: 'Медуза', hpMult: 0.8, atkMult: 0.8, role: 'healer' },
            'tank': { vis: '🦀', name: 'Краб', hpMult: 1.6, atkMult: 0.5, role: 'tank' },
            'vamp': { vis: '🦑', name: 'Кальмар', hpMult: 1.0, atkMult: 1.2, role: 'vamp' }
        }
    };

    let wData = db[world] || db['jjk'];
    return wData[selected];
}

function getBossRole(world) {
    if (world === 'jjk') return { vis: '👺', name: 'СУКУНА (Копия)', hpMult: 6, atkMult: 1.5, role: 'boss' };
    if (world === 'op') return { vis: '🐊', name: 'КРОКОДАЙЛ', hpMult: 6, atkMult: 1.5, role: 'boss' };
    if (world === 'jojo') return { vis: '🧛', name: 'ДИО', hpMult: 6, atkMult: 1.5, role: 'boss' };
    return { vis: '👹', name: 'БОСС', hpMult: 6, atkMult: 1.5, role: 'boss' };
}

window.startBattle = (floorNum, enemyData = null) => {
    // 1. === ФИКС БАГОВ (Моя добавка) ===

    // Сбрасываем все таймеры от прошлых боев, чтобы враг не ходил сразу
    let highestTimeoutId = setTimeout(";");
    for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
    }

    // Сброс состояний
    if (!battle.mode) battle.mode = 'tower';
    safeDisplay('modal-win', 'none');

    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.style.display = 'none'; });
    const bs = document.getElementById('screen-battle');
    bs.classList.add('active'); bs.style.display = 'flex';
    window.scrollTo(0, 0);

    battle.active = true;
    battle.turnCount = 0; // Инициализация счетчика ходов
    battle.teamGauge = 0;
    battle.processing = false; // Разблокируем кнопки
    battle.turn = 'player';    // Всегда ходит игрок первым
    updateTeamGauge();
    updateAtmosphere();

    // 🔥 FIX: Init/Reset Pending Gold on Floor 1
    if (floorNum === 1 && battle.mode === 'tower') {
        st.pendingRunGold = 0;
    }
    // Ensure it exists otherwise
    if (st.pendingRunGold === undefined) st.pendingRunGold = 0;

    battle.enemies = [];
    battle.anomaly = null;
    battle.defensiveStance = false; // Init Defensive Stance

    // === 2. ЛОГИКА АНОМАЛИЙ (Удалено для Разлома) ===
    const ind = document.getElementById('turn-indicator');
    if (ind) { ind.innerText = "ВАШ ХОД"; ind.style.color = "#fff"; ind.style.borderColor = "#333"; }

    // === 3. ИНИЦИАЛИЗАЦИЯ КОМАНДЫ ===
    // --- 3. ИНИЦИАЛИЗАЦИЯ КОМАНДЫ (С ГЛОБАЛЬНЫМИ СИНЕРГИЯМИ) ---
    battle.team = {};
    battle.activeSynergies = []; // Сброс

    // А. Поиск активных синергий
    if (window.SYNERGIES) {
        window.SYNERGIES.forEach(syn => {
            // Проверяем, есть ли ВСЕ участники синергии в текущем отряде
            const hasAll = syn.ids.every(reqId => st.squad.includes(reqId));

            if (hasAll) {
                battle.activeSynergies.push(syn);
                // Визуальное оповещение (Пункт 4 Тудулиста)
                setTimeout(() => {
                    showNotice(`🔗 СВЯЗЬ: ${syn.n}`, 'success');
                }, 500 + (battle.activeSynergies.length * 300));
            }
        });
    }

    // Б. Создание героев с учетом бонусов
    st.squad.forEach(id => {
        const s = getStats(id);

        // 🔥 ФИКС: Применяем синергии КО ВСЕМ героям
        if (battle.activeSynergies.length > 0) {
            battle.activeSynergies.forEach(syn => {
                // apply(s) модифицирует объект статов 's' напрямую
                if (syn.apply) syn.apply(s);
            });
        }

        battle.team[id] = {
            id: id,
            name: window.DB[id].n,
            curHp: s.hp, maxHp: s.hp, baseHp: s.hp,
            curUlt: s.startUlt || 0, maxUlt: 10,
            blockVal: 0, reflectVal: 0,
            cds: [0, 0, 0, 0, 0, 0, 0, 0],
            buffs: { atk_up: 0, evade_up: 0 },
            form: null, stats: s, stacks: 0, mahoragaTimer: 0,
            reviveUsed: false, immortalTimer: 0,
            shield: 0, stun: 0, burn: 0, bleed: 0, blind: 0, poison: 0, poisonVal: 0,
            def_down: 0, // Добавил счетчик дебаффа защиты
            // Новые эффекты
            guilty: 0, electric_mark: 0, frozen: 0, silence: 0, parasite: 0, charm: 0,
            wither: 0, birdcage: 0, futureSight: 0,
            energyCharges: 0, electricGod: false, mythicalForm: false, constructShield: 0,
            counter_electric: 0
        };
    });
    battle.turnId = st.squad[0];

    // === 4. ЛОГИКА РЕЙДА (Твой FIX) ===
    if (battle.mode === 'raid') {
        const boss = battle.raidBossConfig || (window.RAID_BOSSES ? window.RAID_BOSSES[0] : { hp: 1000000, atk: 100, name: "BOSS" });

        const elWorld = document.getElementById('battle-world-name');
        const elLvl = document.getElementById('battle-lvl');
        if (elWorld) elWorld.innerText = '☠️ РЕЙД';
        if (elLvl) elLvl.innerText = 'БОСС';

        let currentHp = battle.raidStartHp;
        if (!currentHp && currentHp !== 0) currentHp = boss.hp;

        battle.enemies.push({
            hp: currentHp,
            max: boss.hp,
            atk: boss.atk,
            boss: true,
            vis: boss.vis || '👹',
            name: boss.name,
            role: 'boss',
            effects: [],
            isRaidBoss: true,
            def: boss.stats ? (boss.stats.def || 0) : 0,
            evade: boss.stats ? (boss.stats.evade || 0) : 0,
            thorns: boss.stats ? (boss.stats.thorns || 0) : 0
        });

        renderBattle();
        renderSkills();
        return;
    }

    // === 5. ЛОГИКА PVP ===
    // === 5. ЛОГИКА PVP (Внутри startBattle) ===
    if (battle.mode === 'pvp') {
        document.getElementById('battle-world-name').innerText = 'АРЕНА';

        let squad = [];
        let pvpName = 'OPPONENT';

        // Пытаемся достать данные
        if (enemyData) {
            pvpName = enemyData.name || 'Unknown';
            try { squad = JSON.parse(enemyData.squad); } catch (e) { squad = []; }
        }

        document.getElementById('battle-lvl').innerText = pvpName;

        // Загружаем врагов
        squad.forEach(e => {
            if (window.DB[e.id]) {
                let vis = window.DB[e.id].v;
                battle.enemies.push({
                    hp: e.hp, max: e.hp, atk: e.atk,
                    boss: false, vis: vis, effects: [], blocking: false,
                    id: e.id, name: window.DB[e.id].n
                });
            }
        });

        // 🔥 ЗАЩИТА: Если врагов нет (баг загрузки), ставим Манекен
        if (battle.enemies.length === 0) {
            battle.enemies.push({
                hp: 5000, max: 5000, atk: 50,
                boss: false, vis: '🗿', name: 'DUMMY',
                effects: [], blocking: false
            });
            showNotice("Ошибка данных ПВП. Бой с манекеном.", 'error');
        }

        renderBattle(); renderSkills();
        return;
    }

    // === 6. ЛОГИКА ОБЫЧНОЙ БАШНИ И РАЗЛОМА (Твой баланс) ===
    let baseHp, baseAtk;
    const isBoss = floorNum % 10 === 0;

    if (battle.mode === 'rift') {
        let totalPlayerAtk = 0;
        st.squad.forEach(id => totalPlayerAtk += getStats(id).atk);
        let avgAtk = Math.max(10, Math.floor(totalPlayerAtk / st.squad.length));
        const riftMult = 1 + (floorNum * 0.1);

        baseHp = Math.floor(avgAtk * 6 * riftMult);
        baseAtk = Math.floor(avgAtk * 0.6 * riftMult);

        if (isBoss) { baseHp *= 3; baseAtk *= 1.5; }
    } else {
        let mult = floorNum <= 20 ? Math.pow(1.12, floorNum - 1) : Math.pow(1.12, 19) + (floorNum - 20) * 0.5;
        const wMult = window.WORLD_MULTS ? (window.WORLD_MULTS[st.world] || 1.0) : 1.0;
        baseHp = Math.floor(120 * mult * (isBoss ? 6 : 1) * wMult);
        baseAtk = Math.floor(12 * mult * (isBoss ? 1.5 : 1) * wMult);
    }

    // Спавн врагов
    battle.enemies = [];

    if (battle.mode === 'rift') {
        // ЛЕВИАФАН - Единственный и абсолютный босс Разлома
        // Каждое сражение - это дуэль с ним (и его призываемыми щупальцами)
        battle.enemies.push({
            hp: baseHp * 40, max: baseHp * 40, atk: Math.floor(baseAtk * 2.2), // 🔥 FIX: Reduced from 4.0 to 2.2 to prevent one-shots
            boss: true, vis: '🐋', name: 'ЛЕВИАФАН', isLeviathan: true,
            phase: 1, role: 'boss', effects: [], blocking: false
        });

        showNotice("🌊 ВЫ ПРОБУДИЛИ ХОЗЯИНА ОКЕАНА!", 'error');
    } else {
        if (isBoss) {
            let roleData = window.getBossRole ? window.getBossRole(st.world) : { vis: '👹', name: 'Boss', role: 'boss' };
            battle.enemies.push({ hp: baseHp, max: baseHp, atk: baseAtk, boss: true, vis: roleData.vis, role: roleData.role, name: roleData.name, effects: [], blocking: false });

            if (floorNum > 20) {
                let guard = window.getRandomRole ? window.getRandomRole(st.world) : { vis: '🛡️', name: 'Guard', role: 'tank' };
                battle.enemies.push({ hp: Math.floor(baseHp * 0.5), max: Math.floor(baseHp * 0.5), atk: Math.floor(baseAtk * 0.5), boss: false, vis: guard.vis, role: 'tank', name: 'Охрана', effects: [], blocking: false });
            }
        } else {
            let maxE = 1;
            if (floorNum > 3) maxE = 2;
            if (floorNum > 15) maxE = 3;
            if (floorNum > 40) maxE = 4;
            let count = 1;
            let r = Math.random();
            if (maxE >= 2 && r > 0.4) count = 2;
            if (maxE >= 3 && r > 0.7) count = 3;
            if (maxE >= 4 && r > 0.9) count = 4;

            for (let i = 0; i < count; i++) {
                let roleData = window.getRandomRole ? window.getRandomRole(st.world) : { vis: '💀', name: 'Mob', role: 'fighter', hpMult: 1, atkMult: 1 };
                let hpM = roleData.hpMult || 1;
                let atkM = roleData.atkMult || 1;

                battle.enemies.push({
                    hp: Math.floor(baseHp * hpM),
                    max: Math.floor(baseHp * hpM),
                    atk: Math.floor(baseAtk * atkM),
                    boss: false, vis: roleData.vis, role: roleData.role, name: roleData.name, effects: [], blocking: false
                });
            }
        }
    }
    renderBattle();
    renderBattle();
    renderSkills();

    // === EXIT BUTTON (В начале боя) ===
    // === EXIT BUTTON (В начале боя) ===
    // === PROCESSED EXIT BUTTON (Верхний ПРАВЫЙ угол) ===
    const oldBtn = document.getElementById('btn-exit-battle');
    if (oldBtn) oldBtn.remove();

    const exitBtn = document.createElement('button');
    exitBtn.id = 'btn-exit-battle';
    exitBtn.innerText = 'EXIT 🚪';
    exitBtn.style.position = 'absolute';
    exitBtn.style.top = '90px';
    exitBtn.style.right = '15px'; // Правый угол
    exitBtn.style.zIndex = '1000';
    exitBtn.style.padding = '6px 10px';
    exitBtn.style.fontSize = '0.7rem';
    exitBtn.style.background = 'rgba(200, 50, 50, 0.4)'; // Чуть красноватый, полупрозрачный
    exitBtn.style.border = '1px solid #7f1d1d';
    exitBtn.style.color = '#eee';
    exitBtn.style.borderRadius = '6px';
    exitBtn.onclick = () => {
        battle.active = false;
        save();
        goToMenu();
    };
    document.getElementById('screen-battle').appendChild(exitBtn);

    // === INFO BUTTON (Верхний ЛЕВЫЙ угол) ===
    const oldInfo = document.getElementById('btn-battle-info');
    if (oldInfo) oldInfo.remove();

    const infoBtn = document.createElement('button');
    infoBtn.id = 'btn-battle-info';
    infoBtn.style.position = 'absolute';
    infoBtn.style.top = '90px';
    infoBtn.style.left = '15px'; // Левый угол (разные углы)
    infoBtn.style.zIndex = '1000';
    infoBtn.style.padding = '6px 10px';
    infoBtn.style.fontSize = '0.7rem';
    infoBtn.style.background = 'rgba(50, 50, 200, 0.4)'; // Чуть синеватый
    infoBtn.style.border = '1px solid #1e3a8a';
    infoBtn.style.color = '#eee';
    infoBtn.style.borderRadius = '6px';
    // 🔥 FIX: Динамическая кнопка - "ПЕРКИ" или "ДУША" с цветом
    if (battle.mode === 'soul_trial' && battle.soul) {
        const s = window.SOULS_DB ? window.SOULS_DB[battle.soul] : null;
        if (s) {
            infoBtn.innerText = `ДУША ${s.n}`;
            infoBtn.style.color = s.color || '#fff';
            infoBtn.style.borderColor = s.color || '#fff';
        } else {
            infoBtn.innerText = 'ДУША ❤️';
        }
    } else {
        infoBtn.innerText = 'ПЕРКИ 🎁';
        infoBtn.style.color = '#fff';
        infoBtn.style.borderColor = '#1e3a8a';
    }

    infoBtn.onclick = () => {
        let msg = "";
        if (battle.mode === 'rift') {
            const anom = window.ANOMALIES ? window.ANOMALIES.find(a => a.id === battle.anomaly) : null;
            if (anom) msg = `⚠️ АНОМАЛИЯ:\n${anom.n}\n${anom.d}`;
            else msg = "Нет активных аномалий.";
        } else if (battle.mode === 'soul_trial') {
            const s = window.SOULS_DB ? window.SOULS_DB[battle.soul] : null;
            if (s) msg = `❤️ ДУША: ${s.n}\n📜 ${s.desc}`;
            else msg = "Душа не определена.";
        } else {
            // Обычный режим - показать перки
            let perkList = st[`runPerks_${st.world}`] || [];
            if (perkList.length === 0) msg = "Нет активных перков.";
            else {
                let counts = {};
                perkList.forEach(pid => {
                    const p = window.PERKS_DB ? window.PERKS_DB.find(x => x.id === pid) : null;
                    const name = p ? p.n : pid; // 🔥 FIX: Используем название перка вместо ID
                    counts[name] = (counts[name] || 0) + 1;
                });
                msg = "💎 ПЕРКИ ЗАБЕГА:\n";
                for (let k in counts) msg += `- ${k} x${counts[k]}\n`;
            }
        }
        alert(msg);
    };
    document.getElementById('screen-battle').appendChild(infoBtn);
};

function renderBattle() {
    const hid = battle.turnId;
    const hero = battle.team[hid];
    if (!hero) return;

    // --- 1. ОПРЕДЕЛЕНИЕ ДАННЫХ ГЕРОЯ (ТРАНСФОРМАЦИЯ) ---
    let d = window.DB[hid];

    // Если герой в форме (например, Сукуна или Махорага) — берем данные формы
    if (hero.form && window.DB_FORMS && window.DB_FORMS[hero.form]) {
        d = window.DB_FORMS[hero.form];
    }
    // Фолбек на базу, если что-то пошло не так
    if (!d) d = window.DB[hid];
    if (!d) return;

    // --- 2. ВИЗУАЛ ГЕРОЯ ---
    const hVis = document.getElementById('hero-vis');
    if (hVis) {
        hVis.innerText = d.v; // Иконка героя
        // Добавляем класс анимации, если трансформирован
        if (hero.form) hVis.classList.add('transformed');
        else hVis.classList.remove('transformed');

        // Визуализация щита
        if (hero.shield > 0) hVis.style.border = "2px solid #4ade80"; // Зеленая рамка
        else hVis.style.border = "none";
    }

    // --- 3. ХП БАР ГЕРОЯ (Картинки hp_0.png ... hp_5.png) ---
    // Индекс от 0 до 5
    let hpIdx = Math.ceil((hero.curHp / hero.maxHp) * 5);
    if (hero.curHp <= 0) hpIdx = 0;
    else if (hpIdx > 5) hpIdx = 5;

    const elHp = document.getElementById('hero-hp-bar');
    if (elHp) elHp.style.backgroundImage = `url('img/ui/hp_${hpIdx}.png')`;

    const elHpTxt = document.getElementById('hero-hp-txt');
    if (elHpTxt) elHpTxt.innerText = `${Math.ceil(hero.curHp)}/${hero.maxHp}`;

    // --- 4. УЛЬТА/МАНА БАР (Картинки mp_0.png ... mp_5.png) ---
    // Мана 0-10, делим на 2, чтобы получить индекс 0-5
    // 🔥 FIX: Используем CEIL, чтобы 1 мана уже показывала 1 деление
    let ultIdx = Math.ceil(hero.curUlt / 2);
    if (ultIdx < 0) ultIdx = 0;
    if (ultIdx > 5) ultIdx = 5;

    // ... внутри renderBattle ...

    const elUlt = document.getElementById('hero-ult-bar');
    if (elUlt) elUlt.style.backgroundImage = `url('img/ui/mp_${ultIdx}.png')`;

    const elUltTxt = document.getElementById('hero-ult-txt');
    // Math.max(0, ...) не даст показать число меньше нуля
    if (elUltTxt) elUltTxt.innerText = `${Math.floor(Math.max(0, hero.curUlt))}/10`;

    // --- 5. ИНФОРМАЦИЯ О МИРЕ (ЭТАЖ / БОСС) ---
    if (battle.mode !== 'pvp') {
        let lvlText = st.curFloor;
        let worldIcon = 'ЭТАЖ';

        if (battle.mode === 'rift') {
            worldIcon = '🌊';

            // 🔥 Отображение фазы Левиафана
            const leviathan = battle.enemies.find(e => e.isLeviathan);
            if (leviathan) {
                // Всегда показываем фазу, даже если она равна 1
                const phase = leviathan.phase || 1;
                lvlText = `ФАЗА ${phase}`;
            } else {
                lvlText = st.riftFloor;
            }
        }
        if (battle.mode === 'raid') { lvlText = 'БОСС'; worldIcon = '☠️'; }
        if (battle.mode === 'soul_trial') { lvlText = '??'; worldIcon = '❤️'; }

        const elLvl = document.getElementById('battle-lvl');
        const elName = document.getElementById('battle-world-name');

        if (elLvl) elLvl.innerText = lvlText;
        if (elName) elName.innerText = worldIcon;
    }

    // --- 6. ГЕНЕРАЦИЯ ВРАГОВ ---
    const ew = document.getElementById('enemies-wrapper');
    ew.innerHTML = ''; // Очищаем список

    battle.enemies.forEach((en, i) => {
        if (en.hp <= 0) return; // Мертвых не рисуем (или можно рисовать полупрозрачными)

        // Расчет картинки ХП врага (0..5)
        let enHpIdx = Math.ceil((en.hp / en.max) * 5);
        if (en.hp <= 0) enHpIdx = 0;
        if (enHpIdx > 5) enHpIdx = 5;

        // Классы анимации
        let extraClass = en.isLeviathan ? 'boss-anim' : '';
        if (en.boss) extraClass += ' boss-scale'; // Увеличение для боссов

        // Статусы врага (иконки под/над врагом)
        let statusHtml = '';
        if (en.def_down) statusHtml += '<span style="position:absolute; bottom:-15px; left:0; font-size:10px; color:#9ca3af;">🛡️⬇️</span>';
        if (en.stun) statusHtml += '<span style="position:absolute; top:-10px; left:50%; font-size:12px;">💫</span>';
        if (en.burn) statusHtml += '<span style="position:absolute; top:0; right:-5px; font-size:10px;">🔥</span>';
        if (en.poison) statusHtml += '<span style="position:absolute; top:0; left:-5px; font-size:10px;">☠️</span>';
        if (en.blind) statusHtml += '<span style="position:absolute; bottom:-15px; right:0; font-size:10px;">👁️‍🗨️</span>';

        // Отрисовка
        ew.innerHTML += `
        <div class="enemy-unit ${extraClass} ${i === battle.targetIdx ? 'selected' : ''}" id="enemy-${i}" onclick="window.selectTarget(${i})">
            <div style="font-size:3rem; transition: transform 0.2s;">${en.vis}</div>
            <div style="font-size:0.55rem; color:#fff; font-weight:bold; margin-bottom:2px;">${en.name || 'Враг'}</div>
            
            <div class="bar-group" style="width:50px; height:12px; margin:2px auto; position:relative;">
                <div class="bar-state-img" style="background-image: url('img/ui/hp_${enHpIdx}.png'); background-size: cover;"></div>
            </div>
            
            <div style="font-size:0.55rem; text-shadow:1px 1px 0 #000; margin-top:2px;">${Math.ceil(en.hp)}/${en.max}</div>
            ${statusHtml}
        </div>`;
    });

    // --- 7. СЕЛЕКТОР ОТРЯДА (Снизу) ---
    const ss = document.getElementById('squad-selector');
    ss.innerHTML = '';

    st.squad.forEach(id => {
        const d = window.DB[id];
        if (d) {
            const isActive = id === battle.turnId;
            // Проверка смерти: смотрим в battle.team, а не в st.heroes (там полное ХП)
            const isDead = battle.team[id] && battle.team[id].curHp <= 0;

            // Если герой мертв, добавляем класс .dead (серый фильтр)
            ss.innerHTML += `
                <div class="squad-thumb glass ${isActive ? 'active' : ''} ${isDead ? 'dead' : ''}" 
                     onclick="switchHero('${id}')">
                     ${d.v}
                     ${isDead ? '<span style="position:absolute; font-size:10px; color:red;">❌</span>' : ''}
                </div>
            `;
        }
    });
}

function renderSkills() {
    const g = document.getElementById('skills-grid'); g.innerHTML = '';
    const h = battle.team[battle.turnId];
    if (!window.DB[battle.turnId]) return;

    let acts = window.DB[battle.turnId].act;
    // FIX: TRANSFORMATION SKILLS (Пункт 3)
    if (h.form && window.DB_FORMS && window.DB_FORMS[h.form]) {
        acts = window.DB_FORMS[h.form].act;
    }

    acts.forEach((a, i) => {
        const btn = document.createElement('button');
        btn.className = `skill-btn t-${a.t}`;
        btn.innerHTML = `<span>${a.t === 'ult' ? '⚡ ' : ''}${a.n}</span>`;
        if (h.cds[i] > 0) { btn.disabled = true; btn.innerHTML += ` (${h.cds[i]})`; }
        if (a.t === 'ult' && h.curUlt < a.c) btn.disabled = true;
        if (battle.processing) btn.disabled = true;

        btn.onclick = () => preAction(a, i);
        g.appendChild(btn);
    });
}

/* --- ЗАМЕНИТЬ preAction В MAIN.JS --- */

function preAction(act, idx) {
    if (battle.turn !== 'player' || battle.processing) return;

    // Сбрасываем выбор с прошлого хода
    battle.selectedAllyIdx = null;

    // Убираем кнопку вахода (Инфо оставляем!)
    const eb = document.getElementById('btn-exit-battle');
    if (eb) eb.remove();

    // === НОВАЯ ЛОГИКА: Если это Хил/Бафф и он не "на себя" и не "массовый" ===
    if ((act.t === 'heal' || act.t === 'buff') && act.target !== 'self' && act.target !== 'all' && act.mech !== 'heal_all') {

        battle.processing = true; // Блокируем интерфейс
        renderSkills(); // Обновляем кнопки

        // Открываем окно выбора
        window.selectAllyTarget((targetIndex) => {
            // Запоминаем выбор в объект battle
            battle.selectedAllyIdx = targetIndex;

            // Продолжаем выполнение
            commitAction(act, idx);
        });
        return; // Ждем выбора, дальше код не идет
    }

    // Если обычная атака или селф-бафф - сразу выполняем
    commitAction(act, idx);
}

// Вспомогательная функция (то, что раньше было внутри preAction)
function commitAction(act, idx) {
    pendingAct = act;
    pendingIdx = idx;

    battle.processing = true;
    renderSkills();

    if (act.q || act.qte) {
        // 🔥 MODIFIED: DEFENSE NOW ACTIVATES STANCE (NO IMMEDIATE QTE) 🔥
        if (act.t === 'def') {
            doAction('stance');
        } else {
            let title = (act.t === 'atk' || act.t === 'ult') ? 'АТАКА!' : 'ЗАЩИТА!';
            showQTE(title, act.t);
        }
    } else {
        doAction('normal');
    }
}
function showQTE(title, type) {
    battle.phase = 'qte';

    // 1. Показываем оверлей
    const overlay = document.getElementById('qte-overlay');
    overlay.style.display = 'flex';

    // 2. Меняем заголовок (АТАКА или ЗАЩИТА)
    const tEl = overlay.querySelector('h1');
    if (tEl) tEl.innerText = title;

    // 3. Настраиваем ЗОНУ (случайное место)
    const zone = document.getElementById('qte-zone');
    const zoneWidth = 20; // Ширина зоны в %
    // Случайная позиция от 10% до 70%, чтобы не было у краев
    const randomLeft = 10 + Math.random() * 60;

    if (zone) {
        zone.style.left = randomLeft + '%';
        zone.style.width = zoneWidth + '%';
        // Синий для защиты, Красный для атаки
        zone.style.backgroundColor = (type === 'def') ? '#3b82f6' : '#ef4444';
        zone.style.boxShadow = (type === 'def') ? '0 0 15px #3b82f6' : '0 0 15px #ef4444';
    }

    // 4. ЗАПУСКАЕМ КУРСОР (БЕГАЮЩУЮ ПАЛОЧКУ)
    const cur = document.getElementById('qte-cursor');
    if (cur) {
        // Сброс анимации (хак, чтобы она началась заново)
        cur.style.animation = 'none';
        cur.offsetHeight; /* Триггер перерисовки */

        // Включаем анимацию: имя, время, тип, бесконечно, туда-сюда
        // qte-move - это то, что мы добавили в CSS
        cur.style.animation = 'qte-move 0.6s linear infinite alternate';
    }
}

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ QTE ---
function handleQTEClick() {
    // 1. Проверяем, идет ли фаза QTE
    const overlay = document.getElementById('qte-overlay');
    if (!overlay || overlay.style.display === 'none') return;

    // 2. Останавливаем анимацию визуально (фиксируем момент удара)
    const cursor = document.getElementById('qte-cursor');
    const zone = document.getElementById('qte-zone');

    if (cursor) {
        cursor.style.animationPlayState = 'paused';
    }

    // 3. Считываем координаты
    const curRect = cursor.getBoundingClientRect();
    const zoneRect = zone.getBoundingClientRect();

    // 4. Скрываем оверлей и меняем фазу
    setTimeout(() => {
        overlay.style.display = 'none';
        if (cursor) cursor.style.animation = ''; // Сброс анимации для след. раза
    }, 200); // Небольшая задержка, чтобы игрок увидел, где остановил

    battle.phase = 'idle';

    // 5. Проверяем попадание (с допуском 10 пикселей для удобства)
    // Важно: проверяем пересечение отрезков
    let success = (curRect.right >= zoneRect.left && curRect.left <= zoneRect.right);

    let result = success ? 'perfect' : 'normal';

    // Перк перфекциониста (если есть, промах карается)
    const perfStacks = countPerks('perf');
    if (perfStacks > 0 && !success) result = 'miss';

    console.log(`QTE HIT: ${success} (${result})`);

    // Визуальный эффект текста
    const hv = document.getElementById('hero-vis');
    const rect = hv ? hv.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2 };

    if (result === 'perfect') {
        let txt = perfStacks > 0 ? "PERFECT! x2.5" : "PERFECT!";
        showFloatText(txt, rect.left, rect.top - 60, '#fbbf24');
    } else if (result === 'miss') {
        showFloatText("MISSED!", rect.left, rect.top - 60, '#ef4444');
    }

    // 6. ВЫПОЛНЯЕМ ДЕЙСТВИЕ
    // Передаем результат в функцию боя
    if (battle.turn === 'player') {
        // Если ход Игрока — атакуем
        doAction(result);
    } else {
        // Если ход Врага — защищаемся
        resolveEnemyAttack(result);
    }
}

function updateTeamGauge() {
    // REMOVED LIMIT BREAK DISPLAY (Пункт 3: убираем лимит брейк)
    const bar = document.getElementById('limit-bar');
    const btn = document.getElementById('limit-btn');
    if (bar) bar.style.display = 'none';
    if (btn) btn.style.display = 'none';
}

// Функция всплывающего текста (Урон / Хил / Статусы)
// 🔥 FIX: Система позиционирования для разных типов текста
window.floatTextZones = {
    damage: { baseY: 0.4, offset: 0 },      // Урон по врагу - ниже бара ХП
    effect: { baseY: 0.25, offset: 0 },     // Эффекты - выше эмодзи врага
    heal: { baseY: 0.5, offset: 0 },         // Хил - в центре
    buff: { baseY: 0.3, offset: 0 },         // Баффы - выше центра
    status: { baseY: 0.35, offset: 0 }      // Статусы - между эффектами и баффами
};

window.showFloatText = (text, x, y, color = 'white', zone = 'damage') => {
    const el = document.createElement('div');
    el.className = 'float-txt';

    // Если координаты не переданы, используем зоны
    if (x === undefined || y === undefined) {
        const app = document.querySelector('.app');
        const rect = app ? app.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
        const zoneData = window.floatTextZones[zone] || window.floatTextZones.damage;
        x = rect.left + (rect.width / 2) - 20;
        y = rect.top + (rect.height * zoneData.baseY) + (zoneData.offset * 30);
    }

    // Добавляем случайный разброс для зон
    const randomX = (Math.random() * 30) - 15;
    const randomY = (Math.random() * 20) - 10;

    el.style.left = (x + randomX) + 'px';
    el.style.top = (y + randomY) + 'px';
    el.style.color = color;
    el.innerText = text;

    document.body.appendChild(el);

    setTimeout(() => {
        if (el && el.parentNode) {
            el.remove();
        }
    }, 600);
};
// --- НОВАЯ ФУНКЦИЯ (ВСТАВИТЬ ПЕРЕД doAction) ---
function handleEnemyDeath(enemy) {
    if (enemy.handled) return;
    enemy.handled = true;

    // 1. Засчитываем убийство в квест
    track('kills', 1);

    // 2. Визуальная награда
    let gold = Math.floor(10 * (window.RARITY_MULTS ? (window.RARITY_MULTS[enemy.role] || 1) : 1));
    if (st.curFloor) gold += st.curFloor; // Бонус за этаж

    // Award Gold immediately
    st.gold = (st.gold || 0) + gold;
    showFloatText(`+${gold} G`, 200, 200, '#fbbf24');

    // Анимация исчезновения (прозрачность)
    const idx = battle.enemies.indexOf(enemy);
    const el = document.getElementById(`enemy-${idx}`);
    if (el) {
        el.style.opacity = '0.5';
        el.style.filter = 'grayscale(1)';
    }
}

// --- main.js -> doAction ---

// --- ПОЛНАЯ ФУНКЦИЯ doAction (v7.0) ---
function doAction(qteResult) {
    if (battle.turn !== 'player') return;

    const h = battle.team[battle.turnId];
    if (!h || h.curHp <= 0) return;

    // 🔥 FIX: Обработка эффектов в начале хода (bleed, burn, poison)
    // Обрабатываем эффекты на героях
    Object.values(battle.team).forEach(hero => {
        if (hero.curHp <= 0) return;

        // Кровотечение
        if (hero.bleed > 0) {
            const bleedDmg = Math.floor(hero.maxHp * 0.05); // 5% от макс ХП
            hero.curHp = Math.max(0, hero.curHp - bleedDmg);
            if (bleedDmg > 0) showFloatText(`-${bleedDmg} 🩸`, 150, 250, 'red');
            hero.bleed--;
        }

        // Ожог
        if (hero.burn > 0) {
            const burnDmg = Math.floor(hero.maxHp * 0.03); // 3% от макс ХП
            hero.curHp = Math.max(0, hero.curHp - burnDmg);
            if (burnDmg > 0) showFloatText(`-${burnDmg} 🔥`, 150, 250, 'orange');
            hero.burn--;
        }

        // Яд
        if (hero.poison > 0 && hero.poisonVal > 0) {
            hero.curHp = Math.max(0, hero.curHp - hero.poisonVal);
            if (hero.poisonVal > 0) showFloatText(`-${hero.poisonVal} ☠️`, 150, 250, '#a855f7');
            hero.poison--;
        }

        // Иссушение (wither)
        if (hero.wither > 0) {
            const witherDmg = Math.floor(hero.maxHp * 0.04); // 4% от макс ХП
            hero.curHp = Math.max(0, hero.curHp - witherDmg);
            if (witherDmg > 0) showFloatText(`-${witherDmg} 🐊`, 150, 250, '#d4a574');
            hero.wither--;
        }

        // Птичья клетка (birdcage)
        if (hero.birdcage > 0) {
            const cageDmg = Math.floor(hero.maxHp * 0.06); // 6% от макс ХП
            hero.curHp = Math.max(0, hero.curHp - cageDmg);
            if (cageDmg > 0) showFloatText(`-${cageDmg} 🦩`, 150, 250, '#e879f9');
            hero.birdcage--;
        }

        // Снижаем счетчики эффектов
        if (hero.electric_mark > 0) hero.electric_mark--;
        if (hero.guilty > 0) hero.guilty--;
        if (hero.frozen > 0) hero.frozen--;
        if (hero.silence > 0) hero.silence--;
        if (hero.parasite > 0) hero.parasite--;
        if (hero.charm > 0) hero.charm--;
        if (hero.futureSight > 0) hero.futureSight--;
    });

    // Обрабатываем эффекты на врагах
    battle.enemies.forEach(enemy => {
        if (enemy.hp <= 0) return;

        // Кровотечение
        if (enemy.bleed > 0) {
            const bleedDmg = Math.floor(enemy.max * 0.05);
            enemy.hp = Math.max(0, enemy.hp - bleedDmg);
            if (bleedDmg > 0) showFloatText(`-${bleedDmg} 🩸`, 200, 100, 'red');
            enemy.bleed--;
        }

        // Ожог
        if (enemy.burn > 0) {
            const burnDmg = Math.floor(enemy.max * 0.03);
            enemy.hp = Math.max(0, enemy.hp - burnDmg);
            if (burnDmg > 0) showFloatText(`-${burnDmg} 🔥`, 200, 100, 'orange');
            enemy.burn--;
        }

        // Яд
        if (enemy.poison > 0 && enemy.poisonVal > 0) {
            enemy.hp = Math.max(0, enemy.hp - enemy.poisonVal);
            if (enemy.poisonVal > 0) showFloatText(`-${enemy.poisonVal} ☠️`, 200, 100, '#06b6d4');
            enemy.poison--;
        }

        // Иссушение (wither)
        if (enemy.wither > 0) {
            const witherDmg = Math.floor(enemy.max * 0.04);
            enemy.hp = Math.max(0, enemy.hp - witherDmg);
            if (witherDmg > 0) showFloatText(`-${witherDmg} 🐊`, 200, 100, '#d4a574');
            enemy.wither--;
        }

        // Птичья клетка (birdcage)
        if (enemy.birdcage > 0) {
            const cageDmg = Math.floor(enemy.max * 0.06);
            enemy.hp = Math.max(0, enemy.hp - cageDmg);
            if (cageDmg > 0) showFloatText(`-${cageDmg} 🦩`, 200, 100, '#e879f9');
            enemy.birdcage--;
        }

        // Снижаем счетчики эффектов
        if (enemy.electric_mark > 0) enemy.electric_mark--;
        if (enemy.guilty > 0) enemy.guilty--;
        if (enemy.frozen > 0) enemy.frozen--;
        if (enemy.silence > 0) enemy.silence--;
        if (enemy.parasite > 0) enemy.parasite--;
        if (enemy.charm > 0) enemy.charm--;
    });

    // 🔥 FIX: Зеленая душа - хилит всех на 50% от атаки действующего героя каждый ход
    if (battle.mode === 'soul_trial' && battle.soul === 'green') {
        const healAmount = Math.floor(h.stats.atk * 0.5);
        if (healAmount > 0) {
            // Хилим всех героев
            Object.values(battle.team).forEach(hero => {
                if (hero.curHp > 0) {
                    hero.curHp = Math.min(hero.maxHp, hero.curHp + healAmount);
                }
            });
            // Хилим всех врагов
            battle.enemies.forEach(enemy => {
                if (enemy.hp > 0) {
                    enemy.hp = Math.min(enemy.max, enemy.hp + healAmount);
                }
            });
            showFloatText(`+${healAmount} 💚 ВСЕМ`, 200, 200, '#22c55e');
        }
    }

    // 1. ПРОВЕРКА МАНЫ ПЕРЕД УДАРОМ
    if (pendingAct.t === 'ult' && h.curUlt < pendingAct.c) {
        showFloatText("NO MANA!", 200, 200, 'cyan');
        battle.processing = false;
        renderSkills();
        return;
    }

    // 2. СПЕЦИАЛЬНЫЕ МЕХАНИКИ (Гастер, Краши и т.д.)
    if (pendingAct.mech === 'swap_stats') {
        const app = document.querySelector('.app');
        if (app) {
            app.classList.add('invert-screen');
            setTimeout(() => app.classList.remove('invert-screen'), 500);
        }
        showFloatText("♻️ REWRITE", 200, 200, '#00ff00');
        let newAtk = h.curHp;
        let newHp = h.stats.atk;
        h.curHp = Math.max(1, newHp);
        h.stats.atk = Math.max(10, newAtk);
        h.cds[pendingIdx] = (pendingAct.cd || 0) + 1;
        renderBattle();
        battle.turn = 'enemy';
        setTimeout(enemyTurn, 250); // FIX SPEED: 500 -> 250
        return;
    }

    if (pendingAct.mech === 'bsod_crash' || pendingAct.mech === 'crash_game') {
        if (window.triggerBSOD) window.triggerBSOD();
        return;
    }

    // 🔥 FIX: ADD TRANSFORMATION LOGIC
    if (pendingAct.mech === 'transform') {
        const formId = pendingAct.eff ? pendingAct.eff.form : null;
        let form = (window.DB_FORMS && window.DB_FORMS[formId]) ? window.DB_FORMS[formId] : (window.DB && window.DB[formId]);

        if (form) {
            // 1. Изменяем визуал
            h.vis = form.v;
            h.name = form.n;

            // 2. Бонусы статов (если есть в конфиге формы)
            if (form.hp_bonus) {
                h.maxHp = Math.floor(h.maxHp * (1 + form.hp_bonus / 100));
                h.curHp = Math.floor(h.curHp * (1 + form.hp_bonus / 100));
            }
            if (form.atk_bonus) {
                h.stats.atk = Math.floor(h.stats.atk * (1 + form.atk_bonus / 100));
            }

            // 3. Замена скиллов
            h.form = formId;

            showFloatText(`TRANSFORM! ${form.v}`, 200, 200, '#a855f7');

            const hv = document.getElementById('hero-vis');
            if (hv) {
                hv.innerText = form.v;
                hv.classList.add('crit-flash');
                setTimeout(() => hv.classList.remove('crit-flash'), 500);
            }

            renderBattle();
            renderSkills();
            battle.turn = 'enemy';
            setTimeout(enemyTurn, 250);
            return;
        }
    }

    if (pendingAct.mech === 'gaster_rng' || pendingAct.mech === 'glitch') {
        if (window.handleGasterEffects) window.handleGasterEffects('glitch');
    }

    // 3. ВЫБОР ЦЕЛЕЙ
    let targets = [];

    // А) Спец-механики (Фуга)
    if (pendingAct.mech === 'fire') {
        targets = battle.enemies.filter(e => e.hp > 0);
    }
    // Б) Массовые скиллы
    else if (pendingAct.target === 'all' || pendingAct.aoe) {
        if (pendingAct.t === 'heal' || pendingAct.t === 'buff')
            targets = st.squad.map(id => battle.team[id]).filter(h => h.curHp > 0);
        else
            targets = battle.enemies.filter(e => e.hp > 0);
    }
    // В) Одиночные скиллы
    else {
        // 🔥 ЗЕЛЕНАЯ ДУША: Если лечение направлено на врага
        if (pendingAct.t === 'heal' && pendingAct.target === 'enemy') {
            // Лечение врага (зеленая душа)
            if (battle.enemies[battle.targetIdx] && battle.enemies[battle.targetIdx].hp > 0)
                targets = [battle.enemies[battle.targetIdx]];
            else {
                const liveIdx = battle.enemies.findIndex(e => e.hp > 0);
                if (liveIdx !== -1) {
                    battle.targetIdx = liveIdx;
                    targets = [battle.enemies[liveIdx]];
                }
            }
        } else if (pendingAct.t === 'heal' || pendingAct.t === 'buff') {
            // Если выбрали союзника через меню
            if (battle.selectedAllyIdx !== null && battle.selectedAllyIdx !== undefined) {
                const allyId = st.squad[battle.selectedAllyIdx];
                if (battle.team[allyId]) targets = [battle.team[allyId]];
            } else {
                targets = [h]; // Иначе на себя
            }
        } else {
            // Атака по врагу
            if (battle.enemies[battle.targetIdx] && battle.enemies[battle.targetIdx].hp > 0)
                targets = [battle.enemies[battle.targetIdx]];
            else {
                const liveIdx = battle.enemies.findIndex(e => e.hp > 0);
                if (liveIdx !== -1) {
                    battle.targetIdx = liveIdx;
                    targets = [battle.enemies[liveIdx]];
                }
            }
        }
    }

    if (targets.length === 0 && pendingAct.t === 'atk') {
        setTimeout(win, 300);
        return;
    }

    // Визуал рывка
    if (pendingAct.t === 'atk' || pendingAct.t === 'ult') {
        const heroVis = document.getElementById('hero-vis');
        if (heroVis) {
            heroVis.classList.add('lunge');
            setTimeout(() => heroVis.classList.remove('lunge'), 300);
        }
    }

    // 4. РАСЧЕТ МНОЖИТЕЛЕЙ (ОБНОВЛЕНИЕ 3.1 - CRIT SYSTEM)
    let mult = 1.0;
    let isCrit = false;
    let critText = "";

    const perfStacks = countPerks('perf'); // Перк "Перфекционист"

    // Связь с QTE
    if (qteResult === 'perfect') {
        isCrit = true;
        if (perfStacks > 0) {
            mult = 5.0;
            critText = "MAX CRIT x5!";
        } else {
            mult = 2.0;
            critText = "CRIT x2!";
        }
        h.buffs.atk_up = 2; // Бонус за идеал
        // 🔥 FIX: Счетчик идеальных QTE для ачивки
        if (!st.quests.perfectQTE) st.quests.perfectQTE = 0;
        st.quests.perfectQTE++;
    } else if (qteResult === 'miss') {
        mult = 0.5;
        showFloatText("WEAK...", 200, 200, '#aaa');
    }

    // Души (Undertale Mode)
    if (battle.mode === 'soul_trial' && battle.soul) {
        const s = battle.soul;
        const sd = battle.soulData;
        // 🔥 FIX: Оранжевая душа - не давать активировать ОДИН и тот же скилл (по индексу)
        if (s === 'orange') {
            if (sd.lastMove === pendingIdx) {
                showFloatText("НЕ ПОВТОРЯЙСЯ!", 200, 200, 'orange');
                battle.processing = false;
                renderSkills();
                return;
            }
            sd.lastMove = pendingIdx; // Сохраняем индекс скилла, а не тип
        }
        // 🔥 FIX: Зеленая душа переработана - хилит всех на 50% от атаки в начале каждого хода
        // (Обработка перенесена в начало doAction)
        if (s === 'cyan') {
            if (pendingAct.t === 'def') {
                // Зарядка при защите (x3)
                sd.charge = 3;
                showFloatText("ЗАРЯДКА x3!", 200, 200, '#06b6d4');
            } else if (pendingAct.t === 'atk' || pendingAct.t === 'ult') {
                if (sd.charge > 0) {
                    const chargeMult = sd.charge;
                    mult *= chargeMult;
                    sd.charge = 0;
                    showFloatText(`РАЗРЯД x${chargeMult}!`, 200, 200, '#06b6d4');
                } else {
                    mult = 0;
                    showFloatText("ЖМИ ЩИТ! (Терпение)", 200, 200, '#06b6d4');
                }
            }
        }
        if (s === 'blue') {
            sd.turnCount++;
            // Каждые 2 хода (на 2, 4, 6 и т.д.) нужно жать ЗАЩИТУ
            if (sd.turnCount % 2 === 0) {
                if (pendingAct.t !== 'def') {
                    h.curHp -= Math.floor(h.maxHp * 0.3);
                    showFloatText("ГРАВИТАЦИЯ! -30%", 200, 200, '#3b82f6');
                } else {
                    showFloatText("ПРЫЖОК! ✓", 200, 200, '#3b82f6');
                }
            }
        }
        if (s === 'yellow' && (pendingAct.t === 'atk' || pendingAct.t === 'ult')) mult *= 2.0;
    }

    // Перк Счастливчик
    const coinStacks = countPerks('coin');
    let isLucky = false;
    if (coinStacks > 0 && Math.random() < 0.5) {
        mult *= 2;
        isLucky = true;
    }

    // Джекпот
    if (pendingAct.mech === 'jackpot') {
        h.immortalTimer = 5;
        h.curUlt = 10;
        showFloatText("JACKPOT! 🎰", 200, 100, '#ffd700');
    }

    // 5. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ (GLOBAL)
    const app = document.querySelector('.app');
    if (pendingAct.mech === 'fire') {
        document.body.classList.add('flash-red');
        setTimeout(() => document.body.classList.remove('flash-red'), 500);
        showFloatText("🔥 HELL FLAME", 200, 300, 'orange');
    }
    if (pendingAct.mech === 'gaster_blast') {
        document.body.classList.add('flash-red');
        setTimeout(() => document.body.classList.remove('flash-red'), 500);
        showFloatText("💥 BLASTER!", 200, 300, 'red');
    }
    if (pendingAct.mech === 'void_slash') {
        const cut = document.createElement('div');
        cut.className = 'void-cut';
        document.body.appendChild(cut);
        setTimeout(() => cut.remove(), 400);
        showFloatText("✂️ ENTRY №17", 200, 300, '#000');
        battle.enemies.forEach(e => e.blind = 3);
    }
    if (pendingAct.mech === 'gaster_void') {
        const v = document.createElement('div');
        v.className = 'void-pulse';
        document.body.appendChild(v);
        setTimeout(() => v.remove(), 1500);
        showFloatText("⚫ VOID EXPAND", 200, 300, '#555');
    }
    if (pendingAct.mech === 'gaster_stop') {
        if (app) {
            app.classList.add('time-stop');
            setTimeout(() => app.classList.remove('time-stop'), 1000);
        }
        showFloatText("✋ ZA WARUDO", 200, 300, '#fff');
    }
    if (pendingAct.mech === 'gaster_darkness') {
        const d = document.createElement('div');
        d.className = 'total-darkness';
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 1000);
        showFloatText("🌫️ VANISH", 200, 300, '#888');
    }

    // 6. ПРИМЕНЕНИЕ К ЦЕЛЯМ
    // 6. ПРИМЕНЕНИЕ К ЦЕЛЯМ
    targets.forEach(trg => {
        // --- СТАТУСЫ ---
        const enemyIdx = battle.enemies.indexOf(trg);
        const enemyEl = document.getElementById(`enemy-${enemyIdx}`);

        // 🔥 FIX: Вычисляем effectY ЗДЕСЬ, чтобы переменная была доступна везде внутри цикла
        let effectY = 200;
        if (enemyEl) {
            const rect = enemyEl.getBoundingClientRect();
            effectY = rect.top - 20; // Выше эмодзи
        }

        if (pendingAct.eff && typeof pendingAct.eff === 'object') {
            const e = pendingAct.eff;

            // (Убрано локальное объявление effectY отсюда)

            if (e.t === 'stun') { trg.stun = (trg.stun || 0) + e.d; showFloatText("💤 STUN", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#ffff00', 'effect'); }
            if (e.t === 'blind') { trg.blind = (trg.blind || 0) + e.d; showFloatText("👁️ BLIND", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#888', 'effect'); }
            if (e.t === 'burn') { trg.burn = (trg.burn || 0) + e.d; showFloatText("🔥 BURN", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, 'orange', 'effect'); }
            if (e.t === 'bleed') { trg.bleed = (trg.bleed || 0) + e.d; showFloatText("🩸 BLEED", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, 'red', 'effect'); }
            if (e.t === 'poison') { trg.poison = (trg.poison || 0) + e.d; trg.poisonVal = e.v || 30; showFloatText("☠️ POISON", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#a855f7', 'effect'); }
            if (e.t === 'def_down') { trg.def_down = (trg.def_down || 0) + e.d; showFloatText("🛡️ BREAK", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, 'gray', 'effect'); }

            // Баффы на себя или весь отряд
            if (e.t === 'shield') {
                if (pendingAct.target === 'all') {
                    // Применяем щит всем союзникам
                    targets.forEach(ally => {
                        if (ally.curHp > 0) ally.shield = (ally.shield || 0) + e.v;
                    });
                } else {
                    h.shield = (h.shield || 0) + e.v;
                }
            }
            if (e.t === 'buff_atk') {
                if (pendingAct.target === 'all') {
                    // 🔥 FIX: Бафф атаки всему отряду
                    let buffedCount = 0;
                    targets.forEach(ally => {
                        if (ally.curHp > 0) {
                            ally.buffs = ally.buffs || {};
                            ally.buffs.atk_up = e.d;
                            buffedCount++;
                        }
                    });
                    if (buffedCount > 0) {
                        showFloatText(`⚔️ БАФФ ОТРЯДА! +${e.v || 0}% АТК (${buffedCount})`, window.innerWidth / 2, window.innerHeight * 0.3, '#fbbf24');
                    }
                } else {
                    h.buffs.atk_up = e.d;
                }
            }
            if (e.t === 'buff_evade') {
                if (pendingAct.target === 'all') {
                    targets.forEach(ally => {
                        if (ally.curHp > 0) {
                            ally.buffs = ally.buffs || {};
                            ally.buffs.evade_up = e.d;
                        }
                    });
                    showFloatText(`💨 БАФФ УВОРОТА ОТРЯДУ!`, window.innerWidth / 2, window.innerHeight * 0.3, '#06b6d4');
                } else {
                    h.buffs.evade_up = e.d;
                }
            }
            if (e.t === 'buff_crit') {
                if (pendingAct.target === 'all') {
                    targets.forEach(ally => {
                        if (ally.curHp > 0) {
                            ally.buffs = ally.buffs || {};
                            ally.buffs.crit_up = e.d;
                        }
                    });
                    showFloatText(`💥 БАФФ КРИТА ОТРЯДУ!`, window.innerWidth / 2, window.innerHeight * 0.3, '#ef4444');
                }
            }
            if (e.t === 'counter_electric') {
                // Электрический контр-урон от Кашимо
                h.counter_electric = (h.counter_electric || 0) + (e.v || 30);
                showFloatText("⚡ ЭМ ПОЛЕ", 200, 200, '#ffff00');
            }
        }

        // --- АТАКА / УЛЬТА ---
        if (pendingAct.t === 'atk' || pendingAct.t === 'ult') {
            // Гастер RNG
            if (pendingAct.mech === 'gaster_rng') {
                const res = window.handleGasterRng(trg);
                showFloatText(res.text, 200, 200, '#000');
                return;
            }

            let baseDmg = h.stats.atk * (pendingAct.v || 1);

            // Модификаторы
            if (h.buffs.atk_up > 0) {
                baseDmg = Math.floor(baseDmg * 1.5);
                showFloatText("⚔️ ATK UP!", 150, 200, '#fbbf24'); // 🔥 FIX: Визуализация баффа урона
            }
            if (trg.def_down > 0) {
                baseDmg = Math.floor(baseDmg * 1.3);
                showFloatText("🛡️ ARMOR DOWN!", 200, 100, '#9ca3af');
            }

            // 🔥 FIX: Визуализация баффов урона от синергий команды
            if (h.stats.atk && h.stats.atk > getStats(h.id).atk) {
                const bonus = h.stats.atk - getStats(h.id).atk;
                if (bonus > 0) {
                    showFloatText(`+${Math.floor(bonus)} СИНЕРГИЯ`, 150, 180, '#c084fc');
                }
            }

            // Аномалии
            if (battle.anomaly === 'mist') baseDmg *= 2;
            if (battle.anomaly === 'blind' && Math.random() < 0.3) {
                baseDmg = 0;
                showFloatText("MISS", 200, 200, '#aaa');
            }
            // --- ВСТАВИТЬ ВНУТРИ doAction (перед строкой let finalDmg = ...) ---

            // 1. СИНЕРГИЯ: RAGE MODE (Ярость)
            // Если ХП < 50%, урон увеличивается
            if (h.stats.rageMode && h.curHp < h.maxHp * 0.5) {
                mult *= 1.5; // +50% урона
                showFloatText("😡 RAGE!", 200, 150, '#ef4444');
                // Визуал: покраснение
                const heroEl = document.getElementById('hero-vis');
                if (heroEl) heroEl.style.filter = "sepia(1) hue-rotate(-50deg) saturate(3)";
            }

            // 2. СИНЕРГИЯ: Убийца Боссов
            if (h.stats.bossDmg && (trg.boss || trg.isRaidBoss || trg.maxHp > 5000)) {
                mult *= (1 + h.stats.bossDmg / 100);
            }

            // 3. СИНЕРГИЯ: Отравляющие атаки (Бедствия)
            if (h.stats.dotAttack) {
                trg.poison = (trg.poison || 0) + 3; // 3 хода
                trg.poisonVal = Math.floor(h.stats.atk * 0.5); // Сила яда
                showFloatText("☣️ POISON", 200, 200, '#a855f7');
            }

            // --- ДАЛЕЕ ИДЕТ РАСЧЕТ FINAL DMG ---

            // Применяем Крит
            let finalDmg = Math.floor(baseDmg * mult);
            // Если есть игнор, танки не режут урон, а обычные враги получают больше
            if (h.stats.ign) {
                // Если у цели есть защита, игнорируем её часть
                // В твоей игре пока нет явного показателя armor у врагов, 
                // но можно считать, что это пробивает блок танка
                if (trg.role === 'tank') finalDmg = Math.floor(baseDmg * mult); // Отменяем срез урона танком
            }

            // ... (далее идет trg.hp -= finalDmg) ...

            // --- ПОСЛЕ НАНЕСЕНИЯ УРОНА (Вампиризм) ---
            // Вставь это ПОСЛЕ строки track('damage', finalDmg);

            let totalVamp = (countPerks('vamp') * 10) + (h.stats.vamp || 0);
            if (totalVamp > 0) {
                const heal = Math.floor(finalDmg * (totalVamp / 100));
                h.curHp = Math.min(h.maxHp, h.curHp + heal);
                if (heal > 0) showFloatText(`+${heal}`, 150, 250, '#4ade80');
            }

            // Танк блок
            if (trg.role === 'tank' && pendingAct.mech !== 'pure') {
                finalDmg = Math.floor(finalDmg * 0.6);
                showFloatText("BLOCKED", 200, 200, '#aaa');
            }
            if (pendingAct.mech === 'execute' && trg.hp < trg.max * 0.2) finalDmg = 999999;

            // Dispel
            if (pendingAct.mech === 'dispel') {
                trg.buffs = {};
                showFloatText("🚫 DISPEL", 200, 250, 'cyan');
            }
            // Fire (Fuga)
            if (pendingAct.mech === 'fire') {
                trg.burn = (trg.burn || 0) + 3;
                showFloatText("🔥 MAGMA", 200, 250, 'orange');
            }

            // === НОВЫЕ МЕХАНИКИ ПЕРСОНАЖЕЙ ===

            // 1. ХИГУРУМА: Система суда (judgement, execute_guilty, silence)
            if (pendingAct.mech === 'judgement') {
                trg.guilty = (trg.guilty || 0) + (pendingAct.eff?.d || 5);
                showFloatText("⚖️ ВИНОВЕН", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#ffd700', 'effect');
            }
            if (pendingAct.mech === 'execute_guilty') {
                // Урон x2 по помеченным виновным
                if (trg.guilty && trg.guilty > 0) {
                    finalDmg = Math.floor(finalDmg * 2);
                    showFloatText("⚖️ КАЗНЬ!", 200, 200, '#ff0000');
                    trg.guilty = 0; // Снимаем метку после казни
                }
            }
            if (pendingAct.mech === 'judgement_domain') {
                trg.silence = (trg.silence || 0) + (pendingAct.eff?.d || 2);
                showFloatText("🔇 SILENCE", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#8b5cf6', 'effect');
            }

            // 2. КАШИМО: Цепная молния (electric_chain, electric_god, electric_mark)
            if (pendingAct.eff && pendingAct.eff.t === 'electric_mark') {
                trg.electric_mark = (trg.electric_mark || 0) + pendingAct.eff.d;
                showFloatText("⚡ ЗАРЯД", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#ffff00', 'effect');
            }
            if (pendingAct.mech === 'electric_chain') {
                // Бьет по всем помеченным электричеством
                const markedEnemies = battle.enemies.filter(e => e.hp > 0 && e.electric_mark && e.electric_mark > 0);
                if (markedEnemies.length > 0) {
                    markedEnemies.forEach(marked => {
                        const chainDmg = Math.floor(finalDmg * 0.8); // 80% урона по цепочке
                        marked.hp = Math.max(0, marked.hp - chainDmg);
                        marked.electric_mark = Math.max(0, (marked.electric_mark || 0) - 1);
                        const markedIdx = battle.enemies.indexOf(marked);
                        const markedEl = document.getElementById(`enemy-${markedIdx}`);
                        if (markedEl) {
                            showFloatText(`-${chainDmg} ⚡`, markedEl.getBoundingClientRect().left + 20, markedEl.getBoundingClientRect().top, '#ffff00');
                        }
                    });
                    showFloatText("⚡ ЦЕПНАЯ МОЛНИЯ!", 200, 150, '#ffff00');
                }
            }
            if (pendingAct.mech === 'electric_god') {
                // Трансформация в Бога Молний
                h.electricGod = true;
                h.immortalTimer = 3; // Бессмертие на 3 хода
                h.curUlt = 10; // Полная ульта
                showFloatText("⚡ БОГ МОЛНИЙ!", 200, 100, '#ffff00');
                // Станит всех врагов
                battle.enemies.forEach(e => {
                    if (e.hp > 0) e.stun = (e.stun || 0) + 1;
                });
            }

            // 3. ЁРОДЗУ: Конструирование (construct, perfect_construct)
            if (pendingAct.mech === 'construct') {
                // Создает конструкцию (щит + бафф)
                h.constructShield = (h.constructShield || 0) + 30;
                h.shield = (h.shield || 0) + 30;
                showFloatText("🔧 КОНСТРУКЦИЯ", 200, 200, '#9ca3af');
            }
            if (pendingAct.mech === 'perfect_construct') {
                // Идеальная Сфера - чистый урон
                finalDmg = Math.floor(h.stats.atk * pendingAct.v);
                showFloatText("🔧 ИДЕАЛЬНАЯ СФЕРА!", 200, 200, '#ffffff');
            }

            // 4. УРАУМЕ: Ледяная тюрьма (ice_prison, ice_shatter)
            if (pendingAct.mech === 'ice_prison') {
                trg.frozen = (trg.frozen || 0) + 2; // Заморозка на 2 хода
                trg.stun = (trg.stun || 0) + 1;
                showFloatText("❄️ ЗАМОРОЖЕН", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#00ffff', 'effect');
            }
            if (pendingAct.mech === 'ice_shatter') {
                // x3 урон по замороженным
                if (trg.frozen && trg.frozen > 0) {
                    finalDmg = Math.floor(finalDmg * 3);
                    trg.frozen = 0; // Снимаем заморозку после разбивания
                    showFloatText("❄️ РАЗБИТ!", 200, 200, '#00ffff');
                }
            }

            // 5. РЮ: Разряд энергии (charge_up, discharge, max_discharge)
            if (pendingAct.mech === 'charge_up') {
                h.energyCharges = (h.energyCharges || 0) + 1;
                showFloatText(`💥 ЗАРЯД +1 (${h.energyCharges})`, 200, 200, '#f97316');
            }
            if (pendingAct.mech === 'discharge') {
                // Урон зависит от количества зарядов
                const charges = h.energyCharges || 0;
                finalDmg = Math.floor(finalDmg * (1 + charges * 0.5)); // +50% за каждый заряд
                h.energyCharges = 0; // Сбрасываем заряды
                showFloatText(`💥 РАЗРЯД x${1 + charges * 0.5}!`, 200, 200, '#f97316');
            }
            if (pendingAct.mech === 'max_discharge') {
                // Максимальный выброс - урон растет с каждым ходом
                const turnCount = battle.turnCount || 1;
                const multiplier = 1 + (turnCount * 0.2); // +20% за каждый ход
                finalDmg = Math.floor(finalDmg * multiplier);
                h.energyCharges = 0;
                showFloatText(`💥 МАКС. ВЫБРОС x${multiplier.toFixed(1)}!`, 200, 200, '#f97316');
            }

            // 6. ЯМАТО: Мифический страж (mythical_guardian)
            if (pendingAct.mech === 'mythical_guardian') {
                // Превращение в священного зверя
                h.mythicalForm = true;
                h.buffs.atk_up = (h.buffs.atk_up || 0) + 3;
                h.buffs.def_up = 3;
                // Бафф всей команде
                Object.values(battle.team).forEach(ally => {
                    if (ally.curHp > 0) {
                        ally.buffs = ally.buffs || {};
                        ally.buffs.atk_up = 3;
                        ally.buffs.def_up = 3;
                    }
                });
                showFloatText("🐺 МИФИЧЕСКИЙ СТРАЖ!", 200, 100, '#c084fc');
            }

            // 7. САБО: Разрушение брони (armor_break)
            if (pendingAct.mech === 'armor_break') {
                // Игнорирует защиту врага
                finalDmg = Math.floor(baseDmg * mult);
                trg.def_down = (trg.def_down || 0) + (pendingAct.eff?.d || 3);
                showFloatText("🔥 ПРОБИТИЕ БРОНИ!", 200, 200, '#ef4444');
            }

            // 8. ДОФЛАМИНГО: Контроль (parasite, birdcage, charm)
            if (pendingAct.mech === 'parasite') {
                trg.parasite = (trg.parasite || 0) + (pendingAct.eff?.d || 2);
                trg.charm = (trg.charm || 0) + (pendingAct.eff?.d || 2);
                showFloatText("🦩 ПАРАЗИТ!", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#e879f9', 'effect');
            }
            if (pendingAct.mech === 'birdcage') {
                // Птичья клетка - урон по времени всем врагам
                battle.enemies.forEach(e => {
                    if (e.hp > 0) {
                        e.birdcage = (e.birdcage || 0) + 3; // 3 хода урона
                        e.poison = (e.poison || 0) + 3;
                        e.poisonVal = (e.poisonVal || 0) + (pendingAct.eff?.v || 100);
                    }
                });
                showFloatText("🦩 ПТИЧЬЯ КЛЕТКА!", 200, 150, '#e879f9');
            }

            // 9. КРОКОДАЙЛ: Высушивание песком (sand_drain, sand_storm, wither)
            if (pendingAct.mech === 'sand_drain') {
                trg.wither = (trg.wither || 0) + (pendingAct.eff?.d || 3);
                trg.atk_down = (trg.atk_down || 0) + 2; // Слабость
                showFloatText("🐊 ИССУШЕНИЕ", enemyEl ? enemyEl.getBoundingClientRect().left + 20 : 200, effectY, '#d4a574', 'effect');
            }
            if (pendingAct.mech === 'sand_storm') {
                // Песчаная буря - АОЕ + иссушение
                battle.enemies.forEach(e => {
                    if (e.hp > 0) {
                        e.wither = (e.wither || 0) + (pendingAct.eff?.d || 3);
                        e.acc_down = (e.acc_down || 0) + 2; // Снижение точности
                    }
                });
                showFloatText("🐊 ПЕСЧАНАЯ БУРЯ!", 200, 150, '#d4a574');
            }

            // 10. КАТАКУРИ: Предвидение будущего (perfect_counter, future_sight)
            if (pendingAct.eff && pendingAct.eff.t === 'future_sight') {
                h.futureSight = (h.futureSight || 0) + pendingAct.eff.d;
                h.buffs.evade_up = 100; // 100% уворот
                showFloatText("🍩 БУДУЩЕЕ ВИДЕНИЕ", 200, 200, '#ec4899');
            }
            if (pendingAct.mech === 'perfect_counter') {
                // Совершенный уворот команде + контратака
                Object.values(battle.team).forEach(ally => {
                    if (ally.curHp > 0) {
                        ally.buffs = ally.buffs || {};
                        ally.buffs.evade_up = 2; // 2 хода уворота
                        ally.counter = (ally.counter || 0) + 2; // Контратака
                    }
                });
                showFloatText("🍩 СОВЕРШЕННЫЙ УВОРОТ!", 200, 150, '#ec4899');
            }

            // 🔥 LEVIATHAN DAMAGE LIMIT (Лимит урона за один удар)
            if (trg.isLeviathan && trg.phase) {
                const thresholds = [100, 83, 66, 50, 33, 16, 0]; // Пороги для фаз 1-6 + смерть
                const currentPhase = trg.phase - 1; // 0-indexed для массива

                if (currentPhase < thresholds.length - 1) {
                    const currentThreshold = thresholds[currentPhase] / 100;
                    const nextThreshold = thresholds[currentPhase + 1] / 100;

                    // Максимальный урон за один удар = разница между текущим и следующим порогом
                    // Но минимум 8% от текущего HP, чтобы не было слишком легко
                    const maxDmgFromThreshold = Math.floor(trg.max * (currentThreshold - nextThreshold));
                    const maxDmgFromCurrentHP = Math.floor(trg.hp * 0.08); // 8% от текущего HP

                    // Берем максимум из двух, но не больше чем разница порогов
                    const maxDmg = Math.min(
                        Math.max(maxDmgFromCurrentHP, Math.floor(trg.max * 0.05)), // Минимум 5% от макс HP
                        maxDmgFromThreshold + Math.floor(trg.max * 0.02) // Можно немного перебить порог
                    );

                    if (finalDmg > maxDmg) {
                        const originalDmg = finalDmg;
                        finalDmg = maxDmg;
                        showFloatText(`🛡️ ЗАЩИТА ЛЕВИАФАНА! (${originalDmg} → ${maxDmg})`, 200, 200, '#00ffff');
                    }
                }
            }

            // Наносим урон
            const hpBefore = trg.hp;
            trg.hp -= finalDmg;
            if (trg.hp < 0) trg.hp = 0;
            track('damage', finalDmg);

            // 🔥 LEVIATHAN PHASE SYSTEM (FIX: Конечный режим с 6 фазами)
            if (trg.isLeviathan && trg.phase && trg.phase < 7) {
                const thresholds = [100, 83, 66, 50, 33, 16, 0]; // Пороги для фаз 1-6 + смерть
                const currentPhase = trg.phase - 1; // 0-indexed для массива

                if (currentPhase < thresholds.length - 1) {
                    const nextThreshold = thresholds[currentPhase + 1] / 100;
                    const hpPercent = trg.hp / trg.max;

                    // Если пробили порог - переходим в следующую фазу
                    if (hpPercent <= nextThreshold) {
                        // HP кап (враг не может получить урон ниже порога, кроме последней фазы)
                        if (trg.phase < 6) {
                            trg.hp = Math.floor(trg.max * nextThreshold);
                        }
                        // На последней фазе (6) можно убить Левиафана
                        trg.phase++;

                        // Визуальное оповещение
                        showFloatText(`🌊 ФАЗА ${trg.phase}!`, 200, 150, '#00ffff');
                        showNotice(`ЛЕВИАФАН - ФАЗА ${trg.phase}!`, 'error');

                        // 🔥 FIX: Между фазами 2-6 спавнятся обычные враги (не только приспешники)
                        if (trg.phase >= 2 && trg.phase <= 6) {
                            // Спавним обычных врагов между фазами
                            // Уменьшено: 1 враг на фазе 2-3, 2 врага на фазе 4-6
                            const regularEnemyCount = trg.phase <= 3 ? 1 : 2;
                            const baseHp = Math.floor(trg.max * 0.1); // 10% от ХП босса
                            const baseAtk = Math.floor(trg.atk * 0.3); // 30% от атаки босса

                            for (let i = 0; i < regularEnemyCount; i++) {
                                let roleData = window.getRandomRole ? window.getRandomRole('rift') : { vis: '🐟', name: 'Рыба-глюк', hpMult: 1, atkMult: 1, role: 'norm' };
                                battle.enemies.push({
                                    hp: Math.floor(baseHp * (roleData.hpMult || 1)),
                                    max: Math.floor(baseHp * (roleData.hpMult || 1)),
                                    atk: Math.floor(baseAtk * (roleData.atkMult || 1)),
                                    boss: false,
                                    vis: roleData.vis,
                                    role: roleData.role,
                                    name: roleData.name,
                                    effects: [],
                                    blocking: false,
                                    isLeviathanMinion: false // Обычные враги, не приспешники
                                });
                            }
                        }

                        // 🔥 MINION SPAWNS (Plan: 2→3→4→5→6 minions per phase)
                        const minionsToSpawn = trg.phase; // Phase 2 = 2 minions, Phase 3 = 3, etc.
                        const minionHp = Math.floor(trg.max * 0.04); // 40% of boss HP / 10 (since boss has 10x)
                        const minionAtk = Math.floor(trg.atk * 0.4); // 40% of boss ATK

                        for (let m = 0; m < minionsToSpawn; m++) {
                            const minionTypes = [
                                { vis: '🦑', name: 'Щупальце' },
                                { vis: '🐙', name: 'Спрут' },
                                { vis: '🦐', name: 'Креветка' },
                                { vis: '🦀', name: 'Краб' },
                                { vis: '🐚', name: 'Раковина' },
                                { vis: '🪼', name: 'Медуза' }
                            ];
                            const mType = minionTypes[m % minionTypes.length];

                            battle.enemies.push({
                                hp: minionHp,
                                max: minionHp,
                                atk: minionAtk,
                                boss: false,
                                vis: mType.vis,
                                name: mType.name,
                                role: 'fighter',
                                effects: [],
                                blocking: false,
                                isLeviathanMinion: true
                            });
                        }
                        showNotice(`🦑 Левиафан призвал ${minionsToSpawn} существ!`, 'error');

                        // Перерисовываем поле боя
                        setTimeout(() => renderBattle(), 200);
                    }
                }
            }


            // Вампиризм
            const vampLvl = countPerks('vamp');
            if (vampLvl > 0) {
                const heal = Math.floor(finalDmg * (0.1 * vampLvl));
                h.curHp = Math.min(h.maxHp, h.curHp + heal);
            }

            // === 7. ВИЗУАЛИЗАЦИЯ (ОБНОВЛЕНИЕ 3.1) ===
            const idx = battle.enemies.indexOf(trg);
            const el = document.getElementById(`enemy-${idx}`);

            if (el) {
                // Тряска
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 400);

                const rect = el.getBoundingClientRect();

                if (isCrit) {
                    // Вспышка
                    el.classList.add('crit-flash');
                    setTimeout(() => el.classList.remove('crit-flash'), 100);

                    // Звук
                    const audio = new Audio('music/crit.mp3');
                    audio.volume = 0.6;
                    audio.play().catch(() => { });

                    // Последовательность текста
                    showFloatText(`-${finalDmg}`, rect.left + 20, rect.top, '#fff');

                    setTimeout(() => {
                        showCritText(critText, rect.left, rect.top - 30);
                        if (isLucky) setTimeout(() => showCritText("LUCKY! x2", rect.left, rect.top - 60), 150);
                    }, 150);
                } else {
                    // Обычный текст - ниже бара ХП врага
                    showFloatText(`-${finalDmg}`, rect.left + 20, rect.top + 40, '#ef4444', 'damage');
                }
            }

            // ПРОВЕРКА СМЕРТИ (ФИКС 1.2)
            if (trg.hp <= 0) {
                trg.hp = 0;
                handleEnemyDeath(trg);
            }
        }

        // --- ЛЕЧЕНИЕ ---
        else if (pendingAct.t === 'heal' || pendingAct.mech === 'heal_all' || pendingAct.mech === 'panacea') {
            targets.forEach(trg => {
                if (trg.curHp <= 0 && pendingAct.mech !== 'revive') return;

                // 🔥 FIX: Начисляем хил от МАКС ХП цели
                let amt = Math.floor(trg.maxHp * (pendingAct.v / 100));
                if (isNaN(amt)) amt = Math.floor(trg.maxHp * 0.2); // Фолбек 20%

                // Бонус хила от статов/перков
                if (h.stats.healMult) amt = Math.floor(amt * (1 + h.stats.healMult / 100));

                trg.curHp = Math.min(trg.maxHp, trg.curHp + amt);
                showFloatText(`+${amt}`, undefined, undefined, '#4ade80', 'heal');
            });
            if (battle.anomaly === 'invert') {
                let dmg = Math.floor(h.stats.atk * 1.5);
                if (pendingAct.t === 'ult') dmg *= 3;
                trg.curHp -= dmg;
                showFloatText(`ИНВЕРСИЯ! -${dmg}`, 200, 200, '#ef4444');
                const el = document.getElementById(trg.id === h.id ? 'hero-vis' : 'enemy-0');
                if (el) { el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 500); }
                return;
            }
            if (battle.anomaly === 'drought') {
                showFloatText("ЗАСУХА (0)", 200, 200, '#f97316');
                return;
            }

            let amt = Math.floor((pendingAct.v * h.stats.stars + h.stats.atk * 0.5) * mult);
            if (h.stats.role === 'support') amt = Math.floor(amt * 1.3);
            if (pendingAct.mech === 'heal_all') amt = Math.floor(h.maxHp * 0.4);

            trg.curHp = Math.min(trg.maxHp, trg.curHp + amt);
            showFloatText(`+${amt}`, 200, 300, '#4ade80');
        }

        // --- ЗАЩИТА (УПРАВЛЕНИЕ СТОЙКОЙ) ---
        else if (pendingAct.t === 'def') {
            battle.defensiveStance = true;
            // Базовый блок сохраняем на случай, если есть другие источники урона
            h.blockVal = 0.5;
            if (h.stats.role === 'tank') h.blockVal = 0.7;

            showFloatText("🛡️ STANCE", 200, 200, '#3b82f6');

            // Визуальный эффект
            const hv = document.getElementById('hero-vis');
            if (hv) {
                hv.style.boxShadow = "0 0 20px #3b82f6";
                setTimeout(() => hv.style.boxShadow = "none", 1000);
            }
        }
    });

    // 8. РЕСУРСЫ И КУЛДАУНЫ
    if (pendingAct.t === 'ult') h.curUlt -= pendingAct.c;
    if (pendingAct.cd) h.cds[pendingIdx] = pendingAct.cd + 1;

    // Сброс КД (кроме Purple Soul)
    if (!(battle.mode === 'soul_trial' && battle.soul === 'purple'))
        h.cds = h.cds.map(c => Math.max(0, c - 1));
    else if (pendingAct.t === 'def')
        h.cds = [0, 0, 0, 0, 0, 0, 0, 0];

    // 🔥 FIX: +1 УЛЬТА ЗА ХОД СТРОГО (БЕЗ БОНУСОВ МАГА)
    h.curUlt = Math.min(10, h.curUlt + 1);
    if (h.buffs.atk_up > 0) h.buffs.atk_up--;
    if (h.buffs.evade_up > 0) h.buffs.evade_up--;

    // Увеличиваем счетчик ходов для max_discharge
    if (!battle.turnCount) battle.turnCount = 0;
    battle.turnCount++;

    // 🔥 КРАСНАЯ ДУША: Регенерация +10% ХП каждый ход
    if (battle.mode === 'soul_trial' && battle.soul === 'red') {
        const regen = Math.floor(h.maxHp * 0.1);
        h.curHp = Math.min(h.maxHp, h.curHp + regen);
        if (regen > 0) showFloatText(`+${regen} РЕГЕН`, 150, 250, '#ef4444');
    }

    // Эхо
    if (battle.anomaly === 'echo' && Math.random() < 0.5 && !battle.echoTriggered) {
        battle.echoTriggered = true;
        showFloatText("ЭХО!", 200, 100, '#c084fc');
        setTimeout(() => doAction(qteResult), 500);
        return;
    }
    battle.echoTriggered = false;

    renderBattle();

    // 9. КОНЕЦ ХОДА
    // 🔥 RIFT MODE: Победа только когда Левиафан убит
    if (battle.mode === 'rift') {
        const leviathan = battle.enemies.find(e => e.isLeviathan);
        if (!leviathan || leviathan.hp <= 0) {
            setTimeout(win, 500);
        } else {
            battle.turn = 'enemy';
            setTimeout(enemyTurn, 200);
        }
    } else {
        if (battle.enemies.every(e => e.hp <= 0)) {
            setTimeout(win, 500);
        } else {
            battle.turn = 'enemy';
            setTimeout(enemyTurn, 200);
        }
    }
}


// --- main.js -> enemyTurn ---

// --- ВСТАВИТЬ ВМЕСТО ДУБЛИКАТА doAction ---

function enemyTurn() {
    // Проверка на конец боя
    // 🔥 RIFT MODE: Победа только когда Левиафан убит
    if (battle.mode === 'rift') {
        const leviathan = battle.enemies.find(e => e.isLeviathan);
        if (!leviathan || leviathan.hp <= 0) {
            win(); return;
        }
    } else {
        if (!battle.active || battle.enemies.every(e => e.hp <= 0)) {
            win(); return;
        }
    }

    battle.turn = 'enemy';

    // 🔥 FIX: Обрабатываем станы врагов в начале их хода
    battle.enemies.forEach(enemy => {
        if (enemy.stun > 0) {
            enemy.stun--;
            if (enemy.stun > 0) {
                showFloatText("💤 STUNNED", 200, 100, '#ffff00');
            }
        }
    });

    // 1. Собираем живых врагов (проверяем stun, silence, frozen)
    let attackers = battle.enemies.filter(e =>
        e.hp > 0 &&
        (e.stun || 0) <= 0 &&
        (e.silence || 0) <= 0 &&
        (e.frozen || 0) <= 0
    );

    // 🔥 LEVIATHAN PRIORITY: Если есть миньоны, босс не атакует
    const hasMinions = attackers.some(e => e.isLeviathanMinion);
    if (hasMinions) {
        attackers = attackers.filter(e => !e.isLeviathan);
    }
    );

    // 🔥 RIFT MODE: На фазах 2-6 приспешники атакуют первыми
    if (battle.mode === 'rift') {
        const leviathan = attackers.find(e => e.isLeviathan);
        const minions = attackers.filter(e => e.isLeviathanMinion);

        if (leviathan && leviathan.phase >= 2 && minions.length > 0) {
            // Приспешники атакуют первыми, затем Левиафан
            attackers = [...minions, leviathan];
        } else if (leviathan && leviathan.phase >= 2) {
            // Если приспешники убиты, атакует только Левиафан
            attackers = [leviathan];
        }
    }

    // Если некому бить (все мертвы или в стане)
    if (attackers.length === 0) {
        setTimeout(() => {
            battle.turn = 'player';
            battle.processing = false;
            // Сброс блока у игрока
            const activeHero = battle.team[battle.turnId];
            if (activeHero) {
                activeHero.blockVal = 0;
                activeHero.reflectVal = 0;
            }
            battle.defensiveStance = false; // Reset Stance
            renderBattle(); renderSkills();
        }, 1000);
        return;
    }

    // 2. Создаем очередь атак
    battle.attackQueue = attackers;
    processEnemyAttack();
}

// --- НОВАЯ ФУНКЦИЯ (ВСТАВИТЬ РЯДОМ С enemyTurn) ---
function processEnemyAttack() {
    if (!battle.attackQueue || battle.attackQueue.length === 0) {
        // Все враги походили -> Ход игрока
        battle.turn = 'player';
        battle.processing = false;

        // Сброс блока
        const activeHero = battle.team[battle.turnId];
        if (activeHero) {
            activeHero.blockVal = 0;
            activeHero.reflectVal = 0;
        }

        battle.defensiveStance = false; // Reset Stance for next turn

        renderBattle(); renderSkills();
        return;
    }

    // Берем следующего врага
    let enemy = battle.attackQueue.shift();

    // === ПРОВЕРКА ЭФФЕКТОВ НА ВРАГЕ ===
    // Silence - враг не может атаковать
    if (enemy.silence && enemy.silence > 0) {
        showFloatText("🔇 SILENCED", 200, 100, '#8b5cf6');
        enemy.silence--;
        setTimeout(processEnemyAttack, 400);
        return;
    }
    // 🔥 FIX: Если враг умер (от рефлекта в этом же ходу)
    if (enemy.hp <= 0) {
        setTimeout(processEnemyAttack, 100);
        return;
    }
    // Frozen - враг заморожен
    if (enemy.frozen && enemy.frozen > 0) {
        showFloatText("❄️ FROZEN", 200, 100, '#00ffff');
        enemy.frozen--;
        setTimeout(processEnemyAttack, 400);
        return;
    }
    // 4. КОНЕЦ ХОДА ВРАГА (Сбрасываем статус)
    enemy.silence = Math.max(0, (enemy.silence || 0) - 1);
    enemy.stun = Math.max(0, (enemy.stun || 0) - 1);
    enemy.frozen = Math.max(0, (enemy.frozen || 0) - 1);
    enemy.bleed = Math.max(0, (enemy.bleed || 0) - 1);
    enemy.burn = Math.max(0, (enemy.burn || 0) - 1);
    enemy.poison = Math.max(0, (enemy.poison || 0) - 1);

    // Удаляем мертвых врагов (на всякий случай)
    battle.enemies = battle.enemies.filter(e => e.hp > 0);
    // Charm - враг бьет своих
    if (enemy.charm && enemy.charm > 0) {
        showFloatText("🦩 CHARMED!", 200, 100, '#e879f9');
        // Враг бьет случайного союзника-врага
        const enemyTargets = battle.enemies.filter(e => e.hp > 0 && e !== enemy);
        if (enemyTargets.length > 0) {
            const randomTarget = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
            const charmDmg = Math.floor(enemy.atk * 0.8);
            randomTarget.hp = Math.max(0, randomTarget.hp - charmDmg);
            const targetIdx = battle.enemies.indexOf(randomTarget);
            const targetEl = document.getElementById(`enemy-${targetIdx}`);
            if (targetEl) {
                showFloatText(`-${charmDmg} 🦩`, targetEl.getBoundingClientRect().left + 20, targetEl.getBoundingClientRect().top, '#e879f9');
            }
            enemy.charm--;
            setTimeout(processEnemyAttack, 400);
            return;
        }
        enemy.charm--;
    }

    // 🔥 FIX: Урон наносится только на действующего персонажа (который походил в этом ходе)
    let target = battle.team[battle.turnId];
    if (!target || target.curHp <= 0) {
        // Если действующий мертв, ищем следующего живого
        const nextId = st.squad.find(id => battle.team[id].curHp > 0);
        if (nextId) {
            battle.turnId = nextId;
            target = battle.team[nextId];
        } else {
            lose(); return;
        }
    }

    // Показываем уведомление
    showFloatText("⚠️ ATTACK!", 200, 200, 'red');

    // Анимация врага
    const enIdx = battle.enemies.indexOf(enemy);
    const elEn = document.getElementById(`enemy-${enIdx}`);
    if (elEn) {
        elEn.style.transform = "translateY(20px)";
        setTimeout(() => elEn.style.transform = "translateY(0)", 200);
    }

    // Запоминаем атаку для QTE
    battle.pendingEnemyAttack = { enemy, target };

    // Проверка стойки: Если есть защитная стойка, вызываем QTE (Множественное парирование)
    if (battle.defensiveStance) {
        setTimeout(() => {
            showQTE("🛡️ БЛОК!", "def");
        }, 250); // FIX SPEED: 500 -> 250
    } else {
        // Иначе авто-расчет (без QTE)
        setTimeout(() => {
            resolveEnemyAttack('auto');
        }, 250); // FIX SPEED: 500 -> 250 (Быстрые атаки)
    }
}

// --- НОВАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ УРОНА ПОСЛЕ QTE ---
function resolveEnemyAttack(qteResult) {
    // 🔥 FIX: Проверка на существование pendingEnemyAttack
    if (!battle.pendingEnemyAttack || !battle.pendingEnemyAttack.enemy || !battle.pendingEnemyAttack.target) {
        console.error("pendingEnemyAttack is undefined!");
        battle.turn = 'player';
        battle.processing = false;
        renderBattle();
        renderSkills();
        return;
    }
    const { enemy, target } = battle.pendingEnemyAttack;

    let dmg = enemy.atk;
    let text = "";
    let color = "red";

    // 🔥 ЖЕЛТАЯ ДУША: Входящий урон x1.5
    if (battle.mode === 'soul_trial' && battle.soul === 'yellow') {
        dmg = Math.floor(dmg * 1.5);
    }

    //🔥 LEVIATHAN PHASE-SPECIFIC ATTACKS
    if (enemy.isLeviathan && enemy.phase) {
        switch (enemy.phase) {
            case 1:
                // Фаза 1: Обычная атака (без изменений)
                break;
            case 2:
                // Фаза 2: Кровотечение
                dmg = Math.floor(dmg * 1.2);
                target.bleed = (target.bleed || 0) + 2;
                showFloatText("🩸 BLEED!", 150, 250, 'red');
                break;
            case 3:
                // Фаза 3: Оглушение
                dmg = Math.floor(dmg * 1.3);
                target.stun = (target.stun || 0) + 1;
                showFloatText("💤 STUN!", 150, 250, 'yellow');
                break;
            case 4:
                // Фаза 4: AOE атака (весь отряд) - ПОМЕТКА ДЛЯ resolveEnemyAttack
                showFloatText("🌊 TIDAL WAVE!", 200, 150, '#00ffff');
                break;
            case 5:
                // Фаза 5: Дебафф защиты
                dmg = Math.floor(dmg * 1.6);
                target.def_down = (target.def_down || 0) + 3;
                showFloatText("🛡️ ARMOR BREAK!", 150, 250, 'gray');
                break;
            case 6:
                // Фаза 6: Тяжелая атака (вместо Ваншота)
                if (target.curHp / target.maxHp < 0.3) {
                    dmg = Math.floor(target.curHp * 0.8 + target.maxHp * 0.1);
                } else {
                    dmg = Math.floor(dmg * 2.0);
                }
                showFloatText("👁️ ABYSSAL STARE", 200, 150, '#a855f7');
                const extraHits = Math.floor(Math.random() * 2) + 1; // 1-2 доп атаки
                for (let i = 0; i < extraHits; i++) {
                    setTimeout(() => {
                        const extraDmg = Math.floor(enemy.atk * 0.7);
                        target.curHp -= extraDmg;
                        showFloatText(`-${extraDmg} (x${i + 2})`, 150, 300, '#ff4444');
                        renderBattle();
                    }, 400 * (i + 1));
                }
                break;
        }
    }

    // Логика защиты
    if (qteResult === 'perfect') {
        dmg = 0; // Полная защита
        text = "PERFECT BLOCK!";
        color = "#4ade80";

        // Контрудар (если есть перк шипов или просто механика)
        if (target.stats.thorns) {
            enemy.hp -= Math.floor(dmg * 0.5);
            showFloatText("COUNTER!", 200, 150, '#fff');
        }

        // Электрический контр-урон от Кашимо
        if (target.counter_electric && target.counter_electric > 0) {
            const electricCounterDmg = Math.floor(enemy.atk * (target.counter_electric / 100));
            enemy.hp = Math.max(0, enemy.hp - electricCounterDmg);
            enemy.electric_mark = (enemy.electric_mark || 0) + 1; // Помечаем электричеством
            showFloatText(`⚡ COUNTER -${electricCounterDmg}`, 200, 150, '#ffff00');
            target.counter_electric--;
        }

        // 🔥 FIX: REFLECTION ON PERFECT BLOCK (50% ATK)
        let reflect = Math.floor(enemy.atk * 0.5);
        enemy.hp -= reflect;
        showFloatText(`REFLECT -${reflect}`, 200, 150, '#00ffff');

        // Проверка смерти врага от рефлекта
        if (enemy.hp <= 0) {
            enemy.hp = 0;
            handleEnemyDeath(enemy);
        }

    } else if (qteResult === 'normal') {
        dmg = Math.floor(dmg * 0.5); // 50% урона
        text = "BLOCKED";
        color = "yellow";
    } else if (qteResult === 'auto') {
        // АВТО-УКЛОНЕНИЕ (Если нет стойки)
        let evadeChance = target.stats.evade || 0;
        if (target.buffs && target.buffs.evade_up) evadeChance += 50;

        if (Math.random() * 100 < evadeChance) {
            dmg = 0;
            text = "DODGE!";
            color = "#60a5fa";
        } else {
            text = `-${dmg}`;
            // Учет обычной брони
            if (target.blockVal > 0) {
                dmg = Math.max(0, dmg - target.blockVal);
                text = `-${dmg} (Armor)`;
                color = "gray";
            }
        }
    } else {
        // Miss = Полный урон
        text = `-${dmg}`;
    }

    // Наносим урон герою
    if (dmg > 0) {
        target.curHp -= dmg;
        // Тряска экрана
        const app = document.querySelector('.app');
        if (app) { app.classList.add('shake'); setTimeout(() => app.classList.remove('shake'), 300); }
    }

    showFloatText(text, 150, 300, color);
    renderBattle();

    // Проверяем смерть героя
    if (target.curHp <= 0) {
        // Пытаемся сменить героя
        const nextId = st.squad.find(id => battle.team[id].curHp > 0);
        if (nextId) {
            battle.turnId = nextId;
            showNotice("Смена героя!", "warning");
            renderSkills();
        } else {
            lose(); return;
        }
    }

    // Следующий враг через 0.4 сек (FIX SPEED: 1000 -> 400)
    setTimeout(processEnemyAttack, 400);
}

function win() {
    battle.processing = false;

    // --- ЛОГИКА РЕЙДА ---
    if (battle.mode === 'raid') {
        const startHp = battle.raidStartHp || battle.enemies[0].max;
        const currentHp = Math.max(0, battle.enemies[0].hp);
        const dmgDealt = startHp - currentHp;

        if (dmgDealt > 0 && window.submitRaidDamage) window.submitRaidDamage(dmgDealt);

        showNotice(`Рейд окончен! Урон: ${dmgDealt}`, 'success');

        // 🔥 ФИКС ВЫХОДА ИЗ РЕЙДА 🔥
        setTimeout(() => {
            battle.active = false;

            // 1. Прячем бой, показываем меню
            document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
            document.getElementById('screen-menu').style.display = 'flex';
            document.getElementById('screen-battle').classList.remove('active');

            // 2. Возвращаем музыку и фон меню
            // Если st.world вдруг сломался, ставим дефолт
            if (!st.world) st.world = 'jjk';
            updateAtmosphere();

            // 3. Открываем вкладку клана
            const btn = document.getElementById('nav-clan');
            if (btn) window.switchTab('clan', btn);
            else window.switchTab('main', document.getElementById('nav-main')); // Если клана нет, то в главное

        }, 1000); // FIX SPEED: 2000 -> 1000
        return;
    }

    // 1. НАЧИСЛЕНИЕ ОПЫТА (ОБЫЧНАЯ ИГРА)
    let xpGain = 10 * st.curFloor;
    if (st.upgrades.xpMult) xpGain = Math.floor(xpGain * (1 + st.upgrades.xpMult * 0.1));

    st.squad.forEach(id => {
        const h = st.heroes[id];
        if (h) {
            h.exp = (h.exp || 0) + xpGain;
            let needed = h.lvl * 100;
            while (h.exp >= needed) {
                h.lvl++; h.exp -= needed; needed = h.lvl * 100;
                showNotice(`🆙 ${window.DB[id].n} уровень повышен! (${h.lvl})`, 'level');
            }
        }
    });

    // 2. СОХРАНЕНИЕ В ЛИДЕРБОРДЫ
    if (userId && db) {
        let collectionName = '';
        let score = 0;
        if (battle.mode === 'rift') { collectionName = 'leaderboard_rift'; score = st.riftFloor; }
        else if (battle.mode === 'pvp') {
            db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('arena_squads').doc(userId).update({ rank: st.arenaRank }).catch(e => { });
        } else { collectionName = 'leaderboard_' + st.world; score = st.floors[st.world]; }

        if (collectionName && battle.mode !== 'pvp') {
            db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection(collectionName).doc(userId).set({
                name: st.nickname, title: st.currentTitle || "", floor: score, ts: Date.now()
            }).catch(console.error);
        }
    }

    // 3. ВЫДАЧА НАГРАД
    let rewardText = "";
    if (battle.mode === 'rift') {
        // ... (Твой код Разлома) ...
        let crystals = Math.floor(st.riftFloor / 5) + 1;
        if (st.riftFloor % 10 === 0) crystals += 5;
        if (st.riftFloor === 100) crystals += 100;
        st.soulCrystals = (st.soulCrystals || 0) + crystals;

        // 🔥 LEVIATHAN REWARD (Floor 100)
        if (st.riftFloor === 100) {
            // Award Guardian hero
            if (!st.heroes['guardian']) {
                st.heroes['guardian'] = { lvl: 1, stars: 1, duplicates: 0, exp: 0, upgrades: 0 };
            } else {
                st.heroes['guardian'].duplicates++;
            }

            // Award ВЛАДЫКА title
            if (!st.unlockedTitles) st.unlockedTitles = [];
            if (!st.unlockedTitles.includes('ВЛАДЫКА')) {
                st.unlockedTitles.push('ВЛАДЫКА');
            }
            st.currentTitle = 'ВЛАДЫКА';

            showNotice("🐋 ЛЕВИАФАН ПОВЕРЖЕН!\n\n🎁 Получено:\n • Хранитель\n • Титул: ВЛАДЫКА", 'level');
            save();
        }

        st.riftFloor++;
        rewardText = `+${crystals} 👻 Soul Crystals`;

    } else if (battle.mode === 'pvp') {
        // ... (Твой код ПВП) ...
        st.arenaWins++; st.arenaRank += 25; st.gems += 50;
        rewardText = `+25 🏆 Rank, +50 💎`;

    } else if (battle.mode === 'soul_trial') {
        // 🔥 ВОТ ТОТ САМЫЙ БЛОК, КОТОРЫЙ НУЖНО ДОБАВИТЬ 🔥
        // Мы даем награду, но НЕ повышаем этаж башни (st.floors)
        st.soulCrystals = (st.soulCrystals || 0) + 50;
        rewardText = `+50 👻 (Испытание пройдено)`;
        // Важно: тут нет st.floors[st.world]++

    } else {
        // ОБЫЧНАЯ БАШНЯ (Блок else)
        let gMult = 1 + (st.upgrades.goldMult || 0) * 0.1;
        let pMult = 1 + countPerks('gold') * 0.3;
        let gain = Math.floor(50 * st.curFloor * gMult * pMult);

        // 🔥 FIX: XP Gain for all heroes in squad (including Gaster)
        let xpGain = Math.floor(10 * st.curFloor);
        st.squad.forEach(id => {
            const h = st.heroes[id];
            if (h) {
                h.exp = (h.exp || 0) + xpGain;
                // Левел-ап проверка
                const nextExp = h.lvl * 100;
                if (h.exp >= nextExp) {
                    h.exp -= nextExp;
                    h.lvl++;
                    showNotice(`${window.DB[id].n} LVL UP!`, 'level');
                }
            }
        });

        // Award Gold directly
        st.gold = (st.gold || 0) + gain;
        rewardText = `+${gain} G, +${xpGain} XP (ALL)`;

        if (st.curFloor % 10 === 0) {
            // Эволюция Итадори только если он в отряде
            if (st.squad.includes('itadori')) {
                track('bossKills');
            }

            let baseGems = 10;
            let hunterCount = countPerks('boss_hunter');
            let totalGems = baseGems + (hunterCount * 10);
            st.gems += totalGems;
            rewardText += `, +${totalGems} 💎`;
        }

        // Повышаем этаж ТОЛЬКО ТУТ
        if (!st.floors[st.world]) st.floors[st.world] = 1;
        st.floors[st.world]++;
        if (st.curFloor > st.maxTowerFloor) st.maxTowerFloor = st.curFloor;
    }

    if (userId && db && battle.mode !== 'pvp' && battle.mode !== 'soul_trial')

        save(); updateUI();

    // 🔥 FIX: PERK CHECK BEFORE AUTO-CONTINUE
    // Check if the floor we just beat (curFloor - 1) was a multiple of 5
    // Note: st.curFloor is already incremented here (it is the NEXT floor)
    let justBeatFloor = st.curFloor - 1;
    if (battle.mode === 'tower' && justBeatFloor > 0 && justBeatFloor % 5 === 0) {
        showPerkSelection();
        return; // Stop here, wait for player to pick perk
    }

    // 🔥 АВТО-ПРОДОЛЖЕНИЕ (RIFT + ОБЫЧНАЯ БАШНЯ)
    if (battle.mode === 'rift' || battle.mode === 'tower' || !battle.mode) {
        showFloatText("NEXT STAGE...", window.innerWidth / 2, window.innerHeight / 2, '#4ade80');
        setTimeout(() => {
            // Если Рифт - startRift(), если Башня - startBattle(st.curFloor)
            if (battle.mode === 'rift') startRift();
            else startBattle(st.curFloor);
        }, 1500);
        return; // Пропускаем окно победы
    }

    // --- ОБНОВЛЕНИЕ ОКНА ПОБЕДЫ (ТОЛЬКО ДЛЯ ОСОБЫХ РЕЖИМОВ) ---
    // Убрано - больше не показываем окно победы после выбора перков
}

function lose() {
    battle.active = false;
    battle.processing = false;
    track('deaths', 1);
    updateAtmosphere();

    // Deferred gold payout removed - gold is now awarded per victory

    // --- ЛОГИКА РЕЙДА ПРИ ПОРАЖЕНИИ ---
    if (battle.mode === 'raid') {
        const startHp = battle.raidStartHp || battle.enemies[0].max;
        const currentHp = Math.max(0, battle.enemies[0].hp);

        const dmgDealt = startHp - currentHp;

        if (dmgDealt > 0) submitRaidDamage(dmgDealt);

        showNotice(`Вы пали! Урон: ${dmgDealt.toLocaleString()}`, 'error');

        setTimeout(() => {
            document.getElementById('screen-battle').classList.remove('active');
            document.getElementById('screen-battle').style.display = 'none';
            document.getElementById('screen-menu').style.display = 'flex';
            const btn = document.getElementById('nav-clan');
            if (btn) window.switchTab('clan', btn);
        }, 2000);
        return;
    }
    if (battle.mode === 'soul_trial') {
        battle.soul = null; // Стираем душу
        battle.soulData = {}; // Стираем данные души
        showNotice("Испытание провалено!", 'error');
        // Здесь мы НЕ сбрасываем st.floors, так как это отдельный режим
    }
    else if (battle.mode === 'raid') {
        const startHp = battle.raidStartHp || battle.enemies[0].max;
        const currentHp = Math.max(0, battle.enemies[0].hp);
        const dmgDealt = startHp - currentHp;

        if (dmgDealt > 0) submitRaidDamage(dmgDealt);

        showNotice(`Вы пали! Урон: ${dmgDealt.toLocaleString()}`, 'error');

        setTimeout(() => {
            document.getElementById('screen-battle').classList.remove('active');
            document.getElementById('screen-battle').style.display = 'none';
            document.getElementById('screen-menu').style.display = 'flex';
            const btn = document.getElementById('nav-clan');
            if (btn) window.switchTab('clan', btn);
        }, 2000);
        return;
    }
    else if (battle.mode === 'rift') {
        showNotice(`Вы пали в Разломе на ${st.riftFloor} этаже!`, 'error');
        st.riftFloor = 1;
    }
    else if (battle.mode === 'pvp') {
        st.arenaRank = Math.max(0, st.arenaRank - 15);
        showNotice("Поражение на Арене! -15 Рейтинга", 'error');
    }
    else {
        // ОБЫЧНАЯ БАШНЯ (Сброс прогресса)
        st.floors[st.world] = 1;
        if (st.world === 'jjk') st.runPerks_jjk = [];
        if (st.world === 'op') st.runPerks_op = [];
        if (st.world === 'jojo') st.runPerks_jojo = [];
        showNotice("Вы проиграли! Этаж и перки сброшены.", 'error');
    }

    updateAtmosphere();
    save();
    updateUI();
    safeDisplay('modal-win', 'none');

    // Небольшая задержка перед выходом в меню
    setTimeout(goToMenu, 1000);

    if (battle.mode === 'rift') {
        showNotice(`Вы пали в Разломе на ${st.riftFloor} этаже!`, 'error');
        st.riftFloor = 1;
    } else if (battle.mode === 'pvp') {
        st.arenaRank = Math.max(0, st.arenaRank - 15);
        showNotice("Поражение на Арене! -15 Рейтинга", 'error');
    } else {
        st.floors[st.world] = 1;
        if (st.world === 'jjk') st.runPerks_jjk = [];
        if (st.world === 'op') st.runPerks_op = [];
        if (st.world === 'jojo') st.runPerks_jojo = [];
        showNotice("Вы проиграли! Этаж и перки сброшены.", 'error');
    }

    save(); updateUI();
    safeDisplay('modal-win', 'none');
    goToMenu();
}

function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(st)); }

function toggleMusic() {
    const audio = document.getElementById('bgm');
    const img = document.getElementById('img-music'); // Ищем картинку внутри кнопки

    if (audio.paused) {
        audio.play().then(() => {
            isMusicOn = true;
            // Меняем на иконку звука (ВКЛ)
            if (img) img.src = "img/icons/icon_sound.png";
            updateAtmosphere();
        }).catch(() => { });
    } else {
        audio.pause();
        isMusicOn = false;
        // Меняем на иконку БЕЗ звука (ВЫКЛ)
        if (img) img.src = "img/icons/icon_sound_off.png";
    }
}

// В файле main.js замените старую функцию toggleSquad на эту:

// --- ИСПРАВЛЕННАЯ СМЕНА ОТРЯДА (FIX: GASTER & UNLOCKS) ---


function toggleChange(id) {
    // 1. Проверка: Открыт ли герой?
    const heroData = st.heroes[id];
    if (!heroData || heroData.stars <= 0) {
        return showNotice("Этот герой еще не открыт!", "error");
    }

    // === ЛОГИКА ГАСТЕРА (УНИКАЛЬНАЯ) ===
    // Гастер всегда требует одиночества
    if (id === 'gaster') {
        st.squad = ['gaster']; // Очищаем всех, ставим Гастера
        save(); updateUI(); openHero(id);
        showNotice("☝︎ DARKER YET DARKER...", 'error');
        if (window.updateAtmosphere) window.updateAtmosphere();
        return;
    }

    // Если сейчас стоит Гастер, а мы берем кого-то другого — Гастер уходит
    if (st.squad.includes('gaster')) {
        st.squad = []; // Очищаем отряд (удаляем Гастера)
        // И код идет дальше, добавляя нового героя в пустой отряд
    }

    // === СТАНДАРТНАЯ ЛОГИКА (ВКЛЮЧАЯ DIVINE) ===
    const idx = st.squad.indexOf(id);

    if (idx > -1) {
        // --- УДАЛЕНИЕ ИЗ ОТРЯДА ---
        if (st.squad.length > 1) {
            st.squad.splice(idx, 1);
            showNotice("Убран из отряда", "warning");
        } else {
            showNotice("В отряде должен быть хотя бы 1 герой!", 'error');
            return;
        }
    } else {
        // --- ДОБАВЛЕНИЕ В ОТРЯД ---

        // Лимит мест (База 4 + Бонусы Клана)
        let limit = 4;
        const clanBonus = (st.clanId && window.clanData) ? (window.clanData.upgrades?.members || 0) : 0;

        // Если есть бонус клана, добавляем +1 слот (максимум 5)
        if (clanBonus > 0) limit = 5;

        // Если отряд полон — удаляем ПЕРВОГО (FIFO), чтобы освободить место
        if (st.squad.length >= limit) {
            st.squad.shift();
        }

        st.squad.push(id);
        showNotice("Добавлен в отряд!", "success");
    }

    save();
    updateUI();
    openHero(id); // Обновляем кнопку (В ОТРЯД / УБРАТЬ)
}
// Обертка для проверки сброса прогресса (оставляем без изменений, но вызываем новую toggleChange)
function toggleSquad(id) {
    let hasProgress = (st.floors[st.world] > 1) || (st.riftFloor > 1) ||
        (st.world === 'jjk' && st.runPerks_jjk.length > 0) ||
        (st.world === 'op' && st.runPerks_op.length > 0) ||
        (st.world === 'jojo' && st.runPerks_jojo.length > 0);

    if (hasProgress) {
        showConfirm("Смена состава сбросит ЭТАЖ. Продолжить?", (yes) => {
            if (yes) {
                st.floors[st.world] = 1; st.curFloor = 1; st.riftFloor = 1;
                if (st.world === 'jjk') st.runPerks_jjk = [];
                if (st.world === 'op') st.runPerks_op = [];
                if (st.world === 'jojo') st.runPerks_jojo = [];
                if (st.world === 'ut') st.runPerks_ut = []; // Сброс для UT
                toggleChange(id);
            }
        });
    } else {
        toggleChange(id);
    }
}

async function saveToCloud() {
    if (!userId || !db) return showNotice("Нет соединения с сервером!", 'error');
    try {
        await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('cloud_saves').doc(userId).set({ data: JSON.stringify(st), ts: Date.now() });
        showNotice(`УСПЕХ!\nID для загрузки: ${userId}`, 'success');
    } catch (e) { showNotice("Ошибка сохранения: " + e.message, 'error'); }
}

async function loadFromCloud() {
    if (!db) return showNotice("Нет сети!", 'error');
    let targetId = document.getElementById('inp-recover-id').value.trim();
    if (!targetId) targetId = userId;
    if (!targetId) return showNotice("Введите ID!", 'error');

    try {
        const doc = await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('cloud_saves').doc(targetId).get();
        if (doc.exists) {
            const saved = JSON.parse(doc.data().data);
            st = { ...st, ...saved };
            save(); updateUI();
            showNotice("Загружено!", 'success');
        } else {
            showNotice("Сохранение не найдено.", 'error');
        }
    } catch (e) { showNotice("Ошибка: " + e.message, 'error'); }
}

function saveSettings() {
    // Получаем значение из поля ввода
    const nickInput = document.getElementById('inp-nickname').value;

    // --- ФИКС: Сохраняем ник только если поле не пустое ---
    if (nickInput && nickInput.trim() !== "") {
        st.nickname = nickInput.trim();
    }

    // Титул сохраняем всегда (он выбирается из списка)
    st.currentTitle = document.getElementById('inp-title').value;

    save();
    updateUI();
    safeDisplay('modal-settings', 'none');
}

function openSettings() {
    safeDisplay('modal-settings', 'flex');
    const sel = document.getElementById('inp-title');
    sel.innerHTML = '<option value="">Нет титула</option>';
    if (st.unlockedTitles) {
        st.unlockedTitles.forEach(t => {
            sel.innerHTML += `<option value="${t}" ${st.currentTitle === t ? 'selected' : ''}>${t}</option>`;
        });
    }
}

// FIX: New Perk Viewer (Пункт 2)
window.showPerksList = () => {
    let perks = [];
    if (st.world === 'jjk') perks = st.runPerks_jjk || [];
    else if (st.world === 'op') perks = st.runPerks_op || [];
    else if (st.world === 'jojo') perks = st.runPerks_jojo || [];
    else if (st.world === 'ut') perks = st.runPerks_ut || [];
    else if (st.world === 'dr') perks = st.runPerks_dr || [];

    // 🔥 FIX: Показываем перки во время забега
    // Если мы в бою и есть активные перки, показываем их
    if (battle.active && perks.length === 0) {
        return showNotice("Нет активных перков в этом забеге", 'info');
    }

    // Изоляция: Если ПВП или Разлом, перков нет
    if (battle.mode === 'rift' || battle.mode === 'pvp') {
        if (!battle.active) perks = [];
    }

    if (!perks || perks.length === 0) {
        if (battle.active) {
            return showNotice("В этом режиме перки не работают!", 'error');
        } else {
            return showNotice("Нет активных перков", 'info');
        }
    }

    // Создаем красивое модальное окно
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';

    let listHtml = '';
    perks.forEach(pid => {
        const p = window.PERKS_DB ? window.PERKS_DB.find(x => x.id === pid) : null;
        if (p) {
            listHtml += `<div class="card glass" style="display:flex; align-items:center; margin-bottom:5px;">
                <div style="font-size:1.5rem; margin-right:10px;">${p.i}</div>
                <div>
                    <div style="font-weight:bold; color:var(--color-gold)">${p.n}</div>
                    <div style="font-size:0.7rem; color:#aaa">${p.d}</div>
                </div>
            </div>`;
        }
    });

    overlay.innerHTML = `
        <div class="modal-box glass" style="max-height:80vh; overflow-y:auto;">
            <h2>🎁 АКТИВНЫЕ ДАРЫ</h2>
            <div style="margin-bottom:15px;">${listHtml}</div>
            <button class="btn-main" onclick="this.closest('.overlay').remove()">ЗАКРЫТЬ</button>
        </div>
    `;

    document.body.appendChild(overlay);
};

window.switchTab = (t, btn) => {
    // 1. Сбрасываем активные кнопки внизу
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
        const navBtn = document.getElementById('nav-' + t);
        if (navBtn) navBtn.classList.add('active');
    }

    // 2. ЕСЛИ НАЖАЛИ "КЛАН" (Это отдельный экран)
    if (t === 'clan') {
        // Скрываем все экраны
        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        // Показываем экран клана
        const clanScreen = document.getElementById('screen-clan');
        if (clanScreen) {
            clanScreen.style.display = 'flex';
            clanScreen.classList.add('active');
            if (window.renderClanScreen) window.renderClanScreen(); // Загружаем данные
        }
        return;
    }

    // 3. ОБЫЧНЫЕ ВКЛАДКИ (Герои, Магазин, Доп режимы и т.д.)
    // Скрываем экраны боя и клана, включаем меню
    const clanScreen = document.getElementById('screen-clan');
    if (clanScreen) clanScreen.style.display = 'none';
    const battleScreen = document.getElementById('screen-battle');
    if (battleScreen) battleScreen.style.display = 'none';

    const menu = document.getElementById('screen-menu');
    if (menu) {
        menu.style.display = 'flex';
        menu.classList.add('active');
    }

    // Переключаем вкладки внутри меню
    document.querySelectorAll('.tab-content').forEach(e => e.style.display = 'none');
    const target = document.getElementById('tab-' + t);
    if (target) target.style.display = 'block';

    updateUI();
};

// 🔥 FIX: Функции сохранения/загрузки отрядов (3 слота)
window.saveSquadToSlot = (slot) => {
    if (slot < 0 || slot > 2) return;
    if (!st.savedSquads) st.savedSquads = [{}, {}, {}];

    // Сохраняем текущий отряд
    st.savedSquads[slot] = {
        squad: [...st.squad],
        world: st.world,
        timestamp: Date.now()
    };
    save();
    renderSavedSquads(); // 🔥 Refresh UI
    showNotice(`Отряд сохранен в слот ${slot + 1}!`, 'success');
};

window.loadSquadFromSlot = (slot) => {
    if (slot < 0 || slot > 2) return;
    if (!st.savedSquads || !st.savedSquads[slot] || !st.savedSquads[slot].squad) {
        showNotice(`Слот ${slot + 1} пуст!`, 'error');
        return;
    }

    const saved = st.savedSquads[slot];

    // Проверка прогресса
    let hasProgress = (st.floors[st.world] > 1) || (st.riftFloor > 1) ||
        (st.world === 'jjk' && st.runPerks_jjk && st.runPerks_jjk.length > 0) ||
        (st.world === 'op' && st.runPerks_op && st.runPerks_op.length > 0) ||
        (st.world === 'jojo' && st.runPerks_jojo && st.runPerks_jojo.length > 0) ||
        (st.world === 'ut' && st.runPerks_ut && st.runPerks_ut.length > 0);

    if (hasProgress) {
        showConfirm("Смена отряда сбросит этажи и перки. Продолжить?", (yes) => {
            if (yes) {
                st.squad = [...saved.squad];
                st.floors[st.world] = 1;
                st.curFloor = 1;
                st.riftFloor = 1;
                if (st.world === 'jjk') st.runPerks_jjk = [];
                if (st.world === 'op') st.runPerks_op = [];
                if (st.world === 'jojo') st.runPerks_jojo = [];
                if (st.world === 'ut') st.runPerks_ut = [];
                save();
                updateUI();
                renderSavedSquads(); // 🔥 Refresh UI
                showNotice(`Отряд загружен из слота ${slot + 1}!`, 'success');
            }
        });
    } else {
        st.squad = [...saved.squad];
        save();
        updateUI();
        renderSavedSquads(); // 🔥 Refresh UI
        showNotice(`Отряд загружен из слота ${slot + 1}!`, 'success');
    }
};

function renderSavedSquads() {
    const cid = 'saved-squads-container-home';
    if (!st.savedSquads) st.savedSquads = [{}, {}, {}];

    const el = document.getElementById(cid);
    if (!el) return;

    let html = '';
    for (let i = 0; i < 3; i++) {
        const data = st.savedSquads[i];
        const isExist = data && data.squad && data.squad.length > 0;

        let iconsHtml = '';
        if (isExist) {
            data.squad.forEach(id => {
                const d = window.DB[id];
                if (d) iconsHtml += `<div class="slot-p-icon">${d.v}</div>`;
            });
        } else {
            iconsHtml = '<div class="slot-empty-text">ПУСТОЙ СЛОТ</div>';
        }

        html += `
            <div class="saved-slot-card glass">
                <div class="slot-info">
                    <div class="slot-title">СЛОТ ${i + 1}</div>
                    <div class="slot-preview">${iconsHtml}</div>
                </div>
                <div class="slot-actions">
                    <button class="icon-btn slot-btn" onclick="window.saveSquadToSlot(${i})" title="Сохранить текущий">💾</button>
                    <button class="icon-btn slot-btn" style="background:#4ade80; color:#000;" onclick="window.loadSquadFromSlot(${i})" title="Загрузить">▶️</button>
                </div>
            </div>
        `;
    }
    el.innerHTML = html;
}
window.renderSavedSquads = renderSavedSquads;

window.openSettings = openSettings;
window.saveSettings = saveSettings;
window.setHeroFilter = (f, btn) => { currentHeroFilter = f; updateUI(); };
window.preBattle = () => { battle.mode = 'tower'; startBattle(st.curFloor); };
window.startRift = startRift;
window.setWorld = setWorld;
window.openHero = openHero;
window.safeDisplay = safeDisplay;
window.nextFloor = () => {
    // ФИКС 3: Если ПВП - ищем нового врага, иначе идем на след этаж
    if (battle.mode === 'pvp') {
        window.findMatch();
    } else {
        startBattle(battle.mode === 'rift' ? st.riftFloor : st.curFloor);
    }
};
// --- ОБНОВИТЬ В MAIN.JS ---

window.goToMenu = () => {
    battle.active = false;
    battle.team = {}; // Force Clear Team

    // 🔥 ФИКС: Очистка всего мусора
    st.runPerks_ut = []; // Fix UT Stack Bug

    clearVisualEffects();
    clearAllNotices();
    updateAtmosphere();

    safeDisplay('modal-win', 'none');
    safeDisplay('modal-perks', 'none');

    // Force hide battle screen
    const battleScreen = document.getElementById('screen-battle');
    battleScreen.classList.remove('active');
    battleScreen.style.display = 'none';

    // Force show menu screen
    const menu = document.getElementById('screen-menu');
    menu.classList.add('active');
    menu.style.display = 'flex';

    // Scroll to top
    window.scrollTo(0, 0);
};

window.adminArenaWipe = async () => {
    if (!db) return showNotice("No DB!", 'error');
    if (!confirm("Удалить ВСЕХ с арены?")) return;
    try {
        const q = await db.collection('artifacts').doc('base-73318').collection('public').doc('data').collection('arena_squads').get();
        q.forEach(doc => doc.ref.delete());
        showNotice("Арена очищена!", 'success');
    } catch (e) { console.error(e); }
};

window.selectTarget = (i) => { battle.targetIdx = i; renderBattle(); };
window.switchHero = (id) => { if (battle.team[id].curHp > 0) { battle.turnId = id; renderBattle(); renderSkills(); } };
window.handleQTEClick = handleQTEClick;
window.toggleMusic = toggleMusic;
window.openAltar = openAltar;
window.buyAltarUpgrade = buyAltarUpgrade;
window.recycleDuplicates = recycleDuplicates;
window.doPrestige = doPrestige;
window.useLimitBreak = () => showNotice("Limit Break!", 'info');
window.openLeaderboard = () => safeDisplay('modal-leaderboard', 'flex');
window.checkCode = checkCode;
window.saveToCloud = saveToCloud;
window.loadFromCloud = loadFromCloud;
window.openQuests = openQuests;
window.switchQuestTab = switchQuestTab;
window.claimQuest = claimQuest;
window.trackClick = trackClick;

// ==========================================
// СИСТЕМА КЛАНОВ v5.0 (ФИНАЛ: ВСЕ ФУНКЦИИ В ОДНОМ МЕСТЕ)
// ==========================================

let clanData = null;
let clanUnsub = null;

// Вспомогательная функция: Расчет полной стоимости клана (Казна + Потраченное)
function calculateClanValue(d) {
    let total = d.souls || 0;
    const ups = d.upgrades || {};

    // 1. Улучшения статов (HP, ATK, GOLD)
    // Цена: (lvl+1)*500. Сумма арифметической прогрессии: 500 * n*(n+1)/2
    ['hp', 'atk', 'gold'].forEach(k => {
        const lvl = ups[k] || 0;
        if (lvl > 0) {
            total += 500 * (lvl * (lvl + 1)) / 2;
        }
    });

    // 2. Улучшение мест (MEMBERS)
    // Цена: (lvl+1)*2000. Сумма: 2000 * n*(n+1)/2
    const memLvl = ups.members || 0;
    if (memLvl > 0) {
        total += 2000 * (memLvl * (memLvl + 1)) / 2;
    }

    return total;
}

// 1. ЛИДЕРБОРД КЛАНОВ (Исправленная версия v2: Учитывает потраченное)
window.fetchClanLeaderboard = async (type) => {
    if (!db) return showNotice("Нет сети!", 'error');
    const list = document.getElementById('lb-content');
    list.innerHTML = "Загрузка...";
    safeDisplay('modal-leaderboard', 'flex');

    try {
        let docs = [];

        if (type === 'rich') {
            // 🔥 СЛОЖНЫЙ ЗАПРОС: Ищем и богатых, и прокачанных
            // Потому что клан может иметь 0 душ, но быть топ-1 по вложениям
            const q1 = db.collection('clans').orderBy('souls', 'desc').limit(20).get();
            const q2 = db.collection('clans').orderBy('lvl', 'desc').limit(20).get();

            const [r1, r2] = await Promise.all([q1, q2]);

            // Объединяем и убираем дубликаты по ID
            const map = new Map();
            r1.forEach(d => map.set(d.id, d));
            r2.forEach(d => map.set(d.id, d));

            docs = Array.from(map.values());

            // Сортируем по ПОЛНОЙ ЦЕННОСТИ
            docs.sort((a, b) => {
                const valA = calculateClanValue(a.data());
                const valB = calculateClanValue(b.data());
                return valB - valA; // Убывание
            });

        } else {
            // Обычный топ по урону
            const q = await db.collection('clans').orderBy('totalDamage', 'desc').limit(10).get();
            q.forEach(d => docs.push(d));
        }

        let html = `<h3 style="text-align:center; color:var(--color-gold)">ТОП КЛАНОВ (${type === 'rich' ? 'БОГАТСТВО' : 'МОЩЬ'})</h3>`;
        if (type === 'rich') html += `<div style="text-align:center; font-size:10px; color:#aaa; margin-bottom:10px;">(Казна + Вложения)</div>`;

        let i = 1;
        docs.slice(0, 10).forEach(doc => { // Берем топ-10 после сортировки
            const d = doc.data();
            // АВТО-УДАЛЕНИЕ ПУСТЫХ
            if (!d.members || d.members.length < 1) return;

            let val = 0;
            if (type === 'rich') val = calculateClanValue(d);
            else val = d.totalDamage || 0;

            // Форматирование чисел (k/M)
            let valStr = val;
            if (val > 1000000) valStr = (val / 1000000).toFixed(1) + 'M';
            else if (val > 1000) valStr = (val / 1000).toFixed(1) + 'k';

            html += `
            <div class="lb-row">
                <div class="lb-rank">#${i++}</div>
                <div class="lb-name" style="color:${type === 'rich' ? '#c084fc' : '#ef4444'}">[${d.name}]</div>
                <div class="lb-score">${valStr} ${type === 'rich' ? '👻' : '⚔️'}</div>
            </div>`;
        });

        if (i === 1) html += '<div style="text-align:center">Нет кланов</div>';
        list.innerHTML = html;
    } catch (e) {
        console.error(e);
        list.innerHTML = "Ошибка загрузки :(";
    }
};

// 2. ГЛАВНЫЙ ЭКРАН КЛАНА
// 2. ГЛАВНЫЙ ЭКРАН КЛАНА
window.renderClanScreen = function () {
    const noClanDiv = document.getElementById('ui-no-clan');
    const myClanDiv = document.getElementById('ui-my-clan');

    // Сначала скрываем оба
    if (noClanDiv) noClanDiv.style.display = 'none';
    if (myClanDiv) myClanDiv.style.display = 'none';

    if (!st.clanId) {
        // НЕТ КЛАНА
        if (noClanDiv) {
            noClanDiv.style.display = 'block';
            window.fetchPublicClans();
        }
    } else {
        // ЕСТЬ КЛАН
        if (myClanDiv) {
            myClanDiv.style.display = 'block';
            // Запускаем подписку, проверка наград будет ВНУТРИ подписки
            subscribeToClan(st.clanId);
        }
    }
};

// 3. СПИСОК КЛАНОВ (С УЧЕТОМ КУПЛЕННЫХ МЕСТ)
window.fetchPublicClans = async () => {
    const list = document.getElementById('public-clans-list');
    if (!list) return;
    try {
        const q = await db.collection('clans').orderBy('lvl', 'desc').limit(10).get();
        list.innerHTML = '';
        let found = 0;

        q.forEach(doc => {
            const d = doc.data();
            // Удаляем пустые
            if (!d.members || d.members.length < 1) { doc.ref.delete(); return; }

            // Считаем лимит мест
            const maxMembers = 5 + (d.upgrades?.members || 0);
            if (d.members.length >= maxMembers) return; // Скрываем полные

            found++;
            list.innerHTML += `
                <div class="card glass" style="flex-direction:row; justify-content:space-between; align-items:center; padding:10px; margin:0;">
                    <div style="text-align:left;">
                        <div style="font-weight:bold; color:var(--color-gold)">${d.name}</div>
                        <div style="font-size:0.6rem; color:#aaa">Lvl ${d.lvl} • ${d.members.length}/${maxMembers}</div>
                    </div>
                    <button class="btn-small" onclick="applyToClan('${doc.id}')">ЗАЯВКА</button>
                </div>`;
        });
        if (found === 0) list.innerHTML = '<div style="padding:10px; color:#777;">Нет доступных кланов</div>';
    } catch (e) { console.error(e); }
};

// 4. СОЗДАНИЕ КЛАНА
window.createClan = async () => {
    if (st.gems < 1000) return showNotice("Нужно 1000 💎", 'error');
    const name = prompt("Название клана (3-10 букв):");
    if (!name || name.length < 3) return showNotice("Короткое имя", 'error');
    try {
        const ref = db.collection('clans').doc();
        await ref.set({
            name: name, leader: userId, lvl: 1, souls: 0,
            members: [userId], names: { [userId]: st.nickname },
            upgrades: { hp: 0, atk: 0, gold: 0, members: 0 }, chat: [], applicants: []
        });
        st.gems -= 1000; st.clanId = ref.id;
        await db.collection('users').doc(userId).set({ clanId: ref.id }, { merge: true });
        save(); renderClanScreen(); showNotice(`Клан ${name} создан!`, 'success');
    } catch (e) { showNotice("Ошибка: " + e.message, 'error'); }
};

// 5. ЗАЯВКА
window.applyToClan = async (clanId) => {
    try {
        const ref = db.collection('clans').doc(clanId);
        const doc = await ref.get();
        if (!doc.exists) return showNotice("Клан не найден", 'error');
        const data = doc.data();
        if (data.members.includes(userId)) return showNotice("Вы уже тут!", 'error');
        if (data.applicants && data.applicants.includes(userId)) return showNotice("Уже подали!", 'info');

        let safeNick = st.nickname || "Игрок";
        const applyMsg = { type: 'apply', uid: userId, n: safeNick, d: Date.now() };

        await ref.update({
            applicants: firebase.firestore.FieldValue.arrayUnion(userId),
            [`names.${userId}`]: safeNick,
            chat: firebase.firestore.FieldValue.arrayUnion(applyMsg)
        });
        showNotice("Заявка отправлена!", 'success');
    } catch (e) { showNotice("Ошибка: " + e.message, 'error'); }
};

// 6. ПОДПИСКА (Realtime)
// 6. ПОДПИСКА (Realtime)
function subscribeToClan(clanId) {
    if (clanUnsub) clanUnsub(); // Отписка от старого, если была

    clanUnsub = db.collection('clans').doc(clanId).onSnapshot(doc => {
        if (!doc.exists) {
            // Клан удален
            st.clanId = null;
            save();
            renderClanScreen();
            return;
        }

        // 1. ПОЛУЧАЕМ ДАННЫЕ
        clanData = doc.data();

        // 2. РИСУЕМ ИНТЕРФЕЙС
        renderClanUI(doc.id, clanData);

        // 3. 🔥 ПРОВЕРКА НАГРАД (ОФФЛАЙН ПОДДЕРЖКА)
        if (clanData.lastRaidReward) {
            const ev = clanData.lastRaidReward;

            // st.claimedRaidId - храним в сохранении игрока ID последней награды
            if (st.claimedRaidId !== ev.id) {

                // Выдаем награду
                st.gems += ev.gems;
                st.claimedRaidId = ev.id; // Запоминаем: "Эту награду я уже взял"

                save();
                updateUI();

                showNotice(`🏆 НАГРАДА ЗА РЕЙД: +${ev.gems} 💎`, 'success');

                // Звук или эффект победы
                const app = document.querySelector('.app');
                if (app) app.classList.add('shake');
            }
        }
    }, error => {
        console.error("Ошибка подписки:", error);
    });
}


// 7. ОТРИСОВКА ИНТЕРФЕЙСА (ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ)
window.renderClanUI = function (id, data) {
    // Если мы не на экране клана, не тратим ресурсы, но данные сохраняем
    const myClanDiv = document.getElementById('ui-my-clan');
    if (!myClanDiv || myClanDiv.style.display === 'none') return;

    console.log("⚡ ОБНОВЛЕНИЕ ДАННЫХ КЛАНА:", data);

    // --- ОБНОВЛЯЕМ ШАПКУ ---
    const elName = document.getElementById('c-name-txt');
    if (elName) elName.innerText = data.name || "Клан";

    const elId = document.getElementById('c-id-txt');
    if (elId) elId.innerText = "ID: " + id;

    // --- ОБНОВЛЯЕМ КАЗНУ И УРОВЕНЬ ---
    const elSouls = document.getElementById('c-souls-txt');
    if (elSouls) elSouls.innerText = (data.souls || 0) + " 👻";

    const ups = data.upgrades || { hp: 0, atk: 0, gold: 0, members: 0 };
    const lvl = (ups.hp || 0) + (ups.atk || 0) + (ups.gold || 0) + (ups.members || 0);
    const elLvl = document.getElementById('c-lvl-txt');
    if (elLvl) elLvl.innerText = "LVL " + lvl;

    // --- ОБНОВЛЯЕМ КОЛИЧЕСТВО ЛЮДЕЙ ---
    const maxMem = 5 + (ups.members || 0);
    const memCount = (data.members || []).length;
    const elMemTxt = document.getElementById('c-mem-txt');
    if (elMemTxt) elMemTxt.innerText = `Участники: ${memCount} / ${maxMem}`;

    // --- ОБНОВЛЯЕМ СПИСОК УЧАСТНИКОВ (С ПОДРОБНОСТЯМИ) ---
    const memBox = document.getElementById('c-members-box');
    if (memBox) {
        let memHTML = '';
        const isLeader = (data.leader === userId);
        const infos = data.membersInfo || {}; // Берем объект с инфой

        // Сортируем: Лидер первый, потом по донату
        const sortedMembers = (data.members || []).sort((a, b) => {
            if (a === data.leader) return -1;
            if (b === data.leader) return 1;
            const donA = infos[a]?.donated || 0;
            const donB = infos[b]?.donated || 0;
            return donB - donA; // Кто больше задонатил - тот выше
        });

        const now = Date.now();

        sortedMembers.forEach(uid => {
            // Данные игрока
            const info = infos[uid] || {};
            const name = info.n || (data.names && data.names[uid]) || 'Боец';
            const donated = info.donated || 0;
            const lastLogin = info.lastLogin || 0;

            // Расчет времени оффлайн
            let timeStr = "🟢 Онлайн";
            if (lastLogin) {
                const diff = now - lastLogin;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (diff > 5 * 60 * 1000) { // Если больше 5 минут не обновлялся
                    if (days > 0) timeStr = `💤 ${days}д`;
                    else if (hours > 0) timeStr = `🕑 ${hours}ч`;
                    else timeStr = `🕑 ${minutes}м`;
                }
            } else {
                timeStr = "❓";
            }

            const role = (uid === data.leader) ? '👑' : '👤';
            const kickBtn = (isLeader && uid !== userId) ?
                `<button class="btn-small btn-danger" onclick="window.kickMember('${uid}')" style="padding:2px 6px; font-size:0.5rem;">❌</button>` : '';

            memHTML += `
            <div style="display:flex; align-items:center; padding:6px; border-bottom:1px solid #333; background:rgba(255,255,255,0.05); margin-bottom:2px;">
                <div style="flex:1;">
                    <div style="color:#fff; font-size:0.7rem; font-weight:bold;">${role} ${name}</div>
                    <div style="display:flex; justify-content:space-between; width:90%; font-size:0.55rem; color:#aaa; margin-top:2px;">
                        <span>💎 Вклад: <span style="color:#c084fc">${donated}</span></span>
                        <span>${timeStr}</span>
                    </div>
                </div>
                ${kickBtn}
            </div>`;
        });
        memBox.innerHTML = memHTML;
    }

    // --- ОБНОВЛЯЕМ ЧАТ ---
    const chatBox = document.getElementById('c-chat-box');
    if (chatBox) {
        let chatHTML = '';
        const chats = data.chat || [];
        const isLeader = (data.leader === userId);

        chats.slice(-40).forEach(m => {
            if (m.type === 'apply') {
                // ЭТО ЗАЯВКА
                if (isLeader) {
                    chatHTML += `
                     <div style="border:1px solid var(--color-gold); padding:5px; margin:4px 0; background:rgba(255, 215, 0, 0.1);">
                        <div style="color:var(--color-gold); font-size:0.6rem;">ЗАЯВКА: ${m.n}</div>
                        <div style="display:flex; gap:5px; margin-top:4px;">
                            <button class="btn-small btn-blue" onclick="window.acceptApplicant('${m.uid}')">ПРИНЯТЬ</button>
                            <button class="btn-small btn-danger" onclick="window.rejectApplicant('${m.uid}')">ОТКЛОНИТЬ</button>
                        </div>
                     </div>`;
                } else {
                    chatHTML += `<div style="color:#aaa; font-size:0.6rem; padding:4px;">Заявка от ${m.n} (ждет лидера)</div>`;
                }
            } else {
                // ОБЫЧНОЕ СООБЩЕНИЕ
                chatHTML += `
                 <div style="font-size:0.7rem; margin:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:2px;">
                    <b style="color:var(--color-gold)">${m.n}:</b> <span style="color:#eee">${m.t}</span>
                 </div>`;
            }
        });

        // Проверка: нужно ли скроллить вниз (если мы были внизу)
        const isAtBottom = (chatBox.scrollHeight - chatBox.scrollTop === chatBox.clientHeight);
        chatBox.innerHTML = chatHTML;
        if (isAtBottom || chatHTML.length < 500) chatBox.scrollTop = chatBox.scrollHeight;
    }
};
// --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ВНУТРИ КЛАНА ---
window.switchClanInnerTab = (tab) => {
    // 1. Получаем элементы
    const tabChat = document.getElementById('tab-clan-chat');
    const tabMem = document.getElementById('tab-clan-mem');
    const btnChat = document.getElementById('btn-clan-chat');
    const btnMem = document.getElementById('btn-clan-mem');

    // 2. Скрываем всё и сбрасываем стили кнопок
    if (tabChat) tabChat.style.display = 'none';
    if (tabMem) tabMem.style.display = 'none';

    // Стиль "Неактивная кнопка" (серый цвет, тонкая линия)
    if (btnChat) {
        btnChat.style.borderBottom = '1px solid #333';
        btnChat.style.color = '#555';
    }
    if (btnMem) {
        btnMem.style.borderBottom = '1px solid #333';
        btnMem.style.color = '#555';
    }

    // 3. Активируем нужную вкладку
    if (tab === 'chat') {
        if (tabChat) tabChat.style.display = 'block';
        if (btnChat) {
            btnChat.style.borderBottom = '2px solid var(--color-gold)';
            btnChat.style.color = '#fff';
        }
    } else {
        if (tabMem) tabMem.style.display = 'block';
        if (btnMem) {
            btnMem.style.borderBottom = '2px solid var(--color-gold)';
            btnMem.style.color = '#fff';
        }
    }
};

// 8. ЛОГИКА УПРАВЛЕНИЯ
window.acceptApplicant = async (uid) => {
    const limit = 5 + (clanData.upgrades?.members || 0);
    if (!clanData || clanData.members.length >= limit) return showNotice("Мест нет! Улучши клан.", 'error');
    try {
        const ref = db.collection('clans').doc(st.clanId);
        await ref.update({
            members: firebase.firestore.FieldValue.arrayUnion(uid),
            applicants: firebase.firestore.FieldValue.arrayRemove(uid),
            chat: firebase.firestore.FieldValue.arrayUnion({ n: "SYSTEM", t: "Игрок принят!", d: Date.now(), type: 'msg' })
        });
        await db.collection('users').doc(uid).set({ clanId: st.clanId }, { merge: true });
    } catch (e) { console.error(e); }
};

window.rejectApplicant = async (uid) => {
    try { await db.collection('clans').doc(st.clanId).update({ applicants: firebase.firestore.FieldValue.arrayRemove(uid) }); } catch (e) { }
};

window.kickMember = async (uid) => {
    if (!confirm("Выгнать?")) return;
    try {
        await db.collection('clans').doc(st.clanId).update({
            members: firebase.firestore.FieldValue.arrayRemove(uid),
            [`names.${uid}`]: firebase.firestore.FieldValue.delete()
        });
        await db.collection('users').doc(uid).set({ clanId: null }, { merge: true });
    } catch (e) { }
};

window.leaveClan = async () => {
    if (!st.clanId) return; if (!confirm("Выйти?")) return;
    const ref = db.collection('clans').doc(st.clanId);
    try {
        const doc = await ref.get();
        if (doc.exists) {
            const d = doc.data();
            // Если остался один или 0 - удаляем клан
            if (d.members.length <= 1) { await ref.delete(); }
            else {
                await ref.update({ members: firebase.firestore.FieldValue.arrayRemove(userId), [`names.${userId}`]: firebase.firestore.FieldValue.delete() });
                if (d.leader === userId) { const nl = d.members.find(m => m !== userId); if (nl) await ref.update({ leader: nl }); }
            }
        }
        st.clanId = null; await db.collection('users').doc(userId).set({ clanId: null }, { merge: true });
        save(); renderClanScreen();
    } catch (e) { showNotice("Ошибка", 'error'); }
};

window.sendClanMsg = async () => {
    const inp = document.getElementById('chat-inp'); const txt = inp.value.trim(); if (!txt) return;
    const msg = { n: st.nickname, t: txt, d: Date.now(), type: 'msg' };
    await db.collection('clans').doc(st.clanId).update({ chat: firebase.firestore.FieldValue.arrayUnion(msg) });
    inp.value = '';
};

// 9. УЛУЧШЕНИЯ И ДОНАТ
window.openClanUpgrades = () => {
    if (!clanData) return;
    const isLeader = (clanData.leader === userId);
    const overlay = document.createElement('div');
    overlay.className = 'overlay'; overlay.style.display = 'flex'; overlay.style.zIndex = '10005';

    const renderRow = (type, name, desc) => {
        const lvl = clanData.upgrades[type] || 0;
        const cost = (type === 'members') ? (lvl + 1) * 2000 : (lvl + 1) * 500;

        if (type === 'members' && lvl >= 10) return `<div class="card" style="padding:10px; background:#222; opacity:0.7;"><div>${name}<br><small style="color:gold">МАКСИМУМ</small></div></div>`;

        // 🔥 NEW: Показываем текущий бонус
        let currentBonus = '';
        if (type === 'members') {
            currentBonus = `(Сейчас: +${lvl} слот${lvl === 1 ? '' : (lvl < 5 ? 'а' : 'ов')})`;
        } else {
            currentBonus = `(Сейчас: +${lvl}%)`;
        }

        // 🔥 FIX: Убрали лишнюю логику закрытия/открытия окна из onclick - все делает buyClanUpgrade
        const btn = isLeader ? `<button class="btn-small btn-purple" onclick="window.buyClanUpgrade('${type}', ${cost})" id="upgrade-btn-${type}">UP (${cost})</button>` : `<span style="color:#aaa">Lvl ${lvl}</span>`;
        return `<div class="card" style="padding:10px; display:flex; justify-content:space-between; background:#222; margin-bottom:5px;"><div>${name}<br><small style="color:#4ade80">${desc}</small><br><small style="color:#aaa; font-size:0.5rem;">${currentBonus}</small></div>${btn}</div>`;
    };

    overlay.innerHTML = `<div class="modal-box glass" style="max-width:300px;"><h3>УЛУЧШЕНИЯ</h3><div style="text-align:center; margin-bottom:10px;">Казна: ${clanData.souls || 0} 👻</div>${renderRow('members', '👥 Места', '+1 Слот')}${renderRow('hp', '❤️ Живучесть', '+1% HP')}${renderRow('atk', '⚔️ Сила', '+1% ATK')}${renderRow('gold', '💰 Богатство', '+1% Золота')}<button class="btn-main" style="margin-top:10px;" onclick="this.closest('.overlay').remove()">ЗАКРЫТЬ</button></div>`;
    document.body.appendChild(overlay);
};

window.buyClanUpgrade = async (type, cost) => {
    // 1. Локальная проверка (быстрая)
    if ((clanData.souls || 0) < cost) return showNotice("Мало душ!", 'error');

    const ref = db.collection('clans').doc(st.clanId);

    // 🔥 FIX: Блокируем кнопку, чтобы предотвратить двойной клик
    const btn = document.getElementById(`upgrade-btn-${type}`);
    if (btn) {
        btn.disabled = true;
        btn.innerText = "...";
    }

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            if (!doc.exists) throw "Клан не найден";

            const serverData = doc.data();
            const currentSouls = serverData.souls || 0;

            // 2. Строгая проверка на сервере
            if (currentSouls < cost) {
                throw "Недостаточно средств в казне! Кто-то уже потратил.";
            }

            t.update(ref, {
                souls: firebase.firestore.FieldValue.increment(-cost),
                [`upgrades.${type}`]: firebase.firestore.FieldValue.increment(1)
            });
        });

        showNotice("Улучшено!", "success");

        // 🔥 NEW: Оптимистично обновляем локальные данные для мгновенного отображения
        if (!clanData.upgrades) clanData.upgrades = {};
        clanData.upgrades[type] = (clanData.upgrades[type] || 0) + 1;
        clanData.souls = (clanData.souls || 0) - cost;

        // 🔥 NEW: Находим текущий оверлей и обновляем только его содержимое
        const currentOverlay = document.querySelector('.overlay[style*="10005"]');
        if (currentOverlay) {
            // Удаляем старое содержимое и создаем новое
            currentOverlay.remove();
            // Открываем заново с обновленными данными (окно остается открытым)
            window.openClanUpgrades();
        }

        // Realtime listener обновит данные через ~100-500ms, но визуально уже видно изменения
    } catch (e) {
        showNotice(e.toString(), "error");
        // Разблокируем кнопку при ошибке
        if (btn) {
            btn.disabled = false;
            btn.innerText = `UP (${cost})`;
        }
    }
};

window.openDonateMenu = () => {
    const overlay = document.createElement('div');
    overlay.className = 'overlay'; overlay.style.display = 'flex'; overlay.style.zIndex = '10005';
    overlay.innerHTML = `<div class="modal-box glass" style="max-width:250px;"><h3>ВНЕСТИ ДУШИ</h3><p>У тебя: ${st.soulCrystals || 0} 👻</p><button class="btn-main" onclick="window.donateSouls(100); this.closest('.overlay').remove()">100</button><button class="btn-main" onclick="window.donateSouls(1000); this.closest('.overlay').remove()">1000</button><button class="btn-main" onclick="window.donateSouls(st.soulCrystals); this.closest('.overlay').remove()">ВСЁ</button><button class="btn-main btn-danger" onclick="this.closest('.overlay').remove()">ОТМЕНА</button></div>`;
    document.body.appendChild(overlay);
};

window.donateSouls = async (amt) => {
    if ((st.soulCrystals || 0) < amt || amt <= 0) return showNotice("Нечего вносить!", 'error');

    // Снимаем у игрока
    st.soulCrystals -= amt;
    save();

    try {
        // Отправляем в базу
        await db.collection('clans').doc(st.clanId).update({
            souls: firebase.firestore.FieldValue.increment(amt), // В общую кучу
            [`membersInfo.${userId}.donated`]: firebase.firestore.FieldValue.increment(amt), // В личный зачет
            [`membersInfo.${userId}.n`]: st.nickname // На всякий случай обновляем ник
        });

        showNotice(`Внесено ${amt} душ!`, 'success');
        updateUI();
    } catch (e) {
        st.soulCrystals += amt; // Возврат при ошибке
        save();
        showNotice("Ошибка сети", 'error');
    }
};
// ==========================================
// СИСТЕМА РЕЙДОВ (ВОССТАНОВЛЕНО)
// ==========================================
const RAID_BOSSES = [
    {
        id: 'titan', name: 'ГЕО-ТИТАН', vis: '🦍', color: '#8b5cf6',
        desc: 'Мощные удары по площади.', ability: 'ЗЕМЛЕТРЯСЕНИЕ',
        passive: 'Каменная Кожа',
        hp: 10000000000, // 1 МИЛЛИАРД
        atk: 10000, stats: { def: 999 }
    },
    {
        id: 'leviathan', name: 'ЛЕВИАФАН', vis: '🐉', color: '#3b82f6',
        desc: 'Морское чудовище.', ability: 'ЦУНАМИ',
        passive: 'Шипы Бездны',
        hp: 8000000000, // 800 МИЛЛИОНОВ
        atk: 6000, stats: { thorns: 0.1 }
    },
    {
        id: 'ghost', name: 'ПРИЗРАК', vis: '👻', color: '#10b981',
        desc: 'Нематериальный дух.', ability: 'КОШМАР',
        passive: 'Неъуловимость',
        hp: 7000000000, // 700 МИЛЛИОНОВ
        atk: 8000, stats: { evade: 30 }
    }
];

function getRaidState() {
    // Настройки времени
    const BATTLE_TIME = 3 * 60 * 60 * 1000; // 3 часа (в мс)
    const REST_TIME = 10 * 60 * 1000;       // 10 минут (в мс)
    const CYCLE_MS = BATTLE_TIME + REST_TIME; // Полный цикл (190 мин)

    const now = Date.now();

    // Считаем, какой сейчас цикл по счету от начала времен (1970)
    const cycleIndex = Math.floor(now / CYCLE_MS);
    const cycleTime = now % CYCLE_MS;

    // Активен, если текущее время внутри цикла меньше времени битвы
    const isActive = cycleTime < BATTLE_TIME;

    // Выбираем босса (чередуем их каждый цикл)
    const bossIdx = cycleIndex % RAID_BOSSES.length;

    return {
        boss: RAID_BOSSES[bossIdx],
        isActive: isActive,
        // Если активен - время до перерыва, если нет - время до нового босса
        timeLeft: isActive ? (BATTLE_TIME - cycleTime) : (CYCLE_MS - cycleTime),
        cycleId: cycleIndex // Уникальный ID текущего запуска
    };
}

window.startRaidBattle = async () => {
    if (!st.clanId) return showNotice("Нужен клан!", 'error');

    // 1. Проверка состояния
    const s = getRaidState();
    // Если босс мертв и время респавна еще не пришло (локальная проверка)
    if (window.BOSS_DATA && window.BOSS_DATA.dead && window.BOSS_DATA.respawnTime > Date.now()) {
        return showNotice("Босс еще не возродился!", "error");
    }

    showNotice("Вход в Рейд...", 'info');
    const bossRef = db.collection('world_boss').doc('current');

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(bossRef);
            let data = doc.exists ? doc.data() : null;

            const now = Date.now();
            // Условие создания: данных нет ИЛИ (босс мертв И таймер вышел) ИЛИ (босс просрочен > 3ч)
            const shouldSpawn = !data || (data.dead && now > data.respawnTime) || (!data.dead && (now - data.createdAt > 3 * 60 * 60 * 1000));

            // ... (внутри startRaidBattle, внутри if (shouldSpawn)) ...

            if (shouldSpawn) {
                // РАНДОМНЫЙ ВЫБОР БОССА (Вместо очереди)
                const nextIdx = Math.floor(Math.random() * RAID_BOSSES.length);

                // Уникальный ID
                const newRaidId = `raid_${now}`;

                // Берем конфиг выбранного босса
                const bossConf = RAID_BOSSES[nextIdx];

                data = {
                    id: newRaidId,
                    bossIdx: nextIdx,
                    hp: bossConf.hp,
                    max: bossConf.hp,
                    dead: false,
                    createdAt: now,
                    respawnTime: 0,
                    topClanId: null,
                    maxDamage: 0
                };
                t.set(bossRef, data);
            }

            if (data.dead && now < data.respawnTime) throw "Босс отдыхает!";

            battle.raidStartHp = data.hp;
            battle.raidKey = data.id;
            // Сохраняем конфиг, чтобы startBattle знал кого рисовать
            battle.raidBossConfig = RAID_BOSSES[data.bossIdx || 0];
        });

        // Запуск
        battle.mode = 'raid';
        battle.active = true;
        battle.turnCount = 0; // Инициализация счетчика ходов
        startBattle(1);

    } catch (e) {
        // 🔥 ФИКС ОШИБКИ 400: Если босс уже создан (гонка), просто заходим
        if (e.code === 'failed-precondition' || (e.message && e.message.includes('precondition'))) {
            console.log("Конфликт создания: Босс уже есть. Просто входим.");
            // Принудительно читаем новые данные и заходим
            const doc = await bossRef.get();
            const data = doc.data();
            battle.raidStartHp = data.hp;
            battle.raidKey = data.id;
            battle.raidBossConfig = RAID_BOSSES[data.bossIdx || 0];

            battle.mode = 'raid';
            battle.active = true;
            battle.turnCount = 0; // Инициализация счетчика ходов
            startBattle(1);
            return;
        }

        if (typeof e === 'string') showNotice(e, 'info');
        else { console.error(e); showNotice("Ошибка: " + e.message, 'error'); }
    }
};
window.adminResetBoss = async () => {
    if (!db) return console.error("Нет базы");
    if (!confirm("Сбросить босса? Это обнулит ХП текущего рейда.")) return;

    try {
        // Удаляем документ босса. 
        // Следующий удар или вход в рейд создаст его заново с полным ХП.
        await db.collection('world_boss').doc('current').delete();

        // Опционально: Очистить чат клана от старых уведомлений (если нужно)
        // await db.collection('clans').doc(st.clanId).update({ chat: [] });

        showNotice("♻️ Босс сброшен! Обновите страницу.", "success");
        setTimeout(() => location.reload(), 1000);
    } catch (e) {
        console.error(e);
        showNotice("Ошибка сброса", "error");
    }
};

window.submitRaidDamage = async (dmg) => {
    if (!st.clanId || !battle.raidKey) return;

    const bossRef = db.collection('world_boss').doc('current');
    const clanRef = db.collection('clans').doc(st.clanId);

    try {
        await db.runTransaction(async (transaction) => {
            const bossDoc = await transaction.get(bossRef);
            const clanDoc = await transaction.get(clanRef);
            if (!clanDoc.exists) return;

            let bData = bossDoc.exists ? bossDoc.data() : {};
            const cData = clanDoc.data();

            // Защита: если босс уже мертв или сменился
            if (bData.id !== battle.raidKey || bData.dead) return;

            // Считаем урон
            let newHp = bData.hp - dmg;
            let isKill = false;

            // Обновляем личный рекорд клана
            const myClanTotal = (cData.raids?.[battle.raidKey] || 0) + dmg;
            let updates = { topClanId: bData.topClanId, topClanName: bData.topClanName, maxDamage: bData.maxDamage || 0 };

            if (myClanTotal > updates.maxDamage) {
                updates.topClanId = st.clanId;
                updates.topClanName = cData.name;
                updates.maxDamage = myClanTotal;
            }

            if (newHp <= 0) {
                newHp = 0;
                updates.dead = true;
                updates.killerClan = st.clanId;
                updates.killerClanName = cData.name;
                // 🔥 ВАЖНО: Устанавливаем время спавна нового босса (через 10 минут)
                updates.respawnTime = Date.now() + (10 * 60 * 1000);
                isKill = true;
            }
            updates.hp = newHp;

            transaction.update(bossRef, updates);

            // Обновляем Клан
            let clanUpdates = {
                totalDamage: firebase.firestore.FieldValue.increment(dmg),
                [`raids.${battle.raidKey}`]: firebase.firestore.FieldValue.increment(dmg)
            };

            // Если убили - награды
            if (isKill) {
                // Бонус за ластхит
                clanUpdates.souls = firebase.firestore.FieldValue.increment(5000);

                // Сообщение в чат
                let msg = { n: "SYSTEM", t: `⚔️ Босс повержен кланом ${cData.name}!`, d: Date.now(), type: 'msg' };
                clanUpdates.chat = firebase.firestore.FieldValue.arrayUnion(msg);

                // Если мы еще и ТОП-1 по урону — выдаем алмазы
                // (Используем локальную проверку updates.topClanId, так как мы только что её могли обновить)
                if (updates.topClanId === st.clanId) {
                    // Мы не пишем rewardGems, мы пишем Event с уникальным ID (ID рейда)
                    clanUpdates.lastRaidReward = {
                        id: battle.raidKey, // Например "raid_1739283..."
                        gems: 1000,
                        date: Date.now()
                    };

                    clanUpdates.chat = firebase.firestore.FieldValue.arrayUnion({
                        n: "SYSTEM", t: `🏆 Победа! Награда ждет всех участников!`, d: Date.now() + 1, type: 'msg'
                    });
                }
            }
            transaction.update(clanRef, clanUpdates);
        });
    } catch (e) { console.error(e); }
};
// Глобальная переменная для хранения интервала, чтобы не запускать два таймера одновременно
window.raidTimerInterval = null;

window.startRaidTimer = (respawnTime) => {
    // 1. Очищаем старый таймер, если он был
    if (window.raidTimerInterval) clearInterval(window.raidTimerInterval);

    const raidStatus = document.getElementById('raid-btn-status');
    const raidBtn = document.getElementById('btn-main-raid');

    // Функция одного "тика"
    const tick = () => {
        const now = Date.now();
        const diff = respawnTime - now;

        if (diff <= 0) {
            // ВРЕМЯ ВЫШЛО!
            clearInterval(window.raidTimerInterval);
            if (raidStatus) {
                raidStatus.innerText = "⚠️ ГОТОВ К БОЮ!";
                raidStatus.style.color = "#fbbf24";
            }
            if (raidBtn) {
                raidBtn.style.filter = "none";
                raidBtn.onclick = window.startRaidBattle;
            }
            return;
        }

        // ФОРМАТИРУЕМ ВРЕМЯ
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);

        // Рисуем (добавляем нолик, если секунд меньше 10, для красоты: 09, 05...)
        const sStr = s < 10 ? `0${s}` : s;

        if (raidStatus) {
            raidStatus.innerText = `☠️ УБИТ (КД: ${m}:${sStr})`;
            raidStatus.style.color = "#aaa";
        }
    };

    // Запускаем тик сразу и потом каждую секунду
    tick();
    window.raidTimerInterval = setInterval(tick, 1000);
};

// --- НОВАЯ ФУНКЦИЯ ДЛЯ КРИТОВ ---
function showCritText(text, x, y) {
    const el = document.createElement('div');
    el.className = 'crit-text'; // Класс из CSS
    el.innerText = text;

    // Рандомный наклон для стиля Jet Set Radio
    const tilt = (Math.random() * 20) - 10;
    el.style.transform = `skew(${tilt}deg) scale(0)`;

    el.style.left = (x + (Math.random() * 20 - 10)) + 'px';
    el.style.top = y + 'px';

    document.body.appendChild(el);

    // Удаляем после анимации
    setTimeout(() => el.remove(), 700);
}
// --- GASTER & SECRETS ---
window.handleGasterRng = (enemy) => {
    const rand = Math.random();
    let dmg = 0; let text = "";

    // ЭФФЕКТ ГЛИТЧА НА ВЕСЬ ЭКРАН
    const app = document.querySelector('.app');
    if (app) {
        app.classList.add('glitch-mode');
        setTimeout(() => app.classList.remove('glitch-mode'), 200);
    }

    if (rand < 0.1) {
        dmg = 999999; text = "☠️ DELETE";
    }
    else if (rand < 0.5) {
        dmg = -500; text = "♻️ ERROR"; // Лечит врага (баг в пользу врага)
    }
    else {
        dmg = 666; text = "666";
    }

    enemy.hp -= dmg;
    if (enemy.hp > enemy.max) enemy.hp = enemy.max;
    return { dmg, text };
};

window.triggerBSOD = () => {
    const bsod = document.createElement('div');
    bsod.className = 'bsod-screen'; // Используем класс из CSS
    bsod.innerHTML = `
        <h1 style="font-size:4rem; margin-bottom:20px">:(</h1>
        <p style="font-size:1.2rem">CRITICAL_PROCESS_DIED</p>
        <p>Error Code: 0xDEADBEEF</p>
        <p style="margin-top:20px">Rebooting universe... 0%</p>
    `;
    document.body.appendChild(bsod);

    // Звуковой эффект (если есть)
    // const audio = new Audio('snd/glitch.mp3'); audio.play();

    setTimeout(() => {
        bsod.remove();
        // Убиваем всех врагов
        battle.enemies.forEach(e => e.hp = 0);
        win();
    }, 2500);
};
// --- ВСТАВИТЬ В КОНЕЦ MAIN.JS ---

function updateAtmosphere() {
    const bg = document.getElementById('bg-layer');
    const audio = document.getElementById('bgm');
    const app = document.querySelector('.app');

    // Сброс классов эффектов
    if (app) {
        app.classList.remove('ut-mode');
        app.classList.remove('darker-yet-darker');
        app.classList.remove('glitch-mode');
    }

    let targetSrc = '';
    let bgImage = '';

    // --- ПРИОРИТЕТ 1: ГАСТЕР (В отряде или как враг) ---
    // Проверяем: Гастер в отряде ИЛИ мы деремся против него
    const isGasterHere = st.squad.includes('gaster') || (battle.active && battle.enemies && battle.enemies.some(e => e.name === '☠️📬🕆︎💣︎'));

    if (isGasterHere) {
        targetSrc = 'music/gaster.mp3';
        bgImage = 'bg/gaster.jpg';
    }
    // --- ПРИОРИТЕТ 2: БИТВА ---
    else if (battle.active) {
        if (battle.mode === 'rift') {
            // ЛЕВИАФАН (Каждый 100-й этаж или если имя врага Левиафан)
            if (st.riftFloor % 100 === 0 || battle.enemies.some(e => e.isLeviathan)) {
                bgImage = 'bg/battle_leviathan.jpg';
                targetSrc = 'music/battle_leviathan.mp3';
            } else {
                bgImage = 'bg/battle_op.jpg'; // Стандартный фон разлома
                targetSrc = 'music/battle_jojo.mp3';
            }
        }
        else if (battle.mode === 'soul_trial') {
            bgImage = 'bg/battle_ut.jpg';
            targetSrc = 'music/battle_ut.mp3';
        }
        else if (battle.mode === 'raid') {
            bgImage = 'bg/battle_raid.jpg';
            targetSrc = 'music/battle_boss.mp3';
        }
        else {
            // ОБЫЧНЫЕ МИРЫ
            if (st.world === 'dr') {
                bgImage = 'bg/delta.png';
                targetSrc = 'music/delta.mp3';
            } else {
                bgImage = `bg/battle_${st.world}.jpg`;
                targetSrc = `music/battle_${st.world}.mp3`;
            }
            if (st.world === 'ut' && app) app.classList.add('ut-mode');
        }
    }
    // --- ПРИОРИТЕТ 3: МЕНЮ ---
    else {
        if (st.world === 'dr') {
            bgImage = 'bg/delta.png';
            targetSrc = 'music/delta.mp3';
        } else {
            bgImage = `bg/menu_${st.world}.jpg`;
            targetSrc = `music/menu_${st.world}.mp3`;
        }
    }

    // Применяем изменения фона
    if (bg && (!bg.src || !bg.src.includes(bgImage))) {
        bg.src = bgImage;
    }

    // Применяем изменения музыки
    if (audio) {
        // Если трек изменился
        if (!audio.src || !audio.src.includes(targetSrc)) {
            audio.pause();
            audio.src = targetSrc;
            if (isMusicOn) audio.play().catch(e => console.log("Audio play error:", e));
        }
        // Если трек тот же, но почему-то не играет, а должен
        else if (isMusicOn && audio.paused) {
            audio.play().catch(e => { });
        }
    }
}

// Вставь это в checkCode, чтобы работал код
// else if (val === 'ENTRY17') {
//    st.heroes['gaster'] = { lvl:66, stars:6, duplicates:0 };
//    save(); showNotice("🖐️ DARKER YET DARKER", 'error');
// }
// --- БАЛАНС: РАСЧЕТ СТОИМОСТИ ---

// 1. Стоимость повышения уровня (за Души)
// Формула: База * (Уровень ^ 1.4)

// 2. Стоимость повышения Звезд (за Алмазы)
// Формула: 100 * (3 ^ (Звезды - 1))


window.showBossInfo = () => {
    const b = getRaidState().boss;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10020';

    overlay.innerHTML = `
        <div class="modal-box glass" style="max-width:300px;">
            <h2 style="color:${b.color}">${b.name}</h2>
            <div style="font-size:3rem; margin:10px 0;">${b.vis}</div>
            <p style="font-size:0.7rem; color:#ccc;">${b.desc}</p>
            <div style="text-align:left; margin-top:10px; background:rgba(0,0,0,0.3); padding:5px;">
                <div style="color:#ef4444; font-size:0.6rem; margin-bottom:5px;">⚡ ${b.ability}</div>
                <div style="color:#3b82f6; font-size:0.6rem;">🛡️ ${b.passive}</div>
            </div>
            <button class="btn-main" style="margin-top:15px;" onclick="this.closest('.overlay').remove()">ПОНЯТНО</button>
        </div>
    `;
    document.body.appendChild(overlay);
};
// --- ВСТАВИТЬ В КОНЕЦ MAIN.JS ---

// Функция для визуальных эффектов Гастера
window.handleGasterEffects = (mech) => {
    const app = document.querySelector('.app');

    // 1. Эффект Глитча (Тряска + Инверсия)
    // Срабатывает для 'gaster_rng' или 'glitch'
    if (mech === 'gaster_rng' || mech === 'glitch') {
        app.classList.add('glitch-mode');
        setTimeout(() => app.classList.remove('glitch-mode'), 300);
    }

    // 2. Эффект Темноты (Darker Yet Darker)
    // Срабатывает для 'blind_all_dmg'
    if (mech === 'blind_all_dmg' || mech === 'dark_mode') {
        app.classList.add('darker-yet-darker');
        // Темнота остается до конца хода или пока не вызовем updateAtmosphere()
    }

    // 3. Эффект КРАША (Синий экран)
    // Срабатывает для 'crash_game' или 'bsod_crash'
    if (mech === 'crash_game' || mech === 'bsod_crash') {
        // Создаем синий экран
        const bsod = document.createElement('div');
        bsod.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#0000AA;color:#fff;z-index:99999;padding:20px;font-family:monospace;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;';
        bsod.innerHTML = `<h1 style="font-size:5rem">:(</h1><br><p style="font-size:1.5rem">CRITICAL_PROCESS_DIED</p><p>Error Code: 0x666</p><p>Collecting error info... 0%</p>`;
        document.body.appendChild(bsod);

        // Звук ошибки (опционально)
        const audio = new Audio('path/to/error.mp3'); audio.play();

        // Через 2 секунды убиваем всех
        setTimeout(() => {
            bsod.remove();
            if (battle.active) {
                battle.enemies.forEach(e => {
                    e.hp = 0;
                    spawnDamageText(e, "DELETED", '#ff0000'); // Если есть такая функция
                });
                win(); // Победа
            }
        }, 2000);
    }
};

// Вспомогательная функция для текста урона (если её нет)
function spawnDamageText(target, text, color) {
    const idx = battle.enemies.indexOf(target);
    const el = document.getElementById(`enemy-${idx}`);
    if (el) {
        const rect = el.getBoundingClientRect();
        showFloatText(text, rect.left, rect.top, color);
    }
}
// --- ВСТАВИТЬ В КОНЕЦ MAIN.JS ---
// === ФИКС КЛИКА ПО ГЕРОЮ ===
window.openHeroInfoFromBattle = () => {
    // 1. Проверка: Если мы в процессе выбора цели для скилла
    if (battle.processing && pendingAct) {
        // Если это хил или бафф на себя/союзника — применяем скилл
        if (pendingAct.t === 'heal' || pendingAct.eff?.target === 'self' || pendingAct.target === 'friend') {
            doAction('perfect'); // Сразу применяем (или запускаем QTE)
            return;
        }
    }

    // 2. Если просто так кликнули — показываем инфо
    const hero = battle.team[battle.turnId];
    if (hero) {
        showFloatText(`${hero.name}`, 150, 300, '#fff');
        showNotice(`HP: ${Math.ceil(hero.curHp)}/${hero.maxHp}\nATK: ${hero.stats.atk}`, 'info');
    }
};
// === НОВАЯ ФУНКЦИЯ ОТРИСОВКИ ГЕРОЕВ (С СОРТИРОВКОЙ) ===


// === ФУНКЦИЯ ОТКРЫТИЯ МЕНЮ ГЕРОЯ ===
// === ПОДРОБНОЕ МЕНЮ ГЕРОЯ ===


window.upgradeHeroLevel = (id) => {
    const h = st.heroes[id];
    const cost = Math.floor(h.lvl * 150);

    if (st.gold >= cost) {
        st.gold -= cost;
        h.lvl++;
        showNotice("Уровень повышен! 🆙", 'success');
        updateUI(); // Обновит золото
        window.openHeroInfo(id); // Обновит цифры в окне
    } else {
        showNotice("Не хватает золота!", 'error');
    }
};

/* --- ДОБАВИТЬ В MAIN.JS --- */

// Функция выбора союзника для ХИЛА/БАФФА
// Функция выбора союзника для ХИЛА/БАФФА
window.selectAllyTarget = (callback) => {
    const overlay = document.createElement('div');
    overlay.className = 'glass';
    overlay.style.position = 'absolute';
    overlay.style.top = '20%';
    overlay.style.left = '10%';
    overlay.style.width = '80%';
    overlay.style.zIndex = '500';
    overlay.style.border = '2px solid var(--color-pure)';
    overlay.style.textAlign = 'center';
    overlay.id = 'ally-selector-modal';

    overlay.innerHTML = `<h3 style="color:#fff; margin-bottom:10px;">КОГО ПОДДЕРЖАТЬ?</h3>`;

    // 1. ИСПРАВЛЕНИЕ: Перебираем st.squad (массив ID), а не несуществующий battle.squad
    st.squad.forEach((heroId, index) => {
        // 2. ИСПРАВЛЕНИЕ: Получаем данные героя из объекта battle.team
        const hero = battle.team[heroId];

        // Проверка: если героя нет или он мертв
        if (!hero || hero.curHp <= 0) return;

        const d = window.DB[heroId];
        const btn = document.createElement('div');
        btn.style.background = '#333';
        btn.style.border = '1px solid #555';
        btn.style.padding = '10px';
        btn.style.margin = '5px 0';
        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.justifyContent = 'space-between';
        btn.style.alignItems = 'center';

        // 3. ИСПРАВЛЕНИЕ: Используем curHp вместо hp
        const hpPercent = Math.floor((hero.curHp / hero.maxHp) * 100);

        btn.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.5rem;">${d.v}</span>
                <div style="text-align:left;">
                    <div style="color:${hpPercent < 30 ? 'red' : 'white'}">${d.n}</div>
                    <div style="font-size:0.6rem; color:#aaa;">HP: ${Math.floor(hero.curHp)}/${hero.maxHp}</div>
                </div>
            </div>
            <div style="font-size:1.2rem; color:#0f0;">✚</div>
        `;

        btn.onclick = () => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            callback(index); // Возвращаем индекс выбранного героя
        };

        overlay.appendChild(btn);
    });

    // Кнопка отмены
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-main btn-danger';
    closeBtn.innerText = 'ОТМЕНА';
    closeBtn.style.marginTop = '10px';
    closeBtn.onclick = () => {
        // Важно: разблокируем интерфейс при отмене
        battle.processing = false;
        if (window.renderSkills) window.renderSkills();
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
    };
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);
};
window.upgradeHeroStar = (id) => {
    const h = st.heroes[id];
    const cost = (h.stars + 1) * 2;

    if ((h.stacks || 0) >= cost) {
        h.stacks -= cost;
        h.stars++;
        showNotice("Герой возвышен! ⭐", 'success');
        window.openHeroInfo(id);
    } else {
        showNotice(`Нужно ${cost} дубликатов!`, 'error');
    }
};

// Функция добавления/удаления из отряда (на всякий случай)


function updateAtmosphere() {
    const bg = document.getElementById('bg-layer');
    const audio = document.getElementById('bgm');
    const app = document.querySelector('.app');

    // 1. СБРОС ЭФФЕКТОВ (Это решает твою проблему)
    if (app) {
        app.classList.remove('ut-mode');
        app.classList.remove('darker-yet-darker'); // Убираем темноту Гастера
        app.classList.remove('glitch-mode');
    }

    let targetSrc = '';
    let bgImage = '';

    // --- ПРИОРИТЕТ 1: ГАСТЕР (Если он в отряде или мы деремся против него) ---
    // Проверяем: Гастер в отряде? ИЛИ идет бой и враг Гастер?
    const isGasterHere = st.squad.includes('gaster') || (battle.active && battle.enemies.some(e => e.name === '☠️📬🕆︎💣︎'));

    if (isGasterHere) {
        // Включаем темноту
        targetSrc = 'music/gaster.mp3';
        bgImage = 'bg/gaster.jpg';
    }
    // --- ПРИОРИТЕТ 2: БИТВА ---
    else if (battle.active) {
        if (battle.mode === 'rift') {
            // ЛЕВИАФАН (Этаж 100 или сам босс)
            if (st.riftFloor % 100 === 0 || battle.enemies.some(e => e.isLeviathan)) {
                bgImage = 'bg/battle_leviathan.jpg';
                targetSrc = 'music/battle_leviathan.mp3';
            } else {
                bgImage = 'bg/battle_op.jpg';
                targetSrc = 'music/battle_jojo.mp3';
            }
        }
        else if (battle.mode === 'soul_trial') {
            bgImage = 'bg/battle_ut.jpg';
            targetSrc = 'music/battle_ut.mp3';
            if (app) app.classList.add('ut-mode');
        }
        else if (battle.mode === 'raid') {
            bgImage = 'bg/battle_raid.jpg';
            targetSrc = 'music/battle_boss.mp3';
        }
        else {
            // ОБЫЧНЫЕ МИРЫ
            if (st.world === 'dr') {
                bgImage = 'bg/delta.png';
                targetSrc = 'music/delta.mp3';
            } else {
                bgImage = `bg/battle_${st.world}.jpg`;
                targetSrc = `music/battle_${st.world}.mp3`;
            }
            if (st.world === 'ut' && app) app.classList.add('ut-mode');
        }
    }
    // --- ПРИОРИТЕТ 3: МЕНЮ ---
    else {
        if (st.world === 'dr') {
            bgImage = 'bg/delta.png';
            targetSrc = 'music/delta.mp3';
        } else {
            bgImage = `bg/menu_${st.world}.jpg`;
            targetSrc = `music/menu_${st.world}.mp3`;
        }
    }

    // Применяем фон
    if (bg && !bg.src.includes(bgImage)) bg.src = bgImage;

    // Применяем музыку
    if (audio) {
        if (!audio.src.includes(targetSrc)) {
            audio.pause();
            audio.currentTime = 0;
            audio.src = targetSrc;
            if (isMusicOn) audio.play().catch(e => { });
        }
    }
}


// 10. ЗАПУСК ИГРЫ
window.onload = init;