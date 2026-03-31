export const REQUIRED_POINTS = [23, 24, 25, 26, 27, 28, 29, 30, 31, 32];

export const SIDE_REQUIRED_POINTS = {
    left: [11, 15, 23, 25, 27, 29, 31],
    right: [12, 16, 24, 26, 28, 30, 32]
};

export const SIDE_CORE_POINTS = {
    left: [11, 15, 23, 25, 27],
    right: [12, 16, 24, 26, 28]
};

export const NON_ACTION_REASON_CODES = ['not_ready', 'keypoint_lost', 'target_size_drift'];

export const JUMP_CONFIG = {
    minVisibility: 0.45,
    emaAlpha: 0.3,
    readyHoldFrames: 6,
    readyKneeMin: 148,
    readyHipMin: 140,
    preloadKneeMax: 164,
    preloadHipMax: 160,
    preloadMinFrames: 3,
    preloadDrillEnterKneeMax: 138,
    preloadDrillEnterHipMax: 132,
    preloadDrillTargetKneeMin: 90,
    preloadDrillTargetKneeMax: 120,
    preloadDrillTargetHipMax: 105,
    preloadDrillArmBackMin: 0.22,
    preloadDrillArmLiftMin: 0.08,
    preloadDrillExtendKneeMin: 155,
    preloadDrillExtendHipMin: 145,
    preloadDrillExtendDeltaMin: 26,
    preloadDrillTimeoutFrames: 24,
    takeoffConfirmFrames: 2,
    flightConfirmFrames: 2,
    landingConfirmFrames: 2,
    preloadTimeoutMs: 1400,
    minPreloadDepth: 0.024,
    takeoffKneeMin: 138,
    takeoffRise: 0.009,
    minArmSwingRise: 0.03,
    minFlightForward: 0.012,
    takeoffTimeoutMs: 750,
    flightTimeoutMs: 950,
    landingKneeMax: 150,
    landingTimeoutMs: 900,
    roundCooldownFrames: 18,
    rearmHoldFrames: 8,
    stableMotionThreshold: 0.02,
    heelLeadMin: -0.09,
    earlyAttemptKneeMax: 158,
    earlyAttemptHipMax: 154,
    earlyAttemptDepthRatio: 0.018,
    targetTrackRatio: 1.35,
    targetTorsoMinRatio: 0.72,
    targetTorsoMaxRatio: 1.38,
    targetGraceFrames: 4,
    maxLowerBodyLossFrames: 3,
    featureGapSilentFrames: 6,
    featureEvidenceMinFrames: 10,
    doubleTakeoffSyncRatio: 0.025,
    gestureHoldFramesMin: 9,
    gestureHoldFramesMax: 18,
    gestureArmLiftMin: 0.36,
    gestureArmStraightMin: 152,
    frontShoulderRatioMin: 0.56,
    sideTransitionTimeoutMs: 1800,
    sideReadyFrames: 3,
    takeoffAngleLowRatio: 0.72,
    takeoffAngleHighRatio: 1.45,
    pushoffWeakRise: 0.012,
    pushoffWeakForward: 0.016,
    armLegAsyncFrames: 5,
    flightHipExtensionMin: 156
};

