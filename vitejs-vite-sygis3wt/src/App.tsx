import React, { useEffect, useMemo, useState } from 'react';

/** ========= Types ========= */
type Exercise = {
  key: string;
  name: string;
  defaultWeight: number;
  defaultReps: number;
  defaultSets: number;
};
type TodayItem = Exercise & {
  weight: number;
  reps: number;
  sets: number;
  done: boolean;
};
type ExtraItem = {
  key: string;
  name: string;
  weight: number;
  reps: number;
  sets: number;
  done: boolean;
};
type Note = { date: string; xp: number; memo: string };

/** ========= Constants ========= */
const LS_KEY = 'xp_tracker_full_v3'; // バージョンアップ時はキーも更新

// 基本メニュー（あなたの標準設定）
const BASE_EXS: Exercise[] = [
  {
    key: 'chest',
    name: 'チェストプレス',
    defaultWeight: 36,
    defaultReps: 10,
    defaultSets: 2,
  },
  {
    key: 'row',
    name: 'シーテッドロー',
    defaultWeight: 39,
    defaultReps: 10,
    defaultSets: 2,
  },
  {
    key: 'lat',
    name: 'ラットプルダウン',
    defaultWeight: 45,
    defaultReps: 10,
    defaultSets: 2,
  },
  {
    key: 'leg',
    name: 'レッグプレス',
    defaultWeight: 100,
    defaultReps: 10,
    defaultSets: 2,
  },
  {
    key: 'crun',
    name: 'アブドミナルクランチ',
    defaultWeight: 45,
    defaultReps: 15,
    defaultSets: 2,
  },
  {
    key: 'curl',
    name: 'アームカール',
    defaultWeight: 32,
    defaultReps: 10,
    defaultSets: 2,
  },
];

// ユーモア称号（Lv1〜）
const TITLES = [
  '筋トレ見習い',
  '初級プロテイン飲み',
  '追い込みビギナー',
  'セット職人',
  '高重量の志願者',
  'ルーティン守護者',
  '意識高い系マッスル',
  'ジムの住人',
  '上腕二頭筋の語り部',
  '筋肉痛の虜',
  '部位分割の伝達者',
  '追い込みの求道者',
  'インクラインの探究者',
  'フォーム警察',
  '筋肥大の探求者',
  'ストリクトの賢者',
  'ボディメイクの革命児',
  '減量期の鬼',
  '管理人',
  '増量期の化身',
  '高タンパクの伝道師',
  '魔術師',
  '錬金術師',
  'ホエイ界の審査員',
  '筋肉の哲学者',
  'フォーム錬成の達人',
  '爆伸びの旅人',
  'パンプの召喚士',
  'ドロップセットの覇者',
  'スーパーセットの舞姫',
  '可動域の吟遊詩人',
  '効かせの吟味者',
  'セット間の賢者',
  '筋線維の支配者',
  '高密度ボディの錬成者',
  'マシン支配の覇者',
  '鍛錬の求道者',
  'レップの魔術師',
  '筋肉構築の建築士',
  '重量との対話者',
  '限界突破の戦士',
  '鉄と汗の預言者',
  'ウェイトの賢者',
  'トレーニングの巨人',
  '肉体改造の伝説',
  '筋力の守護者',
  '鍛錬界の革命児',
  '成長記録の伝道師',
  'セット回数の覇王',
  '筋帝王',
];

// Lv1→2必要XP=2000、以降1.18倍（Lv50想定）
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
const pretty = (n: number) => n.toLocaleString();

function computeLevel(totalXP: number) {
  let lvl = 1,
    rest = totalXP;
  for (let i = 0; i < LEVEL_NEEDS.length; i++) {
    const need = LEVEL_NEEDS[i];
    if (rest >= need) (rest -= need), lvl++;
    else return { level: lvl, into: rest, toNext: need };
  }
  return { level: LEVEL_NEEDS.length + 1, into: 0, toNext: 0 };
}

