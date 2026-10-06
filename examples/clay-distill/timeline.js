// timeline.js —— 全片唯一时间源《炼不化的黏土》。画面与音效都从这里取时间。
(function (global) {
  const T = {
    fps: 30,
    duration: 30,

    // ---- beat 边界（秒），2 帧一拍 = 450 pose ----
    openEnd: 3.0,        // 0–3  全景炼化中
    d1Start: 3.0, d1End: 8.0,    // 报表 +128 token -> 35%
    d2Start: 8.0, d2End: 13.0,   // 文案 +256 -> 60%
    d3Start: 13.0, d3End: 18.0,  // 数据 +512 -> 90%
    stuckStart: 18.0, stuckEnd: 22.0, // 人际：手背后死攥，卡 90% 闪，AI buzz
    smashTime: 22.0,            // 拍扁成完美白球
    victoryEnd: 26.0,           // 22–26 假胜利：蒸馏完成 100% + 已炼化章
    reversalStart: 26.0,        // 反转开始
    possumPose: 27.0,           // 真小黏站定（负鼠站姿，4 帧一拍）

    // 旁白落点（mix_voice.py 使用；这里仅记录便于对齐）
    voice: [
      { at: 1.0, file: 'voice/v1_trim.wav' },
      { at: 8.6, file: 'voice/v2_trim.wav' },
      { at: 16.0, file: 'voice/v3_spd.wav' },
      { at: 21.0, file: 'voice/v4_trim.wav' },
      { at: 26.0, file: 'voice/v5_spd.wav' },
    ],
  };

  // ---------------- 音效线索 ----------------
  const C = [];
  const add = (t, s, opts) => C.push(Object.assign({ t, s }, opts || {}));

  add(0, 'room');
  add(0, 'hum', { dur: 26.0 });

  // 三段吸技能：带通噪声下行 + 80Hz 啵，覆盖整个炼化段
  add(T.d1Start, 'suck', { dur: T.d1End - T.d1Start });
  add(T.d2Start, 'suck', { dur: T.d2End - T.d2Start });
  add(T.d3Start, 'suck', { dur: T.stuckEnd - T.d3Start });
  // 每段收尾一个 80Hz 啵
  add(T.d1End, 'boop');
  add(T.d2End, 'boop');
  add(T.d3End, 'boop');

  // +token = 钟琴上行五度
  add(T.d1End, 'tokending');
  add(T.d2End, 'tokending');
  add(T.d3End, 'tokending');

  // 揉黏土（拍扁段持续）
  add(T.smashTime, 'knead', { dur: T.victoryEnd - T.smashTime });

  // AI 卡住：重复 buzz
  [18.55, 19.1, 19.65, 20.2, 20.75, 21.3].forEach(t => add(t, 'buzz'));
  add(21.7, 'glitch');

  // 拍扁 = 120->40Hz 低频下压
  add(T.smashTime, 'smash');
  add(T.smashTime, 'low');

  // 已炼化章砸下
  add(24.0, 'stamp');
  add(24.0, 'low');

  // 反转
  add(26.2, 'spring');
  add(26.6, 'boop');
  add(28.6, 'ding');

  const SFX_CUES = C.sort((a, b) => a.t - b.t);

  global.T = T;
  global.SFX_CUES = SFX_CUES;
  if (typeof module !== 'undefined' && module.exports) module.exports = { T, SFX_CUES };
})(typeof window !== 'undefined' ? window : globalThis);