export const ISSUE_META = {
    not_ready: { label: '起跳前没站稳', tip: '先侧身站稳，再进入预摆。', advice: '开始前先稳定站姿 1 秒，再做完整预摆和起跳。' },
    preload_weak: { label: '下蹲不足', tip: '再下蹲一点，膝和髋要一起下沉到位。', advice: '下一轮先做原地后摆下蹲练习，膝角控制到 90 到 120 度，再快速蹬摆。' },
    takeoff_weak: { label: '蹬伸不充分', tip: '起跳时膝髋要更快伸展。', advice: '蹬地时注意伸髋伸膝，向前上方发力。' },
    pushoff_weak: { label: '蹬地力量不足', tip: '蹬地时继续快速伸髋伸膝，把身体送出去。', advice: '先做 5 次快速蹬伸练习，再做完整跳远，体会脚掌快速发力。' },
    takeoff_angle_low: { label: '起跳角度偏低', tip: '起跳时注意向前上方送髋，不要只向前冲。', advice: '练习预摆后向前上方蹬伸，体会向上和向前同时发力。' },
    takeoff_angle_high: { label: '起跳角度偏高', tip: '起跳时不要只向上蹿，注意向前送髋。', advice: '下一轮注意前送身体，减少只向上起跳的感觉。' },
    arm_weak: { label: '摆臂不积极', tip: '双臂从后向前上方快速摆起。', advice: '练习大臂后摆到前上摆，带动起跳节奏。' },
    arm_leg_async: { label: '摆臂与蹬地不同步', tip: '摆臂和蹬地要同时快速发力。', advice: '先做摆臂加蹬伸分解练习，用口令把手臂和腿部发力对齐。' },
    flight_short: { label: '腾空前送不足', tip: '蹬地后继续向前送髋。', advice: '下次蹬地更完整，让身体前移更明显。' },
    flight_no_arch: { label: '腾空未挺身', tip: '腾空后上体和髋部要主动伸展。', advice: '做原地挺身模仿和短距离腾空练习，体会展体动作。' },
    landing_stiff: { label: '落地缓冲不足', tip: '落地时主动屈膝缓冲。', advice: '脚跟落地后及时屈膝收髋，减小冲击。' },
    heel_late: { label: '落地脚跟不明显', tip: '脚跟先接触，再过渡到全脚掌。', advice: '多做小跳缓冲练习，体会脚跟先着地。' },
    keypoint_lost: { label: '入镜不完整', tip: '请保持全身完整入镜。', advice: '调整站位，保证双脚和双手都能被看到。' },
    target_size_drift: { label: '识别目标跑偏', tip: '请保持与镜头距离稳定，避免背景人物遮挡。', advice: '系统会自动锁定练习者，如果位置和人体大小突然变化，会暂时忽略异常帧。' },
    double_takeoff_async: { label: '双脚起跳不同步', tip: '注意双脚同时起跳。', advice: '先做预摆蹬伸专项，体会两脚一起蹬地发力。' }
};

export function pointVisible(point, minVisibility = JUMP_CONFIG.minVisibility) {
    return point && typeof point.x === 'number' && typeof point.y === 'number' && (point.visibility == null || point.visibility >= minVisibility);
}

export function pointTracked(point) {
    return point && typeof point.x === 'number' && typeof point.y === 'number';
}

export function sideRequiredVisible(landmarks, side, minVisibility = JUMP_CONFIG.minVisibility) {
    return SIDE_REQUIRED_POINTS[side].every(index => pointVisible(landmarks[index], minVisibility));
}

export function sideCoreVisible(landmarks, side, minVisibility = JUMP_CONFIG.minVisibility) {
    return SIDE_CORE_POINTS[side].every(index => pointVisible(landmarks[index], minVisibility));
}

export function coreTracked(landmarks) {
    return [11, 12, 23, 24].every(index => pointTracked(landmarks[index]));
}

export function midpoint(a, b) {
    return {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (((typeof a.z === 'number' ? a.z : 0) + (typeof b.z === 'number' ? b.z : 0)) / 2)
    };
}

