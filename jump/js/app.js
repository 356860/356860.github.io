import {
    JUMP_CONFIG,
    ISSUE_META,
    NON_ACTION_REASON_CODES,
    extractFeatures as coreExtractFeatures,
    smoothFeatures as coreSmoothFeatures,
    createRoundState,
    createAttemptState,
    incrementReason as coreIncrementReason,
    buildTopReasonText as coreBuildTopReasonText,
    pickSuggestion as corePickSuggestion,
    buildRoundAnalysis as coreBuildRoundAnalysis,
    pointVisible as corePointVisible
} from './jump-core.js';
import { createAppStorage } from './jump-storage.js';

const STORAGE_KEY = 'jump-gemini-phase-studio-v1';
const AUDIO_PREFS_KEY = 'jump-gemini-audio-prefs-v1';
const SYNC_QUEUE_KEY = 'jump-gemini-sync-queue-v1';
const SESSION_META_KEY = 'jump-gemini-session-meta-v1';
const SUPABASE_URL = 'https://dmssegbmfnngigjiaqgv.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_n-sRBVrmElw3Lv0HU5e6uQ_rSfgklXe';
const SUPABASE_TABLE = 'jump_round_records';
const CONNECTORS = [
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
    [25, 27], [26, 28], [27, 31], [28, 32]
];
const DEFAULT_STUDENTS = { '默认学生': [] };
const DEFAULT_AUDIO_PREFS = { effects: true, guidance: true, praise: true, volume: 0.8 };
const GESTURE_STAGE_DISABLED = 'DISABLED';
const GESTURE_STAGE_WAIT = 'WAIT_GESTURE';
const GESTURE_STAGE_TRANSITION = 'TRANSITION_TO_SIDE';
const GESTURE_STAGE_ARMED = 'ARMED_FOR_ATTEMPT';

const STANDARD_JUMP_PROFILE = {
    source: '跳远.mp4',
    validFrames: 23,
    phases: {
        ready: { kneeAngle: [174.861, 180.498], hipAngle: [175.31, 180.273], holdFrames: 6 },
        preload: { kneeAngle: [170.14, 178.309], hipDrop: [0.028, 0.092], wristBack: [2.532, 19.254] },
        takeoff: { kneeAngle: [165.534, 169.534], armLiftDelta: [-0.817, -0.797], hipRise: [-0.003, 0.003] },
        flight: { hipForwardDelta: [0.007, 0.013], trunkLean: [5.547, 9.547] },
        landing: { kneeAngle: [165.534, 169.534], heelLead: [-0.013, -0.009] }
    }
};

const DRILL_CONTENT = {
    full: [
        { title: '完整立定跳远', text: `参考标准视频 ${STANDARD_JUMP_PROFILE.source}，动作按“站稳→预摆→蹬伸起跳→腾空→落地缓冲”依次完成。` },
        { title: '角度要点', text: '预摆阶段重点看膝髋一起下沉；蹬地时膝和髋要快速打开；落地时脚跟先着地并主动屈膝。' }
    ],
    arms: [
        { title: '摆臂专项', text: '重点练大臂后摆到前上摆。不要只甩小臂，要让肩关节带动手臂完整摆动。' },
        { title: '推荐练习', text: '原地摆臂 2 组，每组 8 次；再做 5 次摆臂带预摆，感受手臂带动身体向前上方。' }
    ],
    preload: [
        { title: '预摆蹬伸专项', text: '重点练膝髋共同下沉和快速蹬伸，不要只弯腰或只蹲不蹬。' },
        { title: '推荐练习', text: '先做 5 次慢预摆，再做 5 次预摆后快速蹬伸，重点体会下蹲和起跳衔接。' }
    ],
    landing: [
        { title: '落地缓冲专项', text: '重点练脚跟先着地、全脚掌过渡和屈膝缓冲，落地后保持身体稳定。' },
        { title: '推荐练习', text: '小跳落地缓冲 2 组，每组 6 次；落地时注意脚跟先接触，再过渡到全脚掌。' }
    ]
};

const storageApi = createAppStorage({
    dbName: 'jump-training-db',
    storeName: 'state',
    keysWithDefaults: {
        [STORAGE_KEY]: DEFAULT_STUDENTS,
        [AUDIO_PREFS_KEY]: DEFAULT_AUDIO_PREFS,
        [SYNC_QUEUE_KEY]: [],
        [SESSION_META_KEY]: null
    }
});

