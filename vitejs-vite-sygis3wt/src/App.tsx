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


const MOTIVATION_PHRASES = [
  "積み上げが、明日の強さになる。",
  "昨日の自分を、静かに超える。",
  "1セットずつ、理想に近づく。",
  "継続は、いちばん強い才能。",
  "今日の1回が、未来の輪郭をつくる。",
  "焦らず、止まらず、積み上げる。",
  "強さは、記録の先にある。",
  "小さな更新を、確かな成長へ。",
  "丁寧な1レップが、身体を変える。",
  "積み重ねた分だけ、自分は強くなる。",
];

function ForgeLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg
        viewBox="0 0 56 56"
        className={compact ? "h-9 w-9" : "h-11 w-11"}
        aria-hidden="true"
      >
        <path d="M10 9h34l-7 10H15L10 9Z" fill="currentColor" opacity="0.95" />
        <path d="M10 24h27L24 34H10V24Z" fill="currentColor" opacity="0.82" />
        <path d="M10 39h18L10 52V39Z" fill="currentColor" />
      </svg>
      <div className="leading-none">
        <div className="text-[18px] md:text-[21px] font-semibold tracking-[0.22em] text-slate-900">
          FORGE
        </div>
        <div className="mt-1 text-[9px] md:text-[10px] uppercase tracking-[0.28em] text-slate-400">
          Training Log
        </div>
      </div>
    </div>
  );
}

type MuscleArea =
  | "chest"
  | "shoulders"
  | "triceps"
  | "biceps"
  | "abs"
  | "lats"
  | "midback"
  | "legs"
  | "generic";

function getMuscleArea(exercise: ExerciseTemplate): MuscleArea {
  const key = exercise.key.toLowerCase();
  const name = exercise.name;

  if (key === "chest" || key === "fly" || name.includes("チェスト") || name.includes("ペック")) {
    return "chest";
  }
  if (key === "side_raise" || name.includes("サイドレイズ") || name.includes("ラテラル")) {
    return "shoulders";
  }
  if (key === "triceps" || name.includes("トライセップ")) return "triceps";
  if (key === "curl" || name.includes("カール")) return "biceps";
  if (key === "crunch" || name.includes("クランチ") || name.includes("腹")) return "abs";
  if (key === "lat" || name.includes("ラット")) return "lats";
  if (key === "row" || name.includes("ロー")) return "midback";
  if (key === "legpress" || name.includes("レッグ")) return "legs";
  return "generic";
}

