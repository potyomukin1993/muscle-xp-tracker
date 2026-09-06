import { useEffect, useMemo, useRef, useState } from "react";

/** ========= Types ========= */
type WorkoutPattern = "A" | "B";

type SetEntry = {
  weight: number;
  reps: number;
  done: boolean;
};

type FormVideo = {
  id: string;
  title: string;
  url: string;
  startSeconds: number;
};

type ExerciseTemplate = {
  key: string;
  name: string;
  isBase: boolean;
  pattern: WorkoutPattern;
  sets: SetEntry[];
  formVideos: FormVideo[];
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
  version: 7;
  totalXP: number;
  notes: Note[];
  todayDate: string;
  exercises: ExerciseTemplate[];
  runMeters: number;
  currentPattern: WorkoutPattern;
  lastPattern: WorkoutPattern | null;
};

type LegacyFormCheck = {
  id?: string;
  label?: string;
  checked?: boolean;
};

type LegacyExercise = {
  key?: string;
  name?: string;
  isBase?: boolean;
  pattern?: WorkoutPattern;
  sets?: SetEntry[];
  formChecks?: LegacyFormCheck[];
  formVideos?: FormVideo[];
  lastFormMemo?: string;
  formMemoDraft?: string;
};

type LegacySavedState = {
  version?: number;
  totalXP?: number;
  notes?: Note[];
  todayDate?: string;
  exercises?: LegacyExercise[];
  runMeters?: number;
  currentPattern?: WorkoutPattern;
  lastPattern?: WorkoutPattern | null;
};

/** ========= Date ========= */
function getTodayJST() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** ========= Constants ========= */
const LS_KEY = "xp_tracker_full_v7";
const LEGACY_LS_KEYS = ["xp_tracker_full_v6", "xp_tracker_full_v5", "xp_tracker_full_v4"];
const INITIAL_TOTAL_XP = 902_277;

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

function isPattern(value: unknown): value is WorkoutPattern {
  return value === "A" || value === "B";
}

function oppositePattern(pattern: WorkoutPattern): WorkoutPattern {
  return pattern === "A" ? "B" : "A";
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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
      formVideos: [],
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
      formVideos: [],
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
      formVideos: [
        {
          id: "triceps_reference_1",
          title: "オーバーヘッドトライセップス参考",
          url: "https://youtube.com/shorts/Auf16cO1Zg8",
          startSeconds: 0,
        },
      ],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      key: "side_raise",
      name: "サイドレイズ",
      isBase: true,
      pattern: "A",
      sets: [
        { weight: 10, reps: 10, done: false },
        { weight: 10, reps: 10, done: false },
      ],
      formVideos: [],
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
      formVideos: [],
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
      formVideos: [],
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
      formVideos: [],
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
      formVideos: [],
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
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
  ];
}

/** ========= Migration / normalization ========= */
function normalizeSets(raw: unknown, fallback: SetEntry[]): SetEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;

  return raw.map((item) => {
    const set = item as Partial<SetEntry>;
    return {
      weight: Number(set.weight) || 0,
      reps: Number(set.reps) || 0,
      done: Boolean(set.done),
    };
  });
}

function normalizeVideos(raw: unknown, fallback: FormVideo[] = []): FormVideo[] {
  if (!Array.isArray(raw)) return fallback;

  return raw
    .map((item, index) => {
      const video = item as Partial<FormVideo>;
      return {
        id: typeof video.id === "string" && video.id ? video.id : `video_${index + 1}`,
        title:
          typeof video.title === "string" && video.title.trim()
            ? video.title
            : `参考動画 ${index + 1}`,
        url: typeof video.url === "string" ? video.url : "",
        startSeconds: Math.max(0, Math.floor(Number(video.startSeconds) || 0)),
      };
    })
    .filter((video) => video.url.trim() !== "" || video.title.trim() !== "");
}

const DEPRECATED_STANDARD_KEYS = new Set(["shoulder", "hammer", "legext"]);
const DEPRECATED_STANDARD_NAMES = new Set([
  "ショルダープレス",
  "ハンマーカール",
  "レッグエクステンション",
]);

