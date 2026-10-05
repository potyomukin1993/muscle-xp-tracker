import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";

/** ========= 型 ========= */
type WorkoutPattern = "A" | "B";
タイプ ViewMode = "home" | "training" | "exercise" | "history" | "stats" | "settings";

type SetEntry = {
  重量: 数値;
  反復回数：回数
  完了: ブール値;
};

type PreviousSetEntry = {
  重量: 数値;
  反復回数：回数
};

type FormVideo = {
  id: 文字列;
  タイトル: 文字列;
  URL: 文字列;
  開始秒数: 数値;
};

type ExerciseTemplate = {
  キー: 文字列;
  名前: 文字列;
  isBase: ブール値;
  パターン: ワークアウトパターン;
  セット: SetEntry[];
  lastSessionSets: PreviousSetEntry[];
  formVideos: FormVideo[];
  lastFormMemo: 文字列;
  formMemoDraft: 文字列;
};

タイプノート = {
  日付: 文字列;
  xp: 数値;
  メモ: 文字列;
  パターン？：ワークアウトパターン;
};

タイプ SavedState = {
  バージョン: 7;
  合計XP：数値;
  注記: 注記[];
  今日の日付: 文字列;
  練習問題: ExerciseTemplate[];
  ランメーター：数値;
  currentPattern: ワークアウトパターン;
  lastPattern: WorkoutPattern | null;
};

type LegacyFormCheck = {
  id?: 文字列;
  ラベル?: 文字列;
  チェック済みか？：ブール値；
};

type LegacyExercise = {
  key?: 文字列;
  名前?: 文字列;
  isBase?: ブール値;
  パターン？：ワークアウトパターン;
  セット?: SetEntry[];
  lastSessionSets?: PreviousSetEntry[];
  formChecks?: LegacyFormCheck[];
  formVideos?: FormVideo[];
  lastFormMemo?: string;
  formMemoDraft?: string;
};

タイプ LegacySavedState = {
  バージョン？：番号
  totalXP?: 数値;
  注釈?: 注釈[];
  todayDate?: string;
  練習問題？：LegacyExercise[];
  ランメーター？：数値;
  currentPattern?: ワークアウトパターン;
  lastPattern?: WorkoutPattern | null;
};

/** ========= 日付 ========= */
function getTodayJST() {
  return new Intl.DateTimeFormat("sv-SE", {
    タイムゾーン: "アジア/東京"
    年: "数値"、
    月: "2桁"、
    日: "2桁"、
  }).format(new Date());
}

/** ========= 定数 ========= */
const LS_KEY = "xp_tracker_full_v7";
const LEGACY_LS_KEYS = ["xp_tracker_full_v6", "xp_tracker_full_v5", "xp_tracker_full_v4"];
const INITIAL_TOTAL_XP = 902_277;

// 2蟷江縺§Lv50諠述螳壹き繝ｼ繝。
function buildLevelNeeds(start = 1200, growth = 1.11, levels = 50) {
  const arr: number[] = [];
  let need = start;
  for (let i = 0; i < levels - 1; i++) {
    arr.push(Math.round(need));
    必要性 *=成長;
  }
  return arr;
}

const LEVEL_NEEDS = buildLevelNeeds();

const TITLES = [
  "遲九ヨ繝拉攻撃狗偵＞","蛻晉エ壹�繝キュー繝う繝ぅ鬟イ縺ソ","霑ｽ縺�ｾ"、"、"、"、"、"、
  "繝ｫ繝シ繝ぅ繝ぅ螳郁恵キ閠","確保余裕倬ｫ倥＞その繝槭ャ繧議繝ｫ","繧ｸ繝�縺®菴丈ｺｺｺ","荳願�莠碁�遲九�隱槭j驛®","遲玖i逞帙�陌�",
  "驛良く菴榊�蜑イ縺®莨晞＃閠�","霑ｽ縺�セスシ縺ソ縺リオ豎る％閠�","繧､繝ぅ繧ッ繝ｩ"","繝か輔繝ｼ繝�隴ｦ蟇�","遲玖ぇ螟法縺リオ先に「豎り€�",
  "繧セス繝医Μ繧アッサー医雉「閠」」、"繝懊ショ繧"繝｡繧､繧ッ縺®髱ｩ蜻蜈 �","貂幃㍼譛溘�鬯ｼ","邂｡逅�ｺｺｺ","蠅鈴㍼譛溘�蛹冶ｺｫ",
  "鬮倥ち繝ぅ繝代け縺リオ莨晞％蟶ｫ","鬲碑｡灘crｫ","骭しゃ驥題｡灘ｸｫ","繝帙お繧､逡後�蟇ｩ譟蜩｡","遲玖i縺®蜩イ蟄ｦ閠�",
  "繝輔か繝ｼ繝�骭シャー謌舌�驕比ｺｺｺ","辷�ｼｸ縺ｳ縺®譌�ｺｺｺ","繝代Φ繝励�蜿沙蝟壼”ｫ","そのような状況","そのような状況",
  "蜿蜍募集中沺縺®蜷滄♀隧ｩ莠ｺ"、"蜉ケス九○縺®蜷溷袖閠"、"サザサヨ髢薙"閠�","遲狗ｷ夂ｶｳ縺®謾ｯ驟崎€�","鬮伜ｯｺｦ繝懊ｵ繧"縺®骭謌占€�",
  "繝槭す繝ぅ謾ｯ驟阪「飛行」"、"骰幃軒縺®豎る％閠"、"繝car繝��縺®鬲碑｡灘九ｫ","遲玖i讒狗アッ峨蟒述今後牙"ｫ","驥咲㍼縺良く縺®蟇セス隧ジア閠�",
  "髯千楓遯∫�エ縺®謌ｦ螢ｫ","驩�→豎励�鬆占€閠�","繧ｦ繧§繧､繝医� 雉「閠�","繝医Ξ繝ｼ繝九Φ繧ー縺®蟾®莠ｺ","閧我ス捺隼騾�縺®莨晁™",
  "遲句鴨縺®螳イクイクキ閠�","骰幃軒逡後�髱ｩ蜻ｽ蜈�","謌宣聞險倬恐怖縺®莨晞％蟶ｫ"、"ソソ繝ヨ蝗樊焚縺リオ目撃"、"遲句ｸ晉視"
];

const pretty = (n: number) => n.toLocaleString();