export function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getAngle2D(a, b, c) {
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

export function getAngle3D(a, b, c) {
    if (!a || !b || !c) return 180;
    const ab = {
        x: a.x - b.x,
        y: a.y - b.y,
        z: ((typeof a.z === 'number' ? a.z : 0) - (typeof b.z === 'number' ? b.z : 0))
    };
    const cb = {
        x: c.x - b.x,
        y: c.y - b.y,
        z: ((typeof c.z === 'number' ? c.z : 0) - (typeof b.z === 'number' ? b.z : 0))
    };
    const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
    const magAB = Math.hypot(ab.x, ab.y, ab.z);
    const magCB = Math.hypot(cb.x, cb.y, cb.z);
    if (!magAB || !magCB) return 180;
    const cosine = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
    return Math.acos(cosine) * 180 / Math.PI;
}

export function getAngle(a, b, c) {
    const angle2D = getAngle2D(a, b, c);
    const angle3D = getAngle3D(a, b, c);
    const diff = Math.abs(angle3D - angle2D);
    if (diff <= 18) return angle3D;
    if (diff >= 45) return angle2D;
    const weight3D = (45 - diff) / (45 - 18);
    return angle2D * (1 - weight3D) + angle3D * weight3D;
}

export function getVisibleSide(landmarks) {
    const weights = {
        11: 0.6, 12: 0.6,
        15: 0.35, 16: 0.35,
        23: 1.5, 24: 1.5,
        25: 1.3, 26: 1.3,
        27: 1.2, 28: 1.2,
        29: 1.0, 30: 1.0,
        31: 1.0, 32: 1.0
    };
    const leftIndexes = [11, 15, 23, 25, 27, 29, 31];
    const rightIndexes = [12, 16, 24, 26, 28, 30, 32];
    const score = indexes => indexes.reduce((sum, index) => {
        const point = landmarks[index];
        return sum + (((point && point.visibility) || 0) * (weights[index] || 1));
    }, 0);
    return score(leftIndexes) >= score(rightIndexes) ? 'left' : 'right';
}

export function resolveTrackedSide(landmarks, minVisibility = JUMP_CONFIG.minVisibility) {
    const preferredSide = getVisibleSide(landmarks);
    if (coreTracked(landmarks) && sideCoreVisible(landmarks, preferredSide, minVisibility)) return preferredSide;
    const fallbackSide = preferredSide === 'left' ? 'right' : 'left';
    if (coreTracked(landmarks) && sideCoreVisible(landmarks, fallbackSide, minVisibility)) return fallbackSide;
    return null;
}

export function allRequiredVisible(landmarks, minVisibility = JUMP_CONFIG.minVisibility) {
    return !!resolveTrackedSide(landmarks, minVisibility);
}

export function extractFeatures(landmarks, config = JUMP_CONFIG) {
    const side = resolveTrackedSide(landmarks, config.minVisibility);
    if (!side) return null;

    const hipMid = midpoint(landmarks[23], landmarks[24]);
    const shoulderMid = midpoint(landmarks[11], landmarks[12]);
    const useLeft = side === 'left';
    const hip = landmarks[useLeft ? 23 : 24];
    const knee = landmarks[useLeft ? 25 : 26];
    const ankle = landmarks[useLeft ? 27 : 28];
    const heel = landmarks[useLeft ? 29 : 30];
    const footIndex = landmarks[useLeft ? 31 : 32];
    const shoulder = landmarks[useLeft ? 11 : 12];
    const wrist = landmarks[useLeft ? 15 : 16];
    const otherShoulder = landmarks[useLeft ? 12 : 11];
    const torso = Math.max(distance(shoulderMid, hipMid), 0.001);
    const shoulderWidth = Math.max(
        pointTracked(landmarks[11]) && pointTracked(landmarks[12]) ? distance(landmarks[11], landmarks[12]) : torso,
        0.001
    );
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const dualAnklesVisible = pointVisible(leftAnkle, config.minVisibility) && pointVisible(rightAnkle, config.minVisibility);
    const heelLeadAvailable = pointVisible(heel, config.minVisibility * 0.75) && pointVisible(footIndex, config.minVisibility * 0.75);
    const leftLift = dualAnklesVisible ? hipMid.y - leftAnkle.y : 0;
    const rightLift = dualAnklesVisible ? hipMid.y - rightAnkle.y : 0;
    const referenceShoulder = pointTracked(otherShoulder) ? otherShoulder : shoulder;

    return {
        side,
        hipMid,
        ankle,
        wrist,
        torso,
        shoulderWidth,
        kneeAngle2D: getAngle2D(hip, knee, ankle),
        kneeAngle3D: getAngle3D(hip, knee, ankle),
        hipAngle2D: getAngle2D(shoulder, hip, knee),
        hipAngle3D: getAngle3D(shoulder, hip, knee),
        kneeAngle: getAngle(hip, knee, ankle),
        hipAngle: getAngle(shoulder, hip, knee),
        armLift: (shoulder.y - wrist.y) / torso,
        wristBack: Math.abs(wrist.x - referenceShoulder.x) / shoulderWidth,
        heelLead: heelLeadAvailable ? (heel.y - footIndex.y) / torso : null,
        heelLeadAvailable,
        ankleAsync: dualAnklesVisible ? Math.abs(leftLift - rightLift) / torso : 0,
        ankleForwardAsync: dualAnklesVisible ? Math.abs(leftAnkle.x - rightAnkle.x) / torso : 0,
        lowerBodyVisible: sideCoreVisible(landmarks, side, config.minVisibility),
        dualAnklesVisible
    };
}

function blendNumber(prev, curr, alpha) {
    if (!Number.isFinite(prev)) return curr;
    if (!Number.isFinite(curr)) return prev;
    return prev * (1 - alpha) + curr * alpha;
}

function blendPoint(prev, curr, alpha) {
    if (!prev) return curr;
    if (!curr) return prev;
    return {
        x: blendNumber(prev.x, curr.x, alpha),
        y: blendNumber(prev.y, curr.y, alpha),
        z: blendNumber(prev.z, curr.z, alpha)
    };
}

export function smoothFeatures(previous, features, alpha = JUMP_CONFIG.emaAlpha) {
    if (!previous) {
        return {
            ...features,
            hipMid: { ...features.hipMid },
            ankle: { ...features.ankle },
            wrist: { ...features.wrist }
        };
    }
    return {
        ...features,
        hipMid: blendPoint(previous.hipMid, features.hipMid, alpha),
        ankle: blendPoint(previous.ankle, features.ankle, alpha),
        wrist: blendPoint(previous.wrist, features.wrist, alpha),
        torso: blendNumber(previous.torso, features.torso, alpha),
        shoulderWidth: blendNumber(previous.shoulderWidth, features.shoulderWidth, alpha),
        kneeAngle2D: blendNumber(previous.kneeAngle2D, features.kneeAngle2D, alpha),
        kneeAngle3D: blendNumber(previous.kneeAngle3D, features.kneeAngle3D, alpha),
        kneeAngle: blendNumber(previous.kneeAngle, features.kneeAngle, alpha),
        hipAngle2D: blendNumber(previous.hipAngle2D, features.hipAngle2D, alpha),
        hipAngle3D: blendNumber(previous.hipAngle3D, features.hipAngle3D, alpha),
        hipAngle: blendNumber(previous.hipAngle, features.hipAngle, alpha),
        armLift: blendNumber(previous.armLift, features.armLift, alpha),
        wristBack: blendNumber(previous.wristBack, features.wristBack, alpha),
        heelLead: blendNumber(previous.heelLead, features.heelLead, alpha),
        ankleAsync: blendNumber(previous.ankleAsync, features.ankleAsync, alpha),
        ankleForwardAsync: blendNumber(previous.ankleForwardAsync, features.ankleForwardAsync, alpha)
    };
}

export function createRoundState() {
    return {
        startedAt: Date.now(),
        practiceCount: 0,
        successCount: 0,
        failedCount: 0,
        failReasons: {},
        improvementReasons: {}
    };
}

export function createAttemptState(baseline) {
    return {
        baselineHipY: baseline.hipY,
        baselineHipX: baseline.hipX,
        baselineAnkleY: baseline.ankleY,
        baselineWristY: baseline.wristY,
        baselineTorso: baseline.torso || 0.001,
        maxDepth: 0,
        maxRise: 0,
        maxArmLift: 0,
        maxForward: 0,
        landingKneeAngle: 180,
        maxHeelLead: -1,
        hasHeelLeadSample: false,
        maxAnkleAsync: 0,
        maxAnkleForwardAsync: 0,
        maxFlightHipAngle: 0,
        armPeakFrame: null,
        takeoffFrame: null,
        sampleFrame: 0,
        hasSyncSample: false,
        committed: false
    };
}

export function incrementReason(bucket, code) {
    bucket[code] = (bucket[code] || 0) + 1;
}

export function filterActionReasons(bucket) {
    return Object.fromEntries(
        Object.entries(bucket || {}).filter(([code, count]) => !NON_ACTION_REASON_CODES.includes(code) && Number(count) > 0)
    );
}

export function topReasonEntries(bucket) {
    return Object.entries(bucket || {}).sort((a, b) => b[1] - a[1]).slice(0, 2);
}

export function buildTopReasonText(bucket, issueMeta = ISSUE_META) {
    const entries = topReasonEntries(bucket);
    if (entries.length === 0) return '';
    return entries.map(([code, count]) => `${issueMeta[code].label}${count}次`).join('；');
}

export function pickSuggestion(round, mode, issueMeta = ISSUE_META) {
    const failTop = topReasonEntries(filterActionReasons(round?.failReasons || {}));
    if (failTop.length > 0) return issueMeta[failTop[0][0]].advice;

    const improveTop = topReasonEntries(filterActionReasons(round?.improvementReasons || {}));
    if (improveTop.length > 0) return `已经完成动作，下一轮重点优化：${issueMeta[improveTop[0][0]].label}。`;

    if (mode === 'arms') return '继续练大臂后摆到前上摆的完整节奏。';
    if (mode === 'preload') return '下一轮继续先屈膝预摆，再快速蹬伸。';
    if (mode === 'landing') return '下一轮继续保持脚跟着地和屈膝缓冲。';
    return '动作整体较完整，下一轮继续保持预摆、蹬伸和落地缓冲节奏。';
}

export function buildRoundAnalysis(round, mode, issueMeta = ISSUE_META) {
    const successCount = Number(round?.successCount || 0);
    const failedCount = Number(round?.failedCount || 0);
    const practiceCount = Number(round?.practiceCount || successCount + failedCount);
    const actionFailReasons = filterActionReasons(round?.failReasons || {});
    const actionImproveReasons = filterActionReasons(round?.improvementReasons || {});
    const topReasonsText = buildTopReasonText(actionFailReasons, issueMeta);
    const improvementText = buildTopReasonText(actionImproveReasons, issueMeta);
    const hasActionFeedback = Boolean(topReasonsText || improvementText);
    const suggestion = hasActionFeedback
        ? pickSuggestion({ failReasons: actionFailReasons, improvementReasons: actionImproveReasons }, mode, issueMeta)
        : '';

    let summaryText = '';
    if (practiceCount === 0) {
        summaryText = '本轮尚未开始，暂无有效练习记录。';
    } else if (topReasonsText) {
        summaryText = `本轮共练习 ${practiceCount} 次。主要问题：${topReasonsText}。训练建议：${suggestion}`;
    } else if (improvementText) {
        summaryText = `本轮共练习 ${practiceCount} 次。重点优化：${improvementText}。训练建议：${suggestion}`;
    } else {
        summaryText = `本轮共练习 ${practiceCount} 次。`;
    }

    return {
        practiceCount,
        successCount,
        failedCount,
        topReasonsText,
        improvementText,
        suggestion,
        summaryText,
        hasActionFeedback,
        actionFailReasons,
        actionImproveReasons
    };
}

