import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";

/** ========= Types ========= */
type WorkoutPattern = "A" | "B";
type ViewMode = "home" | "training" | "exercise";

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
      isBase: false,
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

// High-quality anatomy base illustrations from Wikimedia Commons.
// Front/back artwork: Termininja, CC BY-SA 3.0.
const ANATOMY_FRONT_URL =
  "https://upload.wikimedia.org/wikipedia/commons/1/13/Muscular_system.svg";
const ANATOMY_BACK_URL =
  "https://upload.wikimedia.org/wikipedia/commons/9/90/Muscular_system-back.svg";

type AnatomyOverlay = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate?: number;
  radius?: string;
};

function getAnatomyOverlays(area: MuscleArea): {
  view: "front" | "back";
  overlays: AnatomyOverlay[];
} {
  switch (area) {
    case "chest":
      return {
        view: "front",
        overlays: [
          { left: 38, top: 24.5, width: 12.5, height: 10, rotate: -5, radius: "48% 52% 48% 52%" },
          { left: 49.5, top: 24.5, width: 12.5, height: 10, rotate: 5, radius: "52% 48% 52% 48%" },
        ],
      };
    case "shoulders":
      return {
        view: "front",
        overlays: [
          { left: 28.5, top: 22.5, width: 10, height: 9, rotate: -14, radius: "50%" },
          { left: 61.5, top: 22.5, width: 10, height: 9, rotate: 14, radius: "50%" },
        ],
      };
    case "triceps":
      return {
        view: "back",
        overlays: [
          { left: 27, top: 33, width: 8, height: 18, rotate: 8, radius: "45%" },
          { left: 65, top: 33, width: 8, height: 18, rotate: -8, radius: "45%" },
        ],
      };
    case "biceps":
      return {
        view: "front",
        overlays: [
          { left: 27, top: 32.5, width: 8.5, height: 16, rotate: -7, radius: "45%" },
          { left: 64.5, top: 32.5, width: 8.5, height: 16, rotate: 7, radius: "45%" },
        ],
      };
    case "abs":
      return {
        view: "front",
        overlays: [
          { left: 43, top: 36, width: 14, height: 27, radius: "38%" },
        ],
      };
    case "lats":
      return {
        view: "back",
        overlays: [
          { left: 31.5, top: 31, width: 15, height: 26, rotate: -6, radius: "45% 30% 55% 45%" },
          { left: 53.5, top: 31, width: 15, height: 26, rotate: 6, radius: "30% 45% 45% 55%" },
        ],
      };
    case "midback":
      return {
        view: "back",
        overlays: [
          { left: 39, top: 23.5, width: 22, height: 21, radius: "42%" },
        ],
      };
    case "legs":
      return {
        view: "front",
        overlays: [
          { left: 35, top: 61, width: 13.5, height: 29, rotate: 2, radius: "45%" },
          { left: 51.5, top: 61, width: 13.5, height: 29, rotate: -2, radius: "45%" },
        ],
      };
    default:
      return { view: "front", overlays: [] };
  }
}

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
  const config = getAnatomyOverlays(area);
  const large = size === "lg";

  return (
    <figure
      className={`relative shrink-0 overflow-hidden ${
        large
          ? "h-[176px] w-[126px] rounded-[28px] bg-gradient-to-b from-slate-50 to-white"
          : "h-[72px] w-[52px] rounded-2xl bg-slate-50"
      }`}
      aria-label={`${exercise.name}で主に鍛える部位`}
    >
      <img
        src={config.view === "back" ? ANATOMY_BACK_URL : ANATOMY_FRONT_URL}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full select-none object-contain object-top opacity-[0.42] grayscale saturate-0"
        style={{ filter: "grayscale(1) saturate(0) contrast(.82) brightness(1.18)" }}
      />

      {config.overlays.map((overlay, index) => (
        <span
          key={`${area}-${index}`}
          className="absolute bg-sky-500/80 shadow-[0_0_18px_rgba(14,165,233,.22)] mix-blend-multiply"
          style={{
            left: `${overlay.left}%`,
            top: `${overlay.top}%`,
            width: `${overlay.width}%`,
            height: `${overlay.height}%`,
            transform: `rotate(${overlay.rotate ?? 0}deg)`,
            borderRadius: overlay.radius ?? "45%",
          }}
        />
      ))}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white via-white/80 to-transparent" />
    </figure>
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
  const [openExerciseKey, setOpenExerciseKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [selectedExerciseKey, setSelectedExerciseKey] = useState<string | null>(null);
  const [detailEditMode, setDetailEditMode] = useState(false);
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

  // Chrome/Google Translateによるブランド名・種目名の意図しない翻訳を抑止。
  useEffect(() => {
    document.documentElement.lang = "ja";
    document.documentElement.setAttribute("translate", "no");

    let meta = document.querySelector('meta[name="google"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "google";
      document.head.appendChild(meta);
    }
    meta.content = "notranslate";

    return () => {
      if (created && meta?.parentNode) {
        meta.parentNode.removeChild(meta);
      }
    };
  }, []);

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
    setOpenExerciseKey(null);
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
    setSelectedExerciseKey(key);
    setDetailEditMode(true);
    setViewMode("exercise");
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

    if (selectedExerciseKey === exerciseKey) {
      setSelectedExerciseKey(null);
      setDetailEditMode(false);
      setViewMode("training");
    }
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
    setOpenExerciseKey(null);
    setSelectedExerciseKey(null);
    setDetailEditMode(false);
    setViewMode("home");

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
    setOpenExerciseKey(null);
    setSelectedExerciseKey(null);
    setDetailEditMode(false);
    setViewMode("home");
    setCelebration(null);
  };

  if (!loaded) {
    return (
      <div
        translate="no"
        className="notranslate min-h-screen bg-[#f4f6f8] flex items-center justify-center text-slate-500"
      >
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

  const standardVisibleExercises = visibleExercises.filter(
    ({ exercise }) => exercise.isBase
  );

  const selectedEntry =
    selectedExerciseKey === null
      ? null
      : exercises
          .map((exercise, originalIndex) => ({ exercise, originalIndex }))
          .find(({ exercise }) => exercise.key === selectedExerciseKey) ?? null;

  const openExerciseDetail = (exerciseKey: string) => {
    setSelectedExerciseKey(exerciseKey);
    setDetailEditMode(false);
    setViewMode("exercise");
  };

  const startTraining = () => {
    setOpenExerciseKey(visibleExercises[0]?.exercise.key ?? null);
    setSelectedExerciseKey(null);
    setDetailEditMode(false);
    setViewMode("training");
  };

  const appShell =
    "min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f4f7fa_38%,_#eef2f6_100%)] text-slate-900 notranslate selection:bg-sky-100";
  const pageWidth = "mx-auto w-full max-w-md";
  const card =
    "rounded-[28px] border border-white/80 bg-white/95 shadow-[0_18px_50px_rgba(15,23,42,0.075)] backdrop-blur";

  const BrandHeader = ({ compact = false }: { compact?: boolean }) => (
    <header
      className={`${card} flex items-center justify-between ${
        compact ? "px-4 py-3" : "px-5 py-[18px]"
      }`}
    >
      <div className="text-slate-800">
        <ForgeLogo compact={compact} />
      </div>
      <details className="relative">
        <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-600">
          ⋯
        </summary>
        <div className="absolute right-0 z-[80] mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <button
            onClick={exportJSON}
            className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50"
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
          <div className="mt-2 border-t border-slate-100 px-3 pt-3 text-[10px] leading-4 text-slate-400">
            Anatomy artwork: Termininja / Wikimedia Commons / CC BY-SA 3.0
          </div>
        </div>
      </details>
    </header>
  );

  const TopBar = ({
    titleText,
    onBack,
  }: {
    titleText: string;
    onBack: () => void;
  }) => (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className={`${pageWidth} flex h-16 items-center justify-between px-4`}>
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 active:bg-slate-100"
          aria-label="戻る"
        >
          ‹
        </button>
        <div className="text-base font-semibold tracking-wide text-slate-900">
          {titleText}
        </div>
        <button
          onClick={() => setViewMode("home")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-400 active:bg-slate-100"
          aria-label="ホーム"
        >
          ···
        </button>
      </div>
    </header>
  );

  const BottomXPBar = () => (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-700/30 bg-[#172238]/[0.97] px-4 py-3 text-white shadow-[0_-10px_30px_rgba(15,23,42,0.18)] backdrop-blur">
      <div className={`${pageWidth} flex items-center gap-3`}>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            TODAY'S XP
          </div>
          <div className="mt-0.5 flex items-baseline gap-3">
            <span className="text-xl font-semibold">{pretty(calc.finalXP)} XP</span>
            <span className="text-[11px] text-slate-400">
              筋トレ {pretty(calc.strengthXP)} / ラン {pretty(calc.runXP)}
            </span>
          </div>
        </div>
        <button
          onClick={commitToday}
          className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-sky-950/20 active:scale-[0.98]"
        >
          保存 →
        </button>
      </div>
    </div>
  );

  let screen: JSX.Element;

  if (viewMode === "home") {
    screen = (
      <div className={`${appShell} px-3 pb-8 pt-3`}>
        <div className={`${pageWidth} space-y-3`}>
          <BrandHeader />

          <section className={`${card} p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
                  TOTAL EXPERIENCE
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-slate-950">
                    {pretty(totalXP)}
                  </span>
                  <span className="pb-1 text-lg font-semibold text-slate-500">XP</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
                  LEVEL
                </div>
                <div className="mt-1 text-[34px] font-semibold leading-none text-slate-950">
                  Lv {lv.level}
                </div>
                <div className="mt-2 max-w-[140px] truncate text-xs text-slate-500">
                  {title}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>次のレベルまで {pretty(Math.max(0, lv.toNext - lv.into))} XP</span>
                <span>Lv {Math.min(lv.level + 1, LEVEL_NEEDS.length + 1)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <button
              onClick={() => lastPattern && selectPattern(lastPattern)}
              className={`${card} p-4 text-left active:scale-[0.99]`}
            >
              <div className="text-[11px] font-semibold text-slate-400">
                前回のトレーニング
              </div>
              <div className="mt-1 text-base font-semibold">
                {lastPattern ? `${lastPattern}メニュー` : "記録なし"}
              </div>
            </button>
            <button
              onClick={() => selectPattern(recommendedPattern)}
              className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-4 text-left shadow-[0_12px_32px_rgba(15,23,42,0.05)] active:scale-[0.99]"
            >
              <div className="text-[11px] font-semibold text-sky-500">
                あなたへのおすすめ
              </div>
              <div className="mt-1 text-base font-semibold">
                {recommendedPattern}メニュー
              </div>
            </button>
          </section>

          <section className={`${card} p-5`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">本日のメニュー</h2>
                <input
                  type="date"
                  value={todayDate}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => handleDateChange(event.target.value)}
                  className="mt-2 border-0 bg-transparent p-0 text-xs text-slate-400 outline-none"
                />
              </div>
              <div className="max-w-[48%] text-right text-xs leading-5 text-slate-500">
                “{motivationPhrase}”
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["A", "B"] as WorkoutPattern[]).map((pattern) => {
                const selected = currentPattern === pattern;
                return (
                  <button
                    key={pattern}
                    onClick={() => selectPattern(pattern)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-[#1f2d43] bg-[#1f2d43] text-white shadow-lg shadow-slate-300/40"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="text-base font-semibold">{pattern}メニュー</div>
                    <div
                      className={`mt-1 text-[11px] ${
                        selected ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {pattern === "A" ? "胸・肩・腕" : "背中・腕・体幹・脚"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[22px] bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">
                  {currentPattern}メニューの種目
                </div>
                <div className="text-[10px] font-semibold tracking-[0.16em] text-slate-300">
                  TODAY'S PLAN
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {standardVisibleExercises.map(({ exercise }, index) => (
                  <button
                    key={exercise.key}
                    onClick={() => openExerciseDetail(exercise.key)}
                    className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left active:bg-white"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-[10px] font-semibold text-white shadow-sm shadow-sky-200">
                      {index + 1}
                    </span>
                    <span className="truncate text-[13px] font-medium text-slate-700">
                      {exercise.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">今日の進捗</span>
                <span className="font-semibold text-slate-600">
                  {completedBaseExercises}/{currentBaseExercises.length}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${workoutProgress}%` }}
                />
              </div>
            </div>

            <button
              onClick={startTraining}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/15 active:scale-[0.99]"
            >
              トレーニング開始 →
            </button>
          </section>

          <details className={`${card} p-4`}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
              最近のセッション
            </summary>
            <div className="mt-3 space-y-2">
              {notes.slice(0, 6).map((note, index) => (
                <div
                  key={`${note.date}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div className="text-xs text-slate-500">
                    {note.date}
                    {note.pattern ? ` ・ ${note.pattern}メニュー` : ""}
                  </div>
                  <div className="text-sm font-semibold">+{pretty(note.xp)} XP</div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-xs text-slate-400">まだ記録がありません</div>
              )}
            </div>
          </details>
        </div>
      </div>
    );
  } else if (viewMode === "training") {
    screen = (
      <div className={`${appShell} pb-28`}>
        <TopBar titleText={`${currentPattern}メニュー`} onBack={() => setViewMode("home")} />

        <main className={`${pageWidth} px-3 py-4`}>
          <section className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {currentPattern === "A" ? "胸・肩・腕" : "背中・腕・体幹・脚"}を鍛えるメニュー
              </div>
              <div className="text-lg font-semibold text-slate-800">
                <span className="text-sky-500">{completedBaseExercises}</span>
                <span className="text-slate-400"> / </span>
                {currentBaseExercises.length} 種目完了
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${workoutProgress}%` }}
              />
            </div>
          </section>

          <section className="space-y-3">
            {visibleExercises.map(({ exercise, originalIndex }, visualIndex) => {
              const isOpen = openExerciseKey === exercise.key;
              const doneSets = exercise.sets.filter((set) => set.done).length;
              const firstSet = exercise.sets[0];

              return (
                <article
                  key={exercise.key}
                  className={`${card} overflow-hidden transition-shadow duration-200 ${isOpen ? "shadow-[0_20px_55px_rgba(15,23,42,0.10)]" : ""}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <button
                      onClick={() =>
                        setOpenExerciseKey((prev) =>
                          prev === exercise.key ? null : exercise.key
                        )
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        doneSets > 0
                          ? "bg-emerald-500 text-white"
                          : exercise.isBase
                          ? "bg-sky-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {doneSets === exercise.sets.length && doneSets > 0
                        ? "✓"
                        : exercise.isBase
                        ? visualIndex + 1
                        : "+"}
                    </button>

                    <button
                      onClick={() => openExerciseDetail(exercise.key)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <MuscleMap exercise={exercise} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold text-slate-900">
                          {exercise.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-400">
                          前回{" "}
                          {firstSet
                            ? `${firstSet.weight}kg × ${firstSet.reps} × ${exercise.sets.length}`
                            : "—"}
                        </span>
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        setOpenExerciseKey((prev) =>
                          prev === exercise.key ? null : exercise.key
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-300"
                    >
                      {isOpen ? "⌃" : "›"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/75 to-white px-3 pb-3 pt-2.5">
                      <div className="space-y-1.5">
                        {exercise.sets.map((set, setIndex) => (
                          <div
                            key={`${exercise.key}-${setIndex}`}
                            className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 rounded-xl px-3 py-2.5 even:bg-slate-50/80"
                          >
                            <div className="text-xs font-medium text-slate-500">
                              Set {setIndex + 1}
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              {set.weight}kg
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              {set.reps}回
                            </div>
                            <button
                              onClick={() => toggleSetDone(originalIndex, setIndex)}
                              className="rounded-full"
                            >
                              <SetStatusIcon done={set.done} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => openExerciseDetail(exercise.key)}
                          className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-600"
                        >
                          ▶ 参考動画
                        </button>
                        <div className="min-w-0 flex-1 truncate text-right text-[11px] text-slate-400">
                          {exercise.lastFormMemo
                            ? `前回メモ：${exercise.lastFormMemo}`
                            : "前回メモ：なし"}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={addExtraExercise}
              className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-500"
            >
              ＋自由種目を追加
            </button>
            <div className={`${card} flex items-center gap-2 px-3 py-2`}>
              <span className="text-xs font-semibold text-slate-500">ラン</span>
              <input
                type="number"
                value={runMeters}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateRunMeters(Number(event.target.value || 0))
                }
                className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none"
              />
              <span className="text-[10px] text-slate-400">m</span>
            </div>
          </div>
        </main>

        <BottomXPBar />
      </div>
    );
  } else if (selectedEntry) {
    const { exercise, originalIndex } = selectedEntry;
    const firstSet = exercise.sets[0];

    screen = (
      <div className={`${appShell} pb-28`}>
        <TopBar
          titleText=""
          onBack={() => {
            setDetailEditMode(false);
            setViewMode("training");
          }}
        />

        <main className={`${pageWidth} px-3 pb-8 pt-3`}>
          <section className={`${card} overflow-hidden p-6`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {exercise.isBase ? (
                  <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-slate-950">
                    {exercise.name}
                  </h1>
                ) : (
                  <input
                    value={exercise.name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateExerciseName(originalIndex, event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xl font-semibold outline-none focus:border-sky-400"
                  />
                )}
                <div className="mt-1 text-xs font-medium text-slate-400">
                  {exercise.pattern}メニュー
                </div>
              </div>
              <MuscleMap exercise={exercise} size="lg" />
            </div>

            <div className="mt-5 rounded-[22px] bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
              <div className="text-[11px] font-semibold text-slate-400">
                前回の記録
              </div>
              <div className="mt-1 text-xl font-semibold">
                {firstSet
                  ? `${firstSet.weight}kg × ${firstSet.reps} × ${exercise.sets.length}`
                  : "—"}
              </div>
            </div>
          </section>

          <section className={`${card} mt-3 p-4`}>
            <h2 className="text-base font-semibold">セットを記録</h2>

            <div className="mt-3 space-y-2">
              {exercise.sets.map((set, setIndex) => (
                <div
                  key={`${exercise.key}-${setIndex}`}
                  className="grid grid-cols-[50px_1fr_1fr_auto] items-center gap-2"
                >
                  <div className="text-sm font-medium">Set {setIndex + 1}</div>
                  <div className="relative">
                    <input
                      type="number"
                      value={set.weight}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSetField(
                          originalIndex,
                          setIndex,
                          "weight",
                          Number(event.target.value || 0)
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-right font-semibold outline-none focus:border-sky-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      kg
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSetField(
                          originalIndex,
                          setIndex,
                          "reps",
                          Number(event.target.value || 0)
                        )
                      }
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 pr-7 text-right font-semibold outline-none focus:border-sky-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      回
                    </span>
                  </div>
                  <button
                    onClick={() => toggleSetDone(originalIndex, setIndex)}
                    className="rounded-full"
                  >
                    <SetStatusIcon done={set.done} />
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
          </section>

          <section className={`${card} mt-3 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">フォーム参考動画</h2>
              <button
                onClick={() => setDetailEditMode((prev) => !prev)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              >
                {detailEditMode ? "編集を閉じる" : "編集"}
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-[22px] border border-slate-100 bg-slate-50/50">
              {exercise.formVideos.length === 0 ? (
                <div className="px-4 py-4 text-xs text-slate-400">
                  参考動画はまだ登録されていません。
                </div>
              ) : (
                exercise.formVideos.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => openFormVideo(video)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left active:bg-sky-50 ${
                      index > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-white text-sky-500 shadow-inner ring-1 ring-slate-100">
                      ▶
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {video.title || `参考動画 ${index + 1}`}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {formatStartTime(video.startSeconds)}
                      </span>
                    </span>
                    <span className="text-slate-300">›</span>
                  </button>
                ))
              )}
            </div>

            {detailEditMode && (
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-3">
                {exercise.formVideos.map((video, videoIndex) => (
                  <div
                    key={`edit-${video.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex gap-2">
                      <input
                        value={video.title}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateFormVideo(originalIndex, video.id, {
                            title: event.target.value,
                          })
                        }
                        placeholder="動画名"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                      />
                      <button
                        onClick={() =>
                          moveFormVideo(originalIndex, video.id, -1)
                        }
                        disabled={videoIndex === 0}
                        className="rounded-lg bg-slate-100 px-2 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() =>
                          moveFormVideo(originalIndex, video.id, 1)
                        }
                        disabled={
                          videoIndex === exercise.formVideos.length - 1
                        }
                        className="rounded-lg bg-slate-100 px-2 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                    <input
                      value={video.url}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateFormVideo(originalIndex, video.id, {
                          url: event.target.value,
                        })
                      }
                      placeholder="YouTube URL"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400">開始</span>
                      <input
                        type="number"
                        min="0"
                        value={Math.floor(video.startSeconds / 60)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
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
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
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
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() =>
                          removeFormVideo(originalIndex, video.id)
                        }
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => addFormVideo(originalIndex)}
                  className="rounded-xl bg-[#1f2d43] px-3 py-2 text-xs font-semibold text-white"
                >
                  ＋参考動画を追加
                </button>

                {!exercise.isBase && (
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
                    <select
                      value={exercise.pattern}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
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
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                    >
                      種目を削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`${card} mt-3 p-4`}>
            <div className="text-sm font-semibold">前回メモ</div>
            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
              {exercise.lastFormMemo || "まだメモはありません"}
            </div>
            <textarea
              value={exercise.formMemoDraft}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateFormMemoDraft(originalIndex, event.target.value)
              }
              placeholder="今日気づいたフォームのポイント"
              rows={2}
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
          </section>
        </main>

        <BottomXPBar />
      </div>
    );
  } else {
    screen = (
      <div className={`${appShell} flex items-center justify-center p-6`}>
        <button
          onClick={() => setViewMode("training")}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
        >
          トレーニング画面へ戻る
        </button>
      </div>
    );
  }

  return (
    <div translate="no" className="notranslate">
      {screen}

      {celebration && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setCelebration(null)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
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
                {
                  MOTIVATION_PHRASES[
                    (notes.length + 1) % MOTIVATION_PHRASES.length
                  ]
                }
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