const app = {
            ready: false,
            training: false,
            students: { ...DEFAULT_STUDENTS },
            currentStudent: '',
            round: null,
            phase: 'IDLE',
            phaseFrames: 0,
            phaseStartedAt: 0,
            attemptStartedAt: 0,
            readyFrames: 0,
            cooldownFrames: 0,
            awaitingReset: false,
            rearmFrames: 0,
            stableFrames: 0,
            prevHipX: null,
            prevHipY: null,
            baseline: null,
            attempt: null,
            targetLock: null,
            targetGraceFrames: 0,
            lowerBodyLossFrames: 0,
            smoothFeatures: null,
            confirmFrames: { takeoff: 0, flight: 0, landing: 0 },
            drillPhase: 'IDLE',
            drillFrames: 0,
            gestureStage: GESTURE_STAGE_WAIT,
            gestureHoldFrames: 0,
            transitionStartedAt: 0,
            gestureSideReadyFrames: 0
        };

        const video = document.getElementById('video-layer');
        const canvas = document.getElementById('draw-layer');
        const ctx = canvas.getContext('2d');
        const overlay = document.getElementById('overlay');
        const overlayText = document.getElementById('overlay-text');
        const phaseBadge = document.getElementById('phase-badge');
        const feedbackMain = document.getElementById('feedback-main');
        const feedbackSub = document.getElementById('feedback-sub');
        const practiceCountEl = document.getElementById('practice-count');
        const roundSummary = document.getElementById('round-summary');
        const historyList = document.getElementById('history-list');
        const studentListContainer = document.getElementById('student-list-container');
        const startBtn = document.getElementById('start-btn');
        const modeSelect = document.getElementById('mode-select');
        const drillList = document.getElementById('drill-list');
        const classNameInput = document.getElementById('class-name-input');
        const groupNameInput = document.getElementById('group-name-input');
        const sessionLabelInput = document.getElementById('session-label-input');
        const studentPanel = document.getElementById('student-panel');
        const studentToggle = document.getElementById('student-toggle');
        const studentNameHint = document.getElementById('student-name-hint');
        const studentNameInput = document.getElementById('student-name-input');
        const syncStatusEl = document.getElementById('sync-status');
        const soundPanel = document.getElementById('sound-panel');
        const soundToggle = document.getElementById('sound-toggle');
        const soundEffectsToggle = document.getElementById('sound-effects-toggle');
        const voiceGuidanceToggle = document.getElementById('voice-guidance-toggle');
        const voicePraiseToggle = document.getElementById('voice-praise-toggle');
        const audioVolumeRange = document.getElementById('audio-volume-range');
        const titleChip = document.querySelector('.title-chip');
        const studentDock = document.querySelector('.student-dock');
        const audioState = {
            prefs: { ...DEFAULT_AUDIO_PREFS },
            ctx: null,
            lastGuidanceText: '',
            lastGuidanceAt: 0,
            lastPraiseAt: 0
        };
        const syncState = {
            queue: [],
            flushing: false,
            lastMessage: ''
        };
        const sessionMeta = createDefaultSessionMeta();
        const PRAISE_LINES = [
            '这次节奏很好，继续保持。',
            '动作越来越连贯了。',
            '很好，继续做下一次。',
            '这次完成得不错，再来一组。'
        ];

        studentNameInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                submitStudentName();
            }
        });

        function normalizePracticeUi() {
            if (titleChip) titleChip.textContent = '立定跳远课堂版';
            if (studentDock) {
                const legacyChip = studentDock.querySelector('.chip');
                if (legacyChip) legacyChip.remove();
            }
            const historyHint = document.querySelector('.panel .muted');
            if (historyHint) historyHint.textContent = '每次结束本轮后，会保存当前学生的练习次数、主要问题和下一轮建议。';
        }

        function createDefaultSessionMeta() {
            return {
                className: '',
                groupName: '',
                sessionLabel: createDefaultSessionLabel()
            };
        }

        function normalizeAudioPrefs(value) {
            const parsed = value && typeof value === 'object' ? value : {};
            return {
                effects: parsed.effects !== false,
                guidance: parsed.guidance !== false,
                praise: parsed.praise !== false,
                volume: typeof parsed.volume === 'number' ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_AUDIO_PREFS.volume
            };
        }

        function normalizeStudents(value) {
            if (value && typeof value === 'object' && Object.keys(value).length > 0) return value;
            return { ...DEFAULT_STUDENTS };
        }

        function normalizeSessionMeta(value) {
            const fallback = createDefaultSessionMeta();
            const parsed = value && typeof value === 'object' ? value : {};
            return {
                className: typeof parsed.className === 'string' ? parsed.className : '',
                groupName: typeof parsed.groupName === 'string' ? parsed.groupName : '',
                sessionLabel: typeof parsed.sessionLabel === 'string' && parsed.sessionLabel.trim() ? parsed.sessionLabel : fallback.sessionLabel
            };
        }

        function normalizeSyncQueue(value) {
            return Array.isArray(value) ? value : [];
        }

        function persistState(key, value) {
            storageApi.save(key, value).catch(error => console.warn(`Failed to persist ${key}`, error));
        }

        function saveAudioPrefs() {
            persistState(AUDIO_PREFS_KEY, audioState.prefs);
        }

        function applyAudioPrefsToUi() {
            soundEffectsToggle.checked = audioState.prefs.effects;
            voiceGuidanceToggle.checked = audioState.prefs.guidance;
            voicePraiseToggle.checked = audioState.prefs.praise;
            audioVolumeRange.value = Math.round(audioState.prefs.volume * 100);
        }

        function ensureAudioContext() {
            if (audioState.ctx) return audioState.ctx;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            audioState.ctx = new AudioCtx();
            return audioState.ctx;
        }

        function unlockAudio() {
            const ctx = ensureAudioContext();
            if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
        }

        function playTone(type) {
            if (!audioState.prefs.effects) return;
            const ctx = ensureAudioContext();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume().catch(() => {});
            const configs = {
                start: { frequency: 660, duration: 0.12, gain: 0.05, wave: 'triangle' },
                success: { frequency: 880, duration: 0.12, gain: 0.06, wave: 'sine' },
                finish: { frequency: 520, duration: 0.18, gain: 0.05, wave: 'triangle' },
                warning: { frequency: 300, duration: 0.16, gain: 0.05, wave: 'square' }
            };
            const config = configs[type] || configs.success;
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const now = ctx.currentTime;
            oscillator.type = config.wave;
            oscillator.frequency.value = config.frequency;
            gainNode.gain.setValueAtTime(config.gain * audioState.prefs.volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            oscillator.start(now);
            oscillator.stop(now + config.duration);
        }

        function speakText(text, options = {}) {
            const kind = options.kind || 'guidance';
            const force = options.force === true;
            if (!text || !window.speechSynthesis) return;
            if (kind === 'guidance' && !audioState.prefs.guidance) return;
            if (kind === 'praise' && !audioState.prefs.praise) return;
            const now = Date.now();
            if (!force) {
                if (kind === 'guidance') {
                    if (text === audioState.lastGuidanceText && now - audioState.lastGuidanceAt < 2400) return;
                    if (now - audioState.lastGuidanceAt < 1800) return;
                }
                if (kind === 'praise' && now - audioState.lastPraiseAt < 3200) return;
            }
            try {
                if (kind === 'guidance') {
                    speechSynthesis.cancel();
                    audioState.lastGuidanceText = text;
                    audioState.lastGuidanceAt = now;
                } else if (kind === 'praise') {
                    audioState.lastPraiseAt = now;
                }
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'zh-CN';
                utterance.rate = kind === 'guidance' ? 1.03 : 1.0;
                utterance.pitch = kind === 'praise' ? 1.05 : 1.0;
                utterance.volume = audioState.prefs.volume;
                speechSynthesis.speak(utterance);
            } catch (error) {
                console.warn('speech failed', error);
            }
        }

        function maybeSpeakFeedback(main, phase) {
            if (!app.training || phase === 'IDLE') return;
            speakText(main, { kind: 'guidance' });
        }

        function speakPraiseLine(line) {
            speakText(line || PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)], { kind: 'praise' });
        }

        function closeSoundPanel() {
            soundPanel.classList.remove('is-open');
            soundToggle.textContent = '声音提示';
        }

        function toggleSoundPanel() {
            const isOpen = !soundPanel.classList.contains('is-open');
            soundPanel.classList.toggle('is-open', isOpen);
            soundToggle.textContent = isOpen ? '收起声音' : '声音提示';
        }

        function updateAudioPrefs() {
            unlockAudio();
            audioState.prefs.effects = soundEffectsToggle.checked;
            audioState.prefs.guidance = voiceGuidanceToggle.checked;
            audioState.prefs.praise = voicePraiseToggle.checked;
            audioState.prefs.volume = Number(audioVolumeRange.value || 80) / 100;
            saveAudioPrefs();
        }

        function saveStudents() {
            persistState(STORAGE_KEY, app.students);
        }

        function createDefaultSessionLabel() {
            const now = new Date();
            const dateText = new Intl.DateTimeFormat('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(now).replace(/\//g, '-');
            const dayPart = now.getHours() < 12 ? '上午课' : '下午课';
            return `${dateText} ${dayPart}`;
        }

        function saveSessionMeta() {
            persistState(SESSION_META_KEY, sessionMeta);
        }

        function applySessionMetaToUi() {
            if (classNameInput) classNameInput.value = sessionMeta.className || '';
            if (groupNameInput) groupNameInput.value = sessionMeta.groupName || '';
            if (sessionLabelInput) sessionLabelInput.value = sessionMeta.sessionLabel || '';
        }

        function updateSessionMeta() {
            sessionMeta.className = (classNameInput.value || '').trim();
            sessionMeta.groupName = (groupNameInput.value || '').trim();
            sessionMeta.sessionLabel = (sessionLabelInput.value || '').trim() || createDefaultSessionLabel();
            if (!sessionLabelInput.value.trim()) sessionLabelInput.value = sessionMeta.sessionLabel;
            saveSessionMeta();
            refreshSyncStatus();
        }

        function saveSyncQueue() {
            persistState(SYNC_QUEUE_KEY, syncState.queue);
        }

        function setSyncStatus(message, tone = '') {
            syncState.lastMessage = message;
            if (!syncStatusEl) return;
            syncStatusEl.textContent = message;
            syncStatusEl.className = `muted sync-status${tone ? ` is-${tone}` : ''}`;
        }

        function refreshSyncStatus() {
            if (syncState.flushing) {
                setSyncStatus(`云端同步：正在上传 ${syncState.queue.length} 条记录。`, 'warning');
                return;
            }
            if (syncState.queue.length > 0) {
                const online = navigator.onLine;
                setSyncStatus(`云端同步：待上传 ${syncState.queue.length} 条记录。${online ? '网络已连接，稍后自动重试。' : '当前离线，恢复网络后会自动补传。'}`, 'warning');
                return;
            }
            if (syncState.lastMessage) {
                setSyncStatus(syncState.lastMessage, 'success');
                return;
            }
            setSyncStatus('云端同步：已连接，新的训练总结会自动上传。', 'success');
        }

        function currentModeLabel() {
            const option = modeSelect.options[modeSelect.selectedIndex];
            return option ? option.textContent.trim() : currentMode();
        }

        function createRecordId() {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
            return `jump_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
        }

        function buildRoundAnalysis() {
            return coreBuildRoundAnalysis(app.round, currentMode(), ISSUE_META);
        }

        function buildRoundRecord() {
            const analysis = buildRoundAnalysis();
            const savedAt = new Date();
            return {
                recordId: createRecordId(),
                time: savedAt.toLocaleString(),
                savedAt: savedAt.toISOString(),
                studentName: app.currentStudent,
                className: sessionMeta.className || '',
                groupName: sessionMeta.groupName || '',
                sessionLabel: sessionMeta.sessionLabel || createDefaultSessionLabel(),
                mode: currentMode(),
                modeLabel: currentModeLabel(),
                practiceCount: analysis.practiceCount,
                successCount: analysis.successCount,
                failedCount: analysis.failedCount,
                topReasonsText: analysis.topReasonsText,
                improvementText: analysis.improvementText,
                suggestion: analysis.suggestion,
                summaryText: analysis.summaryText,
                hasActionFeedback: analysis.hasActionFeedback,
                syncStatus: 'pending',
                source: 'jump-web'
            };
        }

        function shouldPersistRoundRecord(record) {
            if (!record) return false;
            if (!Number(record.practiceCount || 0)) return false;
            return record.hasActionFeedback === true;
        }

        function buildSupabasePayload(record) {
            return {
                record_id: record.recordId,
                student_name: record.studentName || app.currentStudent,
                class_name: record.className || '',
                group_name: record.groupName || '',
                session_label: record.sessionLabel || createDefaultSessionLabel(),
                mode: record.mode || currentMode(),
                mode_label: record.modeLabel || currentModeLabel(),
                practice_count: Number(record.practiceCount || 0),
                success_count: Number(record.successCount || 0),
                failed_count: Number(record.failedCount || 0),
                top_reasons_text: record.topReasonsText || '',
                improvement_text: record.improvementText || '',
                summary_text: record.summaryText || '',
                suggestion: record.suggestion || '',
                saved_at: record.savedAt || new Date().toISOString(),
                source: record.source || 'jump-web',
                raw_record: record
            };
        }

        async function uploadRecordToSupabase(record) {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_PUBLISHABLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify([buildSupabasePayload(record)])
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status} ${errorText}`);
            }
        }

        async function flushSyncQueue() {
            if (syncState.flushing || syncState.queue.length === 0) {
                refreshSyncStatus();
                return;
            }
            if (!navigator.onLine) {
                refreshSyncStatus();
                return;
            }

            syncState.flushing = true;
            refreshSyncStatus();

            try {
                while (syncState.queue.length > 0) {
                    const nextRecord = syncState.queue[0];
                    await uploadRecordToSupabase(nextRecord);
                    syncState.queue.shift();
                    saveSyncQueue();
                }
                setSyncStatus('云端同步：最新训练总结已上传。', 'success');
            } catch (error) {
                console.warn('Failed to sync jump round records', error);
                setSyncStatus(`云端同步失败：${error.message}。已保留待上传记录。`, 'error');
            } finally {
                syncState.flushing = false;
                if (syncState.queue.length > 0 && !String(syncState.lastMessage || '').startsWith('云端同步失败')) {
                    refreshSyncStatus();
                }
            }
        }

        function queueRoundRecord(record) {
            syncState.queue.push(record);
            saveSyncQueue();
            refreshSyncStatus();
            flushSyncQueue();
        }

        function renderHistoryItem(record) {
            const practiceCount = Number.isFinite(record.practiceCount) ? record.practiceCount : (Number(record.successCount || 0) + Number(record.failedCount || 0));
            const summaryLine = record.summaryText || `本轮共练习 ${practiceCount || 0} 次。`;
            const topReasonsText = record.topReasonsText || record.improvementText || '本轮未形成可用动作指导';
            const suggestion = record.suggestion || '请保证全身完整入镜后，再进行一次完整动作。';
            const tags = [record.className, record.groupName, record.sessionLabel].filter(Boolean).join(' / ');
            return `
                <div class="time">${record.time || ''}</div>
                ${tags ? `<div class="time">${tags}</div>` : ''}
                <div class="result">
                    <strong>${summaryLine}</strong><br>
                    主要问题：${topReasonsText}<br>
                    训练建议：${suggestion}
                </div>
            `;
        }

        function ensureCurrentStudent() {
            const names = Object.keys(app.students);
            if (!names.includes(app.currentStudent)) app.currentStudent = names[0];
        }

        function renderStudentOptions() {
            ensureCurrentStudent();
            studentListContainer.innerHTML = '';
            Object.keys(app.students).forEach(name => {
                const row = document.createElement('div');
                row.className = `student-row${name === app.currentStudent ? ' is-active' : ''}`;
                row.addEventListener('click', () => changeStudent(name));

                const label = document.createElement('span');
                label.className = 'student-row-name';
                label.textContent = name;
                row.appendChild(label);

                if (name !== '默认学生') {
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'student-row-delete';
                    removeBtn.textContent = '×';
                    removeBtn.addEventListener('click', event => {
                        event.stopPropagation();
                        deleteStudent(name);
                    });
                    row.appendChild(removeBtn);
                }

                studentListContainer.appendChild(row);
            });
            studentToggle.textContent = app.currentStudent;
            renderHistory();
        }

        function closeStudentPanel() {
            studentPanel.classList.remove('is-open');
            studentToggle.textContent = app.currentStudent;
        }

        function toggleStudentPanel() {
            const isOpen = !studentPanel.classList.contains('is-open');
            studentPanel.classList.toggle('is-open', isOpen);
            studentToggle.textContent = isOpen ? '收起管理' : app.currentStudent;
            if (isOpen) requestAnimationFrame(() => studentNameInput.focus());
        }

        function addStudent() {
            studentNameInput.focus();
        }

        function renameStudent() {
            addStudent();
        }

        function closeStudentNameEditor() {
            studentNameInput.value = '';
            studentNameHint.textContent = '点选名单可切换学生，右侧 × 可删除。';
        }

        function submitStudentName() {
            const trimmed = studentNameInput.value.trim();
            if (!trimmed) {
                studentNameHint.textContent = '姓名不能为空，请重新输入。';
                studentNameInput.focus();
                return;
            }
            if (app.students[trimmed]) {
                studentNameHint.textContent = `“${trimmed}”已经存在，请换一个名字。`;
                studentNameInput.focus();
                studentNameInput.select();
                return;
            }
            app.students[trimmed] = [];
            app.currentStudent = trimmed;
            saveStudents();
            renderStudentOptions();
            closeStudentNameEditor();
        }

        function changeStudent(name) {
            app.currentStudent = name;
            renderHistory();
            resetRound(true);
            closeStudentPanel();
        }

        function deleteStudent(name = app.currentStudent) {
            const names = Object.keys(app.students);
            if (names.length <= 1) return;
            if (!confirm(`确定删除 ${name} 吗？`)) return;
            delete app.students[name];
            if (app.currentStudent === name) app.currentStudent = Object.keys(app.students)[0];
            saveStudents();
            renderStudentOptions();
            closeStudentPanel();
        }

        function clearCurrentStudentHistory() {
            if (!confirm(`确定清空 ${app.currentStudent} 的历史记录吗？`)) return;
            app.students[app.currentStudent] = [];
            saveStudents();
            renderHistory();
        }

        function renderHistory() {
            historyList.innerHTML = '';
            const records = app.students[app.currentStudent] || [];
            if (records.length === 0) {
                historyList.innerHTML = '<div class="history-item"><div class="result">当前学生还没有保存的跳远记录。</div></div>';
                return;
            }
            [...records].reverse().forEach(record => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = renderHistoryItem(record);
                historyList.appendChild(div);
            });
        }

        function currentMode() {
            return modeSelect.value;
        }

        function usesGestureGate() {
            return currentMode() === 'full';
        }

        function renderDrills() {
            const drills = DRILL_CONTENT[currentMode()] || [];
            drillList.innerHTML = drills.map(item => `
                <div class="drill-item">
                    <strong>${item.title}</strong>
                    <span>${item.text}</span>
                </div>
            `).join('');
        }

        function changeMode() {
            resetRound(false);
            renderDrills();
            if (currentMode() === 'arms') {
                updateFeedback('当前为摆臂专项', '重点体会大臂后摆到前上摆，不要只甩小臂。', 'READY');
            } else if (currentMode() === 'preload') {
                updateFeedback('当前为预摆蹬伸专项', '重点体会膝髋共同下沉，再快速蹬伸起跳。', 'READY');
            } else if (currentMode() === 'landing') {
                updateFeedback('当前为落地缓冲专项', '重点体会脚跟先着地、屈膝缓冲和稳定控制。', 'READY');
            } else {
                updateFeedback('正对镜头单手上举', '先正对镜头单手直臂上举 0.3 到 0.5 秒，再转侧身开始跳远。', 'IDLE');
            }
        }

        function resizeCanvas() {
            canvas.width = video.clientWidth || canvas.width;
            canvas.height = video.clientHeight || canvas.height;
        }

        window.addEventListener('resize', resizeCanvas);

        function pointVisible(point) {
            return corePointVisible(point, JUMP_CONFIG.minVisibility);
        }

        function clearMotionTracking() {
            app.phase = 'IDLE';
            app.phaseFrames = 0;
            app.phaseStartedAt = 0;
            app.attemptStartedAt = 0;
            app.readyFrames = 0;
            app.cooldownFrames = 0;
            app.awaitingReset = false;
            app.rearmFrames = 0;
            app.stableFrames = 0;
            app.prevHipX = null;
            app.prevHipY = null;
            app.baseline = null;
            app.attempt = null;
            app.targetLock = null;
            app.targetGraceFrames = 0;
            app.lowerBodyLossFrames = 0;
            app.smoothFeatures = null;
            app.confirmFrames = { takeoff: 0, flight: 0, landing: 0 };
            app.drillPhase = 'IDLE';
            app.drillFrames = 0;
        }

        function resetGestureGate() {
            app.gestureStage = usesGestureGate() ? GESTURE_STAGE_WAIT : GESTURE_STAGE_DISABLED;
            app.gestureHoldFrames = 0;
            app.transitionStartedAt = 0;
            app.gestureSideReadyFrames = 0;
        }

        function resetAttemptFlow() {
            clearMotionTracking();
            resetGestureGate();
        }

        function midpoint2D(a, b) {
            return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        }

        function getAngle2D(a, b, c) {
            if (!a || !b || !c) return 180;
            const abx = a.x - b.x;
            const aby = a.y - b.y;
            const cbx = c.x - b.x;
            const cby = c.y - b.y;
            const ab = Math.hypot(abx, aby);
            const cb = Math.hypot(cbx, cby);
            if (!ab || !cb) return 180;
            const cosine = Math.min(1, Math.max(-1, (abx * cbx + aby * cby) / (ab * cb)));
            return Math.acos(cosine) * 180 / Math.PI;
        }

        function detectRaiseGesture(landmarks) {
            const leftShoulder = landmarks[11];
            const rightShoulder = landmarks[12];
            const leftHip = landmarks[23];
            const rightHip = landmarks[24];
            if (![leftShoulder, rightShoulder, leftHip, rightHip].every(pointVisible)) return { detected: false };

            const shoulderMid = midpoint2D(leftShoulder, rightShoulder);
            const hipMid = midpoint2D(leftHip, rightHip);
            const torso = Math.max(Math.hypot(shoulderMid.x - hipMid.x, shoulderMid.y - hipMid.y), 0.001);
            const shoulderWidth = Math.max(Math.abs(leftShoulder.x - rightShoulder.x), 0.001);
            const frontEnough = shoulderWidth / torso >= JUMP_CONFIG.frontShoulderRatioMin;
            if (!frontEnough) return { detected: false };

            const checkSide = side => {
                const shoulder = landmarks[side === 'left' ? 11 : 12];
                const elbow = landmarks[side === 'left' ? 13 : 14];
                const wrist = landmarks[side === 'left' ? 15 : 16];
                if (![shoulder, elbow, wrist].every(pointVisible)) return null;
                const armLift = (shoulder.y - wrist.y) / torso;
                const elbowAngle = getAngle2D(shoulder, elbow, wrist);
                const wristAligned = Math.abs(wrist.x - shoulder.x) <= shoulderWidth * 0.95;
                const elbowAboveShoulder = elbow.y <= shoulder.y + torso * 0.18;
                if (
                    armLift >= JUMP_CONFIG.gestureArmLiftMin &&
                    elbowAngle >= JUMP_CONFIG.gestureArmStraightMin &&
                    wristAligned &&
                    elbowAboveShoulder
                ) {
                    return { side, armLift, elbowAngle };
                }
                return null;
            };

            return checkSide('left') || checkSide('right') || { detected: false };
        }

        function finalizeAttemptCycle(main, sub) {
            app.attempt = null;
            app.attemptStartedAt = 0;
            app.cooldownFrames = 0;
            app.awaitingReset = false;
            app.rearmFrames = 0;
            app.readyFrames = 0;
            app.targetGraceFrames = 0;
            app.confirmFrames = { takeoff: 0, flight: 0, landing: 0 };
            if (usesGestureGate()) {
                app.baseline = null;
                app.targetLock = null;
                app.prevHipX = null;
                app.prevHipY = null;
                app.smoothFeatures = null;
                app.stableFrames = 0;
                app.lowerBodyLossFrames = 0;
                app.gestureStage = GESTURE_STAGE_WAIT;
                app.gestureHoldFrames = 0;
                app.transitionStartedAt = 0;
                app.gestureSideReadyFrames = 0;
                updateFeedback(main, sub, 'IDLE');
                return;
            }
            app.cooldownFrames = JUMP_CONFIG.roundCooldownFrames;
            app.awaitingReset = true;
            app.rearmFrames = 0;
            setPhase('READY');
            updateFeedback(main, sub, 'READY');
        }

        function resetAttemptWithoutCounting(main, sub) {
            app.attempt = null;
            app.attemptStartedAt = 0;
            app.cooldownFrames = 0;
            app.awaitingReset = false;
            app.rearmFrames = 0;
            app.readyFrames = JUMP_CONFIG.readyHoldFrames;
            app.targetGraceFrames = 0;
            app.confirmFrames = { takeoff: 0, flight: 0, landing: 0 };
            app.phase = 'READY';
            app.phaseFrames = 0;
            app.phaseStartedAt = Date.now();
            if (usesGestureGate()) {
                app.gestureStage = GESTURE_STAGE_ARMED;
                app.gestureHoldFrames = 0;
                app.transitionStartedAt = 0;
                app.gestureSideReadyFrames = JUMP_CONFIG.sideReadyFrames;
            }
            updateFeedback(main, sub, 'READY');
        }

        function markAttemptCommitted() {
            if (app.attempt) app.attempt.committed = true;
        }

        function tickAttemptSample() {
            if (!app.attempt) return;
            app.attempt.sampleFrame = (app.attempt.sampleFrame || 0) + 1;
        }

        function updateAttemptArmPeak(armLiftValue) {
            if (!app.attempt) return;
            if (!Number.isFinite(armLiftValue)) return;
            if (armLiftValue > app.attempt.maxArmLift) {
                app.attempt.maxArmLift = armLiftValue;
                app.attempt.armPeakFrame = app.attempt.sampleFrame;
            }
        }

        function enrichAttemptDiagnostics() {
            if (!app.round || !app.attempt) return;
            const forward = Math.max(app.attempt.maxForward || 0, 0);
            const rise = Math.max(app.attempt.maxRise || 0, 0);
            const angleRatio = rise / Math.max(forward, 0.0001);
            const hasTakeoffEvidence = rise >= JUMP_CONFIG.takeoffRise * 0.75 || forward >= JUMP_CONFIG.minFlightForward * 0.75;

            if (hasTakeoffEvidence) {
                if (rise < JUMP_CONFIG.pushoffWeakRise && forward < JUMP_CONFIG.pushoffWeakForward) {
                    incrementReason(app.round.improvementReasons, 'pushoff_weak');
                } else if (forward >= JUMP_CONFIG.minFlightForward * 0.75 && angleRatio < JUMP_CONFIG.takeoffAngleLowRatio) {
                    incrementReason(app.round.improvementReasons, 'takeoff_angle_low');
                } else if (rise >= JUMP_CONFIG.takeoffRise * 0.9 && angleRatio > JUMP_CONFIG.takeoffAngleHighRatio) {
                    incrementReason(app.round.improvementReasons, 'takeoff_angle_high');
                }
            }

            if (Number.isFinite(app.attempt.armPeakFrame) && Number.isFinite(app.attempt.takeoffFrame)) {
                if (Math.abs(app.attempt.armPeakFrame - app.attempt.takeoffFrame) > JUMP_CONFIG.armLegAsyncFrames) {
                    incrementReason(app.round.improvementReasons, 'arm_leg_async');
                }
            }

            if (forward >= JUMP_CONFIG.minFlightForward * 0.75 && app.attempt.maxFlightHipAngle > 0 && app.attempt.maxFlightHipAngle < JUMP_CONFIG.flightHipExtensionMin) {
                incrementReason(app.round.improvementReasons, 'flight_no_arch');
            }
        }

        function shouldCountFailure(reasonCode) {
            if (!app.attempt) return false;
            if (app.attempt.committed) return true;
            if (reasonCode === 'keypoint_lost' || reasonCode === 'target_size_drift' || reasonCode === 'not_ready' || reasonCode === 'preload_weak') return false;
            return app.phase === 'TAKEOFF' || app.phase === 'FLIGHT' || app.phase === 'LANDING';
        }

        function handleGestureGate(landmarks) {
            if (!app.training || !usesGestureGate()) return { blocked: false, features: null };

            if (app.gestureStage === GESTURE_STAGE_WAIT) {
                const gesture = detectRaiseGesture(landmarks);
                if (gesture.side) {
                    app.gestureHoldFrames = Math.min(app.gestureHoldFrames + 1, JUMP_CONFIG.gestureHoldFramesMax);
                    if (app.gestureHoldFrames >= JUMP_CONFIG.gestureHoldFramesMin) {
                        app.gestureStage = GESTURE_STAGE_TRANSITION;
                        app.gestureHoldFrames = 0;
                        app.transitionStartedAt = Date.now();
                        app.gestureSideReadyFrames = 0;
                        clearMotionTracking();
                        updateFeedback('已识别准备手势', '请转为侧身站立，准备开始本次跳远。', 'IDLE');
                    } else {
                        updateFeedback('保持举手 0.3 秒', '正对镜头单手直臂上举，系统正在确认开始手势。', 'IDLE');
                    }
                } else {
                    app.gestureHoldFrames = 0;
                    updateFeedback('正对镜头单手上举', '先正对镜头，单手直臂上举 0.3 到 0.5 秒，再转侧身练习。', 'IDLE');
                }
                return { blocked: true, features: null };
            }

            const features = extractFeatures(landmarks);

            if (app.gestureStage === GESTURE_STAGE_TRANSITION) {
                if (!features) {
                    if (Date.now() - app.transitionStartedAt > JUMP_CONFIG.sideTransitionTimeoutMs) {
                        app.transitionStartedAt = Date.now();
                    }
                    updateFeedback('请转为侧身准备', '转侧身后保持全身入镜，先站稳再开始跳远。', 'IDLE');
                    return { blocked: true, features: null };
                }
                const stableFeatures = smoothFeatures(features);
                updateBaseline(stableFeatures);
                app.prevHipX = stableFeatures.hipMid.x;
                app.prevHipY = stableFeatures.hipMid.y;
                const readyPose = stableFeatures.kneeAngle >= JUMP_CONFIG.readyKneeMin && stableFeatures.hipAngle >= JUMP_CONFIG.readyHipMin;
                if (readyPose && app.baseline) {
                    app.gestureSideReadyFrames += 1;
                    if (app.gestureSideReadyFrames >= JUMP_CONFIG.sideReadyFrames) {
                        app.gestureStage = GESTURE_STAGE_ARMED;
                        app.readyFrames = JUMP_CONFIG.readyHoldFrames;
                        setPhase('READY');
                        updateFeedback('可以开始本次跳远', '保持侧身，先下蹲预摆，再快速蹬伸起跳。', 'READY');
                    } else {
                        updateFeedback('保持侧身准备', '已识别开始手势，请侧身站稳，马上开始。', 'READY');
                    }
                } else {
                    app.gestureSideReadyFrames = 0;
                    updateFeedback('保持侧身准备', '已识别开始手势，请侧身站稳，马上开始。', 'READY');
                }
                return { blocked: true, features: stableFeatures };
            }

            if (!features) {
                updateFeedback('请保持侧身入镜', '完成举手后，请侧身站立并保证全身完整入镜。', 'READY');
                app.prevHipX = null;
                app.prevHipY = null;
                app.smoothFeatures = null;
                return { blocked: true, features: null };
            }

            return { blocked: false, features };
        }

        function extractFeatures(landmarks) {
            return coreExtractFeatures(landmarks, JUMP_CONFIG);
        }

        function smoothFeatures(features) {
            app.smoothFeatures = coreSmoothFeatures(app.smoothFeatures, features, JUMP_CONFIG.emaAlpha);
            return app.smoothFeatures;
        }

        function resetRound(keepFeedback) {
            app.round = createRoundState();
            resetAttemptFlow();
            updateCounters();
            if (!keepFeedback) {
                if (usesGestureGate()) {
                    updateFeedback('正对镜头单手上举', '先正对镜头，单手直臂上举 0.3 到 0.5 秒，再转侧身练习。', 'IDLE');
                } else {
                    updateFeedback('请侧身站立，保证全身入镜', '系统会按“站稳准备 → 预摆 → 蹬伸起跳 → 腾空 → 落地缓冲”五个阶段判断动作。', 'IDLE');
                }
                renderRoundSummary();
            }
        }

        function updateCounters() {
            practiceCountEl.textContent = app.round ? app.round.practiceCount : 0;
        }

        function refreshBaseline(features) {
            if (!app.baseline) {
                app.baseline = {
                    hipY: features.hipMid.y,
                    hipX: features.hipMid.x,
                    ankleY: features.ankle.y,
                    wristY: features.wrist.y,
                    torso: features.torso
                };
                return;
            }
            app.baseline.hipY = app.baseline.hipY * 0.85 + features.hipMid.y * 0.15;
            app.baseline.hipX = app.baseline.hipX * 0.85 + features.hipMid.x * 0.15;
            app.baseline.ankleY = app.baseline.ankleY * 0.85 + features.ankle.y * 0.15;
            app.baseline.wristY = app.baseline.wristY * 0.85 + features.wrist.y * 0.15;
            app.baseline.torso = app.baseline.torso * 0.85 + features.torso * 0.15;
        }

        function setPhase(phase) {
            app.phase = phase;
            app.phaseFrames = 0;
            app.phaseStartedAt = Date.now();
            app.confirmFrames = { takeoff: 0, flight: 0, landing: 0 };
            const labels = { IDLE: '阶段：待机', READY: '阶段：站稳准备', PRELOAD: '阶段：预摆蓄力', TAKEOFF: '阶段：起跳发力', FLIGHT: '阶段：腾空前移', LANDING: '阶段：落地缓冲' };
            phaseBadge.textContent = labels[phase] || '阶段：待机';
        }

        function getPhaseElapsedMs() {
            return app.phaseStartedAt ? Date.now() - app.phaseStartedAt : 0;
        }

        function updateFeedback(main, sub, phase) {
            feedbackMain.textContent = main;
            feedbackSub.textContent = sub;
            if (phase) setPhase(phase);
            maybeSpeakFeedback(main, phase);
        }

        function incrementReason(bucket, code) {
            coreIncrementReason(bucket, code);
        }

        function buildTopReasonText(bucket) {
            return coreBuildTopReasonText(bucket, ISSUE_META);
        }

        function hasAttemptSignal(features) {
            if (!app.baseline) return false;
            const torsoRef = Math.max(app.baseline.torso || features.torso || 0.001, 0.001);
            const hipDrop = (features.hipMid.y - app.baseline.hipY) / torsoRef;
            const hipForward = Math.abs(features.hipMid.x - app.baseline.hipX) / torsoRef;
            return (
                features.kneeAngle <= JUMP_CONFIG.preloadKneeMax ||
                features.hipAngle <= JUMP_CONFIG.preloadHipMax ||
                hipDrop > (JUMP_CONFIG.minPreloadDepth * 0.55) ||
                hipForward > (JUMP_CONFIG.minFlightForward * 0.6) ||
                features.wristBack > 0.2 ||
                features.armLift > 0.03
            );
        }

        function hasStrongAttemptSignal(features) {
            if (!app.baseline) return false;
            const torsoRef = Math.max(app.baseline.torso || features.torso || 0.001, 0.001);
            const hipDrop = (features.hipMid.y - app.baseline.hipY) / torsoRef;
            return (
                features.kneeAngle <= JUMP_CONFIG.earlyAttemptKneeMax ||
                features.hipAngle <= JUMP_CONFIG.earlyAttemptHipMax ||
                hipDrop >= JUMP_CONFIG.earlyAttemptDepthRatio
            );
        }

        function updateTargetLock(features) {
            if (!app.targetLock) {
                app.targetLock = {
                    hipX: features.hipMid.x,
                    hipY: features.hipMid.y,
                    torso: features.torso,
                    side: features.side
                };
                app.targetGraceFrames = 0;
                return { accepted: true, reason: null };
            }

            const torsoRatio = features.torso / Math.max(app.targetLock.torso, 0.001);
            const centerDistance = Math.hypot(features.hipMid.x - app.targetLock.hipX, features.hipMid.y - app.targetLock.hipY);
            const maxDistance = Math.max(app.targetLock.torso * JUMP_CONFIG.targetTrackRatio, 0.22);
            if (
                torsoRatio < JUMP_CONFIG.targetTorsoMinRatio ||
                torsoRatio > JUMP_CONFIG.targetTorsoMaxRatio ||
                centerDistance > maxDistance
            ) {
                app.targetGraceFrames += 1;
                return { accepted: true, drifted: true, reason: 'target_size_drift' };
            }

            app.targetLock.hipX = app.targetLock.hipX * 0.78 + features.hipMid.x * 0.22;
            app.targetLock.hipY = app.targetLock.hipY * 0.78 + features.hipMid.y * 0.22;
            app.targetLock.torso = app.targetLock.torso * 0.82 + features.torso * 0.18;
            app.targetLock.side = features.side;
            app.targetGraceFrames = 0;
            return { accepted: true, drifted: false, reason: null };
        }

        function recordSimpleFailure(reasonCode, phase) {
            if (!app.round) return;
            updateFeedback(`本次未成功：${ISSUE_META[reasonCode].label}`, ISSUE_META[reasonCode].tip, phase || 'READY');
            app.cooldownFrames = Math.max(app.cooldownFrames, 6);
        }

        function pickSuggestion() {
            return corePickSuggestion(app.round, currentMode(), ISSUE_META);
        }

        function renderRoundSummary() {
            if (!app.round) return;
            const analysis = buildRoundAnalysis();
            roundSummary.innerHTML = `
                <div class="summary-card"><strong>练习次数</strong><p>本轮共练习 ${analysis.practiceCount} 次。</p></div>
                <div class="summary-card"><strong>主要问题</strong><p>${analysis.topReasonsText || analysis.improvementText || '本轮未形成可用动作指导。'}</p></div>
                <div class="summary-card"><strong>训练建议</strong><p>${analysis.suggestion || '请保证全身完整入镜后，再进行一次完整动作。'}</p></div>
            `;
        }

        function saveRoundHistory() {
            if (!app.round) return;
            const record = buildRoundRecord();
            if (!shouldPersistRoundRecord(record)) return;
            app.students[app.currentStudent].push(record);
            saveStudents();
            renderHistory();
            queueRoundRecord(record);
        }

        function beginAttempt() {
            app.attemptStartedAt = Date.now();
            app.attempt = createAttemptState(app.baseline);
            app.confirmFrames = { takeoff: 0, flight: 0, landing: 0 };
            updateFeedback('开始预摆', '先下蹲预摆，再快速蹬伸起跳。', 'PRELOAD');
        }

        function recordFailure(reasonCode) {
            if (!app.round || !app.attempt) return;
            const counted = shouldCountFailure(reasonCode);
            if (counted) {
                app.round.practiceCount += 1;
                app.round.failedCount += 1;
                if (!NON_ACTION_REASON_CODES.includes(reasonCode)) incrementReason(app.round.failReasons, reasonCode);
                updateCounters();
            }
            playTone('warning');
            if (counted) {
                finalizeAttemptCycle(`本次重点：${ISSUE_META[reasonCode].label}`, `${ISSUE_META[reasonCode].tip} 完成后请重新正对镜头举手开始下一次。`);
            } else if (reasonCode === 'preload_weak') {
                resetAttemptWithoutCounting('预摆后再起跳', '预摆可以做 2 到 3 次，等节奏准备好后再一次完成蹬伸起跳。');
            } else {
                resetAttemptWithoutCounting('本次未计入练习次数', '动作链还没完整建立，请保持侧身准备，继续预摆后再起跳。');
            }
        }

        function recordSuccess() {
            if (!app.round || !app.attempt) return;
            markAttemptCommitted();
            app.round.practiceCount += 1;
            app.round.successCount += 1;
            if (app.attempt.maxDepth < JUMP_CONFIG.minPreloadDepth + 0.01) incrementReason(app.round.improvementReasons, 'preload_weak');
            if (app.attempt.maxArmLift < JUMP_CONFIG.minArmSwingRise + 0.02) incrementReason(app.round.improvementReasons, 'arm_weak');
            if (app.attempt.maxRise < JUMP_CONFIG.takeoffRise + 0.002) incrementReason(app.round.improvementReasons, 'takeoff_weak');
            if (app.attempt.landingKneeAngle > 132) incrementReason(app.round.improvementReasons, 'landing_stiff');
            if (app.attempt.maxHeelLead < JUMP_CONFIG.heelLeadMin) incrementReason(app.round.improvementReasons, 'heel_late');
            enrichAttemptDiagnostics();
            updateCounters();
            playTone('success');
            finalizeAttemptCycle('本次练习完成', '继续保持预摆、蹬地和脚跟着地的完整节奏。下次请重新正对镜头举手开始。');
            speakPraiseLine();
        }

        function updateBaseline(features) {
            const motion = app.prevHipY == null ? 0 : Math.abs(features.hipMid.y - app.prevHipY) + Math.abs(features.hipMid.x - app.prevHipX);
            app.stableFrames = motion < JUMP_CONFIG.stableMotionThreshold ? app.stableFrames + 1 : 0;
            const isReadyPose = features.kneeAngle >= JUMP_CONFIG.readyKneeMin && features.hipAngle >= JUMP_CONFIG.readyHipMin;
            const isStableReady = isReadyPose && app.stableFrames >= 2;

            if (isStableReady) {
                refreshBaseline(features);
            }

            if (app.awaitingReset) {
                if (isStableReady) {
                    app.rearmFrames += 1;
                    if (app.rearmFrames >= JUMP_CONFIG.rearmHoldFrames) {
                        app.awaitingReset = false;
                        app.rearmFrames = 0;
                        app.readyFrames = JUMP_CONFIG.readyHoldFrames;
                        if (!app.attempt) updateFeedback('已回到起始站姿', '可以开始下一次完整动作。', 'READY');
                    }
                } else {
                    app.rearmFrames = 0;
                    if (!app.attempt) app.readyFrames = 0;
                }
                return;
            }

            if (isStableReady) {
                app.readyFrames += 1;
                if (app.readyFrames >= JUMP_CONFIG.readyHoldFrames) updateFeedback('已准备好，先下蹲预摆再起跳', '请保持侧身、全身入镜，完成完整跳远动作。', 'READY');
                if (app.phase === 'IDLE') setPhase('READY');
            } else if (!app.attempt) {
                app.readyFrames = Math.max(0, app.readyFrames - 1);
            }
        }

        function handleReady(features) {
            if (app.awaitingReset) {
                updateFeedback('先回到起始站姿', '落地站稳后，再开始下一次完整动作。', 'READY');
                return;
            }
            if (app.readyFrames < JUMP_CONFIG.readyHoldFrames) {
                if (app.baseline && hasStrongAttemptSignal(features) && app.cooldownFrames === 0) {
                    beginAttempt();
                    return;
                }
                updateFeedback('先站稳准备', '请侧身站立，双脚完整入镜，保持 1 秒稳定。', 'READY');
                return;
            }
            if (hasAttemptSignal(features)) beginAttempt();
            else updateFeedback('先下蹲预摆', '保持侧身，先做明显预摆，再快速蹬伸起跳。', 'READY');
        }

        function handlePreload(features) {
            app.phaseFrames += 1;
            tickAttemptSample();
            const depthRatio = (features.hipMid.y - app.attempt.baselineHipY) / Math.max(app.attempt.baselineTorso, 0.001);
            app.attempt.maxDepth = Math.max(app.attempt.maxDepth, depthRatio);
            updateAttemptArmPeak(app.attempt.baselineWristY - features.wrist.y);
            if (app.attempt.maxDepth < JUMP_CONFIG.minPreloadDepth * 0.85) {
                updateFeedback('预摆再深一点', '膝和髋一起下沉，准备快速蹬伸。', 'PRELOAD');
            } else if (app.attempt.maxArmLift < JUMP_CONFIG.minArmSwingRise * 0.7) {
                updateFeedback('手臂先向后摆开', '预摆时双臂后摆，再顺势前上摆。', 'PRELOAD');
            } else {
                updateFeedback('继续预摆', '保持下蹲节奏，马上转入快速蹬伸。', 'PRELOAD');
            }
            if (app.phaseFrames < JUMP_CONFIG.preloadMinFrames) return;
            const riseFromDeepest = app.attempt.maxDepth - depthRatio;
            if (features.kneeAngle >= JUMP_CONFIG.takeoffKneeMin && riseFromDeepest >= JUMP_CONFIG.takeoffRise) {
                app.confirmFrames.takeoff += 1;
                if (app.confirmFrames.takeoff >= JUMP_CONFIG.takeoffConfirmFrames) {
                    markAttemptCommitted();
                    if (!Number.isFinite(app.attempt.takeoffFrame)) app.attempt.takeoffFrame = app.attempt.sampleFrame;
                    updateFeedback('开始蹬伸起跳', '继续快速伸髋伸膝，同时摆臂前上。', 'TAKEOFF');
                    setPhase('TAKEOFF');
                    return;
                }
            } else {
                app.confirmFrames.takeoff = 0;
            }
            if (getPhaseElapsedMs() > JUMP_CONFIG.preloadTimeoutMs) recordFailure(app.attempt.maxDepth < JUMP_CONFIG.minPreloadDepth ? 'preload_weak' : 'takeoff_weak');
        }

        function handleTakeoff(features) {
            app.phaseFrames += 1;
            tickAttemptSample();
            markAttemptCommitted();
            const torsoRef = Math.max(app.attempt.baselineTorso, 0.001);
            app.attempt.maxRise = Math.max(app.attempt.maxRise, (app.attempt.baselineHipY - features.hipMid.y) / torsoRef);
            updateAttemptArmPeak(app.attempt.baselineWristY - features.wrist.y);
            app.attempt.maxForward = Math.max(app.attempt.maxForward, Math.abs(features.hipMid.x - app.attempt.baselineHipX) / torsoRef);
            const ankleLift = (app.attempt.baselineAnkleY - features.ankle.y) / torsoRef;
            if (app.attempt.maxArmLift < JUMP_CONFIG.minArmSwingRise * 0.8) {
                updateFeedback('摆臂再主动一点', '双臂从后向前上方快速摆起。', 'TAKEOFF');
            } else if (app.attempt.maxRise < JUMP_CONFIG.takeoffRise * 0.8) {
                updateFeedback('起跳更快一些', '继续伸髋伸膝，把身体快速送起。', 'TAKEOFF');
            } else {
                updateFeedback('继续向前上方发力', '保持完整蹬伸，准备进入腾空。', 'TAKEOFF');
            }
            if (features.dualAnklesVisible) {
                app.attempt.hasSyncSample = true;
                app.attempt.maxAnkleAsync = Math.max(app.attempt.maxAnkleAsync, features.ankleAsync);
                app.attempt.maxAnkleForwardAsync = Math.max(app.attempt.maxAnkleForwardAsync, features.ankleForwardAsync);
            }
            if (app.attempt.maxRise >= JUMP_CONFIG.takeoffRise && (ankleLift > JUMP_CONFIG.takeoffRise || app.attempt.maxForward >= JUMP_CONFIG.minFlightForward)) {
                app.confirmFrames.flight += 1;
                if (app.confirmFrames.flight >= JUMP_CONFIG.flightConfirmFrames) {
                    updateFeedback('进入腾空', '保持身体前移，准备脚跟先着地。', 'FLIGHT');
                    setPhase('FLIGHT');
                    return;
                }
            } else {
                app.confirmFrames.flight = 0;
            }
            if (getPhaseElapsedMs() > JUMP_CONFIG.takeoffTimeoutMs) {
                if (app.attempt.hasSyncSample && (app.attempt.maxAnkleAsync > JUMP_CONFIG.doubleTakeoffSyncRatio || app.attempt.maxAnkleForwardAsync > JUMP_CONFIG.doubleTakeoffSyncRatio)) {
                    recordFailure('double_takeoff_async');
                } else {
                    recordFailure(app.attempt.maxArmLift < JUMP_CONFIG.minArmSwingRise ? 'arm_weak' : 'takeoff_weak');
                }
            }
        }

        function handleFlight(features) {
            app.phaseFrames += 1;
            tickAttemptSample();
            markAttemptCommitted();
            app.attempt.maxForward = Math.max(app.attempt.maxForward, Math.abs(features.hipMid.x - app.attempt.baselineHipX));
            app.attempt.maxHeelLead = Math.max(app.attempt.maxHeelLead, features.heelLead);
            app.attempt.maxFlightHipAngle = Math.max(app.attempt.maxFlightHipAngle || 0, features.hipAngle || 0);
            if (app.attempt.maxForward < JUMP_CONFIG.minFlightForward * 0.8) {
                updateFeedback('继续向前送髋', '腾空时保持身体前移，不要过早收腿。', 'FLIGHT');
            } else {
                updateFeedback('准备脚跟先着地', '腾空末段提前准备落地缓冲。', 'FLIGHT');
            }
            if (features.kneeAngle <= JUMP_CONFIG.landingKneeMax || features.heelLead >= JUMP_CONFIG.heelLeadMin) {
                app.confirmFrames.landing += 1;
                if (app.confirmFrames.landing >= JUMP_CONFIG.landingConfirmFrames) {
                    app.attempt.landingKneeAngle = features.kneeAngle;
                    updateFeedback('进入落地缓冲', '脚跟先着地，随后主动屈膝缓冲。', 'LANDING');
                    setPhase('LANDING');
                    return;
                }
            } else {
                app.confirmFrames.landing = 0;
            }
            if (getPhaseElapsedMs() > JUMP_CONFIG.flightTimeoutMs) recordFailure(app.attempt.maxForward < JUMP_CONFIG.minFlightForward ? 'flight_short' : 'landing_stiff');
        }

        function handleLanding(features) {
            app.phaseFrames += 1;
            tickAttemptSample();
            markAttemptCommitted();
            app.attempt.landingKneeAngle = Math.min(app.attempt.landingKneeAngle, features.kneeAngle);
            app.attempt.maxHeelLead = Math.max(app.attempt.maxHeelLead, features.heelLead);
            if (features.heelLead < JUMP_CONFIG.heelLeadMin) {
                updateFeedback('脚跟先着地', '先让脚跟接触，再过渡到全脚掌。', 'LANDING');
            } else {
                updateFeedback('主动屈膝缓冲', '落地后继续屈膝收髋，保持身体稳定。', 'LANDING');
            }
            if (features.kneeAngle <= JUMP_CONFIG.landingKneeMax && app.phaseFrames >= 2) {
                app.confirmFrames.landing += 1;
                if (app.confirmFrames.landing >= JUMP_CONFIG.landingConfirmFrames) {
                    recordSuccess();
                    return;
                }
            } else {
                app.confirmFrames.landing = 0;
            }
            if (getPhaseElapsedMs() > JUMP_CONFIG.landingTimeoutMs) {
                recordFailure(app.attempt.maxHeelLead < JUMP_CONFIG.heelLeadMin ? 'heel_late' : 'landing_stiff');
            }
        }

        function handleArmDrill(features) {
            if (app.readyFrames < JUMP_CONFIG.readyHoldFrames) {
                updateFeedback('先站稳准备', '摆臂专项开始前也要先站稳，保证全身入镜。', 'READY');
                return;
            }
            if (app.cooldownFrames > 0) {
                app.cooldownFrames -= 1;
                return;
            }
            if (app.drillPhase === 'IDLE') {
                if (features.wristBack >= 0.28) {
                    app.drillPhase = 'BACK';
                    app.drillFrames = 0;
                    updateFeedback('已完成后摆', '继续把双臂快速前上摆。', 'PRELOAD');
                } else {
                    updateFeedback('摆臂专项练习', '先让手臂明显后摆，再快速前上摆。', 'READY');
                }
                return;
            }
            app.drillFrames += 1;
            if (features.armLift >= 0.08) {
                app.round.practiceCount += 1;
                app.round.successCount += 1;
                updateCounters();
                if (features.armLift < 0.12) incrementReason(app.round.improvementReasons, 'arm_weak');
                playTone('success');
                updateFeedback('摆臂专项成功', '继续保持后摆到位、前摆快速。', 'READY');
                speakPraiseLine('摆臂这次很到位，继续保持。');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
                return;
            }
            if (app.drillFrames > 18) {
                app.round.practiceCount += 1;
                app.round.failedCount += 1;
                incrementReason(app.round.failReasons, 'arm_weak');
                updateCounters();
                playTone('warning');
                updateFeedback('本次摆臂未成功', ISSUE_META.arm_weak.tip, 'READY');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
            }
        }

        function handlePreloadDrill(features) {
            if (app.readyFrames < JUMP_CONFIG.readyHoldFrames) {
                updateFeedback('先站稳准备', '预摆蹬伸专项开始前，也要先站稳并侧身入镜。', 'READY');
                return;
            }
            if (app.cooldownFrames > 0) {
                app.cooldownFrames -= 1;
                return;
            }
            if (app.drillPhase === 'IDLE') {
                if (features.kneeAngle <= JUMP_CONFIG.preloadKneeMax || features.hipAngle <= JUMP_CONFIG.preloadHipMax) {
                    app.drillPhase = 'PRELOAD';
                    app.drillFrames = 0;
                    updateFeedback('已进入预摆', '继续下蹲，再快速蹬伸起跳。', 'PRELOAD');
                } else {
                    updateFeedback('预摆蹬伸专项', '先屈膝下蹲，再快速伸髋伸膝。', 'READY');
                }
                return;
            }
            app.drillFrames += 1;
            if (features.kneeAngle >= JUMP_CONFIG.takeoffKneeMin) {
                app.round.practiceCount += 1;
                app.round.successCount += 1;
                updateCounters();
                playTone('success');
                updateFeedback('预摆蹬伸完成', '膝髋打开较及时，继续保持。', 'READY');
                speakPraiseLine('这次蹬伸很连贯，继续保持。');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
                return;
            }
            if (app.drillFrames > 18) {
                app.round.practiceCount += 1;
                app.round.failedCount += 1;
                incrementReason(app.round.failReasons, 'takeoff_weak');
                updateCounters();
                playTone('warning');
                updateFeedback('本次蹬伸未充分', ISSUE_META.takeoff_weak.tip, 'READY');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
            }
        }

        function handleLandingDrill(features) {
            if (app.readyFrames < JUMP_CONFIG.readyHoldFrames) {
                updateFeedback('先站稳准备', '落地缓冲专项开始前先站稳，准备做小跳缓冲。', 'READY');
                return;
            }
            if (app.cooldownFrames > 0) {
                app.cooldownFrames -= 1;
                return;
            }
            if (app.drillPhase === 'IDLE') {
                if (features.kneeAngle > 155) {
                    updateFeedback('落地缓冲专项', '做一次小跳或快速下落，脚跟先着地，随后主动屈膝缓冲。', 'READY');
                }
                if (features.kneeAngle < 138 || features.heelLead >= JUMP_CONFIG.heelLeadMin) {
                    app.drillPhase = 'LANDING';
                    app.drillFrames = 0;
                }
                return;
            }
            app.drillFrames += 1;
            if (features.kneeAngle <= 120 && features.heelLead >= JUMP_CONFIG.heelLeadMin) {
                app.round.practiceCount += 1;
                app.round.successCount += 1;
                updateCounters();
                playTone('success');
                updateFeedback('落地缓冲完成', '脚跟着地和屈膝缓冲都比较到位。', 'READY');
                speakPraiseLine('落地缓冲做得不错，继续保持。');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
                return;
            }
            if (app.drillFrames > 12) {
                app.round.practiceCount += 1;
                app.round.failedCount += 1;
                incrementReason(app.round.failReasons, features.heelLead < JUMP_CONFIG.heelLeadMin ? 'heel_late' : 'landing_stiff');
                updateCounters();
                playTone('warning');
                updateFeedback('本次落地缓冲未完成', features.heelLead < JUMP_CONFIG.heelLeadMin ? ISSUE_META.heel_late.tip : ISSUE_META.landing_stiff.tip, 'READY');
                app.drillPhase = 'IDLE';
                app.cooldownFrames = 12;
            }
        }

        function analyzeMotion(landmarks) {
            const gateResult = handleGestureGate(landmarks);
            if (gateResult.blocked) return;
            const features = gateResult.features || extractFeatures(landmarks);
            if (!features) {
                if (app.training) {
                    app.lowerBodyLossFrames += 1;
                    if (app.lowerBodyLossFrames > JUMP_CONFIG.maxLowerBodyLossFrames && app.attempt) {
                        recordFailure('keypoint_lost');
                    } else {
                        updateFeedback('请退后站位，让双脚入镜', '跳远指导需要看到双脚、膝和髋，请完整进入镜头后再练习。', app.phase === 'IDLE' ? 'IDLE' : 'READY');
                    }
                }
                app.prevHipX = null;
                app.prevHipY = null;
                app.smoothFeatures = null;
                return;
            }
            app.lowerBodyLossFrames = 0;
            const targetStatus = updateTargetLock(features);
            if (targetStatus.drifted && app.training && app.targetGraceFrames > JUMP_CONFIG.targetGraceFrames) {
                updateFeedback('继续完成动作', '检测到身体位移较大，系统会继续使用已采集动作数据分析。', app.phase === 'IDLE' ? 'READY' : app.phase);
            }
            const stableFeatures = smoothFeatures(features);
            updateBaseline(stableFeatures);
            app.prevHipX = stableFeatures.hipMid.x;
            app.prevHipY = stableFeatures.hipMid.y;
            if (!app.training) return;
            if (currentMode() === 'arms') {
                handleArmDrill(stableFeatures);
                return;
            }
            if (currentMode() === 'preload') {
                handlePreloadDrill(stableFeatures);
                return;
            }
            if (currentMode() === 'landing') {
                handleLandingDrill(stableFeatures);
                return;
            }
            if (app.cooldownFrames > 0) {
                app.cooldownFrames -= 1;
                return;
            }
            switch (app.phase) {
                case 'IDLE':
                case 'READY':
                    handleReady(stableFeatures);
                    break;
                case 'PRELOAD':
                    handlePreload(stableFeatures);
                    break;
                case 'TAKEOFF':
                    handleTakeoff(stableFeatures);
                    break;
                case 'FLIGHT':
                    handleFlight(stableFeatures);
                    break;
                case 'LANDING':
                    handleLanding(stableFeatures);
                    break;
                default:
                    setPhase('READY');
            }
        }

        function drawSkeleton(landmarks) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!landmarks) return;
            ctx.save();
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(36, 107, 255, 0.92)';
            ctx.beginPath();
            CONNECTORS.forEach(([from, to]) => {
                const p1 = landmarks[from];
                const p2 = landmarks[to];
                if (!p1 || !p2) return;
                ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
                ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
            });
            ctx.stroke();
            ctx.fillStyle = 'rgba(31, 157, 85, 0.95)';
            landmarks.forEach(point => {
                if (!pointVisible(point)) return;
                ctx.beginPath();
                ctx.arc((1 - point.x) * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }

        function onResults(results) {
            if (canvas.width !== video.clientWidth || canvas.height !== video.clientHeight) resizeCanvas();
            drawSkeleton(results.poseLandmarks || null);
            if (results.poseLandmarks) analyzeMotion(results.poseLandmarks);
        }

        function toggleTraining() {
            if (!app.ready) return;
            unlockAudio();
            app.training = !app.training;
            startBtn.textContent = app.training ? '暂停分析' : '开始分析';
            startBtn.className = app.training ? 'danger' : 'primary';
            if (app.training) {
                resetRound(false);
                playTone('start');
                if (usesGestureGate()) {
                    updateFeedback('正对镜头单手上举', '先正对镜头单手直臂上举 0.3 到 0.5 秒，再转侧身练习。', 'IDLE');
                    speakText('开始练习，请先正对镜头单手上举，再转侧身练习。', { kind: 'guidance', force: true });
                } else {
                    updateFeedback('请先站稳准备', '侧身站立，保持 1 秒稳定后再进入预摆。', 'IDLE');
                    speakText('开始练习，请先站稳准备。', { kind: 'guidance', force: true });
                }
            } else {
                finishRound(false);
            }
        }

        function finishRound(showIdleMessage = true) {
            if (!app.round) return;
            const practiceCount = Number(app.round.practiceCount || 0);
            if (app.training) {
                app.training = false;
                startBtn.textContent = '开始分析';
                startBtn.className = 'primary';
            }
            renderRoundSummary();
            saveRoundHistory();
            playTone('finish');
            if (practiceCount > 0) {
                const suggestion = pickSuggestion();
                speakText(`本轮练习${practiceCount}次。${suggestion}`, { kind: 'guidance', force: true });
            }
            if (showIdleMessage) updateFeedback('本轮已结束', '可切换学生或点击开始分析，进入下一轮。', 'IDLE');
        }

        async function registerServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            const isSecureContextHost = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (!isSecureContextHost) return;
            try {
                const swUrl = new URL('../service-worker.js', import.meta.url);
                const scope = new URL('../', import.meta.url).pathname;
                await navigator.serviceWorker.register(swUrl, { scope });
            } catch (error) {
                console.warn('Failed to register service worker', error);
            }
        }

        async function initCamera() {
            overlay.style.display = 'flex';
            overlayText.textContent = '正在打开摄像头并加载姿态识别，请允许摄像头权限。';
            try {
                const poseAssetBase = new URL('../mediapipe/pose/', import.meta.url);
                const pose = new Pose({ locateFile: file => new URL(file, poseAssetBase).href });
                pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
                pose.onResults(onResults);
                const camera = new Camera(video, {
                    onFrame: async () => { await pose.send({ image: video }); },
                    width: 640,
                    height: 480
                });
                await camera.start();
                resizeCanvas();
                app.ready = true;
                overlay.style.display = 'none';
                updateFeedback('请侧身站立，保证全身入镜', '开始分析后，系统会自动识别预摆、起跳、腾空和落地阶段。', 'IDLE');
            } catch (error) {
                console.error(error);
                overlay.style.display = 'flex';
                overlayText.textContent = `初始化失败：${String(error && error.message ? error.message : error)}`;
            }
        }

        async function initApp() {
            await registerServiceWorker();
            const snapshot = await storageApi.init();
            app.students = normalizeStudents(snapshot[STORAGE_KEY]);
            audioState.prefs = normalizeAudioPrefs(snapshot[AUDIO_PREFS_KEY]);
            syncState.queue = normalizeSyncQueue(snapshot[SYNC_QUEUE_KEY]);
            Object.assign(sessionMeta, normalizeSessionMeta(snapshot[SESSION_META_KEY]));

            normalizePracticeUi();
            applyAudioPrefsToUi();
            applySessionMetaToUi();
            app.currentStudent = Object.keys(app.students)[0];
            renderStudentOptions();
            refreshSyncStatus();
            renderDrills();
            resetRound(false);
            await initCamera();
            setTimeout(() => flushSyncQueue(), 1200);
        }

        window.toggleStudentPanel = toggleStudentPanel;
        window.submitStudentName = submitStudentName;
        window.toggleSoundPanel = toggleSoundPanel;
        window.updateAudioPrefs = updateAudioPrefs;
        window.toggleTraining = toggleTraining;
        window.finishRound = finishRound;
        window.clearCurrentStudentHistory = clearCurrentStudentHistory;
        window.changeMode = changeMode;
        window.updateSessionMeta = updateSessionMeta;

        window.addEventListener('online', flushSyncQueue);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') flushSyncQueue();
        });

        initApp().catch(error => {
            console.error('Failed to initialize jump app', error);
            overlay.style.display = 'flex';
            overlayText.textContent = `初始化失败：${String(error && error.message ? error.message : error)}`;
        });
    


