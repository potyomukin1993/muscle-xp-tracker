import React, { useEffect, useMemo, useState } from "react";

/** ========= Types ========= */
type SetEntry = {
  weight: number;
  reps: number;
  done: boolean;
};

type ExerciseTemplate = {
  key: string;
  name: string;
  isBase: boolean;
  sets: SetEntry[];
};

type Note = {
  date: string;
  xp: number;
  memo: string;
};

type SavedState = {
  totalXP: number;
  notes: Note[];
  todayDate: string;
  exercises: ExerciseTemplate[];
  runMeters: number;
};

/** ========= Constants ========= */
const LS_KEY = "xp_tracker_full_v4";

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

// 初期テンプレート
function createInitialExercises(): ExerciseTemplate[] {
  return [
    {
      key: "chest",
      name: "チェストプレス",
      isBase: true,
      sets: [
        { weight: 50, reps: 10, done: false },
        { weight: 50, reps: 10, done: false },
        { weight: 50, reps: 10, done: false },
      ],
    },
    {
      key: "row",
      name: "シーテッドロー",
      isBase: true,
      sets: [
        { weight: 52, reps: 10, done: false },
        { weight: 52, reps: 10, done: false },
        { weight: 52, reps: 10, done: false },
      ],
    },
    {
      key: "lat",
      name: "ラットプルダウン",
      isBase: true,
      sets: [
        { weight: 59, reps: 10, done: false },
        { weight: 59, reps: 10, done: false },
      ],
    },
    {
      key: "legpress",
      name: "レッグプレス",
      isBase: true,
      sets: [
        { weight: 93, reps: 10, done: false },
        { weight: 93, reps: 10, done: false },
      ],
    },
    {
      key: "crunch",
      name: "アブドミナルクランチ",
      isBase: true,
      sets: [
        { weight: 59, reps: 15, done: false },
        { weight: 59, reps: 15, done: false },
      ],
    },
    {
      key: "curl",
      name: "アームカール",
      isBase: true,
      sets: [
        { weight: 36, reps: 10, done: false },
        { weight: 36, reps: 10, done: false },
      ],
    },
    {
      key: "legext",
      name: "レッグエクステンション",
      isBase: false,
      sets: [
        { weight: 73, reps: 10, done: false },
        { weight: 73, reps: 10, done: false },
      ],
    },
  ];
}

function resetDoneOnly(exercises: ExerciseTemplate[]) {
  return exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s, done: false })),
  }));
}