/** ========= App ========= */
export default function App() {
  const [totalXP, setTotalXP] = useState<number>(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [today, setToday] = useState(() => ({
    date: new Date().toISOString().slice(0, 10),
    items: BASE_EXS.map<TodayItem>((e) => ({
      ...e,
      weight: e.defaultWeight,
      reps: e.defaultReps,
      sets: e.defaultSets,
      done: false,
    })),
    extras: [] as ExtraItem[],
    runMeters: 0,
    legExt: { weight: 73, reps: 10, sets: 2, done: false }, // 標準73kg希望
  }));

  // 初期ロード
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (typeof obj.totalXP === 'number') setTotalXP(obj.totalXP);
        if (Array.isArray(obj.notes)) setNotes(obj.notes);
        if (obj.today) setToday(obj.today);
      } catch {
        // noop
      }
    }
  }, []);

  // 保存
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ totalXP, notes, today }));
  }, [totalXP, notes, today]);

  /** ---- 集計ロジック ---- */
  const calc = useMemo(() => {
    const baseSum = today.items
      .filter((i) => i.done)
      .reduce((s, i) => s + i.weight * i.reps * i.sets, 0);
    const extrasSum = today.extras
      .filter((i) => i.done)
      .reduce((s, i) => s + i.weight * i.reps * i.sets, 0);
    const legExtXP = today.legExt.done
      ? today.legExt.weight * today.legExt.reps * today.legExt.sets
      : 0;
    const runXP = Number(today.runMeters) || 0; // ラン: 距離(m)=XP

    const missing = Math.max(
      0,
      BASE_EXS.length - today.items.filter((i) => i.done).length
    );
    const added =
      today.extras.filter((i) => i.done).length +
      (today.legExt.done ? 1 : 0) +
      (runXP > 0 ? 1 : 0);

    let mult = 1.0 - 0.1 * missing + 0.1 * added;
    mult = Math.max(0.5, Math.min(1.5, mult)); // 0.5〜1.5にクリップ

    const raw = baseSum + extrasSum + legExtXP + runXP;
    const finalXP = Math.round(raw * mult);
    return {
      baseSum,
      extrasSum,
      legExtXP,
      runXP,
      missing,
      added,
      mult,
      finalXP,
    };
  }, [today]);

  const lv = computeLevel(totalXP);
  const title = TITLES[Math.min(lv.level - 1, TITLES.length - 1)];
  const progress =
    lv.toNext === 0 ? 100 : Math.min(100, (lv.into / lv.toNext) * 100);

  /** ---- 便利関数 ---- */
  const toggleItem = (idx: number) =>
    setToday((p) => ({
      ...p,
      items: p.items.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)),
    }));

  const updateItem = (
    idx: number,
    field: 'weight' | 'reps' | 'sets',
    v: number
  ) =>
    setToday((p) => ({
      ...p,
      items: p.items.map((x, i) => (i === idx ? { ...x, [field]: v } : x)),
    }));

  const addExtra = () =>
    setToday((p) => ({
      ...p,
      extras: [
        ...p.extras,
        {
          key: `ex_${Date.now()}`,
          name: '追加種目',
          weight: 20,
          reps: 10,
          sets: 2,
          done: false,
        },
      ],
    }));

  const updateExtra = (idx: number, field: keyof ExtraItem, v: any) =>
    setToday((p) => ({
      ...p,
      extras: p.extras.map((x, i) => (i === idx ? { ...x, [field]: v } : x)),
    }));

  const resetToday = () =>
    setToday({
      date: new Date().toISOString().slice(0, 10),
      items: BASE_EXS.map<TodayItem>((e) => ({
        ...e,
        weight: e.defaultWeight,
        reps: e.defaultReps,
        sets: e.defaultSets,
        done: false,
      })),
      extras: [],
      runMeters: 0,
      legExt: { weight: 73, reps: 10, sets: 2, done: false },
    });

  const commitToday = () => {
    const memo = `倍率${calc.mult.toFixed(2)} / 欠け${calc.missing} / 追加${
      calc.added
    } / ラン${pretty(calc.runXP)}XP`;
    setTotalXP((v) => v + calc.finalXP);
    setNotes((arr) => [{ date: today.date, xp: calc.finalXP, memo }, ...arr]);
    resetToday();
  };

  const hardReset = () => {
    if (
      !confirm('すべてのデータ（総XP・履歴・今日の入力）をリセットしますか？')
    )
      return;
    setTotalXP(0);
    setNotes([]);
    resetToday();
  };

  // バックアップ（JSONダウンロード）
  const exportJSON = () => {
    const payload = { totalXP, notes, today };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xp-backup-${today.date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 復元（JSON読み込み）
  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(String(reader.result));
          if (typeof obj.totalXP === 'number') setTotalXP(obj.totalXP);
          if (Array.isArray(obj.notes)) setNotes(obj.notes);
          if (obj.today) setToday(obj.today);
          alert('復元しました！');
        } catch {
          alert('JSONの形式が不正です。');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /** ========= UI ========= */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6 pb-24 md:pb-8">
        {/* Header / Status */}
        <div className="rounded-2xl bg-white shadow p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                筋トレXPトラッカー（フル機能版）
              </h1>
              <div className="mt-2 text-sm">
                総経験値：
                <span className="font-semibold">{pretty(totalXP)}</span> XP
              </div>
              <div className="mt-2 text-sm">
                レベル：<span className="font-semibold">Lv {lv.level}</span>「
                {title}」
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
              今日の入力をリセット
            </button>
            <button
              onClick={hardReset}
              className="px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200"
            >
              全データをリセット
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

            {/* 総XPの手動引き継ぎ */}
            <label className="ml-auto flex items-center gap-2 text-sm">
              現在の総XPを上書き：
              <input
                type="number"
                className="border rounded-lg px-3 py-2 h-11 text-base w-40"
                value={totalXP}
                onChange={(e) => setTotalXP(Number(e.target.value || 0))}
              />
            </label>
          </div>
        </div>

        {/* 今日の入力 */}
        <div className="rounded-2xl bg-white shadow p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">今日のトレーニング</h2>
            <div className="text-sm opacity-70">日付：{today.date}</div>
          </div>

          {/* ラベル行（PCのみ表示） */}
          <div className="hidden md:grid grid-cols-12 gap-2 text-sm font-medium px-1">
            <div className="col-span-3">種目</div>
            <div className="col-span-2 text-right">重量(kg)</div>
            <div className="col-span-2 text-right">回数</div>
            <div className="col-span-2 text-right">セット</div>
            <div className="col-span-2 text-right">目安XP</div>
            <div className="col-span-1 text-center">実施</div>
          </div>

          {/* 基本6種目 */}
          {today.items.map((it, i) => (
            <div
              key={it.key}
              className="grid grid-cols-12 md:grid-cols-12 gap-2 items-center rounded-xl md:rounded-none p-3 md:p-0 bg-white md:bg-transparent shadow md:shadow-none"
            >
              <label className="col-span-12 md:col-span-3 font-medium flex items-center gap-2 text-base">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggleItem(i)}
                />
                {it.name}
              </label>
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={it.weight}
                onChange={(e) =>
                  updateItem(i, 'weight', Number(e.target.value))
                }
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={it.reps}
                onChange={(e) => updateItem(i, 'reps', Number(e.target.value))}
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={it.sets}
                onChange={(e) => updateItem(i, 'sets', Number(e.target.value))}
              />
              <div className="col-span-12 md:col-span-2 text-xs opacity-70 md:text-right">
                {pretty(Math.round(it.weight * it.reps * it.sets))} XP
              </div>
            </div>
          ))}

          {/* 追加種目 */}
          <div className="pt-2">
            <button
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200"
              onClick={addExtra}
            >
              ＋ 追加種目
            </button>
          </div>

          {today.extras.map((ex, i) => (
            <div
              key={ex.key}
              className="grid grid-cols-12 md:grid-cols-12 gap-2 items-center rounded-xl md:rounded-none p-3 md:p-0 bg-white md:bg-transparent shadow md:shadow-none"
            >
              <input
                className="col-span-12 md:col-span-3 border rounded-lg px-3 py-2 h-11 text-base"
                value={ex.name}
                onChange={(e) => updateExtra(i, 'name', e.target.value)}
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={ex.weight}
                onChange={(e) =>
                  updateExtra(i, 'weight', Number(e.target.value))
                }
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={ex.reps}
                onChange={(e) => updateExtra(i, 'reps', Number(e.target.value))}
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={ex.sets}
                onChange={(e) => updateExtra(i, 'sets', Number(e.target.value))}
              />
              <label className="col-span-12 md:col-span-2 font-medium flex items-center justify-start md:justify-center gap-2">
                <input
                  type="checkbox"
                  checked={ex.done}
                  onChange={() => updateExtra(i, 'done', !ex.done)}
                />
                実施
              </label>
              <div className="col-span-12 md:col-span-1 text-xs opacity-70 md:text-right">
                {pretty(Math.round(ex.weight * ex.reps * ex.sets))} XP
              </div>
            </div>
          ))}

          {/* ボーナス：レッグエクステンション */}
          <div className="mt-2 border-t pt-3">
            <div className="font-semibold mb-1">
              ボーナス：レッグエクステンション
            </div>
            <div className="grid grid-cols-12 md:grid-cols-12 gap-2 items-center rounded-xl md:rounded-none p-3 md:p-0">
              <label className="col-span-12 md:col-span-3 font-medium flex items-center gap-2 text-base">
                <input
                  type="checkbox"
                  checked={today.legExt.done}
                  onChange={() =>
                    setToday((p) => ({
                      ...p,
                      legExt: { ...p.legExt, done: !p.legExt.done },
                    }))
                  }
                />
                実施
              </label>
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={today.legExt.weight}
                onChange={(e) =>
                  setToday((p) => ({
                    ...p,
                    legExt: { ...p.legExt, weight: Number(e.target.value) },
                  }))
                }
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={today.legExt.reps}
                onChange={(e) =>
                  setToday((p) => ({
                    ...p,
                    legExt: { ...p.legExt, reps: Number(e.target.value) },
                  }))
                }
              />
              <input
                className="col-span-4 md:col-span-2 border rounded-lg px-3 py-2 h-11 text-base text-right"
                type="number"
                value={today.legExt.sets}
                onChange={(e) =>
                  setToday((p) => ({
                    ...p,
                    legExt: { ...p.legExt, sets: Number(e.target.value) },
                  }))
                }
              />
              <div className="col-span-12 md:col-span-2 text-xs opacity-70 md:text-right">
                {today.legExt.done
                  ? pretty(
                      today.legExt.weight *
                        today.legExt.reps *
                        today.legExt.sets
                    )
                  : 0}{' '}
                XP
              </div>
            </div>
          </div>

          {/* ボーナス：ラントレ */}
          <div className="mt-2">
            <div className="font-semibold mb-1">
              ボーナス：ラントレ距離（m） = XP
            </div>
            <input
              className="border rounded-lg px-3 py-2 h-11 text-base w-40"
              type="number"
              value={today.runMeters}
              onChange={(e) =>
                setToday((p) => ({
                  ...p,
                  runMeters: Number(e.target.value || 0),
                }))
              }
              placeholder="例：2000"
            />
          </div>

          {/* 集計 */}
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-blue-50 p-3">
              <div className="font-semibold">本日のXP内訳</div>
              <div className="text-sm">
                基本：{pretty(calc.baseSum)} / 追加：{pretty(calc.extrasSum)} /
                レッグEX：{pretty(calc.legExtXP)} / ラン：{pretty(calc.runXP)}
              </div>
              <div className="text-sm">
                倍率：{calc.mult.toFixed(2)}（欠け{calc.missing}・追加
                {calc.added}）
              </div>
              <div className="text-xl font-bold mt-1">
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
                今日の入力をリセット
              </button>
            </div>
          </div>
        </div>

        {/* 履歴 */}
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

      {/* ---- モバイル固定バー ---- */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t p-3 z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
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

      <footer className="hidden md:block text-xs opacity-60 text-center py-6">
        © 筋トレXPトラッカー – ローカル保存版（必要に応じて Firebase / Supabase
        同期へ拡張可能）
      </footer>
    </div>
  );
}