function migrateExercises(rawExercises: LegacyExercise[] | undefined): ExerciseTemplate[] {
  const defaults = createInitialExercises();
  const source = Array.isArray(rawExercises) ? rawExercises : [];
  const matchedIndexes = new Set<number>();

  const migratedDefaults = defaults.map((defaultExercise) => {
    // まず安定したkeyで照合し、新規標準種目などkeyが一致しない場合のみ
    // 同名の旧・自由追加種目を引き継ぐ。これによりサイドレイズを
    // 以前「追加種目」として登録していた場合も重量・動画・メモを維持できる。
    let sourceIndex = source.findIndex(
      (exercise, index) =>
        !matchedIndexes.has(index) && exercise.key === defaultExercise.key
    );

    if (sourceIndex < 0) {
      sourceIndex = source.findIndex(
        (exercise, index) =>
          !matchedIndexes.has(index) && exercise.name === defaultExercise.name
      );
    }

    if (sourceIndex < 0) return defaultExercise;

    matchedIndexes.add(sourceIndex);
    const old = source[sourceIndex];

    return {
      ...defaultExercise,
      // 標準種目はv7で定義した名称・A/B所属を優先し、
      // 既存の重量・回数・動画・メモだけを引き継ぐ。
      sets: normalizeSets(old.sets, defaultExercise.sets),
      formVideos: normalizeVideos(old.formVideos, defaultExercise.formVideos),
      lastFormMemo:
        typeof old.lastFormMemo === "string" ? old.lastFormMemo : "",
      formMemoDraft:
        typeof old.formMemoDraft === "string" ? old.formMemoDraft : "",
    };
  });

  const extras = source
    .map((exercise, index) => ({ exercise, index }))
    .filter(({ exercise, index }) => {
      if (matchedIndexes.has(index)) return false;

      const key = typeof exercise.key === "string" ? exercise.key : "";
      const name = typeof exercise.name === "string" ? exercise.name : "";

      // v6以前の標準メニューから外れた種目は、アップデート時に自動削除する。
      // ユーザーが「＋追加種目」で作った自由種目はそのまま維持する。
      if (DEPRECATED_STANDARD_KEYS.has(key)) return false;
      if (DEPRECATED_STANDARD_NAMES.has(name) && exercise.isBase !== false) return false;

      return true;
    })
    .map(({ exercise: old, index }): ExerciseTemplate => ({
      key:
        typeof old.key === "string" && old.key
          ? old.key
          : `extra_migrated_${index}`,
      name:
        typeof old.name === "string" && old.name ? old.name : "追加種目",
      isBase: Boolean(old.isBase),
      pattern: isPattern(old.pattern) ? old.pattern : "B",
      sets: normalizeSets(old.sets, [
        { weight: 20, reps: 10, done: false },
      ]),
      formVideos: normalizeVideos(old.formVideos, []),
      lastFormMemo:
        typeof old.lastFormMemo === "string" ? old.lastFormMemo : "",
      formMemoDraft:
        typeof old.formMemoDraft === "string" ? old.formMemoDraft : "",
    }));

  return [...migratedDefaults, ...extras];
}

function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const note = item as Partial<Note>;
      return {
        date: typeof note.date === "string" ? note.date : getTodayJST(),
        xp: Number(note.xp) || 0,
        memo: typeof note.memo === "string" ? note.memo : "",
        pattern: isPattern(note.pattern) ? note.pattern : undefined,
      };
    })
    .filter((note) => note.xp !== 0 || note.memo || note.date);
}

function buildStateFromRaw(raw: LegacySavedState | null): SavedState {
  const today = getTodayJST();
  const rawXP = typeof raw?.totalXP === "number" ? raw.totalXP : INITIAL_TOTAL_XP;

  return {
    version: 7,
    totalXP: Math.max(INITIAL_TOTAL_XP, rawXP),
    notes: normalizeNotes(raw?.notes),
    todayDate: today,
    exercises: migrateExercises(raw?.exercises),
    runMeters: typeof raw?.runMeters === "number" ? raw.runMeters : 0,
    currentPattern: isPattern(raw?.currentPattern) ? raw.currentPattern : "A",
    lastPattern:
      raw?.lastPattern === null || isPattern(raw?.lastPattern)
        ? raw.lastPattern ?? null
        : null,
  };
}