export default function App() {
  const [totalXP, setTotalXP] = useState<number>(493928);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todayDate, setTodayDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [exercises, setExercises] = useState<ExerciseTemplate[]>(createInitialExercises());
  const [runMeters, setRunMeters] = useState<number>(0);

  // load
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) return;
    try {
      const parsed: SavedState = JSON.parse(saved);
      if (typeof parsed.totalXP === "number") setTotalXP(parsed.totalXP);
      if (Array.isArray(parsed.notes)) setNotes(parsed.notes);
      if (typeof parsed.todayDate === "string") setTodayDate(parsed.todayDate);
      if (Array.isArray(parsed.exercises)) setExercises(parsed.exercises);
      if (typeof parsed.runMeters === "number") setRunMeters(parsed.runMeters);
    } catch {
      // noop
    }
  }, []);

  // save
  useEffect(() => {
    const payload: SavedState = {
      totalXP,
      notes,
      todayDate,
      exercises,
      runMeters,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
  }, [totalXP, notes, todayDate, exercises, runMeters]);

  const calc = useMemo(() => {
    const baseExercises = exercises.filter((e) => e.isBase);
    const extraExercises = exercises.filter((e) => !e.isBase);

    const baseSum = baseExercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.done)
          .reduce((sub, s) => sub + s.weight * s.reps, 0),
      0
    );

    const extraSum = extraExercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets
          .filter((s) => s.done)
          .reduce((sub, s) => sub + s.weight * s.reps, 0),
      0
    );

    const baseCompletedCount = baseExercises.filter((ex) =>
      ex.sets.some((s) => s.done)
    ).length;

    const missing = Math.max(0, baseExercises.length - baseCompletedCount);

    const extraDoneCount =
      extraExercises.filter((ex) => ex.sets.some((s) => s.done)).length +
      (runMeters > 0 ? 1 : 0);

    let mult = 1.0 - 0.1 * missing + 0.1 * extraDoneCount;
    mult = Math.max(0.5, Math.min(1.5, mult));

    const raw = baseSum + extraSum + runMeters;
    const finalXP = Math.round(raw * mult);

    return {
      baseSum,
      extraSum,
      runXP: runMeters,
      missing,
      extraDoneCount,
      mult,
      raw,
      finalXP,
    };
  }, [exercises, runMeters]);

  const lv = computeLevel(totalXP);
  const title = TITLES[Math.min(lv.level - 1, TITLES.length - 1)];
  const progress = lv.toNext === 0 ? 100 : Math.min(100, (lv.into / lv.toNext) * 100);

  const updateSetField = (
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: number
  ) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((set, j) =>
                j === setIdx ? { ...set, [field]: value } : set
              ),
            }
          : ex
      )
    );
  };

  const toggleSetDone = (exIdx: number, setIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((set, j) =>
                j === setIdx ? { ...set, done: !set.done } : set
              ),
            }
          : ex
      )
    );
  };

  const addSet = (exIdx: number) => {
    setExercises((prev) =>
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
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
      prev.map((ex, i) => {
        if (i !== exIdx) return ex;
        if (ex.sets.length <= 1) return ex;
        return {
          ...ex,
          sets: ex.sets.slice(0, -1),
        };
      })
    );
  };

  const addExtraExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        key: `extra_${Date.now()}`,
        name: "追加種目",
        isBase: false,
        sets: [{ weight: 20, reps: 10, done: false }],
      },
    ]);
  };

  const updateExerciseName = (exIdx: number, name: string) => {
    setExercises((prev) =>
      prev.map((ex, i) => (i === exIdx ? { ...ex, name } : ex))
    );
  };

  const resetToday = () => {
    setExercises((prev) => resetDoneOnly(prev));
    setRunMeters(0);
    setTodayDate(new Date().toISOString().slice(0, 10));
  };

  const commitToday = () => {
    const memo = `倍率${calc.mult.toFixed(2)} / 欠け${calc.missing} / 追加${calc.extraDoneCount} / ラン${pretty(calc.runXP)}XP`;
    setTotalXP((v) => v + calc.finalXP);
    setNotes((arr) => [
      { date: todayDate, xp: calc.finalXP, memo },
      ...arr,
    ]);

    // 前回入力値を維持しつつ、完了だけリセット
    setExercises((prev) => resetDoneOnly(prev));
    setRunMeters(0);
    setTodayDate(new Date().toISOString().slice(0, 10));
  };

  const exportJSON = () => {
    const payload: SavedState = {
      totalXP,
      notes,
      todayDate,
      exercises,
      runMeters,
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
          const obj: SavedState = JSON.parse(String(reader.result));
          if (typeof obj.totalXP === "number") setTotalXP(obj.totalXP);
          if (Array.isArray(obj.notes)) setNotes(obj.notes);
          if (typeof obj.todayDate === "string") setTodayDate(obj.todayDate);
          if (Array.isArray(obj.exercises)) setExercises(obj.exercises);
          if (typeof obj.runMeters === "number") setRunMeters(obj.runMeters);
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
    if (!confirm("全データをリセットしますか？")) return;
    setTotalXP(493928);
    setNotes([]);
    setTodayDate(new Date().toISOString().slice(0, 10));
    setExercises(createInitialExercises());
    setRunMeters(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
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
            </div>
            <div className="w-full md:w-1/2">
              <div className="text-sm mb-1">
                次のレベルまで：{pretty(Math.max(0, lv.toNext - lv.into))} XP
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${progress}%` }}
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
              今日の完了状態をリセット
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

        {/* Today */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">今日のトレーニング</h2>
            <input
              type="date"
              value={todayDate}
              onChange={(e) => setTodayDate(e.target.value)}
              className="border rounded-lg px-3 py-2 h-11 text-base bg-white text-black"
            />
          </div>

          {exercises.map((ex, exIdx) => (
            <div key={ex.key} className="rounded-2xl border bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                {ex.isBase ? (
                  <div className="font-semibold text-lg">{ex.name}</div>
                ) : (
                  <input
                    value={ex.name}
                    onChange={(e) => updateExerciseName(exIdx, e.target.value)}
                    className="border rounded-lg px-3 py-2 h-11 text-base bg-white text-black w-full md:w-72"
                  />
                )}

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => addSet(exIdx)}
                    className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm"
                  >
                    ＋セット
                  </button>
                  <button
                    onClick={() => removeLastSet(exIdx)}
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

              {ex.sets.map((set, setIdx) => (
                <div
                  key={`${ex.key}-${setIdx}`}
                  className="grid grid-cols-12 gap-2 items-center rounded-xl p-3 bg-gray-50"
                >
                  <div className="col-span-12 md:col-span-2 font-medium">
                    Set {setIdx + 1}
                  </div>

                  <input
                    type="number"
                    value={set.weight}
                    onChange={(e) =>
                      updateSetField(exIdx, setIdx, "weight", Number(e.target.value || 0))
                    }
                    className="col-span-6 md:col-span-3 border rounded-lg px-3 py-2 h-11 text-base text-right bg-white text-black"
                  />

                  <input
                    type="number"
                    value={set.reps}
                    onChange={(e) =>
                      updateSetField(exIdx, setIdx, "reps", Number(e.target.value || 0))
                    }
                    className="col-span-6 md:col-span-3 border rounded-lg px-3 py-2 h-11 text-base text-right bg-white text-black"
                  />

                  <div className="col-span-6 md:col-span-2 text-sm md:text-right">
                    {pretty(set.weight * set.reps)} XP
                  </div>

                  <div className="col-span-6 md:col-span-2 flex justify-end md:justify-center">
                    <button
                      onClick={() => toggleSetDone(exIdx, setIdx)}
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
            </div>
          ))}

          <div className="pt-2">
            <button
              onClick={addExtraExercise}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
            >
              ＋追加種目
            </button>
          </div>

          <div className="space-y-2">
            <div className="font-semibold">ボーナス：ラントレ距離（m） = XP</div>
            <input
              type="number"
              value={runMeters}
              onChange={(e) => setRunMeters(Number(e.target.value || 0))}
              placeholder="例：2000"
              className="border rounded-lg px-3 py-2 h-11 text-base w-40 bg-white text-black"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-blue-50 p-4">
              <div className="font-semibold">本日のXP内訳</div>
              <div className="text-sm mt-1">
                基本：{pretty(calc.baseSum)} / 追加：{pretty(calc.extraSum)} / ラン：{pretty(calc.runXP)}
              </div>
              <div className="text-sm">
                倍率：{calc.mult.toFixed(2)}（欠け{calc.missing}・追加{calc.extraDoneCount}）
              </div>
              <div className="text-xl font-bold mt-2">
                最終XP：{pretty(calc.finalXP)} XP
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
                完了状態をリセット
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
              {notes.map((n, i) => (
                <div key={i} className="border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm opacity-70">{n.date}</div>
                  <div className="font-semibold">+{pretty(n.xp)} XP</div>
                  <div className="text-xs opacity-60">{n.memo}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* mobile fixed bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t p-3 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-gray-500">本日の最終XP</div>
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
    </div>
  );
}