function MuscleMap({
  exercise,
  size = "sm",
}: {
  exercise: ExerciseTemplate;
  size?: "sm" | "lg";
}) {
  const area = getMuscleArea(exercise);
  const isBack = area === "lats" || area === "midback";
  const wrap = size === "lg" ? "h-36 w-28" : "h-20 w-16";

  const active = "fill-sky-500";
  const muted = "fill-slate-200";
  const line = "stroke-slate-300";

  return (
    <svg
      viewBox="0 0 100 150"
      className={`${wrap} shrink-0`}
      role="img"
      aria-label={`${exercise.name}で主に鍛える部位`}
    >
      <circle cx="50" cy="14" r="10" className={muted} />
      <path
        d="M36 27C30 33 26 45 27 61l4 34 8 38h22l8-38 4-34c1-16-3-28-9-34-8-6-20-6-28 0Z"
        className={muted}
      />
      <path d="M34 32 19 45 14 78l9 2 11-29" className={`${line} fill-none`} strokeWidth="8" strokeLinecap="round" />
      <path d="m66 32 15 13 5 33-9 2-11-29" className={`${line} fill-none`} strokeWidth="8" strokeLinecap="round" />
      <path d="M42 129 36 147M58 129l6 18" className={`${line} fill-none`} strokeWidth="9" strokeLinecap="round" />

      {!isBack && area === "chest" && (
        <>
          <path d="M33 40c6-7 13-7 17 0v20c-8 2-14-2-17-8Z" className={active} />
          <path d="M67 40c-6-7-13-7-17 0v20c8 2 14-2 17-8Z" className={active} />
        </>
      )}
      {!isBack && area === "shoulders" && (
        <>
          <ellipse cx="29" cy="38" rx="10" ry="12" className={active} />
          <ellipse cx="71" cy="38" rx="10" ry="12" className={active} />
        </>
      )}
      {!isBack && area === "triceps" && (
        <>
          <path d="M20 48c5 0 8 5 7 13l-4 18-8-2 2-20Z" className={active} />
          <path d="M80 48c-5 0-8 5-7 13l4 18 8-2-2-20Z" className={active} />
        </>
      )}
      {!isBack && area === "biceps" && (
        <>
          <ellipse cx="22" cy="57" rx="7" ry="12" className={active} />
          <ellipse cx="78" cy="57" rx="7" ry="12" className={active} />
        </>
      )}
      {!isBack && area === "abs" && (
        <>
          <rect x="42" y="62" width="7" height="14" rx="3" className={active} />
          <rect x="51" y="62" width="7" height="14" rx="3" className={active} />
          <rect x="42" y="78" width="7" height="14" rx="3" className={active} />
          <rect x="51" y="78" width="7" height="14" rx="3" className={active} />
          <rect x="42" y="94" width="7" height="14" rx="3" className={active} />
          <rect x="51" y="94" width="7" height="14" rx="3" className={active} />
        </>
      )}
      {area === "legs" && (
        <>
          <path d="M38 104h12l-4 34-10 5-4-13Z" className={active} />
          <path d="M62 104H50l4 34 10 5 4-13Z" className={active} />
        </>
      )}
      {isBack && (
        <>
          <path d="M34 36c8-5 24-5 32 0l-4 20-12 9-12-9Z" className={area === "midback" ? active : muted} />
          <path d="M34 48 27 72l14 24 9-15V62Z" className={area === "lats" ? active : muted} />
          <path d="m66 48 7 24-14 24-9-15V62Z" className={area === "lats" ? active : muted} />
        </>
      )}
      {area === "generic" && (
        <path d="M31 46h38M26 54h48" className="stroke-sky-500" strokeWidth="6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function SetStatusIcon({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
      ✓
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
  );
}


function calculateSessionXP(
  exercises: ExerciseTemplate[],
  pattern: WorkoutPattern,
  runMeters: number
) {
  const currentExercises = exercises.filter(
    (exercise) => exercise.pattern === pattern
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

  const runXP = Math.max(0, runMeters);
  const finalXP = strengthXP + runXP;

  return { strengthXP, runXP, finalXP, performedCount };
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
  const [openExerciseKey, setOpenExerciseKey] = useState<string | null>("chest");
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
  const calc = useMemo(
    () => calculateSessionXP(exercises, currentPattern, runMeters),
    [exercises, currentPattern, runMeters]
  );

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
    const firstExercise = latestStateRef.current.exercises.find(
      (exercise) => exercise.pattern === pattern
    );
    setOpenExerciseKey(firstExercise?.key ?? null);
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

  const deleteExercise = (exerciseKey: string) => {
    const target = latestStateRef.current.exercises.find(
      (exercise) => exercise.key === exerciseKey
    );

    // 標準種目は削除不可。自由追加種目のみ削除できる。
    if (!target || target.isBase) return;

    if (!confirm(`「${target.name}」を削除しますか？`)) return;

    const nextExercises = latestStateRef.current.exercises.filter(
      (exercise) => exercise.key !== exerciseKey
    );

    setExercises(nextExercises);
    persistNow({ exercises: nextExercises });

    // 削除した種目の動画編集パネル状態も破棄する。
    setOpenVideoManagers((prev) => {
      const next = { ...prev };
      delete next[exerciseKey];
      return next;
    });
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
    const snapshot = latestStateRef.current;
    const committedPattern = snapshot.currentPattern;
    const snapshotCalc = calculateSessionXP(
      snapshot.exercises,
      committedPattern,
      snapshot.runMeters
    );

    if (snapshotCalc.finalXP <= 0) {
      alert("完了したセット、またはラン距離を入力してください");
      return;
    }

    const oldLevel = computeLevel(snapshot.totalXP).level;
    const nextTotalXP = snapshot.totalXP + snapshotCalc.finalXP;
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
        xp: snapshotCalc.finalXP,
        memo: `筋トレ${pretty(snapshotCalc.strengthXP)}XP / ラン${pretty(snapshotCalc.runXP)}XP`,
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
    setOpenExerciseKey(
      nextState.exercises.find(
        (exercise) => exercise.pattern === nextState.currentPattern
      )?.key ?? null
    );

    setCelebration({
      xp: snapshotCalc.finalXP,
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        <div className="flex flex-col items-center gap-4">
          <div className="text-slate-800">
            <ForgeLogo />
          </div>
          <div className="text-sm">読み込み中...</div>
        </div>
      </div>
    );
  }

  const motivationPhrase =
    MOTIVATION_PHRASES[notes.length % MOTIVATION_PHRASES.length];

  return (
    <div className="min-h-screen bg-[#eef1f4] text-slate-900">
      <div className="mx-auto max-w-3xl px-3 pb-28 pt-3 sm:px-5 sm:pt-5">
        {/* Brand header */}
        <header className="mb-3 flex items-center justify-between rounded-[24px] border border-white/70 bg-white/90 px-4 py-3 shadow-[0_10px_35px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="text-slate-800">
            <ForgeLogo />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportJSON}
              className="hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 sm:block"
            >
              Backup
            </button>
            <details className="relative">
              <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                ⋯
              </summary>
              <div className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <button
                  onClick={exportJSON}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 sm:hidden"
                >
                  バックアップ
                </button>
                <button
                  onClick={importJSON}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  復元
                </button>
                <button
                  onClick={resetToday}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  今日の入力をリセット
                </button>
                <button
                  onClick={hardReset}
                  className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  全データをリセット
                </button>
              </div>
            </details>
          </div>
        </header>

        {/* XP / Level */}
        <section className="rounded-[24px] border border-white/70 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold tracking-[0.08em] text-slate-400">
                TOTAL EXPERIENCE
              </div>
              <div className="mt-1 flex items-end gap-2">
                <div className="text-4xl font-semibold tracking-tight text-slate-950">
                  {pretty(totalXP)}
                </div>
                <div className="pb-1 text-lg font-semibold text-slate-500">XP</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-400">LEVEL</div>
              <div className="text-3xl font-semibold text-slate-900">Lv {lv.level}</div>
              <div className="mt-1 max-w-[150px] truncate text-xs text-slate-500">
                {title}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>次のレベルまで {pretty(Math.max(0, lv.toNext - lv.into))} XP</span>
              <span>Lv {Math.min(lv.level + 1, LEVEL_NEEDS.length + 1)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Previous / recommendation */}
        <section className="mt-3 grid grid-cols-2 gap-3">
          <button
            onClick={() => lastPattern && selectPattern(lastPattern)}
            className="rounded-[22px] border border-white/70 bg-white p-4 text-left shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition active:scale-[0.99]"
          >
            <div className="text-[11px] font-semibold text-slate-400">前回のトレーニング</div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {lastPattern ? `${lastPattern}メニュー` : "記録なし"}
            </div>
          </button>
          <button
            onClick={() => selectPattern(recommendedPattern)}
            className="rounded-[22px] border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 text-left shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition active:scale-[0.99]"
          >
            <div className="text-[11px] font-semibold text-sky-500">あなたへのおすすめ</div>
            <div className="mt-1 text-base font-semibold text-slate-900">
              {recommendedPattern}メニュー
            </div>
          </button>
        </section>

        {/* Menu selector */}
        <section className="mt-3 rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">本日のメニュー</div>
              <input
                type="date"
                value={todayDate}
                onChange={(event) => handleDateChange(event.target.value)}
                className="mt-1 border-0 bg-transparent p-0 text-xs text-slate-400 outline-none"
              />
            </div>
            <div className="max-w-[52%] text-right text-xs leading-5 text-slate-500">
              {motivationPhrase}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as WorkoutPattern[]).map((pattern) => {
              const selected = currentPattern === pattern;
              return (
                <button
                  key={pattern}
                  onClick={() => selectPattern(pattern)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-slate-800 bg-slate-800 text-white shadow-lg shadow-slate-300/40"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <div className="text-base font-semibold">{pattern}メニュー</div>
                  <div className={`mt-1 text-[11px] ${selected ? "text-slate-300" : "text-slate-400"}`}>
                    {pattern === "A" ? "胸・肩・腕" : "背中・腕・体幹・脚"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">今日の進捗</span>
              <span className="font-semibold text-slate-600">
                {completedBaseExercises}/{currentBaseExercises.length}種目 ・ {workoutProgress}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${workoutProgress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Exercises */}
        <section className="mt-3 space-y-3">
          {visibleExercises.map(({ exercise, originalIndex }, visualIndex) => {
            const isOpen = openExerciseKey === exercise.key;
            const doneSets = exercise.sets.filter((set) => set.done).length;
            const firstSet = exercise.sets[0];

            return (
              <article
                key={exercise.key}
                className="overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenExerciseKey((prev) =>
                      prev === exercise.key ? null : exercise.key
                    )
                  }
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    doneSets > 0 ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {exercise.isBase ? visualIndex + 1 : "+"}
                  </div>

                  <MuscleMap exercise={exercise} />

                  <div className="min-w-0 flex-1">
                    {exercise.isBase ? (
                      <div className="truncate text-base font-semibold text-slate-900">
                        {exercise.name}
                      </div>
                    ) : (
                      <input
                        value={exercise.name}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) =>
                          updateExerciseName(originalIndex, event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-base font-semibold outline-none focus:border-sky-400"
                      />
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span>
                        目安 {firstSet ? `${firstSet.weight}kg × ${firstSet.reps}` : "—"}
                      </span>
                      <span>{doneSets}/{exercise.sets.length}セット完了</span>
                    </div>
                  </div>

                  <div className={`text-xl text-slate-300 transition ${isOpen ? "rotate-180" : ""}`}>⌄</div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    {!exercise.isBase && (
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <select
                          value={exercise.pattern}
                          onChange={(event) =>
                            updateExercisePattern(
                              originalIndex,
                              event.target.value as WorkoutPattern
                            )
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="A">Aメニュー</option>
                          <option value="B">Bメニュー</option>
                        </select>
                        <button
                          onClick={() => deleteExercise(exercise.key)}
                          className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600"
                        >
                          種目を削除
                        </button>
                      </div>
                    )}

                    <div className="space-y-2">
                      {exercise.sets.map((set, setIndex) => (
                        <div
                          key={`${exercise.key}-${setIndex}`}
                          className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 rounded-2xl bg-slate-50 p-2.5"
                        >
                          <div className="text-xs font-semibold text-slate-500">
                            Set {setIndex + 1}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={set.weight}
                              onChange={(event) =>
                                updateSetField(
                                  originalIndex,
                                  setIndex,
                                  "weight",
                                  Number(event.target.value || 0)
                                )
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-right text-sm font-semibold outline-none focus:border-sky-400"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                              kg
                            </span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(event) =>
                                updateSetField(
                                  originalIndex,
                                  setIndex,
                                  "reps",
                                  Number(event.target.value || 0)
                                )
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-right text-sm font-semibold outline-none focus:border-sky-400"
                            />
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                              回
                            </span>
                          </div>
                          <button
                            onClick={() => toggleSetDone(originalIndex, setIndex)}
                            className="flex items-center gap-2 rounded-xl px-2 py-1.5"
                          >
                            <SetStatusIcon done={set.done} />
                            <span className={`hidden text-xs font-semibold sm:inline ${
                              set.done ? "text-emerald-600" : "text-slate-400"
                            }`}>
                              {set.done ? "完了" : "未完了"}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => addSet(originalIndex)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        ＋セット
                      </button>
                      <button
                        onClick={() => removeLastSet(originalIndex)}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        −セット
                      </button>
                    </div>

                    {/* Video / memo accordion */}
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      <button
                        onClick={() =>
                          setOpenVideoManagers((prev) => ({
                            ...prev,
                            [exercise.key]: !prev[exercise.key],
                          }))
                        }
                        className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                      >
                        <span>フォーム参考動画・メモ</span>
                        <span className="text-xs font-normal text-slate-400">
                          動画 {exercise.formVideos.length}件
                        </span>
                      </button>

                      {openVideoManagers[exercise.key] && (
                        <div className="space-y-4 border-t border-slate-200 p-4">
                          {exercise.formVideos.length === 0 ? (
                            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-400">
                              参考動画はまだ登録されていません。
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {exercise.formVideos.map((video, videoIndex) => (
                                <div
                                  key={video.id}
                                  className="rounded-2xl border border-slate-200 p-3"
                                >
                                  <div className="flex items-start gap-2">
                                    <input
                                      value={video.title}
                                      onChange={(event) =>
                                        updateFormVideo(originalIndex, video.id, {
                                          title: event.target.value,
                                        })
                                      }
                                      placeholder="動画名"
                                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                    />
                                    <button
                                      onClick={() => moveFormVideo(originalIndex, video.id, -1)}
                                      disabled={videoIndex === 0}
                                      className="rounded-lg bg-slate-100 px-2 py-2 text-xs disabled:opacity-30"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => moveFormVideo(originalIndex, video.id, 1)}
                                      disabled={videoIndex === exercise.formVideos.length - 1}
                                      className="rounded-lg bg-slate-100 px-2 py-2 text-xs disabled:opacity-30"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  <input
                                    value={video.url}
                                    onChange={(event) =>
                                      updateFormVideo(originalIndex, video.id, {
                                        url: event.target.value,
                                      })
                                    }
                                    placeholder="YouTube URL"
                                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                                  />
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-400">開始</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={Math.floor(video.startSeconds / 60)}
                                      onChange={(event) =>
                                        updateVideoTimePart(
                                          originalIndex,
                                          video,
                                          "minutes",
                                          Number(event.target.value || 0)
                                        )
                                      }
                                      className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm"
                                    />
                                    <span className="text-xs text-slate-400">分</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={video.startSeconds % 60}
                                      onChange={(event) =>
                                        updateVideoTimePart(
                                          originalIndex,
                                          video,
                                          "seconds",
                                          Number(event.target.value || 0)
                                        )
                                      }
                                      className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm"
                                    />
                                    <span className="text-xs text-slate-400">秒</span>
                                  </div>
                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => openFormVideo(video)}
                                      className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white"
                                    >
                                      ▶ {formatStartTime(video.startSeconds)}から見る
                                    </button>
                                    <button
                                      onClick={() => removeFormVideo(originalIndex, video.id)}
                                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                                    >
                                      削除
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <button
                            onClick={() => addFormVideo(originalIndex)}
                            className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                          >
                            ＋参考動画を追加
                          </button>

                          <div>
                            <div className="mb-2 text-xs font-semibold text-slate-500">
                              前回メモ
                            </div>
                            {exercise.lastFormMemo ? (
                              <div className="mb-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                                {exercise.lastFormMemo}
                              </div>
                            ) : (
                              <div className="mb-2 text-xs text-slate-400">
                                まだメモはありません
                              </div>
                            )}
                            <textarea
                              value={exercise.formMemoDraft}
                              onChange={(event) =>
                                updateFormMemoDraft(originalIndex, event.target.value)
                              }
                              placeholder="今日気づいたフォームのポイント"
                              rows={2}
                              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <button
          onClick={addExtraExercise}
          className="mt-3 w-full rounded-[20px] border border-dashed border-slate-300 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-500"
        >
          ＋{currentPattern}メニューに自由種目を追加
        </button>

        {/* Run */}
        <section className="mt-3 rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-800">ラントレ距離</div>
              <div className="mt-1 text-xs text-slate-400">1m = 1XP</div>
            </div>
            <div className="relative w-36">
              <input
                type="number"
                value={runMeters}
                onChange={(event) =>
                  updateRunMeters(Number(event.target.value || 0))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-right font-semibold outline-none focus:border-sky-400"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                m
              </span>
            </div>
          </div>
        </section>

        {/* Recent sessions */}
        <details className="mt-3 rounded-[24px] border border-white/70 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
            最近のセッション
          </summary>
          <div className="mt-3 space-y-2">
            {notes.length === 0 ? (
              <div className="text-xs text-slate-400">まだ記録がありません</div>
            ) : (
              notes.slice(0, 8).map((note, index) => (
                <div
                  key={`${note.date}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div>
                    <div className="text-xs text-slate-400">
                      {note.date} {note.pattern ? `・${note.pattern}メニュー` : ""}
                    </div>
                    <div className="text-xs text-slate-500">{note.memo}</div>
                  </div>
                  <div className="font-semibold text-slate-800">
                    +{pretty(note.xp)} XP
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      </div>

      {/* Fixed bottom summary */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700/30 bg-slate-900/95 px-3 py-3 text-white shadow-[0_-10px_30px_rgba(15,23,42,0.2)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
              Today's XP
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-xl font-semibold">{pretty(calc.finalXP)} XP</span>
              <span className="text-[11px] text-slate-400">
                筋トレ {pretty(calc.strengthXP)} / ラン {pretty(calc.runXP)}
              </span>
            </div>
          </div>
          <button
            onClick={commitToday}
            className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-900/20 active:scale-[0.98]"
          >
            保存 →
          </button>
        </div>
      </div>

      {celebration && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setCelebration(null)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
              Session Complete
            </div>
            <div className="mt-3 text-4xl font-semibold text-slate-950">
              +{pretty(celebration.xp)} XP
            </div>
            {celebration.newLevel > celebration.oldLevel ? (
              <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 font-semibold text-amber-700">
                LEVEL UP! Lv {celebration.newLevel}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                {MOTIVATION_PHRASES[
                  (notes.length + 1) % MOTIVATION_PHRASES.length
                ]}
              </div>
            )}
            <button
              onClick={() => setCelebration(null)}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
