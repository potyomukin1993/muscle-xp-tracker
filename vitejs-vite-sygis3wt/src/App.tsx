import React, { useEffect, useMemo, useState } from "react";

/** ========= Types ========= */
type WorkoutPattern = "A" | "B";

type SetEntry = {
  weight: number;
  reps: number;
  done: boolean;
};

type FormCheck = {
  id: string;
  label: string;
  checked: boolean;
};

type ExerciseTemplate = {
  key: string;
  name: string;
  isBase: boolean;
  pattern: WorkoutPattern;
  sets: SetEntry[];
  formChecks: FormCheck[];
  lastFormMemo: string;
  formMemoDraft: string;
};

type Note = {
  date: string;
  xp: number;
  memo: string;
  pattern?: WorkoutPattern;
};

type SavedState = {
  version: 5;
  totalXP: number;
  notes: Note[];
  todayDate: string;
  exercises: ExerciseTemplate[];
  runMeters: number;
  currentPattern: WorkoutPattern;
  lastPattern: WorkoutPattern | null;
};

type LegacyExercise = {
  key?: string;
  name?: string;
  isBase?: boolean;
  sets?: SetEntry[];
  pattern?: WorkoutPattern;
  formChecks?: FormCheck[];
  lastFormMemo?: string;
  formMemoDraft?: string;
};

type LegacySavedState = {
  totalXP?: number;
  notes?: Note[];
  todayDate?: string;
  exercises?: LegacyExercise[];
  runMeters?: number;
  currentPattern?: WorkoutPattern;
  lastPattern?: WorkoutPattern | null;
};

function getTodayJST() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** ========= Constants ========= */
const LS_KEY = "xp_tracker_full_v5";
const LEGACY_LS_KEY = "xp_tracker_full_v4";
const INITIAL_TOTAL_XP = 731_493;

// 2年でLv50想定カーブ
function buildLevelNeeds(start = 1200, growth = 1.11, levels = 50) {
  const arr: number[] = [];
  let need = start;
  for (let i = 0; i < levels - 1; i++) {
    arr.push(Math.round(need));
    need *= growth;
  }
  return arr;
}
const LEVEL_NEEDS = buildLevelNeeds();

const TITLES = [
  "筋トレ見習い","初級プロテイン飲み","追い込みビギナー","セット職人","高重量の志願者",
  "ルーティン守護者","意識高い系マッスル","ジムの住人","上腕二頭筋の語り部","筋肉痛の虜",
  "部位分割の伝達者","追い込みの求道者","インクラインの探究者","フォーム警察","筋肥大の探求者",
  "ストリクトの賢者","ボディメイクの革命児","減量期の鬼","管理人","増量期の化身",
  "高タンパクの伝道師","魔術師","錬金術師","ホエイ界の審査員","筋肉の哲学者",
  "フォーム錬成の達人","爆伸びの旅人","パンプの召喚士","ドロップセットの覇者","スーパーセットの舞姫",
  "可動域の吟遊詩人","効かせの吟味者","セット間の賢者","筋線維の支配者","高密度ボディの錬成者",
  "マシン支配の覇者","鍛錬の求道者","レップの魔術師","筋肉構築の建築士","重量との対話者",
  "限界突破の戦士","鉄と汗の預言者","ウェイトの賢者","トレーニングの巨人","肉体改造の伝説",
  "筋力の守護者","鍛錬界の革命児","成長記録の伝道師","セット回数の覇王","筋帝王"
];

const pretty = (n: number) => n.toLocaleString();

function computeLevel(totalXP: number) {
  let lvl = 1;
  let rest = totalXP;
  for (let i = 0; i < LEVEL_NEEDS.length; i++) {
    const need = LEVEL_NEEDS[i];
    if (rest >= need) {
      rest -= need;
      lvl++;
    } else {
      return { level: lvl, into: rest, toNext: need };
    }
  }
  return { level: LEVEL_NEEDS.length + 1, into: 0, toNext: 0 };
}

const makeChecks = (labels: string[]): FormCheck[] =>
  labels.map((label, index) => ({
    id: `check_${index + 1}`,
    label,
    checked: false,
  }));