関数 formatPreviousSets(
  セット: PreviousSetEntry[]、
  コンパクト = false
) {
  if (sets.length === 0) return "窶�";

  const first = sets[0];
  const allSame = sets.every(
    (セット) => set.weight === first.weight && set.reps === first.reps
  );

  if (allSame) {
    return `${first.weight}kg ÷ ${first.reps} ÷ ${sets.length}`;
  }

  if (compact) {
    const sameReps = sets.every((set) => set.reps === first.reps);
    if (sameReps) {
      return `${sets.map((set) => set.weight).join("竊�")}kg 決定 ${first.reps}蝗杼;
    }

    戻り値セット
      .map((set) => `${set.weight}から${set.reps}`)
      .join(" 竊� ");
  }

  戻り値セット
    .map((set) => `${set.weight}kg ÷ ${set.reps}`)
    .join(" 竊� ");
}

function computeLevel(totalXP: number) {
  let lvl = 1;
  let rest = totalXP;

  for (let i = 0; i < LEVEL_NEEDS.length; i++) {
    const need = LEVEL_NEEDS[i];
    if (rest >= need) {
      休息 -= 必要;
      レベル++;
    } それ以外 {
      return { level: lvl, into: rest, toNext: need };
    }
  }

  return { level: LEVEL_NEEDS.length + 1, into: 0, toNext: 0 };
}

function isPattern(value: unknown): value is WorkoutPattern {
  戻り値 === "A" || 値 === "B";
}

function oppositePattern(pattern: WorkoutPattern): WorkoutPattern {
  パターン === "A" ? "B" : "A" を返す。
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** ========= 初期演習 ========= */
function createInitialExercises(): ExerciseTemplate[] {
  戻る [
    {
      キー:「胸」
      名前: "繝√ォ繧ケット繝医",
      isBase: true、
      パターン: "A"、
      セット: [
        { 重量: 50、回数: 10、完了: false }、
        { 重量: 50、回数: 10、完了: false }、
        { 重量: 50、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キー:「飛ぶ」
      名前: "繝壹ャ繧アッ繝輔Λ繧",
      isBase: true、
      パターン: "A"、
      セット: [
        { 重量: 32、回数: 10、完了: false }、
        { 重量: 32、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キーワード:「上腕三頭筋」
      名前: "医師Λ繧、その",
      isBase: true、
      パターン: "A"、
      セット: [
        { 重量: 23、回数: 10、完了: false }、
        { 重量: 23、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [
        {
          id: "triceps_reference_1",
          タイトル: "繧™繝ｼ繝舌",
          URL: "https://youtube.com/shorts/Auf16cO1Zg8",
          開始秒数: 0、
        },
      ],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キー: "side_raise",
      名前: "繧オ繧､繝峨Ξ繧､繧ｺ",
      isBase: true、
      パターン: "A"、
      セット: [
        { 重量: 10、回数: 10、完了: false }、
        { 重量: 10、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キー: "lat"、
      名前: "繝ｩ繝�ヨ繝励Ν繝€繧ｦ繝ｳ",
      isBase: true、
      パターン: "B"、
      セット: [
        { 重量: 59、回数: 10、完了: false }、
        { 重量: 59、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キー: "行",
      名前: "繧キ繝ｼ繝�ya繝峨Ο繝ｼ",
      isBase: true、
      パターン: "B"、
      セット: [
        { 重量: 52、回数: 10、完了: false }、
        { 重量: 52、回数: 10、完了: false }、
        { 重量: 52、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キー: "curl"、
      名前: "繝ｼ繝�繧ｫ繝ｼ繝ｫ",
      isBase: true、
      パターン: "B"、
      セット: [
        { 重量: 36、回数: 10、完了: false }、
        { 重量: 36、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キーワード:「クランチ」
      名前: "繝悶ラ繝溘リ繝ｫ繧アッ繝ｩ繝ｳ繝"、
      isBase: true、
      パターン: "B"、
      セット: [
        { 重量: 59、回数: 15、完了: false }、
        { 重量: 59、回数: 15、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
    {
      キーワード: 「レッグプレス」
      名前: "繝カー繝ゲ繝励Ξ繧",
      isBase: true、
      パターン: "B"、
      セット: [
        { 重量: 93、回数: 10、完了: false }、
        { 重量: 93、回数: 10、完了: false }、
      ],
      lastSessionSets: [],
      formVideos: [],
      lastFormMemo: "",
      formMemoDraft: "",
    },
  ];
}

/** ========= 移行 / 正規化 ========= */
function normalizeSets(raw: unknown, fallback: SetEntry[]): SetEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;

  return raw.map((item) => {
    const set = item as Partial<SetEntry>;
    戻る {
      重み: 数値(set.weight) || 0,
      繰り返し回数: Number(set.reps) || 0,
      完了: Boolean(set.done)
    };
  });
}

function normalizePreviousSets(
  生: 不明、
  フォールバック: PreviousSetEntry[] = []
): PreviousSetEntry[] {
  if (!Array.isArray(raw)) return fallback;

  生データを返す
    .map((item) => {
      const set = item as Partial<PreviousSetEntry>;
      戻る {
        重み: Math.max(0, Number(set.weight) || 0),
        繰り返し回数: Math.max(0, Number(set.reps) || 0),
      };
    })
    .filter((set) => set.weight > 0 || set.reps > 0);
}

function toPreviousSets(raw: unknown): PreviousSetEntry[] {
  if (!Array.isArray(raw)) return [];

  生データを返す
    .map((item) => {
      const set = item as Partial<SetEntry>;
      戻る {
        重み: Math.max(0, Number(set.weight) || 0),
        繰り返し回数: Math.max(0, Number(set.reps) || 0),
      };
    })
    .filter((set) => set.weight > 0 || set.reps > 0);
}

function normalizeVideos(raw: unknown, fallback: FormVideo[] = []): FormVideo[] {
  if (!Array.isArray(raw)) return fallback;

  生データを返す
    .map((item, index) => {
      const video = item as Partial<FormVideo>;
      戻る {
        id: typeof video.id === "string" && video.id ? video.id : `video_${index + 1}`,
        タイトル：
          typeof video.title === "string" && video.title.trim()
            ?ビデオタイトル
            : `蜿り€��虚その ${index + 1}`,
        url: typeof video.url === "string" ? video.url : "",
        startSeconds: Math.max(0, Math.floor(Number(video.startSeconds) || 0)),
      };
    })
    .filter((video) => video.url.trim() !== "" || video.title.trim() !== "");
}

const DEPRECATED_STANDARD_KEYS = new Set(["shoulder", "hammer", "legext"]);
const DEPRECATED_STANDARD_NAMES = new Set([
  "繧キ繝アァ繝ｫ繝€繝ｼ繝励Ξ繧",
  "繝上Φ繝槭�繧ｫ繝ｼ繝ｫ",
  "シャア繝ゲ繧修正繧アッケケ繝Φ繧キ繝§",
]);

function migrateExercises(rawExercises: LegacyExercise[] | undefined): ExerciseTemplate[] {
  const defaults = createInitialExercises();
  const source = Array.isArray(rawExercises) ? rawExercises : [];
  const matchedIndexes = new Set<number>();

  const migratedDefaults = defaults.map((defaultExercise) => {
    // 縺セス縺壼®牙®壹＠縺殘ey縺§辣§蜷医＠縲∵眠飛行乗良呎ｺ也®®逶®縺™縺ｩkey縺御ｸ€表示エ縺励↑縺��エ蜷医�縺ソ
    // 蜷悟平面縺®譌ァ繝その瞬間™™応答霑スピード霉�遞®逶リオン繧貞淑″邯吶＄縲ゅ％繧後↓繧医j繧繧､繝峨Ξ繧､繧会話。
    // 莉･蜑阪€ゴス蜉�遞®逶®縲阪→縺励※逋その骭イ縺励※縺�◆蝣エ蜷医ブ驥埼㍼その蜍慕判繝｡繝「繧堤ガセ謖√〒縺阪ｋ縲。」
    let sourceIndex = source.findIndex(
      （練習問題、索引）=>
        !matchedIndexes.has(index) && exercise.key === defaultExercise.key
    );

    if (sourceIndex < 0) {
      sourceIndex = source.findIndex(
        （練習問題、索引）=>
          !matchedIndexes.has(index) && exercise.name === defaultExercise.name
      );
    }

    if (sourceIndex < 0) return defaultExercise;

    matchedIndexes.add(sourceIndex);
    const old = source[sourceIndex];

    const normalizedSets = normalizeSets(old.sets, defaultExercise.sets);
    const migratedPreviousSets = Array.isArray(old.lastSessionSets)
      ? normalizePreviousSets(old.lastSessionSets)
      : toPreviousSets(old.sets);

    戻る {
      ...defaultExercise、
      // 讓呎ｺ也承認®®逶®縺appv7縺§螳夂ｾｩ縺励◆蜷咲ã ®ã ®A/B謇€螻槭r蜆™™蜈医@縲。
      // 譌「蟄倥」驥咲㍼その蝗樊繝その蜍慕判繝サ繝。
      セット: 正規化セット、
      // v11莉･蜑阪�蜑榊屓繧其繝�ヨ縺®迢遶倶晏倥’縺™縺九▲縺溘◆繧√€�
      //蛻晏屓遘其陦梧凾縺®縺斯迴承認菫晏倥＆繧後※縺�ｋ繧その繝�ヨ讒区繧貞燕蝗櫁権利倬幻縺良く縺励※見る。
      lastSessionSets: migratedPreviousSets、
      formVideos: normalizeVideos(old.formVideos, defaultExercise.formVideos),
      最後のフォームメモ:
        old.lastFormMemo のタイプ === "文字列" ? old.lastFormMemo : "",
      フォームメモ下書き:
        old.formMemoDraft のタイプ === "文字列" ? old.formMemoDraft : "",
    };
  });

  const extras = source
    .map((exercise, index) => ({ exercise, index }))
    .filter(({ exercise, index }) => {
      if (matchedIndexes.has(index)) return false;

      const key = typeof exercise.key === "string" ? exercise.key : "";
      const name = typeof exercise.name === "string" ? exercise.name : "";

      // v6莉･蜑阪�讓呎ｺ悶Γ繝九Η繝ｼ縺九ｉ螟悶l縺溽®®逶®縺アッ縲√i繝��繝��繝域凾縺ｫ表示™蜍募集炎髯､縺吶ｋ縲。
      // 繝ｦ繝ｼ繧ｶ繝ｼ縺後€鯉ｼ玖ｽ蜉�遞®逶®縲阪〒菴懊▲縺溯�逕ｱ遞®逶®縺昴�縺精縺精肯謖√☆繧九€。
      if (DEPRECATED_STANDARD_KEYS.has(key)) return false;
      if (DEPRECATED_STANDARD_NAMES.has(name) && exercise.isBase !== false) return false;

      trueを返します。
    })
    .map(({ exercise: old, index }): ExerciseTemplate => ({
      鍵：
        typeof old.key === "string" && old.key
          ? old.key
          : `extra_migrated_${index}`、
      名前：
        typeof old.name === "string" && old.name ? old.name : "霑ｽ蜉�遞®逶®",
      isBase: false、
      パターン: isPattern(old.pattern) ? old.pattern : "B",
      セット: normalizeSets(old.sets, [
        { 重量: 20、回数: 10、完了: false }、
      ]),
      lastSessionSets: Array.isArray(old.lastSessionSets)
        ? normalizePreviousSets(old.lastSessionSets)
        : toPreviousSets(old.sets)、
      formVideos: normalizeVideos(old.formVideos, []),
      最後のフォームメモ:
        old.lastFormMemo のタイプ === "文字列" ? old.lastFormMemo : "",
      フォームメモ下書き:
        old.formMemoDraft のタイプ === "文字列" ? old.formMemoDraft : "",
    }));

  return [...migratedDefaults, ...extras];
}

function normalizeNotes(raw: unknown): Note[] {
  if (!Array.isArray(raw)) return [];

  生データを返す
    .map((item) => {
      const note = item as Partial<Note>;
      戻る {
        date: typeof note.date === "string" ? note.date : getTodayJST(),
        xp: Number(note.xp) || 0,
        メモ: typeof note.memo === "string" ? note.memo : "",
        パターン: isPattern(note.pattern) ? note.pattern : undefined、
      };
    })
    .filter((note) => note.xp !== 0 || note.memo || note.date);
}

function buildStateFromRaw(raw: LegacySavedState | null): SavedState {
  const today = getTodayJST();
  const rawXP = typeof raw?.totalXP === "number" ? raw.totalXP : INITIAL_TOTAL_XP;

  戻る {
    バージョン: 7、
    totalXP: Math.max(INITIAL_TOTAL_XP, rawXP)
    注記: normalizeNotes(raw?.notes)
    今日日付: 今日、
    練習問題: migrateExercises(raw?.exercises)
    runMeters: typeof raw?.runMeters === "number" ? raw.runMeters : 0,
    currentPattern: isPattern(raw?.currentPattern) ? raw.currentPattern : "A",
    最後のパターン:
      raw?.lastPattern === null || isPattern(raw?.lastPattern)
        ? raw.lastPattern ?? null
        : null、
  };
}

function resetAllSessionFields(exercises: ExerciseTemplate[]) {
  return exercises.map((exercise) => ({
    ...エクササイズ、
    セット: exercise.sets.map((set) => ({ ...set, done: false })),
    formMemoDraft: "",
  }));
}

/** ========= ビデオヘルパー ========= */
function clampStartSeconds(value: number) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}


function extractYouTubeId(rawUrl: string) {
  試す {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") ?? "";
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? "";
      }
    }
  } catch {
    戻る "";
  }
  戻る "";
}

function getYouTubeThumbnail(rawUrl: string) {
  const id = extractYouTubeId(rawUrl);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "";
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

  試す {
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
    生データを返す。
  }
}


const MOTIVATION_PHRASES = [
  "遨阪∩荳翫￡縺後€∵�譌･縺®蠑キ縺輔↓縺™繧九€�",
  "譏良く譌･縺リオ聴覚™蛻�ｒ縲�撕縺九↓雜�∴繧九€�",
  "1",
  "邯咏ｶ壹�縲√>縺｡縺ー繧灘ｼｷ縺�燕閭ス縲�",
  "莉頑律縺®1蝗槭′縲∵悴譚･縺®霈™驛キュー繧偵▽縺上ｋ縲�",
  "辟ｦ繧峨★縲∵ユーロ「縺ｾ繧峨★縲∫ｩ阪∩荳翫￡繧九€」,
  "蠑ｷ縺輔�縲∬莉倬音響縺®蜈医↓縺ゅｋ縲�",
  "蟆上＆縺™譖エ譁ー繧偵€∫「ｺ縺九↑謌宣聞縺ｸ縲」、
  "荳∝アッァ縺™1繝﹝��縺後€∬ｺｫ菴薙ｒ螟峨∴繧九€”,
  "遨阪∩驥阪�縺溷�縺�縺代€∬�蛻��蠑キ縺上↑繧九€�",
];

function ForgeLogo({ compact = false }: { compact?: boolean }) {
  戻る （
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
          フォージ
        </div>
        <div className="mt-1 text-[9px] md:text-[10px] uppercase tracking-[0.28em] text-slate-400">
          トレーニングログ
        </div>
      </div>
    </div>
  );
}

タイプ 筋肉領域 =
  | 「胸」
  | 「肩」
  | 「上腕三頭筋」
  | 「上腕二頭筋」
  | 「腹筋」
  | 「広背筋」
  「背中の真ん中」
  | 「脚」
  | 「汎用」

// ウィキメディア コモンズ / 解剖学 / グレイの解剖学
//菴咲スロリ蜷医o縺帙台ｼｼ繧™繝ｼ繝滑舌縺興奮€∝アッセス雎。遲九′螳滄圀縺ｫ逹€濶イ縺輔縺溽判蜒上r遞®逶®縺宜→縺ｫ陦​​権利遉ｺ縺吶ｋ縲。
const MUSCLE_IMAGE_BY_AREA: Record<
  筋肉領域、
  { src: string; objectPosition?: string; scale?: number }
> = {
  胸： {
    src: "/chest-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  肩: {
    src: "/shoulders-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  上腕三頭筋：{
    src: "/triceps-back.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  上腕二頭筋：{
    src: "/biceps-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  腹筋: {
    src: "/abs-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  lats: {
    src: "/lats-back.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  背中の中央部: {
    src: "/midback-back.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  脚: {
    src: "/legs-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
  ジェネリック： {
    src: "/chest-front.png",
    objectPosition: "50% 50%",
    スケール: 1、
  },
};

const EVEREST_ART_URL =
  "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mount%20Everest%20as%20seen%20from%20Drukair2%20PLW%20edit.jpg";


function getMuscleArea(exercise: ExerciseTemplate): MuscleArea {
  const key = exercise.key.toLowerCase();
  const name = exercise.name;

  if (key === "胸" || key === "飛ぶ" || name.includes("繝√ぉ繧セス繝") || name.includes("繝壹ャ繧ッ")) {
    「胸部」を返します。
  }
  if (key === "side_raise" || name.includes("繧オ繧､繝峨Ξ繧､繧ｺ") || name.includes("繝ｩ繝�Λ繝ｫ")) {
    「肩」を返します。
  }
  if (key === "上腕三頭筋" || name.includes("繝医Λ繧､その上腕")) "上腕三頭筋" を返します。
  if (key === "curl" || name.includes("繧ｫ繝ｼ繝ｫ")) return "上腕二頭筋";
  if (key === "クランチ" || name.includes("繧ッ繝ｩ繝ｳ繝") || name.includes("閻魔")) return "abs";
  if (key === "lat" || name.includes("繝ｩ繝�ヨ")) return "lats";
  if (key === "row" || name.includes("繝キュー繝")) return "midback";
  if (key === "legpress" || name.includes("繝亜繝�げ")) return "脚";
  「generic」を返します。
}

function MuscleMap({
  エクササイズ、
  サイズ = "sm",
}: {
  エクササイズ: エクササイズテンプレート;
  サイズ？：「sm」｜「lg」
}) {
  const area = getMuscleArea(exercise);
  const artwork = MUSCLE_IMAGE_BY_AREA[area];
  const large = size === "lg";

  戻る （
    <図>
      className={`relative shrink-0 overflow-hidden ${
        大きい
          ? "h-[170px] w-[132px] rounded-[24px]"
          : "h-[76px] w-[60px] rounded-[18px]"
      }`}
      aria-label={`${exercise.name}縺§荳その縺ｫ骰帙∴繧マスΚ菴港}
    >
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,#fbfdff_0%,#f5f8fb_100%)]" />

      <img
        src={artwork.src}
        alt={`${exercise.name} 縺荳その縺ｫ骰帙∴繧マスΚ菴港}
        ドラッグ可能={false}
        loading={large ? "eager" : "lazy"}
        className="relative z-10 h-full w-full select-none object-contain"
        style={{
          objectPosition: artwork.objectPosition ?? "50% 50%",
          transform: `scale(${artwork.scale ?? 1})`,
        }}
      ＞
    </figure>
  );
}

function SetStatusIcon({ done }: { done: boolean }) {
  完了を返す？（
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
      笨
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-300 bg-white" />
  );
}


function calculateSessionXP(
  練習問題: ExerciseTemplate[]、
  パターン: ワークアウトパターン、
  ランメーター: 数値
) {
  const currentExercises = exercises.filter(
    (エクササイズ) => エクササイズ.パターン === パターン
  );

  const strengthXP = currentExercises.reduce(
    （合計、練習問題）=>
      合計 +
      エクササイズセット
        .filter((set) => set.done)
        .reduce((sub, set) => sub + set.weight * set.reps, 0),
    0
  );

  const performedCount = currentExercises.filter((exercise) =>
    exercise.sets.some((set) => set.done)
  ）。長さ;

  const runXP = Math.max(0, runMeters);
  const finalXP = strengthXP + runXP;

  return { strengthXP, runXP, finalXP, performedCount };
}

/** ========= アプリ ========= */
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
  const [トースト, setToast] = useState<{
    メッセージ: 文字列;
    トーン: "成功" | "エラー" | "情報";
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    タイトル: 文字列;
    メッセージ: 文字列;
    confirmLabel: 文字列;
    トーン: "危険" | "デフォルト";
    onConfirm: () => void;
  } | null>(null);
  const historyReadyRef = useRef(false);
  const [celebration, setCelebration] = useState<{
    xp: 数値;
    oldLevel: 数値;
    新しいレベル: 数値;
  } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const latestStateRef = useRef<SavedState>({
    バージョン: 7、
    合計XP: INITIAL_TOTAL_XP、
    注記: [],
    今日日付: getTodayJST()、
    練習問題: initialExercisesRef.current、
    ランメーター: 0、
    現在のパターン: "A",
    lastPattern: null、
  });

  const writeState = (next: SavedState) => {
    latestStateRef.current = next;
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  const persistNow = (overrides: Partial<SavedState> = {}) => {
    const next: SavedState = {
      ...latestStateRef.current、
      ...オーバーライド、
      バージョン: 7、
    };
    writeState(next);
    次の値を返す。
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

  // PWA/苦痛Λ繧ｦ繧カカリオンソシャクズセキュリティ監視€√i繝励Μ蜀��逕髱「驕ｷ遘其縺良縺励※謇ｱ縺€」
  useEffect(() => {
    if (!loaded || historyReadyRef.current) return;

    historyReadyRef.current = true;
    window.history.replaceState(
      { forgeView: "home", exerciseKey: null },
      「」、
      ウィンドウの位置.href
    );

    const handlePopState = (event: PopStateEvent) => {
      const state = (event.state ?? {}) as {
        forgeView?: ViewMode;
        exerciseKey?: string | null;
      };
      const nextView = state.forgeView ?? "home";
      setViewMode(nextView);
      setSelectedExerciseKey(
        nextView === "exercise" ? state.exerciseKey ?? null : null
      );
      setDetailEditMode(false);
      if (nextView !== "training") {
        setOpenExerciseKey(null);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [トースト]);

  const notify = (
    メッセージ: 文字列、
    トーン: "成功" | "エラー" | "情報" = "情報"
  ) => setToast({ message, tone });

  // PWA / 繝「繝舌う繝ｫ繝悶Λ繧ｦ繧ｶ縺警備蟶ｸ縺ｫ遶アッ譛ｫ蟷�＞縺」縺ア縺↓謠恐れ判縺吶ｋ縲。
  useEffect(() => {
    let viewport = document.querySelector(
      'meta[name="viewport"]'
    ) を HTMLMetaElement として | null;

    if (!viewport) {
      viewport = document.createElement("meta");
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }

    ビューポートコンテンツ =
      "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    html.style.width = "100%";
    html.style.maxWidth = "100%";
    html.style.overflowX = "hidden";

    body.style.margin = "0";
    body.style.width = "100%";
    body.style.maxWidth = "100%";
    body.style.minWidth = "0";
    body.style.overflowX = "hidden";

    if (root) {
      root.style.width = "100%";
      root.style.maxWidth = "100%";
      root.style.minWidth = "0";
      root.style.overflowX = "hidden";
    }
  }, []);

  // Chrome/Google Translate縺ｫ繧医ク繝痛Λ繝ｳ繝牙展望繝その遞®逶リオン蜷阪�諢丞注目縺励↑縺�その險外繧呈椛豁「縲」
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

  // v7 キューセキュリティ霎ｼ縺ｿ縲Ｗ7 後↑縺代l縺ーv6/v5/v4 決定、蜍慕アザ陦後☆繧九€。
  useEffect(() => {
    let raw: LegacySavedState | null = null;

    試す {
      const current = localStorage.getItem(LS_KEY);
      if (current) {
        raw = JSON.parse(current) as LegacySavedState;
      } それ以外 {
        for (const key of LEGACY_LS_KEYS) {
          const legacy = localStorage.getItem(key);
          if (レガシー) {
            raw = JSON.parse(legacy) as LegacySavedState;
            壊す;
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

  // 上からのメッセージを送信後、「オフ」を選択してください。
  // 蠕ｩ蟶ー繝サ蜀崎｡莉遉ｺ譎ゅ�譌･譛譎る俣田縺リオリ律頑固縺ｸ陬懈”縺吶ｋ縲。
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
      } それ以外 {
        saveLatest();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveLatest();
      } それ以外 {
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
    アップデーター: (前: ExerciseTemplate[]) => ExerciseTemplate[]
  ) => {
    const nextExercises = updater(latestStateRef.current.exercises);
    setExercises(nextExercises);
    persistNow({ exercises: nextExercises });
    return nextExercises;
  };

  const visibleExercises = useMemo(
    () =>
      演習
        .map((exercise, originalIndex) => ({ exercise, originalIndex }))
        .filter(({ exercise }) => exercise.pattern === currentPattern),
    [エクササイズ、現在のパターン]
  );

  // XP縺迴ｾ蝨良く驕ｸ謚樔ｸキュ縺®A/B繝｡繝九Η繝ｼ縺�縺代ｒ蟇ｾ雎｡縺ｫ縺吶ｋ縲。
  // 繝輔か繝シ繝蛟咲紫縺アッ蟒「縲ゅΛ繝ぅXP縺アッ蜊倡エ聴覚刈邂励€」
  const calc = useMemo(
    () => calculateSessionXP(exercises, currentPattern, runMeters),
    [運動、現在のパターン、走行距離]
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
  ）。長さ;
  const workoutProgress =
    currentBaseExercises.length === 0
      ？ 0
      : Math.round(
          (完了した基本運動数 / 現在の基本運動数.長さ) * 100
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
    exIdx: 番号、
    setIdx: 数値、
    フィールド: "体重" | "回数"、
    値: 数値
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        インデックス === exIdx
          ？{
              ...エクササイズ、
              セット: exercise.sets.map((set, setIndex) =>
                setIndex === setIdx
                  ? { ...set, [field]: Math.max(0, value) }
                  ： セット
              )
            }
          ： エクササイズ
      ）
    );
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    if ("vibrate" in navigator) navigator.vibrate(12);
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        インデックス === exIdx
          ？{
              ...エクササイズ、
              セット: exercise.sets.map((set, setIndex) =>
                setIndex === setIdx ? { ...セット、完了: !set.done } : セット
              )
            }
          ： エクササイズ
      ）
    );
  };

  const addSet = (exIdx: number) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx) return exercise;

        const last = exercise.sets[exercise.sets.length - 1];
        戻る {
          ...エクササイズ、
          セット: [
            ...エクササイズセット、
            {
              重量: 最後?.重量?? 0、
              回数: 最後?.回数 ?? 10、
              完了: false、
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
      ...前へ、
      {
        鍵、
        名前: "霑半蜉�遞®逶リオン",
        isBase: false、
        パターン: currentPattern、
        セット: [{ 重量: 20、反復回数: 10、完了: false }]、
        lastSessionSets: [],
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
      (エクササイズ) => exercise.key === exerciseKey
    );

    if (!target || target.isBase) return;

    setConfirmAction({
      タイトル: "遞®逶リオン繧貞炎髯､",
      メッセージ: `縲�${target.name}縲阪→縲√そ繝�ヨ繝サ蜍慕判繝ｻ繝｡繝「繧貞炎髯､縺励∪縺吶€Ａ,
      confirmLabel: "蜑企勁縺吶ｋ",
      トーン：「危険」
      onConfirm: () => {
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

        setConfirmAction(null);
        Notice("遞®逶リオン繧貞炎髯､縺励∪縺励◆", "成功");
      },
    });
  };

  const updateExerciseName = (exIdx: number, name: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, name } : exercise
      ）
    );
  };

  const updateExercisePattern = (
    exIdx: 番号、
    パターン: ワークアウトパターン
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, pattern } : exercise
      ）
    );
  };

  const updateFormMemoDraft = (exIdx: number, value: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        index === exIdx ? { ...exercise, formMemoDraft: value } : exercise
      ）
    );
  };

  const addFormVideo = (exIdx: number) => {
    const id = createId("video");
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        インデックス === exIdx
          ？{
              ...エクササイズ、
              formVideos: [
                ...エクササイズフォームビデオ、
                {
                  ID、
                  title: `蜿莉€…虚 ${exercise.formVideos.length + 1}`,
                  URL: "",
                  開始秒数: 0、
                },
              ],
            }
          ： エクササイズ
      ）
    );
  };

  const updateFormVideo = (
    exIdx: 番号、
    videoId: 文字列、
    パッチ: 部分的な<FormVideo>
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        インデックス === exIdx
          ？{
              ...エクササイズ、
              formVideos: exercise.formVideos.map((video) =>
                video.id === videoId
                  ？{
                      ...ビデオ、
                      ...パッチ、
                      開始秒数:
                        patch.startSeconds === undefined
                          ? video.startSeconds
                          : clampStartSeconds(patch.startSeconds)
                    }
                  ： ビデオ
              )
            }
          ： エクササイズ
      ）
    );
  };

  const updateVideoTimePart = (
    exIdx: 番号、
    ビデオ: FormVideo、
    部分:「分」｜「秒」
    値: 数値
  ) => {
    const currentMinutes = Math.floor(video.startSeconds / 60);
    const currentSeconds = video.startSeconds % 60;
    const minutes =
      part === "minutes" ? Math.max(0, Math.floor(value || 0)) : currentMinutes;
    const 秒 =
      部分 === "秒"
        ? Math.min(59, Math.max(0, Math.floor(value || 0)))
        : 現在の秒数;

    updateFormVideo(exIdx, video.id, {
      startSeconds: 分 * 60 + 秒、
    });
  };

  const removeFormVideo = (exIdx: number, videoId: string) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) =>
        インデックス === exIdx
          ？{
              ...エクササイズ、
              formVideos: exercise.formVideos.filter(
                (ビデオ) => video.id !== videoId
              )
            }
          ： エクササイズ
      ）
    );
  };

  const moveFormVideo = (
    exIdx: 番号、
    videoId: 文字列、
    方向: -1 | 1
  ) => {
    updateExercisesAndPersist((prev) =>
      prev.map((exercise, index) => {
        if (index !== exIdx) return exercise;

        const currentIndex = exercise.formVideos.findIndex(
          (ビデオ) => video.id === videoId
        );
        const targetIndex = currentIndex + direction;

        もし （
          currentIndex < 0 ||
          targetIndex < 0 ||
          targetIndex >= exercise.formVideos.length
        ) {
          運動を再開する。
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
      Notice("YouTube URL繧貞�蜉帙＠縺ｦ縺上□縺輔＞", "error");
      戻る;
    }

    // YouTube 縺ｸ驕ｷ遘ｻ縺吶ｋ逶エ蜑阪↓縲∵怙譁ー縺®繝�ヨ繝注目㍼繝その蝗樊焚遲峨ｒ蜷梧悄虏急☆繧九ユーロ。
    localStorage.setItem(LS_KEY, JSON.stringify(latestStateRef.current));

    const targetUrl = buildVideoUrl(video);
    ターゲットURLがない場合は、返します。

    const link = document.createElement("a");
    link.href = targetUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    リンクをクリックする。
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
      練習問題: 次の練習問題、
      ランメーター: 0、
      今日日付: 今日、
    });
  };

  const commitToday = () => {
    const snapshot = latestStateRef.current;
    const committedPattern = snapshot.currentPattern;
    const snapshotCalc = calculateSessionXP(
      スナップショット.エクササイズ、
      コミットパターン、
      スナップショット.runMeters
    );

    if (snapshotCalc.finalXP <= 0) {
      Notice("繧其繝�ヨ螳御ｺ�€√∪縺溘�繝ｩ繝ｳ霍晞屬繧貞�蜉帙＠縺ｦ縺上□縺輔＞", "info");
      戻る;
    }

    const oldLevel = computeLevel(snapshot.totalXP).level;
    const nextTotalXP = snapshot.totalXP + snapshotCalc.finalXP;
    const newLevel = computeLevel(nextTotalXP).level;
    const today = getTodayJST();

    const nextExercises = snapshot.exercises.map((exercise) => {
      if (exercise.pattern !== committedPattern) return exercise;

      const completedSets = exercise.sets
        .filter((set) => set.done)
        .map(({ weight, reps }) => ({ weight, reps }));

      const performed = completedSets.length > 0;
      const nextMemo =
        実行済み && exercise.formMemoDraft.trim()
          ? exercise.formMemoDraft.trim()
          : exercise.lastFormMemo;

      戻る {
        ...エクササイズ、
        // 縲悟燕蝗槭�險倬 健全縲阪�迴説蝨良蜈･蜉帑クキュ縺®繧其繝�ヨ縺®縺アッ蛻･縺ｫ菫晄撃縺吶ｋ縲。
        // 縺薙l縺ｫ繧医j谺｡蝗槭そ繝す繝法繝ｳ荳キュ縺ｫ驥彩㍼繧貞､画峩縺励※繧ゅ€�
        // 蜑榊屓螳溽ｸｾ縺御ｸ頑固嶌縺阪＆繧後↑縺�€�
        lastSessionSets:
          completedSets.length > 0
            ?完了セット
            : exercise.lastSessionSets、
        lastFormMemo: nextMemo、
        formMemoDraft: "",
        セット: exercise.sets.map((set) => ({ ...set, done: false })),
      };
    });

    const nextNotes: Note[] = [
      {
        日付: snapshot.todayDate || 今日、
        xp: snapshotCalc.finalXP、
        メモ: `遲九ヨ繝ar${pretty(snapshotCalc.strengthXP)}XP / 繝ｩ繝ウー${pretty(snapshotCalc.runXP)}XP`,
        パターン: committedPattern、
      },
      ...スナップショット.メモ、
    ];

    const nextPattern = oppositePattern(committedPattern);

    const nextState: SavedState = {
      バージョン: 7、
      合計XP: 次の合計XP、
      注記: 次の注記、
      今日日付: 今日、
      練習問題: 次の練習問題、
      ランメーター: 0、
      currentPattern: nextPattern、
      lastPattern: committedPattern、
    };

    // XP遒ｺ螳壹�State譖エ譁ー繧医j蜈医↓螳梧�迥ｶ諷九ｒlocalStorage縺ｸ荳€諡シャル菫晏シュー倥☆繧九€�
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
    if (historyReadyRef.current) {
      window.history.replaceState(
        { forgeView: "home", exerciseKey: null },
        「」、
        ウィンドウの位置.href
      );
    }

    setCelebration({
      xp: snapshotCalc.finalXP、
      古いレベル、
      新しいレベル、
    });
  };

  const exportJSON = () => {
    const payload = latestStateRef.current;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      タイプ: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xp-backup-${getTodayJST()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    Notice("繝舌ャ繧ッ繧「繝��繧呈嶌縺榊�縺励∪縺励◆", "成功");
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
        試す {
          const raw = JSON.parse(String(reader.result)) as LegacySavedState;
          const restored = buildStateFromRaw(raw);
          applySavedState(復元済み);
          通知("繝舌ャ繧ッ繧「繝��繧貞ｾｩ蜈�＠縺奢縺励◆", "成功");
        } catch {
          Notice("繝舌ャ繧ッ繧「繝��繝輔ぃ繧､繝ｫ繧堤「ｺ隱阪＠縺ｦ縺上□縺輔＞」, "error");
        }
      };
      reader.readAsText(file);
    };

    input.click();
  };

  const performHardReset = () => {
    const nextState: SavedState = {
      バージョン: 7、
      合計XP: INITIAL_TOTAL_XP、
      注記: [],
      今日日付: getTodayJST()、
      練習問題: createInitialExercises()、
      ランメーター: 0、
      現在のパターン: "A",
      lastPattern: null、
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
    if (historyReadyRef.current) {
      window.history.replaceState(
        { forgeView: "home", exerciseKey: null },
        「」、
        ウィンドウの位置.href
      );
    }
    setCelebration(null);
    setConfirmAction(null);
    Notice("蛻晄悄迥ｶ諷九↓謌其励∪縺励◆", "成功");
  };

  const hardReset = () => {
    setConfirmAction({
      タイトル: "蜈良く繝��繧そ繧偵Μ繧その繝�ヨ",
      メッセージ：
        "邏險�XP縲∝リア・豁エ縲∫®®逶リオン險セキュリティ壹€∝仮想その縲√Γ繝「繧貞�譛」溽憾諷九∈謌その縺励∪縺吶€yu％縺®謫堺ｽ懊�蜈�↓謌その縺帙∪縺帙ｓ縲�",
      confirmLabel: "繝™繧其繝�ヨ縺吶ｋ",
      トーン：「危険」
      onConfirm: ハードリセットを実行します。
    });
  };

  if (!loaded) {
    戻る （
      <div
        translate="いいえ"
        className="notranslate min-h-screen bg-[#f4f6f8] flex items-center justify-center text-slate-500"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="text-slate-800">
            <ForgeLogo />
          </div>
          <div className="text-sm">セキュリティ...</div>
        </div>
      </div>
    );
  }

  const motivationPhr =
    MOTIVATION_PHRASES[notes.length % MOTIVATION_PHRASES.length];

  const standardVisibleExercises = visibleExercises.filter(
    ({ exercise }) => exercise.isBase
  );

  const selectedEntry =
    selectedExerciseKey === null
      ? null
      : 練習問題
          .map((exercise, originalIndex) => ({ exercise, originalIndex }))
          .find(({ exercise }) => exercise.key === selectedExerciseKey) ?? null;

  const pushView = (view: ViewMode, exerciseKey: string | null = null) => {
    window.history.pushState(
      { forgeView: view, exerciseKey },
      「」、
      ウィンドウの位置.href
    );
    setViewMode(view);
    setSelectedExerciseKey(view === "exercise" ? exerciseKey : null);
    setDetailEditMode(false);
  };

  const openExerciseDetail = (exerciseKey: string) => {
    pushView("exercise", exerciseKey);
  };

  const startTraining = () => {
    setOpenExerciseKey(visibleExercises[0]?.exercise.key ?? null);
    pushView("training");
  };

  const goBackInApp = () => {
    window.history.back();
  };

  const goHomeInApp = () => {
    window.history.pushState(
      { forgeView: "home", exerciseKey: null },
      「」、
      ウィンドウの位置.href
    );
    setViewMode("home");
    setSelectedExerciseKey(null);
    setDetailEditMode(false);
    setOpenExerciseKey(null);
  };

  const appShell =
    "min-h-screen w-full min-w-0 overflow-x-hidden bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f4f7fa_38%,_#eef2f6_100%)] text-slate-900 notranslate selection:bg-sky-100";
  const pageWidth = "w-full min-w-0";
  const card =
    "rounded-[24px] border border-slate-100/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]";

  const BrandHeader = () => (
    <header className="border-b border-slate-100/90 bg-white/95 backdrop-blur-xl">
      <div
        className={`${pageWidth} grid h-[72px] grid-cols-[48px_1fr_48px] items-center px-3 md:mx-auto md:max-w-2xl`}
      >
        <ボタン>
          onClick={() => pushView("settings")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:bg-slate-100"
          aria-label="險螳"
        >
          <span className="space-y-[4px]" aria-hidden="true">
            <span className="block h-[2px] w-[18px] rounded bg-current" />
            <span className="block h-[2px] w-[18px] rounded bg-current" />
            <span className="block h-[2px] w-[18px] rounded bg-current" />
          </span>
        </button>

        <div className="text-center leading-none">
          <div className="text-[18px] font-semibold tracking-[0.22em] text-slate-900">
            フォージ
          </div>
          <div className="mt-1.5 text-[9px] uppercase tracking-[0.28em] text-slate-400">
            トレーニングログ
          </div>
        </div>

        <ボタン>
          onClick={() => pushView("history")}
          className="justify-self-end flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition active:bg-slate-100"
          aria-label="螻･豁エ"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M10 20h4" />
          </svg>
        </button>
      </div>
    </header>
  );


  const TopBar = ({
    タイトルテキスト、
  }: {
    タイトルテキスト: 文字列;
  }) => (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur">
      <div className={`${pageWidth} grid h-16 grid-cols-[48px_1fr_48px] items-center px-2 md:mx-auto md:max-w-2xl`}>
        <ボタン>
          onClick={goBackInApp}
          className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-slate-700 active:bg-slate-100"
          aria-label="謌其繧"
        >
          窶ケ
        </button>
        <div className="truncate text-center text-base font-semibold tracking-wide text-slate-900">
          {titleText}
        </div>
        <ボタン>
          onClick={goHomeInApp}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-slate-400 active:bg-slate-100"
          aria-label="繝帙�繝"
        >
          ������������
        </button>
      </div>
    </header>
  );

  const MobileNav = ({ active }: { active: ViewMode }) => {
    const items: Array<{
      表示: "ホーム" | "履歴" | "統計" | "設定";
      ラベル: 文字列;
      アイコン: 「ホーム」｜「履歴」｜「統計」｜「設定」
    }> = [
      { view: "home", label: "繝帙�繝�", icon: "home" },
      { ビュー: "履歴", ラベル: "險倬恐怖", アイコン: "履歴" },
      { ビュー: "統計"、ラベル: "邨亜險"、アイコン: "統計" },
      { view: "settings", label: "非表示", icon: "settings" },
    ];

    const iconNode = (icon: "home" | "history" | "stats" | "settings") => {
      if (icon === "home") {
        戻る （
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
            <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" />
          </svg>
        );
      }
      if (icon === "history") {
        戻る （
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="1.8"
          >
            <rect x="5" y="4" width="14" height="17" rx="2" />
            <path d="M8 2v4M16 2v4M8 10h8M8 14h5" />
          </svg>
        );
      }
      if (icon === "stats") {
        戻る （
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 fill-none stroke-current"
            strokeWidth="1.9"
          >
            <path d="M5 20V10M12 20V4M19 20v-7" />
          </svg>
        );
      }
      戻る （
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 fill-none stroke-current"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.38.35.72.6 1 .3.3.7.5 1.1.5h.1v4h-.1c-.4 0-.8.2-1.1.5-.25.28-.47.62-.6 1Z" />
        </svg>
      );
    };

    戻る （
      <nav className="fixed left-0 right-0 bottom-0 z-40 border-t border-slate-200/70 bg-white/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(15,23,42,0.045)] backdrop-blur-xl">
        <div className={`${pageWidth} grid grid-cols-4 gap-1 md:mx-auto md:max-w-2xl`}>
          {items.map((item) => {
            const selected = active === item.view;
            戻る （
              <ボタン>
                key={item.view}
                onClick={() => {
                  if (item.view === "home") {
                    goHomeInApp();
                  } それ以外 {
                    pushView(item.view);
                  }
                }}
                className={`flex flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                  選択されました ? "text-sky-500" : "text-slate-400 active:bg-slate-50"
                }`}
              >
                {iconNode(item.icon)}
                <span
                  className={`text-[9px] ${
                    選択済み ? "font-semibold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  const BottomXPBar = () => (
    <div className="fixed left-0 right-0 bottom-0 z-50 border-t border-slate-700/20 bg-[#172238]/[0.985] px-4 py-3 text-white shadow-[0_-12px_32px_rgba(15,23,42,0.2)] backdrop-blur">
      <div className={`${pageWidth} flex items-center gap-3 md:mx-auto md:max-w-2xl`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg text-sky-300">
          笞｡
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-[0.18em] text-slate-400">
            譛チャ譌･縺®迯イ蠕嶺ｺ亥®感動P
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold">{pretty(calc.finalXP)} XP</span>
            <span className="truncate text-[10px] text-slate-400">
              九曜 {pretty(calc.strengthXP)} と、{pretty(calc.runXP)}
            </span>
          </div>
        </div>
        <ボタン>
          onClick={commitToday}
          className="rounded-[16px] bg-gradient-to-r from-sky-400 to-blue-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-sky-950/20 transition active:scale-[0.97]"
        >
          菫晏シュー、竊。
        </button>
      </div>
    </div>
  );

  let screen: JSX.Element;

  if (viewMode === "home") {
    画面 = (
      <div className={`${appShell} pb-24`}>
        <ブランドヘッダー />
        <div className={`${pageWidth} space-y-3 px-3 pt-3 md:mx-auto md:max-w-2xl`}>

          <section id="overview" className={`${card} p-5`}>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-amber-300">
                <span className="text-[20px]">笶ｧ</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  レベル
                </span>
                <span className="text-[30px] font-semibold leading-none text-slate-950">
                  {lv.level}
                </span>
                <span className="scale-x-[-1] text-[20px]">笶ｧ</span>
              </div>

              <div className="min-w-0 flex-1 border-l border-slate-100 pl-3">
                <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-800">
                  {タイトル}
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  邯壹￠繧九€よ怙蠑ｷ縺®謇崎�縺�縲。
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-end gap-2">
              <span className="text-[42px] font-semibold leading-none tracking-[-0.045em] text-slate-950">
                {pretty(totalXP)}
              </span>
              <span className="pb-1 text-lg font-semibold text-slate-700">XP</span>
            </div>

            <div className="mt-4">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 transition-[width] duration-500"
                  style={{ width: `${levelProgress}%` }}
                ＞
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>谺｡縺®繝カラー繝吶Ν縺セス縺§ {pretty(Math.max(0, lv.toNext - lv.into))} XP</span>
                <span>Lv {Math.min(lv.level + 1, LEVEL_NEEDS.length + 1)}</span>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <ボタン>
              onClick={() => lastPattern && selectPattern(lastPattern)}
              className={`${card} group flex items-center gap-3 p-3.5 text-left transition active:scale-[0.985]`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
                  <path d="M12 7v5l3 2" />
                  <circle cx="12" cy="12" r="8" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-slate-400">
                  蜑榊屓縺®繝医Ξ繝ｼ繝九Φ繧ー
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-semibold">
                  {最後のパターン ? `${lastPattern}繝｡繝九Η繝ｼ` : "險倬恐怖縺™縺�"}
                </span>
              </span>
            </button>

            <ボタン>
              onClick={() => selectPattern(recommendedPattern)}
              className="group flex items-center gap-3 rounded-[24px] border border-sky-100 bg-gradient-to-br from-white to-sky-50 p-3.5 text-left shadow-[0_10px_30px_rgba(15,23,42,0.045)] transition active:scale-[0.985]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
                笘
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold text-sky-500">
                  縺ゅ↑縺溘∈縺®縺翫☆縺吶a
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-semibold">
                  {推奨パターン}繝｡繝九Η繝紙
                </span>
              </span>
            </button>
          </section>

          <section id="today-menu" className={`${card} p-5`}>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.02em]">
                譛譌･縺®繝｡繝九Η繝ｼ
              </h2>
              <入力
                タイプ="日付"
                value={todayDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleDateChange(event.target.value)
                }
                className="mt-2 border-0 bg-transparent p-0 text-xs text-slate-400 outline-none"
              ＞
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {(["A", "B"] as WorkoutPattern[]).map((pattern) => {
                const selected = currentPattern === pattern;
                戻る （
                  <ボタン>
                    キー={パターン}
                    onClick={() => selectPattern(pattern)}
                    className={`rounded-[18px] border px-4 py-3 text-left transition-all duration-200 active:scale-[0.985] ${
                      選択済み
                        ? "border-sky-500 bg-white text-sky-600 shadow-[0_8px_24px_rgba(14,165,233,0.12)] ring-1 ring-sky-100"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="text-base font-semibold">{pattern}繝｡繝九Η繝し</div>
                    <div
                      className={`mt-1 text-[11px] ${
                        選択されましたか？「text-slate-300」:「text-slate-400」
                      }`}
                    >
                      {パターン === "A" ? "閭クロックサヤン輔���ナダケケサ閼�"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="relative mt-4 min-h-[182px] overflow-hidden">
              <img
                src={EVEREST_ART_URL}
                alt=""
                読み込み中="lazy"
                referrerPolicy="no-referrer"
                className="pointer-events-none absolute bottom-[-10px] right-[-18px] h-[145px] w-[190px] object-cover object-center"
                style={{
                  不透明度: 0.13、
                  フィルター: "グレースケール(1) コントラスト(.9) 明るさ(1.16)",
                  maskImage: "linear-gradient(to top, black 58%, transparent 100%)",
                }}
              ＞

              <div className="relative z-10 grid grid-cols-[1.08fr_.92fr] gap-2">
                <div className="pt-1">
                  <div className="mb-3 text-sm font-semibold text-slate-800">
                    {現在のパターン}繝。
                  </div>
                  <div className="space-y-2.5">
                    {standardVisibleExercises.map(({ exercise }, index) => (
                      <ボタン>
                        key={exercise.key}
                        onClick={() => openExerciseDetail(exercise.key)}
                        className="flex w-full min-w-0 items-center gap-2 text-left transition active:translate-x-0.5"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-[13px] font-semibold text-slate-700">
                          {エクササイズ名}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[168px] flex-col items-end pt-1 text-right">
                  <div className="text-[36px] font-serif leading-none text-slate-200">窶�</div>
                  <div className="-mt-2 max-w-[138px] text-[12px] font-medium leading-[1.8] text-slate-500">
                    {動機付けフレーズ}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">莉頑律縺®騾意謐�</span>
                <span className="font-semibold text-slate-700">
                  {完了した基本運動} / {現在の基本運動の長さ}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${workoutProgress}%` }}
                ＞
              </div>
            </div>

            <ボタン>
              onClick={startTraining}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/15 active:scale-[0.99]"
            >
              繝医Ξ繝ｼ繝九Φ繧ー髢句§ 竊。
            </button>
          </section>

          <details id="recent-sessions" className={`${card} p-4`}>
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-600">
              譛€霑代...その
            </summary>
            <div className="mt-3 space-y-2">
              {notes.slice(0, 6).map((note, index) => (
                <div
                  key={`${note.date}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
                >
                  <div className="text-xs text-slate-500">
                    {note.date}
                    {ノート.パターン ? ` ` および ${note.pattern} ` : ""}
                  </div>
                  <div className="text-sm font-semibold">+{pretty(note.xp)} XP</div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-xs text-slate-400">縺ｾ縺�險倬恐怖縺後≠繧翫∪縺帙ｓ</div>
              )}
            </div>
          </details>
        </div>

        <MobileNav active="home" />
      </div>
    );
  } else if (viewMode === "history") {
    画面 = (
      <div className={`${appShell} pb-24`}>
        <ブランドヘッダー />
        <main className={`${pageWidth} px-3 py-4 md:mx-auto md:max-w-2xl`}>
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">
              研修履歴
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em]">
              險倬の
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              遨阪∩荳翫￡縺溘そ繝す繝§繝ｳ繧呈真剣繧願志願l縺セス縺吶€。
            </p>
          </div>

          {notes.length === 0 ? (
            <section className={`${card} p-7 text-center`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                笨
              </div>
              <div className="mt-4 font-semibold">縺ｾ縺�險倬賢縺アッ縺ゅj縺ｾ縺帙ｓ</div>
              <div className="mt-1 text-xs text-slate-400">
                譛€蛻昴ã ã‚¹ã‚¹ã‚¿ã‚¿
              </div>
            </section>
          ) : (
            <section className={`${card} overflow-hidden`}>
              {notes.map((note, index) => (
                <div
                  key={`${note.date}-${index}-${note.xp}`}
                  className={`flex items-center gap-3 px-4 py-4 ${
                    インデックス > 0 ? "border-t border-slate-100" : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {note.pattern ?? "窶�"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {ノート.パターン ? `${note.pattern}繝｡繝九Η繝ｼ` : "繝医Ξ繝ｼ繝九Φ繧ー"}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-400">
                      {note.date} と {note.memo}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-sky-500">
                      +{pretty(note.xp)}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                      XP
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
        <MobileNav active="history" />
      </div>
    );
  } else if (viewMode === "stats") {
    const sessionCount = notes.length;
    const totalLoggedXP = notes.reduce((sum, note) => sum + note.xp, 0);
    const aCount = notes.filter((note) => note.pattern === "A").length;
    const bCount = notes.filter((note) => note.pattern === "B").length;
    const recentSeven = notes.slice(0, 7);
    const maxRecentXP = Math.max(1, ...recentSeven.map((note) => note.xp));

    画面 = (
      <div className={`${appShell} pb-24`}>
        <ブランドヘッダー />
        <main className={`${pageWidth} px-3 py-4 md:mx-auto md:max-w-2xl`}>
          <div className="mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-500">
              進捗
            </div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.035em]">
              邨亜險
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              邯壹￠縺滄㍼繧偵€∵焚蟄励〒遒ｺ隱阪＠縺ｾ縺吶€。
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <section className={`${card} p-4`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                セッション
              </div>
              <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em]">
                {sessionCount}
              </div>
              <div className="mt-1 text-xs text-slate-400">安全な医療∩その表面</div>
            </section>
            <section className={`${card} p-4`}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                記録されたXP
              </div>
              <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em]">
                {pretty(totalLoggedXP)}
              </div>
              <div className="mt-1 text-xs text-slate-400">螻･豁エ荳翫迯井蠕郵P</div>
            </section>
          </div>

          <section className={`${card} mt-3 p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">譛€霑�7その他の注意</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  迯ai蠕郵P縺®繝懊Μ繝･繝ｼ繝。
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                A {aCount} / B {bCount}
              </div>
            </div>

            <div className="mt-5 flex h-32 items-end gap-2">
              {recentSeven.length === 0 ? (
                <div className="m-auto text-xs text-slate-400">
                  ã‚¹ã‚¹ã‚¹ã‚¤ã‚¤ã‚¿
                </div>
              ) : (
                [...recentSeven].reverse().map((note, index) => {
                  const height = Math.max(
                    12、
                    Math.round((note.xp / maxRecentXP) * 100)
                  );
                  戻る （
                    <div
                      key={`${note.date}-${index}`}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div
                        className="w-full max-w-8 rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 shadow-sm"
                        style={{ height: `${height}%` }}
                        タイトル={`${pretty(note.xp)} XP`}
                      ＞
                      <span className="text-[9px] font-medium text-slate-400">
                        {note.pattern ?? "窶�"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className={`${card} mt-3 p-5`}>
            <div className="text-sm font-semibold">迴ｾ蝨®蝨ー</div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  合計経験値
                </div>
                <div className="mt-1 text-[30px] font-semibold tracking-[-0.04em]">
                  {pretty(totalXP)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                  レベル
                </div>
                <div className="mt-1 text-[28px] font-semibold">Lv {lv.level}</div>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                style={{ width: `${levelProgress}%` }}
              ＞
            </div>
          </section>
        </main>
        <MobileNav active="stats" />
      </div>
    );
  } else if (viewMode === "settings") {
    画面 = (
      <div className={`${appShell} pb-24`}>
        <TopBar titleText="險螳" />
        <main className={`${pageWidth} px-3 py-4 md:mx-auto md:max-w-2xl`}>
          <section className={`${card} overflow-hidden`}>
            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                データ
              </div>
              <div className="mt-1 text-base font-semibold">「繝舌」</div>
            </div>
            <ボタン>
              onClick={exportJSON}
              className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-4 text-left"
            >
              <span>
                <span className="block text-sm font-medium">JSON プレゼン嶌縺榊�縺�</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  XP のセキュリティは、セキュリティを厳しく監視します。
                </span>
              </span>
              <span className="text-slate-300">窶</span>
            </button>
            <ボタン>
              onClick={importJSON}
              className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-4 text-left"
            >
              <span>
                <span className="block text-sm font-medium">繝舌ャ繧ｯ繧「繝��繧貞ｾｩ蜈」</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  菫晏キュー俶クロック医∩JSON縺九i蠕ｩ蜈。
                </span>
              </span>
              <span className="text-slate-300">窶</span>
            </button>
          </section>

          <section className={`${card} mt-3 overflow-hidden`}>
            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                セッション
              </div>
              <div className="mt-1 text-base font-semibold">蜈･蜉帷®｡逅�</div>
            </div>
            <ボタン>
              onClick={() => {
                resetToday();
                Notice("莉頑律縺®蜈･蜉帙ｒ繝™繧その繝�ヨ縺励∪縺励◆", "成功");
              }}
              className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-4 text-left"
            >
              <span>
                <span className="block text-sm font-medium">莉頑律縺®蜈･蜉帙ｒ繝™繧其繝�ヨ</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  XP 補足√＠縺客縺。
                </span>
              </span>
              <span className="text-slate-300">窶</span>
            </button>
          </section>

          <section className="mt-3 overflow-hidden rounded-[24px] border border-red-100 bg-white shadow-[0_10px_34px_rgba(15,23,42,0.045)]">
            <div className="px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-400">
                危険地帯
              </div>
              <div className="mt-1 text-base font-semibold">蜈莉繝��繧ソ</div>
            </div>
            <ボタン>
              onClick={hardReset}
              className="flex w-full items-center justify-between border-t border-red-50 px-5 py-4 text-left"
            >
              <span>
                <span className="block text-sm font-medium text-red-600">
                  蛻晄悄迥ｶ諷九∈謌沙
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  縺薙�謫堺スパ懊�蜈�↓謌その縺帙∪縺帙ｓ
                </span>
              </span>
              <span className="text-red-300">窶 </span>
            </button>
          </section>

          <div className="mt-5 px-3 text-center text-[9px] leading-5 text-slate-400">
            FORGEトレーニングログ
            <br />
            筋肉のアートワーク：FORGEカスタムPNGイラストセット
            
          </div>
        </main>
        <MobileNav active="settings" />
      </div>
    );
  } else if (viewMode === "training") {
    画面 = (
      <div className={`${appShell} pb-28`}>
        <TopBar titleText={`${currentPattern}繝｡繝九Η繝ｼ`} />

        <main className={`${pageWidth} px-3 py-4 md:mx-auto md:max-w-2xl`}>
          <section className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {現在のパターン === "A" ? "閭クロックササヤｩサヤンサ" : "閭マクロササヤンヤナダケケケサ閼"}
              </div>
              <div className="text-[17px] font-semibold tracking-[-0.02em] text-slate-800">
                <span className="text-sky-500">{completedBaseExercises}</span>
                <span className="text-slate-400"> / </span>
                {currentBaseExercises.length}
                <span className="ml-1 text-sm font-medium">遞®逶リオ螳御ｺ�</span>
              </div>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500"
                style={{ width: `${workoutProgress}%` }}
              ＞
            </div>
          </section>

          <section className="space-y-3">
            {visibleExercises.map(({ exercise, originalIndex }, visualIndex) => {
              const isOpen = openExerciseKey === exercise.key;
              const doneSets = exercise.sets.filter((set) => set.done).length;
              戻る （
                <記事>
                  key={exercise.key}
                  className={`${card} overflow-hidden transition-shadow duration-200 ${isOpen ? "shadow-[0_20px_55px_rgba(15,23,42,0.10)]" : ""}`}
                >
                  <div className="flex items-center gap-3 px-3.5 py-3">
                    <ボタン>
                      onClick={() =>
                        setOpenExerciseKey((prev) =>
                          prev === exercise.key ? null : exercise.key
                        ）
                      }
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        完了セット > 0
                          ？「bg-emerald-500 text-white」
                          : exercise.isBase
                          ？「bg-sky-500 text-white」
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {doneSets === exercise.sets.length && doneSets > 0
                        ? 「笨」
                        : exercise.isBase
                        ? visualIndex + 1
                        : "+"}
                    </button>

                    <ボタン>
                      onClick={() => openExerciseDetail(exercise.key)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-semibold tracking-[-0.01em] text-slate-900">
                          {エクササイズ名}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-slate-400">
                          蜑榊屓 {formatPreviousSets(exercise.lastSessionSets, true)}
                        </span>
                      </span>
                      <MuscleMap exercise={exercise} />
                    </button>

                    <ボタン>
                      onClick={() =>
                        setOpenExerciseKey((prev) =>
                          prev === exercise.key ? null : exercise.key
                        ）
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-300"
                    >
                      {オープンですか？ "竚�" : "窶ｺ"}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/75 to-white px-3 pb-3 pt-2.5">
                      <div className="space-y-1.5">
                        {exercise.sets.map((set, setIndex) => (
                          <div
                            key={`${exercise.key}-${setIndex}`}
                            className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0"
                          >
                            <div className="text-xs font-medium text-slate-500">
                              {setIndex + 1} を設定します。
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              {set.weight}kg
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              {set.reps}蝗
                            </div>
                            <ボタン>
                              onClick={() => toggleSetDone(originalIndex, setIndex)}
                              className="rounded-full"
                            >
                              <SetStatusIcon 完了={set.done} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <ボタン>
                          onClick={() => openExerciseDetail(exercise.key)}
                          className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-600"
                        >
                          ଆｶ 蜿莉€...虚逕其の
                        </button>
                        <div className="min-w-0 flex-1 truncate text-right text-[11px] text-slate-400">
                          {exercise.lastFormMemo
                            ? `蜑榊屓繝｡繝「��${exercise.lastFormMemo}`」
                            : "蜑榊屓繝｡繝「�壹↑縺�"}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ボタン>
              onClick={addExtraExercise}
              className="rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-500"
            >
              �������������������������������
            </button>
            <div className={`${card} flex items-center gap-2 px-3 py-2`}>
              <span className="text-xs font-semibold text-slate-500">繝ｩ繝ウー</span>
              <入力
                type="number"
                value={runMeters}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  updateRunMeters(Number(event.target.value || 0))
                }
                className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none"
              ＞
              <span className="text-[10px] text-slate-400">m</span>
            </div>
          </div>
        </main>

        <BottomXPBar />
      </div>
    );
  } else if (selectedEntry) {
    const { exercise, originalIndex } = selectedEntry;

    画面 = (
      <div className={`${appShell} pb-28`}>
        <TopBar titleText="" />

        <main className={`${pageWidth} px-3 pb-8 pt-3`}>
          <section className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_10px_34px_rgba(15,23,42,0.055)]">
            <div className="pointer-events-none absolute right-2 top-2 opacity-[0.09]">
              <div className="h-28 w-28 rounded-full bg-sky-300 blur-3xl" />
            </div>
            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {exercise.isBase ? (
                  <h1 className="text-[28px] font-semibold tracking-[-0.025em] text-slate-950">
                    {エクササイズ名}
                  </h1>
                ) : (
                  <入力
                    value={exercise.name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateExerciseName(originalIndex, event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xl font-semibold outline-none focus:border-sky-400"
                  ＞
                )}
                <div className="mt-1 text-xs font-medium text-slate-400">
                  {exercise.pattern}繝｡繝九Η繝紙
                </div>
              </div>
              <MuscleMap exercise={exercise} size="lg" />
            </div>

            <div className="mt-5 flex items-end justify-between rounded-[20px] bg-slate-50 p-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">
                  蜑榊屓縺リオン險倬
                </div>
                <div className="mt-1 max-w-[250px] text-[18px] font-semibold leading-7 tracking-[-0.02em]">
                  {formatPreviousSets(exercise.lastSessionSets)}
                </div>
              </div>
              <ボタン>
                onClick={() => setViewMode("home")}
                className="text-[11px] font-semibold text-sky-500"
              >
                驕主悉縺®險倬音響 窶ｺ
              </button>
            </div>
          </section>

          <section className={`${card} mt-3 p-4`}>
            <h2 className="text-base font-semibold">そのほかのヨ繧定理倬音</h2>

            <div className="mt-3 space-y-2">
              {exercise.sets.map((set, setIndex) => (
                <div
                  key={`${exercise.key}-${setIndex}`}
                  className="grid grid-cols-[50px_1fr_1fr_auto] items-center gap-2"
                >
                  <div className="text-sm font-medium">{setIndex + 1} を設定</div>
                  <div className="relative">
                    <入力
                      type="number"
                      value={set.weight}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSetField(
                          オリジナルインデックス、
                          setIndex、
                          "重さ"、
                          数値(イベント.ターゲット.値 || 0)
                        ）
                      }
                      className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-2 pr-7 text-right text-[15px] font-semibold outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    ＞
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      kg
                    </span>
                  </div>
                  <div className="relative">
                    <入力
                      type="number"
                      value={set.reps}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateSetField(
                          オリジナルインデックス、
                          setIndex、
                          「反復」
                          数値(イベント.ターゲット.値 || 0)
                        ）
                      }
                      className="h-12 w-full rounded-[14px] border border-slate-200 bg-white px-2 pr-7 text-right text-[15px] font-semibold outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    ＞
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                      蝗
                    </span>
                  </div>
                  <ボタン>
                    onClick={() => toggleSetDone(originalIndex, setIndex)}
                    className="rounded-full"
                  >
                    <SetStatusIcon 完了={set.done} />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <ボタン>
                onClick={() => addSet(originalIndex)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                「九そ繝よ」
              </button>
              <ボタン>
                onClick={() => removeLastSet(originalIndex)}
                className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                竏偵察そ繝よ
              </button>
            </div>
          </section>

          <section className={`${card} mt-3 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">シュ輔か繝ｼ繝蜿り€ 虚その</h2>
              <ボタン>
                onClick={() => setDetailEditMode((prev) => !prev)}
                className="rounded-xl px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50"
              >
                {詳細編集モード ? "邱正当髮�ｒ髢峨§繧�" : "邱正当髮"}
              </button>
            </div>

            <div className="mt-3 overflow-hidden rounded-[22px] border border-slate-100 bg-slate-50/50">
              {exercise.formVideos.length === 0 ? (
                <div className="px-4 py-4 text-xs text-slate-400">
                  蜿莉€� 虚―そのサクサクセスサ� ザ・ザ・イ・サスケl縺ｦ縺�∪縺帙s縲。
                </div>
              ) : (
                exercise.formVideos.map((video, index) => (
                  <ボタン>
                    key={video.id}
                    onClick={() => openFormVideo(video)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 active:bg-sky-50 ${
                      インデックス > 0 ? "border-t border-slate-100" : ""
                    }`}
                  >
                    <span className="relative h-[54px] w-[84px] shrink-0 overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-100">
                      {getYouTubeThumbnail(video.url) ? (
                        <img
                          src={getYouTubeThumbnail(video.url)}
                          alt=""
                          読み込み中="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        ＞
                      ) : (
                        <span className="absolute inset-0 bg-gradient-to-br from-slate-100 to-white" />
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/15">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 pl-0.5 text-[11px] text-sky-500 shadow">
                          か
                        </span>
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {ビデオ.タイトル || `蜿莉€…さらに ${index + 1}`}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {formatStartTime(video.startSeconds)}縺九ｉ蜀咲関数
                      </span>
                    </span>
                    <span className="text-slate-300">窶</span>
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
                      <入力
                        value={video.title}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateFormVideo(originalIndex, video.id, {
                            タイトル: event.target.value、
                          })
                        }
                        placeholder="蜍慕判蜷"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                      ＞
                      <ボタン>
                        onClick={() =>
                          moveFormVideo(originalIndex, video.id, -1)
                        }
                        disabled={videoIndex === 0}
                        className="rounded-lg bg-slate-100 px-2 disabled:opacity-30"
                      >
                        竊
                      </button>
                      <ボタン>
                        onClick={() =>
                          moveFormVideo(originalIndex, video.id, 1)
                        }
                        無効={
                          videoIndex === exercise.formVideos.length - 1
                        }
                        className="rounded-lg bg-slate-100 px-2 disabled:opacity-30"
                      >
                        竊
                      </button>
                    </div>
                    <入力
                      value={video.url}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateFormVideo(originalIndex, video.id, {
                          URL: event.target.value、
                        })
                      }
                      プレースホルダー="YouTube URL"
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
                    ＞
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-400">髢句ｧ�</span>
                      <入力
                        type="number"
                        min="0"
                        value={Math.floor(video.startSeconds / 60)}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateVideoTimePart(
                            オリジナルインデックス、
                            ビデオ、
                            "分"、
                            数値(イベント.ターゲット.値 || 0)
                          ）
                        }
                        className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm"
                      ＞
                      <span className="text-xs text-slate-400">蛻�</span>
                      <入力
                        type="number"
                        min="0"
                        max="59"
                        value={video.startSeconds % 60}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          updateVideoTimePart(
                            オリジナルインデックス、
                            ビデオ、
                            「秒」
                            数値(イベント.ターゲット.値 || 0)
                          ）
                        }
                        className="w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm"
                      ＞
                      <span className="text-xs text-slate-400">遘�</span>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <ボタン>
                        onClick={() =>
                          removeFormVideo(originalIndex, video.id)
                        }
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                      >
                        蜑企勁
                      </button>
                    </div>
                  </div>
                ))}

                <ボタン>
                  onClick={() => addFormVideo(originalIndex)}
                  className="rounded-xl bg-[#1f2d43] px-3 py-2 text-xs font-semibold text-white"
                >
                  「枕カバー」「虚空」その定規。
                </button>

                {!exercise.isBase && (
                  <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
                    <選択>
                      value={exercise.pattern}
                      onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                        updateExercisePattern(
                          オリジナルインデックス、
                          event.target.value を WorkoutPattern として使用する
                        ）
                      }
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="A">A繝｡繝九Η繝し</option>
                      <option value="B">B繝｡繝九Η繝</option>
                    </select>
                    <ボタン>
                      onClick={() => deleteExercise(exercise.key)}
                      className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                    >
                      遞ロリ逶リオン繧貞炎髯、
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className={`${card} mt-3 p-4`}>
            <div className="text-sm font-semibold">蜑榊屓繝｡繝「</div>
            <div className="mt-2 rounded-xl bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
              {exercise.lastFormMemo || "縺せ縺�繝｡繝「縺アッ縺ゅｊ縺サク縺帙ｓ」}
            </div>
            <textarea
              value={exercise.formMemoDraft}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                updateFormMemoDraft(originalIndex, event.target.value)
              }
              placeholder="莉頑律豌励▼縺�◆繝輔か繝ｼ繝縺リオ繝昴う繝ｳ繝"
              行数={2}
              className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
            ＞
          </section>
        </main>

        <BottomXPBar />
      </div>
    );
  } それ以外 {
    画面 = (
      <div className={`${appShell} flex items-center justify-center p-6`}>
        <ボタン>
          onClick={() => setViewMode("training")}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-white"
        >
          医師の診察を受けてください。
        </button>
      </div>
    );
  }

  戻る （
    <div translate="no" className="notranslate">
      {画面}

      {トースト && (
        <div className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[120] flex justify-center px-4">
          <div
            className={`flex max-w-sm items-center gap-3 rounded-2xl border bg-white/95 px-4 py-3 text-sm font-medium shadow-[0_16px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl ${
              toast.tone === "成功"
                ？「ボーダーエメラルド100 テキストエメラルド700」
                : toast.tone === "error"
                ？「border-red-100 text-red-600」
                : "border-sky-100 text-slate-700"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white ${
                toast.tone === "成功"
                  ？「bg-emerald-500」
                  : toast.tone === "error"
                  ？「bg-red-500」
                  : "bg-sky-500"
              }`}
            >
              {toast.tone === "success" ? "笨�" : toast.tone === "error" ? "!" : "i"}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="text-lg font-semibold tracking-[-0.02em]">
              {confirmAction.title}
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-500">
              {confirmAction.message}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <ボタン>
                onClick={() => setConfirmAction(null)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                「「」」「その」
              </button>
              <ボタン>
                onClick={confirmAction.onConfirm}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
                  confirmAction.tone === "危険"
                    ？「bg-red-500」
                    : "bg-gradient-to-r from-sky-500 to-blue-600"
                }`}
              >
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {お祝い ＆＆ （
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
          onClick={() => setCelebration(null)}
        >
          <div
            className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-2xl"
            onClick={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
          >
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
              セッション完了
            </div>
            <div className="mt-3 text-4xl font-semibold text-slate-950">
              +{pretty(celebration.xp)} XP
            </div>
            {celebration.newLevel > celebration.oldLevel ? (
              <div className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 font-semibold text-amber-700">
                レベルアップ！Lv {celebration.newLevel}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-500">
                {
                  動機付けフレーズ[
                    (notes.length + 1) % MOTIVATION_PHRASES.length
                  ]
                }
              </div>
            )}
            <ボタン>
              onClick={() => setCelebration(null)}
              className="mt-5 w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white"
            >
              髢峨§繧。
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