function resetAllSessionFields(exercises: ExerciseTemplate[]) {
  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set, done: false })),
    formMemoDraft: "",
  }));
}

/** ========= Video helpers ========= */
function clampStartSeconds(value: number) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function formatStartTime(totalSeconds: number) {
  const safe = clampStartSeconds(totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildVideoUrl(video: FormVideo) {
  const raw = video.url.trim();
  if (!raw) return "";

  const startSeconds = clampStartSeconds(video.startSeconds);

  try {
    const normalizedRaw = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(normalizedRaw);
    const host = parsed.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/^m\./, "");

    let youtubeId = "";

    if (host === "youtu.be") {
      youtubeId = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (parsed.pathname === "/watch") {
        youtubeId = parsed.searchParams.get("v") ?? "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        youtubeId = parsed.pathname.split("/")[2] ?? "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        youtubeId = parsed.pathname.split("/")[2] ?? "";
      }
    }

    if (youtubeId) {
      const youtubeUrl = new URL("https://www.youtube.com/watch");
      youtubeUrl.searchParams.set("v", youtubeId);
      if (startSeconds > 0) {
        youtubeUrl.searchParams.set("t", `${startSeconds}s`);
      }
      return youtubeUrl.toString();
    }

    if (startSeconds > 0) {
      parsed.searchParams.set("t", `${startSeconds}s`);
    }

    return parsed.toString();
  } catch {
    return raw;
  }
}

/** ========= App ========= */
export default function App() {
  const initialExercisesRef = useRef<ExerciseTemplate[]>(createInitialExercises());

  const [totalXP, setTotalXP] = useState<number>(INITIAL_TOTAL_XP);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todayDate, setTodayDate] = useState<string>(getTodayJST());
  const [exercises, setExercises] = useState<ExerciseTemplate[]>(
    initialExercisesRef.current
  );
  const [runMeters, setRunMeters] = useState<number>(0);
  const [currentPattern, setCurrentPattern] = useState<WorkoutPattern>("A");
  const [lastPattern, setLastPattern] = useState<WorkoutPattern | null>(null);
  const [openVideoManagers, setOpenVideoManagers] = useState<
    Record<string, boolean>
  >({});
  const [celebration, setCelebration] = useState<{
    xp: number;
    oldLevel: number;
    newLevel: number;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const latestStateRef = useRef<SavedState>({
    version: 7,
    totalXP: INITIAL_TOTAL_XP,
    notes: [],
    todayDate: getTodayJST(),
    exercises: initialExercisesRef.current,
    runMeters: 0,
    currentPattern: "A",
    lastPattern: null,
  });

  const writeState = (next: SavedState) => {
    latestStateRef.current = next;
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const persistNow = (overrides: Partial<SavedState> = {}) => {
    const next: SavedState = {
      ...latestStateRef.current,
      ...overrides,
      version: 7,
    };
    writeState(next);
    return next;
  };

  const applySavedState = (state: SavedState) => {
    setTotalXP(state.totalXP);
    setNotes(state.notes);
    setTodayDate(state.todayDate);
    setExercises(state.exercises);
    setRunMeters(state.runMeters);
    setCurrentPattern(state.currentPattern);
    setLastPattern(state.lastPattern);
    writeState(state);
  };

  // v7読み込み。v7がなければv6/v5/v4を自動移行する。
  useEffect(() => {
    let raw: LegacySavedState | null = null;

    try {
      const current = localStorage.getItem(LS_KEY);
      if (current) {
        raw = JSON.parse(current) as LegacySavedState;
      } else {
        for (const key of LEGACY_LS_KEYS) {
          const legacy = localStorage.getItem(key);
          if (legacy) {
            raw = JSON.parse(legacy) as LegacySavedState;
            break;
          }
        }
      }
    } catch {
      raw = null;
    }

    const state = buildStateFromRaw(raw);
    applySavedState(state);
    setLoaded(true);
  }, []);

  // バックグラウンド移行・画面OFF・タブ終了時は同期保存。
  // 復帰・再表示時は日本時間の今日へ補正する。
  useEffect(() => {
    if (!loaded) return;

    const saveLatest = () => {
      localStorage.setItem(LS_KEY, JSON.stringify(latestStateRef.current));
    };

    const syncToday = () => {
      const today = getTodayJST();
      if (latestStateRef.current.todayDate !== today) {
        setTodayDate(today);
        persistNow({ todayDate: today });
      } else {
        saveLatest();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveLatest();
      } else {
        syncToday();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", saveLatest);
    window.addEventListener("beforeunload", saveLatest);
    window.addEventListener("pageshow", syncToday);
    window.addEventListener("focus", syncToday);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", saveLatest);
      window.removeEventListener("beforeunload", saveLatest);
      window.removeEventListener("pageshow", syncToday);
      window.removeEventListener("focus", syncToday);
    };
  }, [loaded]);

  const updateExercisesAndPersist = (
    updater: (prev: ExerciseTemplate[]) => ExerciseTemplate[]
  ) => {
    const nextExercises = updater(latestStateRef.current.exercises);
    setExercises(nextExercises);
    persistNow({ exercises: nextExercises });
    return nextExercises;
  };

  const visibleExercises = useMemo(
    () =>
      exercises
        .map((exercise, originalIndex) => ({ exercise, originalIndex }))
        .filter(({ exercise }) => exercise.pattern === currentPattern),
    [exercises, currentPattern]
  );

  // XPは現在選択中のA/Bメニューだけを対象にする。
  // フォーム倍率は廃止。ランXPは単純加算。
  const calc = useMemo(() => {
    const currentExercises = exercises.filter(
      (exercise) => exercise.pattern === currentPattern
    );

    const strengthXP = currentExercises.reduce(
      (sum, exercise) =>
        sum +
        exercise.sets
          .filter((set) => set.done)
          .reduce((sub, set) => sub + set.weight * set.reps, 0),
      0
    );

    const performedCount = currentExercises.filter((exercise) =>
      exercise.sets.some((set) => set.done)
    ).length;

    const runXP = runMeters;
    const finalXP = strengthXP + runXP;

    return {
      strengthXP,
      runXP,
      finalXP,
      performedCount,
    };
  }, [exercises, currentPattern, runMeters]);

  const lv = computeLevel(totalXP);
  const title = TITLES[Math.min(lv.level - 1, TITLES.length - 1)];
  const levelProgress =
    lv.toNext === 0 ? 100 : Math.min(100, (lv.into / lv.toNext) * 100);

  const recommendedPattern: WorkoutPattern = lastPattern
    ? oppositePattern(lastPattern)
    : "A";

  const currentBaseExercises = visibleExercises.filter(
    ({ exercise }) => exercise.isBase
  );
  const completedBaseExercises = currentBaseExercises.filter(({ exercise }) =>
    exercise.sets.some((set) => set.done)
  ).length;
  const workoutProgress =
    currentBaseExercises.length === 0
      ? 0
      : Math.round(
          (completedBaseExercises / currentBaseExercises.length) * 100
        );

  const handleDateChange = (value: string) => {
    setTodayDate(value);
    persistNow({ todayDate: value });
  };

  const selectPattern = (pattern: WorkoutPattern) => {
    setCurrentPattern(pattern);
    persistNow({ currentPattern: pattern });
  };

  const updateSetField = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: number
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              sets: exercise.sets.map((set, setIndex) =>
                setIndex === setIdx
                  ? { ...set, [field]: Math.max(0, value) }
                  : set
              ),
            }
          : exercise
      )
    );
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    updateExercisesAndPersist((prev) =>
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
    updateExercisesAndPersist((prev) =>
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
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx || exercise.sets.length <= 1) return exercise;
        return { ...exercise, sets: exercise.sets.slice(0, -1) };
      })
    );
  };

  const addExtraExercise = () => {
    const key = createId("extra");
    updateExercisesAndPersist((prev) => [
      ...prev,
      {
        key,
        name: "追加種目",
        isBase: false,
        pattern: currentPattern,
        sets: [{ weight: 20, reps: 10, done: false }],
        formVideos: [],
        lastFormMemo: "",
        formMemoDraft: "",
      },
    ]);
    setOpenVideoManagers((prev) => ({ ...prev, [key]: true }));
  };

  const updateExerciseName = (exIdx: number, name: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, name } : exercise
      )
    );
  };

  const updateExercisePattern = (
    exIdx: number,
    pattern: WorkoutPattern
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, pattern } : exercise
      )
    );
  };

  const updateFormMemoDraft = (exIdx: number, value: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, formMemoDraft: value } : exercise
      )
    );
  };

  const addFormVideo = (exIdx: number) => {
    const id = createId("video");
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formVideos: [
                ...exercise.formVideos,
                {
                  id,
                  title: `参考動画 ${exercise.formVideos.length + 1}`,
                  url: "",
                  startSeconds: 0,
                },
              ],
            }
          : exercise
      )
    );
  };

  const updateFormVideo = (
    exIdx: number,
    videoId: string,
    patch: Partial<FormVideo>
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formVideos: exercise.formVideos.map((video) =>
                video.id === videoId
                  ? {
                      ...video,
                      ...patch,
                      startSeconds:
                        patch.startSeconds === undefined
                          ? video.startSeconds
                          : clampStartSeconds(patch.startSeconds),
                    }
                  : video
              ),
            }
          : exercise
      )
    );
  };

  const updateVideoTimePart = (
    exIdx: number,
    video: FormVideo,
    part: "minutes" | "seconds",
    value: number
  ) => {
    const currentMinutes = Math.floor(video.startSeconds / 60);
    const currentSeconds = video.startSeconds % 60;
    const minutes =
      part === "minutes" ? Math.max(0, Math.floor(value || 0)) : currentMinutes;
    const seconds =
      part === "seconds"
        ? Math.min(59, Math.max(0, Math.floor(value || 0)))
        : currentSeconds;

    updateFormVideo(exIdx, video.id, {
      startSeconds: minutes * 60 + seconds,
    });
  };

  const removeFormVideo = (exIdx: number, videoId: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx
          ? {
              ...exercise,
              formVideos: exercise.formVideos.filter(
                (video) => video.id !== videoId
              ),
            }
          : exercise
      )
    );
  };

  const moveFormVideo = (
    exIdx: number,
    videoId: string,
    direction: -1 | 1
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx) return exercise;

        const currentIndex = exercise.formVideos.findIndex(
          (video) => video.id === videoId
        );
        const targetIndex = currentIndex + direction;

        if (
          currentIndex < 0 ||
          targetIndex < 0 ||
          targetIndex >= exercise.formVideos.length
        ) {
          return exercise;
        }

        const nextVideos = [...exercise.formVideos];
        const [moved] = nextVideos.splice(currentIndex, 1);
        nextVideos.splice(targetIndex, 0, moved);

        return { ...exercise, formVideos: nextVideos };
      })
    );
  };

  const openFormVideo = (video: FormVideo) => {
    if (!video.url.trim()) {
      alert("YouTube URLを入力してください");
      return;
    }

    // YouTubeへ遷移する直前に、最新のセット・重量・回数等を同期保存する。
    localStorage.setItem(LS_KEY, JSON.stringify(latestStateRef.current));

    const targetUrl = buildVideoUrl(video);
    if (!targetUrl) return;

    const link = document.createElement("a");
    link.href = targetUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateRunMeters = (value: number) => {
    const nextValue = Math.max(0, value);
    setRunMeters(nextValue);
    persistNow({ runMeters: nextValue });
  };

  const resetToday = () => {
    const nextExercises = resetAllSessionFields(latestStateRef.current.exercises);
    const today = getTodayJST();

    setExercises(nextExercises);
    setRunMeters(0);
    setTodayDate(today);

    persistNow({
      exercises: nextExercises,
      runMeters: 0,
      todayDate: today,
    });
  };

  const commitToday = () => {
    if (calc.finalXP <= 0) {
      alert("完了したセット、またはラン距離を入力してください");
      return;
    }

    const snapshot = latestStateRef.current;
    const committedPattern = snapshot.currentPattern;
    const oldLevel = computeLevel(snapshot.totalXP).level;
    const nextTotalXP = snapshot.totalXP + calc.finalXP;
    const newLevel = computeLevel(nextTotalXP).level;
    const today = getTodayJST();

    const nextExercises = snapshot.exercises.map((exercise) => {
      if (exercise.pattern !== committedPattern) return exercise;

      const performed = exercise.sets.some((set) => set.done);
      const nextMemo =
        performed && exercise.formMemoDraft.trim()
          ? exercise.formMemoDraft.trim()
          : exercise.lastFormMemo;

      return {
        ...exercise,
        lastFormMemo: nextMemo,
        formMemoDraft: "",
        sets: exercise.sets.map((set) => ({ ...set, done: false })),
      };
    });

    const nextNotes: Note[] = [
      {
        date: snapshot.todayDate || today,
        xp: calc.finalXP,
        memo: `筋トレ${pretty(calc.strengthXP)}XP / ラン${pretty(calc.runXP)}XP`,
        pattern: committedPattern,
      },
      ...snapshot.notes,
    ];

    const nextPattern = oppositePattern(committedPattern);

    const nextState: SavedState = {
      version: 7,
      totalXP: nextTotalXP,
      notes: nextNotes,
      todayDate: today,
      exercises: nextExercises,
      runMeters: 0,
      currentPattern: nextPattern,
      lastPattern: committedPattern,
    };

    // XP確定はState更新より先に完成状態をlocalStorageへ一括保存する。
    writeState(nextState);

    setTotalXP(nextState.totalXP);
    setNotes(nextState.notes);
    setTodayDate(nextState.todayDate);
    setExercises(nextState.exercises);
    setRunMeters(nextState.runMeters);
    setCurrentPattern(nextState.currentPattern);
    setLastPattern(nextState.lastPattern);

    setCelebration({
      xp: calc.finalXP,
      oldLevel,
      newLevel,
    });
  };

  const exportJSON = () => {
    const payload = latestStateRef.current;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xp-backup-${getTodayJST()}.json`;
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
          const raw = JSON.parse(String(reader.result)) as LegacySavedState;
          const restored = buildStateFromRaw(raw);
          applySavedState(restored);
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

    const nextState: SavedState = {
      version: 7,
      totalXP: INITIAL_TOTAL_XP,
      notes: [],
      todayDate: getTodayJST(),
      exercises: createInitialExercises(),
      runMeters: 0,
      currentPattern: "A",
      lastPattern: null,
    };

    writeState(nextState);
    setTotalXP(nextState.totalXP);
    setNotes(nextState.notes);
    setTodayDate(nextState.todayDate);
    setExercises(nextState.exercises);
    setRunMeters(nextState.runMeters);
    setCurrentPattern(nextState.currentPattern);
    setLastPattern(nextState.lastPattern);
    setOpenVideoManagers({});
    setCelebration(null);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        読み込み中...
      </div>
    );
  }

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
              onChange={(event) => handleDateChange(event.target.value)}
              className="border rounded-lg px-3 py-2 h-11 text-base bg-white text-black"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as WorkoutPattern[]).map((pattern) => (
              <button
                key={pattern}
                onClick={() => selectPattern(pattern)}
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="font-bold">フォーム確認は動画から</div>
            <div className="text-sm mt-1 text-gray-600">
              各種目の参考動画をワンタップで開けます。動画を開く直前にも入力内容を保存します。
            </div>
          </div>
        </div>

        {/* Exercises */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{currentPattern}メニューの種目</h2>
            <span className="text-sm text-gray-500">{visibleExercises.length}種目</span>
          </div>

          {visibleExercises.map(({ exercise, originalIndex }) => {
            const videoManagerOpen = Boolean(openVideoManagers[exercise.key]);

            return (
              <div
                key={exercise.key}
                className="rounded-2xl border bg-white p-4 space-y-4"
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
                      min={0}
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
                      min={0}
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

                {/* Quick form videos */}
                <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="font-semibold">フォーム参考動画</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        登録数：{exercise.formVideos.length}件
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setOpenVideoManagers((prev) => ({
                          ...prev,
                          [exercise.key]: !prev[exercise.key],
                        }))
                      }
                      className="px-3 py-2 rounded-lg bg-white border hover:bg-gray-100 text-sm"
                    >
                      {videoManagerOpen ? "動画・メモ編集を閉じる" : "動画・メモを編集"}
                    </button>
                  </div>

                  {exercise.formVideos.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      参考動画はまだ未登録です。「動画・メモを編集」から追加できます。
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {exercise.formVideos.map((video) => (
                        <button
                          key={video.id}
                          onClick={() => openFormVideo(video)}
                          className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 text-left"
                        >
                          ▶ {video.title}
                          {video.startSeconds > 0 && (
                            <span className="ml-2 text-xs font-normal text-red-600">
                              {formatStartTime(video.startSeconds)}〜
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {videoManagerOpen && (
                    <div className="border-t pt-4 space-y-4">
                      {exercise.formVideos.map((video, videoIndex) => (
                        <div
                          key={video.id}
                          className="rounded-xl border bg-white p-3 space-y-3"
                        >
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                動画名
                              </label>
                              <input
                                value={video.title}
                                onChange={(event) =>
                                  updateFormVideo(originalIndex, video.id, {
                                    title: event.target.value,
                                  })
                                }
                                className="w-full border rounded-lg px-3 py-2 bg-white text-black"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                YouTube URL
                              </label>
                              <input
                                value={video.url}
                                onChange={(event) =>
                                  updateFormVideo(originalIndex, video.id, {
                                    url: event.target.value,
                                  })
                                }
                                placeholder="https://youtube.com/..."
                                className="w-full border rounded-lg px-3 py-2 bg-white text-black"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                開始位置・分
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={Math.floor(video.startSeconds / 60)}
                                onChange={(event) =>
                                  updateVideoTimePart(
                                    originalIndex,
                                    video,
                                    "minutes",
                                    Number(event.target.value || 0)
                                  )
                                }
                                className="w-24 border rounded-lg px-3 py-2 bg-white text-black text-right"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1">
                                秒
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={video.startSeconds % 60}
                                onChange={(event) =>
                                  updateVideoTimePart(
                                    originalIndex,
                                    video,
                                    "seconds",
                                    Number(event.target.value || 0)
                                  )
                                }
                                className="w-20 border rounded-lg px-3 py-2 bg-white text-black text-right"
                              />
                            </div>

                            <button
                              onClick={() => openFormVideo(video)}
                              className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
                            >
                              ▶ {formatStartTime(video.startSeconds)}から確認
                            </button>

                            <div className="flex gap-1 ml-auto">
                              <button
                                disabled={videoIndex === 0}
                                onClick={() =>
                                  moveFormVideo(originalIndex, video.id, -1)
                                }
                                className="px-3 py-2 rounded-lg bg-gray-100 text-sm disabled:opacity-40"
                              >
                                ↑
                              </button>
                              <button
                                disabled={videoIndex === exercise.formVideos.length - 1}
                                onClick={() =>
                                  moveFormVideo(originalIndex, video.id, 1)
                                }
                                className="px-3 py-2 rounded-lg bg-gray-100 text-sm disabled:opacity-40"
                              >
                                ↓
                              </button>
                              <button
                                onClick={() =>
                                  removeFormVideo(originalIndex, video.id)
                                }
                                className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm"
                              >
                                削除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        onClick={() => addFormVideo(originalIndex)}
                        className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                      >
                        ＋参考動画を追加
                      </button>

                      <div>
                        <label className="block text-sm font-semibold mb-1">
                          今日のフォームメモ
                        </label>
                        <textarea
                          value={exercise.formMemoDraft}
                          onChange={(event) =>
                            updateFormMemoDraft(originalIndex, event.target.value)
                          }
                          placeholder="例：肩をすくめない。次回は肘の軌道を動画と比較する"
                          rows={2}
                          className="w-full border rounded-lg px-3 py-2 bg-white text-black"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          この種目を実施してXP保存した時、入力内容を「前回のフォームメモ」として残します。
                        </div>
                      </div>
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
            <input
              type="number"
              min={0}
              value={runMeters}
              onChange={(event) =>
                updateRunMeters(Number(event.target.value || 0))
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
                  <span>{currentPattern}メニュー筋トレXP</span>
                  <span>{pretty(calc.strengthXP)} XP</span>
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
                <div
                  key={`${note.date}-${index}`}
                  className="border rounded-xl p-3 bg-gray-50"
                >
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

      {/* Mobile fixed bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t p-3 z-40">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500">{currentPattern}メニュー</div>
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