/** ========= Initial exercises ========= */
function createInitialExercises(): ExerciseTemplate[] {
  return [
    {
      key: "chest",
      name: "チェストプレス",
      isBase: true,
      pattern: "A",
      sets: [
        { weight: 50, reps: 10, done: false },
        { weight: 50, reps: 10, done: false },
        { weight: 50, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "肩甲骨を軽く寄せ、背中をパッドにつける",
        "肩をすくめず、胸を張った姿勢を保つ",
        "肘を真横に開きすぎず、手首の下に置く",
        "反動を使わず、胸の収縮を感じながら押す",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "shoulder",
      name: "ショルダープレス",
      isBase: true,
      pattern: "A",
      sets: [
        { weight: 32, reps: 10, done: false },
        { weight: 32, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "背中をパッドにつけ、腰を反りすぎない",
        "肩をすくめず、首を長く保つ",
        "肘を開きすぎず、前腕をおおむね垂直に保つ",
        "肩に痛みが出ない可動域で、やや前上方へ押す",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "fly",
      name: "ペックフライ",
      isBase: true,
      pattern: "A",
      sets: [
        { weight: 32, reps: 10, done: false },
        { weight: 32, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "胸を張り、背中を細長いパッドにつける",
        "肩をすくめず、肩甲骨を軽く寄せて固定する",
        "肘の曲がりを保ち、腕ではなく胸で閉じる",
        "戻しすぎず、負荷が抜けない範囲でゆっくり戻す",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "triceps",
      name: "トライセップス",
      isBase: true,
      pattern: "A",
      sets: [
        { weight: 23, reps: 10, done: false },
        { weight: 23, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "肘をマシンの回転軸付近に合わせる",
        "肘を開かず、体の横で固定する",
        "肩をすくめず、上体を反らさない",
        "反動を使わず、肘を伸ばして三頭筋を収縮させる",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "legpress",
      name: "レッグプレス",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 93, reps: 10, done: false },
        { weight: 93, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "足裏全体をフットプレートにつける",
        "膝とつま先を同じ方向へ向ける",
        "深く下ろしても腰と骨盤をシートから浮かせない",
        "膝を完全にロックせず、反動なしで押す",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "lat",
      name: "ラットプルダウン",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 59, reps: 10, done: false },
        { weight: 59, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "大腿部パッドで体を固定し、胸を軽く張る",
        "引き始めに肩を下げ、肩をすくめない",
        "肘を脇腹へ近づける意識で胸上部へ引く",
        "上体を大きく倒さず、戻しもゆっくり行う",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "row",
      name: "シーテッドロー",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 52, reps: 10, done: false },
        { weight: 52, reps: 10, done: false },
        { weight: 52, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "足を安定させ、胸を張って背骨をまっすぐ保つ",
        "肩をすくめず、肩甲骨を後ろへ寄せて引く",
        "肘を体の近くに通し、みぞおち付近へ引く",
        "上体の反動を使わず、腕を戻す時も負荷を保つ",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "curl",
      name: "アームカール",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 36, reps: 10, done: false },
        { weight: 36, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "肘をマシンの回転軸付近に合わせる",
        "上腕をパッドにつけ、肘の位置を動かさない",
        "肩を前へ出さず、体の反動を使わない",
        "下ろす局面をゆっくり行い、肘を乱暴に伸ばし切らない",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "hammer",
      name: "ハンマーカール",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 32, reps: 10, done: false },
        { weight: 32, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "ニュートラルグリップを保ち、手首を反らさない",
        "上腕をパッドにつけ、肘を固定する",
        "肩や上体を使って持ち上げない",
        "下ろす局面をゆっくり行い、負荷を抜かない",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "crunch",
      name: "アブドミナルクランチ",
      isBase: true,
      pattern: "B",
      sets: [
        { weight: 59, reps: 15, done: false },
        { weight: 59, reps: 15, done: false },
      ],
      formChecks: makeChecks([
        "背中と肩をパッドにつけ、足を安定させる",
        "腕で押し込まず、みぞおちを骨盤へ近づける",
        "腰だけを折らず、腹部全体を丸める",
        "戻す時も反動を使わず、腹筋の緊張を保つ",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "legext",
      name: "レッグエクステンション",
      isBase: false,
      pattern: "B",
      sets: [
        { weight: 73, reps: 10, done: false },
        { weight: 73, reps: 10, done: false },
      ],
      formChecks: makeChecks([
        "膝をマシンの回転軸に合わせる",
        "背中と骨盤をシートにつける",
        "反動を使わず、大腿四頭筋で持ち上げる",
        "膝を乱暴にロックせず、ゆっくり戻す",
      ]),
      lastFormMemo: "",
      formMemoDraft: "",
    },
  ];
}

function resetSessionFields(exercises: ExerciseTemplate[]) {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s, done: false })),
    formChecks: ex.formChecks.map((check) => ({ ...check, checked: false })),
    formMemoDraft: "",
  }));
}

function isPattern(value: unknown): value is WorkoutPattern {
  return value === "A" || value === "B";
}

function migrateExercises(rawExercises: LegacyExercise[] | undefined): ExerciseTemplate[] {
  const defaults = createInitialExercises();
  const source = Array.isArray(rawExercises) ? rawExercises : [];

  const usedKeys = new Set<string>();

  const migratedDefaults = defaults.map((defaultExercise) => {
    const old = source.find(
      (exercise) =>
        exercise.key === defaultExercise.key ||
        (!exercise.key && exercise.name === defaultExercise.name)
    );

    if (!old) return defaultExercise;
    if (old.key) usedKeys.add(old.key);

    return {
      ...defaultExercise,
      name: typeof old.name === "string" ? old.name : defaultExercise.name,
      sets:
        Array.isArray(old.sets) && old.sets.length > 0
          ? old.sets.map((set) => ({
              weight: Number(set.weight) || 0,
              reps: Number(set.reps) || 0,
              done: Boolean(set.done),
            }))
          : defaultExercise.sets,
      pattern: isPattern(old.pattern) ? old.pattern : defaultExercise.pattern,
      formChecks:
        Array.isArray(old.formChecks) && old.formChecks.length > 0
          ? old.formChecks.map((check, index) => ({
              id: check.id || `check_${index + 1}`,
              label: check.label || "フォーム項目",
              checked: Boolean(check.checked),
            }))
          : defaultExercise.formChecks,
      lastFormMemo:
        typeof old.lastFormMemo === "string" ? old.lastFormMemo : "",
      formMemoDraft:
        typeof old.formMemoDraft === "string" ? old.formMemoDraft : "",
    };
  });

  const extras = source
    .filter((old) => {
      const key = old.key || "";
      const matchesDefault = defaults.some(
        (defaultExercise) =>
          defaultExercise.key === key ||
          (!key && defaultExercise.name === old.name)
      );
      return !matchesDefault && !usedKeys.has(key);
    })
    .map((old, index): ExerciseTemplate => ({
      key: old.key || `extra_migrated_${index}_${Date.now()}`,
      name: typeof old.name === "string" ? old.name : "追加種目",
      isBase: Boolean(old.isBase),
      pattern: isPattern(old.pattern) ? old.pattern : "B",
      sets:
        Array.isArray(old.sets) && old.sets.length > 0
          ? old.sets.map((set) => ({
              weight: Number(set.weight) || 0,
              reps: Number(set.reps) || 0,
              done: Boolean(set.done),
            }))
          : [{ weight: 20, reps: 10, done: false }],
      formChecks: Array.isArray(old.formChecks)
        ? old.formChecks.map((check, checkIndex) => ({
            id: check.id || `check_${checkIndex + 1}`,
            label: check.label || "フォーム項目",
            checked: Boolean(check.checked),
          }))
        : [],
      lastFormMemo:
        typeof old.lastFormMemo === "string" ? old.lastFormMemo : "",
      formMemoDraft:
        typeof old.formMemoDraft === "string" ? old.formMemoDraft : "",
    }));

  return [...migratedDefaults, ...extras];
}

export default function App() {
  const [totalXP, setTotalXP] = useState<number>(INITIAL_TOTAL_XP);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todayDate, setTodayDate] = useState<string>(getTodayJST());
  const [exercises, setExercises] = useState<ExerciseTemplate[]>(createInitialExercises());
  const [runMeters, setRunMeters] = useState<number>(0);
  const [currentPattern, setCurrentPattern] = useState<WorkoutPattern>("A");
  const [lastPattern, setLastPattern] = useState<WorkoutPattern | null>(null);
  const [openForms, setOpenForms] = useState<Record<string, boolean>>({});
  const [editingForms, setEditingForms] = useState<Record<string, boolean>>({});
  const [celebration, setCelebration] = useState<{
    xp: number;
    oldLevel: number;
    newLevel: number;
    perfect: boolean;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // load + v4 -> v5 migration
  useEffect(() => {
    const currentSaved = localStorage.getItem(LS_KEY);
    const legacySaved = localStorage.getItem(LEGACY_LS_KEY);

    try {
      if (currentSaved) {
        const parsed = JSON.parse(currentSaved) as LegacySavedState;
        if (typeof parsed.totalXP === "number") setTotalXP(parsed.totalXP);
        if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
        if (typeof parsed.todayDate === "string") setTodayDate(parsed.todayDate);
        setExercises(migrateExercises(parsed.exercises));
        if (typeof parsed.runMeters === "number") setRunMeters(parsed.runMeters);
        if (isPattern(parsed.currentPattern)) setCurrentPattern(parsed.currentPattern);
        if (parsed.lastPattern === null || isPattern(parsed.lastPattern)) {
          setLastPattern(parsed.lastPattern ?? null);
        }
      } else if (legacySaved) {
        const parsed = JSON.parse(legacySaved) as LegacySavedState;
        // v5への初回移行時は、ユーザー確認済みの累計XPを採用する
        setTotalXP(INITIAL_TOTAL_XP);
        if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
        if (typeof parsed.todayDate === "string") setTodayDate(parsed.todayDate);
        setExercises(migrateExercises(parsed.exercises));
        if (typeof parsed.runMeters === "number") setRunMeters(parsed.runMeters);
      }
    } catch {
      // 壊れた保存データは初期状態で開始
    } finally {
      setLoaded(true);
    }
  }, []);

  // save
  useEffect(() => {
    if (!loaded) return;

    const payload: SavedState = {
      version: 5,
      totalXP,
      notes,
      todayDate,
      exercises,
      runMeters,
      currentPattern,
      lastPattern,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [
    loaded,
    totalXP,
    notes,
    todayDate,
    exercises,
    runMeters,
    currentPattern,
    lastPattern,
  ]);

  const visibleExercises = useMemo(
    () =>
      exercises
        .map((exercise, originalIndex) => ({ exercise, originalIndex }))
        .filter(({ exercise }) => exercise.pattern === currentPattern),
    [exercises, currentPattern]
  );

  const calc = useMemo(() => {
    const strengthXP = exercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets
          .filter((set) => set.done)
          .reduce((sub, set) => sub + set.weight * set.reps, 0),
      0
    );

    const performedExercises = exercises.filter((exercise) =>
      exercise.sets.some((set) => set.done)
    );

    const formRequiredExercises = performedExercises.filter(
      (exercise) => exercise.formChecks.length > 0
    );

    const allFormsChecked = formRequiredExercises.every((exercise) =>
      exercise.formChecks.every((check) => check.checked)
    );

    const hasStrengthTraining = performedExercises.length > 0;
    const formMultiplier =
      hasStrengthTraining && !allFormsChecked ? 0.8 : 1.0;

    const strengthAfterForm = Math.round(strengthXP * formMultiplier);
    const runXP = runMeters;
    const finalXP = strengthAfterForm + runXP;

    return {
      strengthXP,
      strengthAfterForm,
      runXP,
      formMultiplier,
      finalXP,
      performedCount: performedExercises.length,
      perfectForm: hasStrengthTraining && allFormsChecked,
    };
  }, [exercises, runMeters]);

  const lv = computeLevel(totalXP);
  const title = TITLES[Math.min(lv.level - 1, TITLES.length - 1)];
  const levelProgress =
    lv.toNext === 0 ? 100 : Math.min(100, (lv.into / lv.toNext) * 100);

  const recommendedPattern: WorkoutPattern = lastPattern === "A" ? "B" : "A";

  const currentBaseExercises = visibleExercises.filter(
    ({ exercise }) => exercise.isBase
  );
  const completedBaseExercises = currentBaseExercises.filter(({ exercise }) =>
    exercise.sets.some((set) => set.done)
  ).length;
  const workoutProgress =
    currentBaseExercises.length === 0
      ? 0
      : Math.round((completedBaseExercises / currentBaseExercises.length) * 100);

  const updateSetField = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              sets: exercise.sets.map((set, setIndex) =>
                setIndex === setIdx ? { ...set, [field]: value } : set
              ),
            }
          : exercise
      )
    );
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              sets: exercise.sets.map((set, setIndex) =>
                setIndex === setIdx ? { ...set, done: !set.done } : set
              ),
            }
          : exercise
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx) return exercise;
        const last = exercise.sets[exercise.sets.length - 1];
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              weight: last?.weight ?? 0,
              reps: last?.reps ?? 10,
              done: false,
            },
          ],
        };
      })
    );
  };

  const removeLastSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx || exercise.sets.length <= 1) return exercise;
        return { ...exercise, sets: exercise.sets.slice(0, -1) };
      })
    );
  };

  const addExtraExercise = () => {
    const key = `extra_${Date.now()}`;
    setExercises((prev) => [
      ...prev,
      {
        key,
        name: "追加種目",
        isBase: false,
        pattern: currentPattern,
        sets: [{ weight: 20, reps: 10, done: false }],
        formChecks: [],
        lastFormMemo: "",
        formMemoDraft: "",
      },
    ]);
    setOpenForms((prev) => ({ ...prev, [key]: true }));
    setEditingForms((prev) => ({ ...prev, [key]: true }));
  };

  const updateExerciseName = (exIdx: number, name: string) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, name } : exercise
      )
    );
  };

  const updateExercisePattern = (exIdx: number, pattern: WorkoutPattern) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, pattern } : exercise
      )
    );
  };

  const toggleFormCheck = (exIdx: number, checkId: string) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formChecks: exercise.formChecks.map((check) =>
                check.id === checkId
                  ? { ...check, checked: !check.checked }
                  : check
              ),
            }
          : exercise
      )
    );
  };

  const updateFormMemoDraft = (exIdx: number, value: string) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, formMemoDraft: value } : exercise
      )
    );
  };

  const addFormCheck = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formChecks: [
                ...exercise.formChecks,
                {
                  id: `check_${Date.now()}`,
                  label: "新しいフォーム項目",
                  checked: false,
                },
              ],
            }
          : exercise
      )
    );
  };

  const updateFormCheckLabel = (
    exIdx: number,
    checkId: string,
    label: string
  ) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formChecks: exercise.formChecks.map((check) =>
                check.id === checkId ? { ...check, label } : check
              ),
            }
          : exercise
      )
    );
  };

  const removeFormCheck = (exIdx: number, checkId: string) => {
    setExercises((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formChecks: exercise.formChecks.filter(
                (check) => check.id !== checkId
              ),
            }
          : exercise
      )
    );
  };

  const resetToday = () => {
    setExercises((prev) => resetSessionFields(prev));
    setRunMeters(0);
    setTodayDate(getTodayJST());
  };

  const commitToday = () => {
    if (calc.finalXP <= 0) {
      alert("完了したセット、またはラン距離を入力してください");
      return;
    }

    const oldLevel = computeLevel(totalXP).level;
    const nextTotalXP = totalXP + calc.finalXP;
    const newLevel = computeLevel(nextTotalXP).level;
    const committedPattern = currentPattern;

    const memo = `フォーム倍率×${calc.formMultiplier.toFixed(1)} / 筋トレ${pretty(calc.strengthAfterForm)}XP / ラン${pretty(calc.runXP)}XP`;

    setTotalXP(nextTotalXP);
    setNotes((arr) => [
      {
        date: todayDate,
        xp: calc.finalXP,
        memo,
        pattern: committedPattern,
      },
      ...arr,
    ]);

    setLastPattern(committedPattern);
    setCurrentPattern(committedPattern === "A" ? "B" : "A");

    setExercises((prev) =>
      prev.map((exercise) => {
        const performed = exercise.sets.some((set) => set.done);
        return {
          ...exercise,
          lastFormMemo:
            performed && exercise.formMemoDraft.trim()
              ? exercise.formMemoDraft.trim()
              : exercise.lastFormMemo,
          formMemoDraft: "",
          sets: exercise.sets.map((set) => ({ ...set, done: false })),
          formChecks: exercise.formChecks.map((check) => ({
            ...check,
            checked: false,
          })),
        };
      })
    );

    setRunMeters(0);
    setTodayDate(getTodayJST());
    setCelebration({
      xp: calc.finalXP,
      oldLevel,
      newLevel,
      perfect: calc.perfectForm,
    });
  };

  const exportJSON = () => {
    const payload: SavedState = {
      version: 5,
      totalXP,
      notes,
      todayDate,
      exercises,
      runMeters,
      currentPattern,
      lastPattern,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xp-backup-${todayDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(String(reader.result)) as LegacySavedState;
          if (typeof obj.totalXP === "number") setTotalXP(obj.totalXP);
          if (Array.isArray(obj.notes)) setNotes(obj.notes);
          if (typeof obj.todayDate === "string") setTodayDate(obj.todayDate);
          setExercises(migrateExercises(obj.exercises));
          if (typeof obj.runMeters === "number") setRunMeters(obj.runMeters);
          if (isPattern(obj.currentPattern)) setCurrentPattern(obj.currentPattern);
          if (obj.lastPattern === null || isPattern(obj.lastPattern)) {
            setLastPattern(obj.lastPattern ?? null);
          }
          alert("復元しました");
        } catch {
          alert("JSONの形式が不正です");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const hardReset = () => {
    if (!confirm("全データを初期状態へ戻しますか？")) return;
    setTotalXP(INITIAL_TOTAL_XP);
    setNotes([]);
    setTodayDate(getTodayJST());
    setExercises(createInitialExercises());
    setRunMeters(0);
    setCurrentPattern("A");
    setLastPattern(null);
    setOpenForms({});
    setEditingForms({});
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-28 md:pb-8">
        {/* Header */}
        <div className="rounded-2xl bg-white shadow p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">筋トレXPトラッカー</h1>
              <div className="mt-2 text-sm">
                総経験値：<span className="font-semibold">{pretty(totalXP)}</span> XP
              </div>
              <div className="mt-1 text-sm">
                レベル：<span className="font-semibold">Lv {lv.level}</span>「{title}」
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-gray-100 px-3 py-1.5">
                  前回：{lastPattern ? `${lastPattern}メニュー` : "記録なし"}
                </span>
                <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 font-semibold">
                  推奨：{recommendedPattern}メニュー
                </span>
              </div>
            </div>

            <div className="w-full md:w-1/2">
              <div className="text-sm mb-1">
                次のレベルまで：{pretty(Math.max(0, lv.toNext - lv.into))} XP
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={commitToday}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              XPを加算して保存
            </button>
            <button
              onClick={resetToday}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              今日の入力をリセット
            </button>
            <button
              onClick={exportJSON}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              バックアップ
            </button>
            <button
              onClick={importJSON}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              復元
            </button>
            <button
              onClick={hardReset}
              className="px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
            >
              全データをリセット
            </button>
          </div>
        </div>

        {/* Pattern selector and progress */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">本日のメニュー</h2>
              <div className="text-sm text-gray-500 mt-1">
                前回が{lastPattern ?? "未記録"}のため、今日は{recommendedPattern}がおすすめです
              </div>
            </div>
            <input
              type="date"
              value={todayDate}
              onChange={(event) => setTodayDate(event.target.value)}
              className="border rounded-lg px-3 py-2 h-11 text-base bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as WorkoutPattern[]).map((pattern) => (
              <button
                key={pattern}
                onClick={() => setCurrentPattern(pattern)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  currentPattern === pattern
                    ? pattern === "A"
                      ? "border-red-500 bg-red-50 ring-2 ring-red-100"
                      : "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="text-xl font-bold">{pattern}メニュー</div>
                <div className="text-sm text-gray-600 mt-1">
                  {pattern === "A" ? "胸・肩・三頭筋" : "脚・背中・二頭筋・腹筋"}
                </div>
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-semibold">今日の進捗</span>
              <span>
                {completedBaseExercises}/{currentBaseExercises.length}種目・{workoutProgress}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${currentPattern === "A" ? "bg-red-500" : "bg-blue-600"}`}
                style={{ width: `${workoutProgress}%` }}
              />
            </div>
          </div>

          <div
            className={`rounded-xl p-4 border ${
              calc.formMultiplier === 1
                ? "bg-green-50 border-green-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            <div className="font-bold">
              {calc.perfectForm ? "PERFECT FORM" : calc.performedCount > 0 ? "GOOD FORM" : "FORM CHECK"}
            </div>
            <div className="text-sm mt-1">
              現在のフォーム倍率：×{calc.formMultiplier.toFixed(1)}
              {calc.performedCount > 0 && calc.formMultiplier < 1
                ? "（実施種目に未チェックがあります）"
                : ""}
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{currentPattern}メニューの種目</h2>
            <span className="text-sm text-gray-500">
              {visibleExercises.length}種目
            </span>
          </div>

          {visibleExercises.map(({ exercise, originalIndex }) => {
            const checkedCount = exercise.formChecks.filter(
              (check) => check.checked
            ).length;
            const performed = exercise.sets.some((set) => set.done);
            const formComplete =
              exercise.formChecks.length === 0 ||
              checkedCount === exercise.formChecks.length;
            const formOpen = Boolean(openForms[exercise.key]);
            const editingForm = Boolean(editingForms[exercise.key]);

            return (
              <div
                key={exercise.key}
                className={`rounded-2xl border bg-white p-4 space-y-3 ${
                  performed && !formComplete ? "border-amber-300" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    {exercise.isBase ? (
                      <div className="font-semibold text-lg">{exercise.name}</div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          value={exercise.name}
                          onChange={(event) =>
                            updateExerciseName(originalIndex, event.target.value)
                          }
                          className="border rounded-lg px-3 py-2 h-11 text-base bg-white text-black w-full sm:w-72"
                        />
                        <select
                          value={exercise.pattern}
                          onChange={(event) =>
                            updateExercisePattern(
                              originalIndex,
                              event.target.value as WorkoutPattern
                            )
                          }
                          className="border rounded-lg px-3 py-2 h-11 bg-white text-black"
                        >
                          <option value="A">Aメニュー</option>
                          <option value="B">Bメニュー</option>
                        </select>
                      </div>
                    )}

                    {exercise.lastFormMemo && (
                      <div className="mt-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                        <span className="font-semibold">前回のフォームメモ：</span>
                        {exercise.lastFormMemo}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => addSet(originalIndex)}
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                    >
                      ＋セット
                    </button>
                    <button
                      onClick={() => removeLastSet(originalIndex)}
                      className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                    >
                      −セット
                    </button>
                  </div>
                </div>

                <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium text-gray-500">
                  <div className="col-span-2">セット</div>
                  <div className="col-span-3 text-right">重量(kg)</div>
                  <div className="col-span-3 text-right">回数</div>
                  <div className="col-span-2 text-right">XP</div>
                  <div className="col-span-2 text-center">状態</div>
                </div>

                {exercise.sets.map((set, setIdx) => (
                  <div
                    key={`${exercise.key}-${setIdx}`}
                    className="grid grid-cols-12 gap-2 items-center rounded-xl p-3 bg-gray-50"
                  >
                    <div className="col-span-12 md:col-span-2 font-medium">
                      Set {setIdx + 1}
                    </div>

                    <input
                      type="number"
                      value={set.weight}
                      onChange={(event) =>
                        updateSetField(
                          originalIndex,
                          setIdx,
                          "weight",
                          Number(event.target.value || 0)
                        )
                      }
                      className="col-span-6 md:col-span-3 border rounded-lg px-3 py-2 h-11 text-base text-right bg-white text-black"
                    />

                    <input
                      type="number"
                      value={set.reps}
                      onChange={(event) =>
                        updateSetField(
                          originalIndex,
                          setIdx,
                          "reps",
                          Number(event.target.value || 0)
                        )
                      }
                      className="col-span-6 md:col-span-3 border rounded-lg px-3 py-2 h-11 text-base text-right bg-white text-black"
                    />

                    <div className="col-span-6 md:col-span-2 text-sm md:text-right">
                      {pretty(set.weight * set.reps)} XP
                    </div>

                    <div className="col-span-6 md:col-span-2 flex justify-end md:justify-center">
                      <button
                        onClick={() => toggleSetDone(originalIndex, setIdx)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                          set.done
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {set.done ? "完了済み" : "セット完了"}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border bg-gray-50 overflow-hidden">
                  <button
                    onClick={() =>
                      setOpenForms((prev) => ({
                        ...prev,
                        [exercise.key]: !prev[exercise.key],
                      }))
                    }
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div>
                      <div className="font-semibold">
                        フォーム確認 {checkedCount}/{exercise.formChecks.length}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        実施種目は全チェックでXP×1.0、未チェックありで×0.8
                      </div>
                    </div>
                    <span className="text-lg">{formOpen ? "▲" : "▼"}</span>
                  </button>

                  {formOpen && (
                    <div className="border-t px-4 py-4 space-y-3 bg-white">
                      {exercise.formChecks.length === 0 && !editingForm && (
                        <div className="text-sm text-gray-500">
                          フォーム項目は未登録です。必要に応じて編集から追加できます。
                        </div>
                      )}

                      {exercise.formChecks.map((check) => (
                        <div key={check.id} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={check.checked}
                            onChange={() =>
                              toggleFormCheck(originalIndex, check.id)
                            }
                            className="mt-1 h-5 w-5 shrink-0"
                          />

                          {editingForm ? (
                            <>
                              <input
                                value={check.label}
                                onChange={(event) =>
                                  updateFormCheckLabel(
                                    originalIndex,
                                    check.id,
                                    event.target.value
                                  )
                                }
                                className="flex-1 border rounded-lg px-3 py-2 bg-white text-black"
                              />
                              <button
                                onClick={() =>
                                  removeFormCheck(originalIndex, check.id)
                                }
                                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm"
                              >
                                削除
                              </button>
                            </>
                          ) : (
                            <span className="text-sm leading-6">{check.label}</span>
                          )}
                        </div>
                      ))}

                      {editingForm && (
                        <button
                          onClick={() => addFormCheck(originalIndex)}
                          className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                        >
                          ＋フォーム項目
                        </button>
                      )}

                      <div className="pt-2">
                        <label className="block text-sm font-semibold mb-1">
                          今日のフォームメモ
                        </label>
                        <textarea
                          value={exercise.formMemoDraft}
                          onChange={(event) =>
                            updateFormMemoDraft(originalIndex, event.target.value)
                          }
                          placeholder="例：肩がすくみやすい。次回は重量を1段下げる"
                          rows={2}
                          className="w-full border rounded-lg px-3 py-2 bg-white text-black"
                        />
                      </div>

                      <button
                        onClick={() =>
                          setEditingForms((prev) => ({
                            ...prev,
                            [exercise.key]: !prev[exercise.key],
                          }))
                        }
                        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                      >
                        {editingForm ? "編集を終了" : "フォーム項目を編集"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <button
              onClick={addExtraExercise}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              ＋{currentPattern}メニューに自由種目を追加
            </button>
          </div>
        </div>

        {/* Run + XP summary */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-4">
          <div className="space-y-2">
            <div className="font-semibold">ラントレ距離（m）＝XP</div>
            <div className="text-sm text-gray-500">
              ランXPはフォーム倍率の対象外です
            </div>
            <input
              type="number"
              value={runMeters}
              onChange={(event) =>
                setRunMeters(Number(event.target.value || 0))
              }
              placeholder="例：2000"
              className="border rounded-lg px-3 py-2 h-11 text-base w-40 bg-white text-black"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="font-semibold">本日のXP内訳</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span>筋トレ素点</span>
                  <span>{pretty(calc.strengthXP)} XP</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>フォーム倍率</span>
                  <span>×{calc.formMultiplier.toFixed(1)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>倍率適用後</span>
                  <span>{pretty(calc.strengthAfterForm)} XP</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>ランXP</span>
                  <span>{pretty(calc.runXP)} XP</span>
                </div>
              </div>
              <div className="border-t border-blue-200 mt-3 pt-3 text-xl font-bold flex justify-between gap-4">
                <span>最終XP</span>
                <span>{pretty(calc.finalXP)} XP</span>
              </div>
            </div>

            <div className="hidden md:flex items-end gap-2">
              <button
                onClick={commitToday}
                className="px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold w-full hover:bg-blue-700"
              >
                XPを加算して保存
              </button>
              <button
                onClick={resetToday}
                className="px-4 py-3 rounded-2xl bg-gray-100 w-full hover:bg-gray-200"
              >
                今日の入力をリセット
              </button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="rounded-2xl bg-white shadow p-5">
          <h2 className="text-xl font-semibold mb-2">最近のセッション</h2>
          {notes.length === 0 ? (
            <div className="text-sm opacity-70">まだ記録がありません</div>
          ) : (
            <div className="space-y-2">
              {notes.map((note, index) => (
                <div key={`${note.date}-${index}`} className="border rounded-xl p-3 bg-gray-50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm opacity-70">{note.date}</div>
                    {note.pattern && (
                      <span className="rounded-full bg-white border px-2.5 py-1 text-xs font-semibold">
                        {note.pattern}メニュー
                      </span>
                    )}
                  </div>
                  <div className="font-semibold">+{pretty(note.xp)} XP</div>
                  <div className="text-xs opacity-60">{note.memo}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* mobile fixed bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t p-3 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500">
              {currentPattern}メニュー・フォーム×{calc.formMultiplier.toFixed(1)}
            </div>
            <div className="text-lg font-bold">{pretty(calc.finalXP)} XP</div>
          </div>
          <button
            onClick={commitToday}
            className="px-4 py-3 rounded-xl bg-blue-600 text-white font-bold"
          >
            保存
          </button>
          <button
            onClick={resetToday}
            className="px-4 py-3 rounded-xl bg-gray-100"
          >
            リセット
          </button>
        </div>
      </div>

      {/* Celebration */}
      {celebration && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setCelebration(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-sm font-semibold tracking-widest text-blue-600">
              WORKOUT COMPLETE
            </div>
            {celebration.perfect && (
              <div className="mt-3 text-xl font-black text-green-600">
                PERFECT FORM BONUS!
              </div>
            )}
            <div className="mt-4 text-4xl font-black">
              +{pretty(celebration.xp)} XP
            </div>
            {celebration.newLevel > celebration.oldLevel && (
              <div className="mt-3 text-lg font-bold">
                Lv {celebration.oldLevel} → Lv {celebration.newLevel}
              </div>
            )}
            <button
              onClick={() => setCelebration(null)}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold text-white"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
