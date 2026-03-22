import { FormEvent, useEffect, useMemo, useState } from "react";

type Source = "google" | "youtube" | "shorts" | "tiktok";
type VideoPlatform = "youtube" | "shorts" | "tiktok";
type TopResult = { title: string; url: string; query: string; kind: "video" | "site" };
type SourceData = { suggestions: string[]; tags: string[]; score: number; top?: TopResult; error?: string };
type ResultMap = Partial<Record<Source, SourceData>>;
type ChannelPlatform = "youtube" | "tiktok";
type ChannelItem = {
  platform: ChannelPlatform;
  name: string;
  url: string;
  followers?: string;
  score: number;
};
type TitleCandidate = { text: string; score: number };
type RankedTitleCandidate = TitleCandidate & { last: string };
type QueryCandidate = { text: string; score: number };
type MusicTrack = { title: string; url: string; query: string; score: number; reason: string };
type VideoSeoAnalysis = {
  platform: VideoPlatform;
  url: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  score: number;
  recommendations: string[];
  improvedTitles: string[];
};
type AnalyticsReport = {
  intent: string;
  competition: { score: number; label: string };
  demandScore: number;
  difficultyScore: number;
  viralPotential: number;
  coverage: number;
  serpMatch: number;
  tagSeoCoverage: number;
  liveSignals: number;
  dataFreshness: number;
  sourceReliability: number;
  overallConfidence: number;
  bestPlatform: string;
  trendTokens: string[];
  querySeo: number;
  titleSeo: number;
  platformTitleSeo: Record<VideoPlatform, number>;
  platformIntentFit: Record<VideoPlatform, number>;
  semanticRelevance: number;
  titleQuality: number;
  keywordGap: number;
  longTailPotential: number;
  ctrPotential: number;
  seoOpportunity: number;
  keywordIntentMatch: number;
  crossPlatformConsistency: number;
  keywordDensity: number;
  titleUniqueness: number;
  trendCoverage: number;
  titleMatchTopSerp: number;
  topResultRelevance: number;
  tiktokSignal: number;
  exactMatchScore: number;
  sourceConsensus: number;
  semanticStability: number;
  seoPower: number;
  queryTitleAlignment: number;
  keywordClusterQuality: number;
  intentConsistency: number;
  serpVolatility: number;
  contentReadiness: number;
  winProbability: number;
  recommendations: string[];
};
type GeneratedData = {
  improvedQuery: string;
  improvedTags: string[];
  bestTitle: string;
  bestTitles: Record<VideoPlatform, string>;
  titlesByPlatform: Record<VideoPlatform, TitleCandidate[]>;
  bestQuery: string;
  queryOptions: QueryCandidate[];
  musicTracks: MusicTrack[];
  analytics: AnalyticsReport;
};
type FetchPayload = { suggestions: string[]; top?: TopResult };

const STOP_WORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "you",
  "your",
  "how",
  "что",
  "это",
  "как",
  "для",
  "или",
  "без",
  "под",
  "про",
]);

const TITLE_BANNED_WORDS = new Set(["теги", "тег", "хэштеги", "hashtags", "tags", "tag", "практики"]);
const VIDEO_INTENT_WORDS = ["как", "гайд", "обзор", "пошагово", "с нуля", "без ошибок", "tutorial", "guide"];
const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  youtube: "YouTube",
  shorts: "YouTube Shorts",
  tiktok: "TikTok",
};
const PLATFORM_INTENT_WORDS: Record<VideoPlatform, string[]> = {
  youtube: ["гайд", "пошагово", "обзор", "инструкция", "tutorial", "guide"],
  shorts: ["shorts", "быстро", "за минуту", "коротко", "за 30 секунд"],
  tiktok: ["тренд", "вирус", "лайфхак", "челлендж", "что залетает"],
};
const MUSIC_INTENT_MAP = {
  "Информационный": ["background", "ambient", "cinematic", "focus"],
  "Обучающий": ["tutorial", "lofi", "focus", "study"],
  "Коммерческий": ["upbeat", "promo", "corporate", "energy"],
  "Сравнение": ["tech", "future", "minimal", "background"],
} as const;
const MUSIC_POSITIVE_WORDS = [
  "music",
  "instrumental",
  "audio",
  "beat",
  "track",
  "song",
  "lofi",
  "ambient",
  "background",
  "remix",
  "ost",
];
const MUSIC_NEGATIVE_WORDS = ["как", "tutorial", "гайд", "обзор", "новости", "стрим", "reaction", "реакция", "vlog", "подкаст", "интервью"];
const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const GLOSSARY: Record<string, string> = {
  SEO: "Search Engine Optimization: оптимизация контента под поиск и рекомендации.",
  SERP: "Search Engine Results Page: страница результатов поиска по запросу.",
  CTR: "Click-Through Rate: доля кликов по ролику среди показов.",
  "Long-tail": "Низкочастотные и точные фразы, которые дают более целевой трафик.",
  "SEO Opportunity": "Потенциал роста в поиске при текущем спросе и конкуренции.",
  "Intent match": "Насколько формулировки совпадают с намерением пользователя.",
  "Platform Intent Fit": "Насколько заголовок адаптирован под поведение аудитории конкретной платформы.",
  "Keyword Density": "Плотность ключевых слов без переспама.",
  "Cross-platform consistency": "Согласованность смысла между YouTube, Shorts и TikTok.",
  "Live signals": "Сигналы из текущих live-данных: подсказки, топ-результаты и их пересечения.",
  "Data freshness": "Актуальность данных: сколько источников успешно ответили прямо сейчас.",
  "Trend coverage": "Доля трендовых слов, которые реально попали в запрос, теги и названия.",
  "SERP title match": "Насколько названия похожи на формулировки из верхних результатов поиска.",
  "Top result relevance": "Насколько выбранные top-результаты платформ реально совпадают с исходным запросом.",
  "TikTok signal": "Сила live-сигналов TikTok: релевантность подсказок, наличие top-видео и устойчивость источника.",
  "Exact match": "Доля живых сигналов, где встречается исходная фраза запроса почти без изменений.",
  "Source consensus": "Насколько источники (Google/YouTube/Shorts/TikTok) подтверждают одни и те же ключевые слова.",
  "Semantic stability": "Стабильность семантики между источниками и top-результатами: чем выше, тем надежнее ядро.",
  "SEO Power": "Интегральная сила SEO-стратегии: спрос, совпадение с SERP, покрытие тегами и надежность live-сигналов.",
  "Query-title alignment": "Насколько выбранный запрос и заголовки используют одно и то же SEO-ядро.",
  "Keyword cluster quality": "Качество кластера ключей: есть ли устойчивые повторяемые темы в live-сигналах.",
  "Intent consistency": "Согласованность намерения пользователя между запросом, тегами и названиями.",
  "SERP volatility": "Насколько неоднородны верхние результаты поиска: высокий показатель = тема менее стабильна.",
  "Content readiness": "Готовность контента к публикации: интегральная оценка SEO, интента и покрытия семантики.",
  "Win probability": "Итоговый шанс продвинуться по запросу с текущими данными и SEO-ядром.",
};

const sourceMeta: Record<Source, { title: string; color: string }> = {
  google: { title: "Google Search", color: "from-white/70 to-zinc-100/70" },
  youtube: { title: "YouTube", color: "from-white/75 to-zinc-100/70" },
  shorts: { title: "YouTube Shorts", color: "from-white/72 to-zinc-100/68" },
  tiktok: { title: "TikTok", color: "from-white/70 to-zinc-100/65" },
};

const clean = (text: string) =>
  text
    .toLowerCase()
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (text: string) => clean(text).split(" ").filter((x) => x && x.length > 1);
const unique = (arr: string[]) => [...new Set(arr.map((x) => x.trim()).filter(Boolean))];
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const deTag = (s: string) => clean(s.replace(/^#/, "").replace(/_/g, " "));
const dedupeWords = (s: string) => {
  const seen = new Set<string>();
  return s
    .split(/\s+/)
    .filter((w) => {
      const key = clean(w);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" ");
};
const sanitizeTitle = (s: string) => {
  const words = s
    .replace(/[|/:]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !TITLE_BANNED_WORDS.has(clean(w)));
  return dedupeWords(words.join(" ")).replace(/\s+/g, " ").trim();
};
const sanitizeQueryText = (s: string) =>
  clean(s)
    .replace(/(^|\s)(теги|тег|hashtags?|tags?)($|\s)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
const getYoutubeId = (url: string) => {
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v") || "";
    if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const shorts = u.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/i)?.[1];
    if (shorts) return shorts;
    const pathId = u.pathname.match(/\/([a-zA-Z0-9_-]{11})$/)?.[1];
    return pathId || "";
  } catch {
    return url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] || "";
  }
};
const getTikTokId = (url: string) => {
  const decoded = (() => {
    try {
      const once = decodeURIComponent(url);
      try {
        return decodeURIComponent(once);
      } catch {
        return once;
      }
    } catch {
      return url;
    }
  })();
  return (
    decoded.match(/\/video\/(\d{8,})/)?.[1] ||
    decoded.match(/[?&](?:aweme_id|item_id)=(\d{8,})/)?.[1] ||
    decoded.match(/%2Fvideo%2F(\d{8,})/i)?.[1] ||
    ""
  );
};
const getYandexTrackInfo = (url: string) => {
  const m = url.match(/\/album\/(\d+)\/track\/(\d+)/);
  return m ? { albumId: m[1], trackId: m[2] } : null;
};
const unescapeJsonText = (s: string) =>
  s
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\u002f/g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, " ")
    .trim();
const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const scoreRelevance = (query: string, suggestions: string[]) => {
  const q = new Set(tokenize(query));
  if (!q.size || !suggestions.length) return 0;
  const ranked = suggestions.map((s, i) => {
    const t = new Set(tokenize(s));
    const intersection = [...q].filter((w) => t.has(w)).length;
    const union = new Set([...q, ...t]).size || 1;
    return (intersection / union) * (1 - i / (suggestions.length * 1.3));
  });
  const best = Math.max(...ranked);
  const avg = ranked.reduce((a, b) => a + b, 0) / ranked.length;
  return Math.min(100, Math.round((best * 0.65 + avg * 0.35) * 100));
};

const toTags = (suggestions: string[], source: Source) => {
  const weight = new Map<string, number>();
  suggestions.forEach((s, rank) => {
    const baseWeight = Math.max(1, 10 - rank);
    const words = tokenize(s).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    [clean(s), ...words].forEach((tag) => weight.set(tag, (weight.get(tag) || 0) + baseWeight));
  });
  return [...weight.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, 16)
    .map(([t]) =>
      source === "google" ? t : `#${t.replace(/\s+/g, source === "youtube" || source === "shorts" ? "" : "_")}`
    );
};

const buildWordWeight = (items: string[], multiplier = 1) => {
  const m = new Map<string, number>();
  items.forEach((item, i) => {
    const boost = Math.max(1, 12 - i) * multiplier;
    tokenize(item)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
      .forEach((w) => m.set(w, (m.get(w) || 0) + boost));
  });
  return m;
};

const classifyIntent = (query: string) => {
  const q = clean(query);
  if (/(купить|цена|стоимость|заказать|best|топ)\b/.test(q)) return "Коммерческий";
  if (/(vs|сравнение|или)\b/.test(q)) return "Сравнение";
  if (/(как|что|почему|гайд|tutorial|guide)\b/.test(q)) return "Обучающий";
  return "Информационный";
};

const textSeoScore = (text: string, query: string, trend: Map<string, number>) => {
  const words = tokenize(text);
  const qWords = new Set(tokenize(query));
  if (!words.length) return 0;
  const overlap = words.filter((w) => qWords.has(w)).length;
  const overlapRatio = overlap / Math.max(1, qWords.size);
  const trendScore = words.reduce((a, w) => a + (trend.get(w) || 0), 0) / words.length;
  const intentBoost = VIDEO_INTENT_WORDS.reduce((a, kw) => a + (text.includes(kw) ? 1 : 0), 0);
  const lenScore = clamp(100 - Math.abs(words.length - 8) * 8);
  return clamp(Math.round(overlapRatio * 55 + Math.min(30, trendScore * 1.8) + intentBoost * 6 + lenScore * 0.15));
};

const tokenOverlapRatio = (a: string, b: string) => {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  const inter = [...ta].filter((w) => tb.has(w)).length;
  return inter / Math.max(1, Math.min(ta.size, tb.size));
};

const jaccard = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return 0;
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
};

const buildAnalytics = (
  query: string,
  results: ResultMap,
  allSuggestions: string[],
  tops: TopResult[],
  improvedTags: string[],
  bestQuery: string,
  bestTitles: Record<VideoPlatform, string>,
  queryOptions: QueryCandidate[]
): AnalyticsReport => {
  const baseTrend = mergeWeights(
    buildWordWeight(allSuggestions, 1.5),
    buildWordWeight(tops.map((t) => `${t.title} ${t.query}`), 1.3),
    buildWordWeight([query], 2)
  );
  const trendTokens = [...baseTrend.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !STOP_WORDS.has(w))
    .slice(0, 8);

  const qWords = new Set(tokenize(query));
  const suggestionTokenSet = new Set(tokenize(allSuggestions.join(" ")));
  const coverage = qWords.size ? Math.round(([...qWords].filter((w) => suggestionTokenSet.has(w)).length / qWords.size) * 100) : 0;
  const serpTokenSet = new Set(tokenize(tops.map((t) => `${t.title} ${t.query}`).join(" ")));
  const serpMatch = qWords.size ? Math.round(([...qWords].filter((w) => serpTokenSet.has(w)).length / qWords.size) * 100) : 0;
  const tagTokenSet = new Set(tokenize(improvedTags.map(deTag).join(" ")));
  const tagSeoCoverage = qWords.size ? Math.round(([...qWords].filter((w) => tagTokenSet.has(w)).length / qWords.size) * 100) : 0;

  const tokenRows = allSuggestions.map((s) => tokenize(s).filter((w) => !STOP_WORDS.has(w))).filter((r) => r.length);
  const uniqueTokenCount = new Set(tokenRows.flat()).size;
  const totalTokenCount = tokenRows.reduce((a, b) => a + b.length, 0) || 1;
  const diversity = uniqueTokenCount / totalTokenCount;
  const overlapAvg =
    tokenRows.length > 0
      ? tokenRows.reduce((acc, row) => {
          const rowSet = new Set(row);
          const overlap = [...qWords].filter((w) => rowSet.has(w)).length;
          return acc + overlap / Math.max(1, qWords.size);
        }, 0) / tokenRows.length
      : 0;
  const competitionScore = clamp(Math.round(overlapAvg * 62 + (1 - diversity) * 38));
  const competitionLabel = competitionScore > 70 ? "Высокая" : competitionScore > 45 ? "Средняя" : "Низкая";

  const sourceHealth = (["google", "youtube", "shorts", "tiktok"] as Source[]).map((s) => {
    const d = results[s];
    if (!d || d.error) return 22;
    return clamp(35 + d.score * 0.45 + Math.min(20, d.suggestions.length * 1.6) + (d.top ? 12 : 0));
  });
  const sourceReliability = Math.round(sourceHealth.reduce((a, b) => a + b, 0) / sourceHealth.length);
  const sourceRows = (["google", "youtube", "shorts", "tiktok"] as Source[]).map((s) => results[s]);
  const okSources = sourceRows.filter((d) => d && !d.error).length;
  const livePoints = sourceRows.reduce((acc, d) => acc + (d?.suggestions.length || 0) + (d?.top ? 4 : 0), 0);
  const liveSignals = clamp(Math.round(livePoints * 2.8));
  const dataFreshness = clamp(Math.round((okSources / 4) * 100));
  const difficultyScore = clamp(Math.round(competitionScore * 0.58 + sourceReliability * 0.22 + Math.max(0, 100 - dataFreshness) * 0.2));

  const platformScores = (Object.entries(results) as [Source, SourceData | undefined][]).map(([source, data]) => ({
    source,
    score: data && !data.error ? data.score + (data.top ? 8 : 0) + (data.suggestions.length > 6 ? 5 : 0) : 0,
  }));
  const best = platformScores.sort((a, b) => b.score - a.score)[0]?.source || "google";
  const bestPlatform = sourceMeta[best as Source]?.title || "Google Search";
  const platformTitleSeo: Record<VideoPlatform, number> = {
    youtube: textSeoScore(bestTitles.youtube, query, baseTrend),
    shorts: textSeoScore(bestTitles.shorts, query, baseTrend),
    tiktok: textSeoScore(bestTitles.tiktok, query, baseTrend),
  };
  const platformIntentFit: Record<VideoPlatform, number> = {
    youtube: clamp(
      Math.round(
        textSeoScore(`${bestTitles.youtube} ${bestQuery}`, query, baseTrend) * 0.72 +
          PLATFORM_INTENT_WORDS.youtube.reduce((a, kw) => a + (clean(bestTitles.youtube).includes(kw) ? 8 : 0), 0)
      )
    ),
    shorts: clamp(
      Math.round(
        textSeoScore(`${bestTitles.shorts} ${bestQuery}`, query, baseTrend) * 0.72 +
          PLATFORM_INTENT_WORDS.shorts.reduce((a, kw) => a + (clean(bestTitles.shorts).includes(kw) ? 8 : 0), 0)
      )
    ),
    tiktok: clamp(
      Math.round(
        textSeoScore(`${bestTitles.tiktok} ${bestQuery}`, query, baseTrend) * 0.72 +
          PLATFORM_INTENT_WORDS.tiktok.reduce((a, kw) => a + (clean(bestTitles.tiktok).includes(kw) ? 8 : 0), 0)
      )
    ),
  };
  const semanticRelevance = Math.round((coverage * 0.45 + sourceReliability * 0.25 + ((platformTitleSeo.youtube + platformTitleSeo.shorts + platformTitleSeo.tiktok) / 3) * 0.3));
  const qualityRows = Object.values(bestTitles).map((title) => {
    const words = tokenize(title);
    return words.length ? (new Set(words).size / words.length) * 100 : 0;
  });
  const titleQuality = Math.round(qualityRows.reduce((a, b) => a + b, 0) / Math.max(1, qualityRows.length));
  const longTailRows = queryOptions.map((item) => tokenize(item.text).length).filter(Boolean);
  const longTailPotential = clamp(Math.round((longTailRows.reduce((a, b) => a + (b >= 5 ? 14 : 7), 0) / Math.max(1, longTailRows.length)) * 6));
  const ctrHooks = ["как", "лучший", "быстро", "ошибок", "секунд", "тренд", "2026", "2027", "без"];
  const ctrRows = Object.values(bestTitles).map((t) => ctrHooks.reduce((a, w) => a + (clean(t).includes(w) ? 1 : 0), 0));
  const ctrPotential = clamp(Math.round((ctrRows.reduce((a, b) => a + b, 0) / Math.max(1, ctrRows.length)) * 18 + titleQuality * 0.28));
  const intentLex = VIDEO_INTENT_WORDS;
  const intentRows = [bestQuery, ...Object.values(bestTitles)];
  const keywordIntentMatch = clamp(
    Math.round(
      (intentRows.reduce(
        (acc, text) => acc + (intentLex.reduce((a, kw) => a + (clean(text).includes(kw) ? 1 : 0), 0) / Math.max(1, intentLex.length)) * 100,
        0
      ) /
        Math.max(1, intentRows.length)) *
        1.1
    )
  );
  const titleRows = Object.values(bestTitles);
  const crossPlatformConsistency = clamp(
    Math.round(
      ((tokenOverlapRatio(titleRows[0], titleRows[1]) + tokenOverlapRatio(titleRows[0], titleRows[2]) + tokenOverlapRatio(titleRows[1], titleRows[2])) /
        3) *
        100
    )
  );
  const queryTokenSet = new Set(tokenize(bestQuery));
  const titleTokenSet = new Set(tokenize(titleRows.join(" ")));
  const overlap = [...queryTokenSet].filter((w) => titleTokenSet.has(w)).length;
  const keywordDensity = clamp(Math.round((overlap / Math.max(1, queryTokenSet.size)) * 100));
  const titleUniqRaw = titleRows.map((title) => {
    const words = tokenize(title);
    return words.length ? (new Set(words).size / words.length) * 100 : 0;
  });
  const titleUniqueness = clamp(Math.round(titleUniqRaw.reduce((a, b) => a + b, 0) / Math.max(1, titleUniqRaw.length)));
  const viralPotential = clamp(
    Math.round(
      ((results.shorts?.score || 0) * 0.33 +
        (results.tiktok?.score || 0) * 0.33 +
        ctrPotential * 0.2 +
        trendTokens.length * 1.8 +
        platformIntentFit.shorts * 0.07 +
        platformIntentFit.tiktok * 0.07)
    )
  );
  const semanticPool = new Set(tokenize(`${bestQuery} ${titleRows.join(" ")} ${improvedTags.map(deTag).join(" ")}`));
  const missingTrend = trendTokens.filter((w) => !semanticPool.has(w));
  const keywordGap = clamp(Math.round((missingTrend.length / Math.max(1, trendTokens.length)) * 100));
  const trendCoverage = clamp(100 - keywordGap);
  const topSerpRows = titleRows.map((title) => {
    if (!tops.length) return 0;
    const bestRow = tops
      .map((t) => tokenOverlapRatio(title, `${t.title} ${t.query}`))
      .sort((a, b) => b - a)[0];
    return Math.round(bestRow * 100);
  });
  const titleMatchTopSerp = clamp(Math.round(topSerpRows.reduce((a, b) => a + b, 0) / Math.max(1, topSerpRows.length)));
  const topResultRelevance = clamp(
    Math.round(
      (tops
        .map((t) => tokenOverlapRatio(`${t.title} ${t.query}`, query))
        .sort((a, b) => b - a)
        .slice(0, 3)
        .reduce((a, b) => a + b, 0) /
        Math.max(1, Math.min(3, tops.length))) *
        100
    )
  );
  const exactNeedle = clean(query);
  const exactRows = unique([
    ...allSuggestions,
    ...tops.map((t) => `${t.title} ${t.query}`),
    bestQuery,
    ...Object.values(bestTitles),
  ]);
  const exactMatchScore = clamp(
    Math.round(
      (exactRows.filter((row) => {
        const c = clean(row);
        if (!c || !exactNeedle) return false;
        if (c.includes(exactNeedle)) return true;
        const overlap = tokenOverlapRatio(c, exactNeedle);
        return overlap >= 0.8;
      }).length /
        Math.max(1, exactRows.length)) *
        100
    )
  );
  const activeSources = (["google", "youtube", "shorts", "tiktok"] as Source[])
    .map((s) => ({
      s,
      tokens: new Set(
        tokenize(`${results[s]?.suggestions.join(" ") || ""} ${results[s]?.top?.title || ""} ${results[s]?.top?.query || ""}`).filter(
          (w) => !STOP_WORDS.has(w)
        )
      ),
    }))
    .filter((x) => x.tokens.size > 0);
  let pairCount = 0;
  let pairAcc = 0;
  for (let i = 0; i < activeSources.length; i += 1) {
    for (let j = i + 1; j < activeSources.length; j += 1) {
      const a = activeSources[i].tokens;
      const b = activeSources[j].tokens;
      const inter = [...a].filter((w) => b.has(w)).length;
      const union = new Set([...a, ...b]).size || 1;
      pairAcc += inter / union;
      pairCount += 1;
    }
  }
  const sourceConsensus = clamp(Math.round(((pairAcc / Math.max(1, pairCount)) * 100) * 1.25));
  const semanticStability = clamp(
    Math.round(sourceConsensus * 0.5 + topResultRelevance * 0.2 + coverage * 0.15 + serpMatch * 0.15)
  );
  const queryTitleAlignment = clamp(
    Math.round(
      (tokenOverlapRatio(bestQuery, bestTitles.youtube) +
        tokenOverlapRatio(bestQuery, bestTitles.shorts) +
        tokenOverlapRatio(bestQuery, bestTitles.tiktok)) *
        (100 / 3)
    )
  );
  const keywordClusterQuality = (() => {
    const topTokens = trendTokens.slice(0, 6);
    if (!topTokens.length) return 0;
    const sources = (["google", "youtube", "shorts", "tiktok"] as Source[])
      .map((s) => tokenize(`${results[s]?.suggestions.join(" ") || ""} ${results[s]?.top?.title || ""}`))
      .filter((arr) => arr.length)
      .map((arr) => new Set(arr.filter((w) => !STOP_WORDS.has(w))));
    if (!sources.length) return 0;
    const tokenCoverage = topTokens.map((token) => sources.filter((set) => set.has(token)).length / sources.length);
    const meanCoverage = tokenCoverage.reduce((a, b) => a + b, 0) / tokenCoverage.length;
    return clamp(Math.round(meanCoverage * 100));
  })();
  const intentConsistency = (() => {
    const lex = new Set(VIDEO_INTENT_WORDS.flatMap((x) => tokenize(x)));
    const textRows = [bestQuery, ...Object.values(bestTitles), improvedTags.map(deTag).join(" ")].map(clean);
    const scored = textRows.map((row) => {
      const words = new Set(tokenize(row));
      const hit = [...lex].filter((kw) => words.has(kw)).length;
      return hit / Math.max(1, lex.size);
    });
    return clamp(Math.round((scored.reduce((a, b) => a + b, 0) / Math.max(1, scored.length)) * 300));
  })();
  const serpVolatility = (() => {
    const titleSets = tops.map((t) => new Set(tokenize(`${t.title} ${t.query}`))).filter((s) => s.size);
    if (titleSets.length < 2) return 55;
    let acc = 0;
    let pairs = 0;
    for (let i = 0; i < titleSets.length; i += 1) {
      for (let j = i + 1; j < titleSets.length; j += 1) {
        acc += jaccard(titleSets[i], titleSets[j]);
        pairs += 1;
      }
    }
    const stability = acc / Math.max(1, pairs);
    return clamp(Math.round((1 - stability) * 100));
  })();
  const tiktokSignal = (() => {
    const tt = results.tiktok;
    if (!tt || tt.error) return 20;
    const topBonus = tt.top && getTikTokId(tt.top.url) ? 28 : tt.top ? 12 : 0;
    return clamp(Math.round(tt.score * 0.62 + Math.min(22, tt.suggestions.length * 2.4) + topBonus));
  })();
  const avgPlatformIntentFit = Math.round(
    (platformIntentFit.youtube + platformIntentFit.shorts + platformIntentFit.tiktok) / 3
  );
  const overallConfidence = clamp(
    Math.round(
      sourceReliability * 0.3 +
        dataFreshness * 0.2 +
        liveSignals * 0.17 +
        semanticRelevance * 0.2 +
        topResultRelevance * 0.08 +
        tiktokSignal * 0.05
    )
  );
  const demandScore = clamp(
    Math.round(
      liveSignals * 0.4 +
        coverage * 0.12 +
        serpMatch * 0.11 +
        Math.min(100, allSuggestions.length * 4) * 0.14 +
        topResultRelevance * 0.13 +
        tiktokSignal * 0.1
    )
  );
  const seoOpportunity = clamp(
    Math.round(
      coverage * 0.18 +
        serpMatch * 0.14 +
        tagSeoCoverage * 0.12 +
        longTailPotential * 0.16 +
        ctrPotential * 0.09 +
        sourceReliability * 0.11 +
        topResultRelevance * 0.1 +
        avgPlatformIntentFit * 0.1
    )
  );
  const seoPower = clamp(
    Math.round(
      seoOpportunity * 0.26 +
        sourceReliability * 0.12 +
        semanticStability * 0.16 +
        exactMatchScore * 0.1 +
        sourceConsensus * 0.1 +
        querySeoBoost(bestQuery, query) * 0.08 +
        titleMatchTopSerp * 0.09 +
        tagSeoCoverage * 0.09
    )
  );
  const contentReadiness = clamp(
    Math.round(
      seoPower * 0.22 +
        queryTitleAlignment * 0.16 +
        keywordClusterQuality * 0.14 +
        intentConsistency * 0.14 +
        trendCoverage * 0.12 +
        sourceReliability * 0.1 +
        (100 - serpVolatility) * 0.12
    )
  );
  const winProbability = clamp(
    Math.round(
      demandScore * 0.18 +
        (100 - difficultyScore) * 0.18 +
      seoPower * 0.14 +
      contentReadiness * 0.15 +
      overallConfidence * 0.15 +
        trendCoverage * 0.08 +
        titleMatchTopSerp * 0.08 +
        topResultRelevance * 0.08 +
      tiktokSignal * 0.04 +
      Math.max(0, 100 - serpVolatility) * 0.1
    )
  );
  const recommendations = [
    demandScore < 45
      ? "Спрос по live-данным умеренный: добавьте более конкретный контекст (гео, формат, боль пользователя)."
      : "Спрос подтвержден live-данными, можно запускать публикацию с текущим ядром ключей.",
    difficultyScore > 70
      ? "Ниша конкурентная: сделайте title более узким и вынесите long-tail фразу в первые 60 символов."
      : "Уровень конкуренции управляемый, можно масштабировать через 2-3 близких long-tail запроса.",
    viralPotential < 50
      ? "Виральный потенциал слабый: добавьте hook-формулировки под Shorts/TikTok и эмоциональный триггер в первые слова тайтла."
      : "Виральный потенциал высокий: сохраните текущий ритм заголовков и протестируйте 2 обложки.",
    longTailPotential < 65 ? "Увеличьте долю long-tail фраз: добавляйте цель и контекст (например, срок, инструмент, формат)." : "Long-tail покрытие хорошее, используйте 2-3 варианта запроса в описании и тайтле.",
    ctrPotential < 60 ? "Усильте CTR: добавьте в название конкретную выгоду или срок результата." : "CTR-сигнал сильный, сохраните текущий формат заголовков.",
    sourceReliability < 60 ? "Часть источников нестабильна, перезапустите анализ и сравните пересечения по токенам." : "Источники стабильны, можно публиковать и тестировать 2-3 варианта обложки.",
    serpMatch < 55 ? "Слабое совпадение с текущей SERP: добавьте в запрос формулировки из топ-результатов, чтобы повысить релевантность." : "SERP-совпадение хорошее: текущая формулировка близка к реальному спросу.",
    tagSeoCoverage < 60 ? "Теги слабо покрывают основной запрос: включите ключевые слова из ядра в первые 5-7 тегов." : "Покрытие запроса тегами хорошее, ядро ключей собрано корректно.",
    keywordIntentMatch < 55 ? "Добавьте в запрос и названия больше intent-слов (как, пошагово, с нуля, без ошибок), чтобы усилить SEO для видео." : "Intent-семантика сильная, формулировки хорошо подходят под видео-поиск.",
    crossPlatformConsistency < 40 ? "Сделайте общий смысл названий ближе между YouTube, Shorts и TikTok, сохранив ядро ключевых слов." : "Кросс-платформенная семантика стабильна, это помогает узнаваемости темы.",
    keywordDensity < 55 ? "Повышайте плотность ключа: включите 1-2 слова из главного запроса в каждое выбранное название." : "Плотность ключа в названиях хорошая, можно масштабировать под разные форматы ролика.",
    titleUniqueness < 75 ? "Удаляйте дубли слов и слабые хвосты в заголовках, чтобы увеличить уникальность и читаемость." : "Уникальность заголовков высокая, риск переспама ключами ниже.",
    titleMatchTopSerp < 45
      ? "Подстройте формулировки заголовков под лексику топ-результатов SERP, чтобы усилить совпадение с живым спросом."
      : "Названия хорошо совпадают с верхней SERP-лексикой, шанс ранжирования выше.",
    trendCoverage < 60
      ? `Добавьте в запросы и названия больше тренд-слов: ${missingTrend.slice(0, 4).join(", ") || "возьмите слова из блока трендов"}.`
      : "Тренды хорошо покрыты в запросе, тегах и заголовках.",
    topResultRelevance < 55
      ? "Top-результаты пока слабо совпадают с запросом: уточните формулировку и добавьте конкретный контекст темы."
      : "Top-результаты хорошо подтверждают реальную релевантность запроса.",
    exactMatchScore < 38
      ? "Добавьте исходную фразу запроса ближе к началу title и в первые теги: exact match сейчас слабый."
      : "Exact match достаточный: исходная фраза регулярно подтверждается live-сигналами.",
    sourceConsensus < 45
      ? "Источники расходятся по семантике: сузьте тему и используйте единое SEO-ядро в запросах/тайтлах."
      : "Источники показывают хорошее совпадение по ядру ключей.",
    semanticStability < 55
      ? "Семантика нестабильна между платформами: уберите лишние слова и сохраните 2-3 ключевых токена во всех вариантах."
      : "Семантика стабильна: запрос и контентная формулировка согласованы между платформами.",
    queryTitleAlignment < 60
      ? "Усильте связку запрос-тайтл: добавьте 1-2 ключа из выбранного запроса в начало каждого названия."
      : "Связка запрос-тайтл сильная: SEO-ядро выдержано во всех платформах.",
    keywordClusterQuality < 55
      ? "Кластер ключей рыхлый: сфокусируйтесь на 3-5 повторяемых токенах, которые подтверждаются в нескольких источниках."
      : "Кластер ключей устойчивый: live-источники подтверждают единое SEO-ядро.",
    intentConsistency < 52
      ? "Интент проседает: синхронизируйте формулировки запроса, тегов и названий под один сценарий пользователя."
      : "Интент согласован между запросом, тегами и названиями.",
    serpVolatility > 64
      ? "SERP волатильна: фиксируйте более узкий угол темы и тестируйте 2-3 заголовка каждую публикацию."
      : "SERP относительно стабильна: можно масштабировать текущую SEO-модель серией роликов.",
    contentReadiness < 62
      ? "Контент пока не полностью готов к публикации: доработайте тайтлы и ключевой кластер по рекомендациям выше."
      : "Контент готов к публикации: можно запускать A/B тест заголовков и обложек.",
    tiktokSignal < 45
      ? "Сигнал TikTok слабый: сузьте запрос и добавьте трендовый формат (челлендж, лайфхак, короткий сценарий)."
      : "TikTok-сигнал сильный: есть данные для релевантных тегов и видео-ориентира.",
    keywordGap > 45
      ? `В семантике не хватает тренд-слов: ${missingTrend.slice(0, 4).join(", ") || "добавьте слова из трендов"}.`
      : "Трендовые токены хорошо отражены в запросах, тегах и названиях.",
    overallConfidence < 65
      ? "Надежность live-данных средняя: повторите анализ и выберите пересечение токенов, которое сохраняется в 2+ источниках."
      : "Надежность live-данных высокая: можно запускать публикацию и A/B тест заголовков.",
  ];

  return {
    intent: classifyIntent(query),
    competition: { score: competitionScore, label: competitionLabel },
    demandScore,
    difficultyScore,
    viralPotential,
    coverage,
    serpMatch,
    tagSeoCoverage,
    liveSignals,
    dataFreshness,
    sourceReliability,
    overallConfidence,
    bestPlatform,
    trendTokens,
    querySeo: textSeoScore(bestQuery, query, baseTrend),
    titleSeo: Math.round((platformTitleSeo.youtube + platformTitleSeo.shorts + platformTitleSeo.tiktok) / 3),
    platformTitleSeo,
    platformIntentFit,
    semanticRelevance,
    titleQuality,
    keywordGap,
    longTailPotential,
    ctrPotential,
    seoOpportunity,
    keywordIntentMatch,
    crossPlatformConsistency,
    keywordDensity,
    titleUniqueness,
    trendCoverage,
    titleMatchTopSerp,
    topResultRelevance,
    tiktokSignal,
    exactMatchScore,
    sourceConsensus,
    semanticStability,
    seoPower,
    queryTitleAlignment,
    keywordClusterQuality,
    intentConsistency,
    serpVolatility,
    contentReadiness,
    winProbability,
    recommendations,
  };
};

const querySeoBoost = (bestQuery: string, query: string) => {
  const overlap = tokenOverlapRatio(bestQuery, query);
  const len = tokenize(bestQuery).length;
  const lenFit = Math.max(0, 1 - Math.abs(len - 6) * 0.1);
  return clamp(Math.round((overlap * 70 + lenFit * 30)));
};

const mergeWeights = (...maps: Map<string, number>[]) => {
  const out = new Map<string, number>();
  maps.forEach((m) => m.forEach((v, k) => out.set(k, (out.get(k) || 0) + v)));
  return out;
};

const improveQuery = (query: string, suggestions: string[]) => {
  const cleanQ = clean(query);
  if (!suggestions.length) return cleanQ;
  const qSet = new Set(tokenize(cleanQ));
  const freq = buildWordWeight(suggestions, 1);
  const candidates = unique([cleanQ, ...suggestions.map(clean)]).slice(0, 20);
  const ranked = candidates
    .map((c) => {
      const words = tokenize(c);
      const overlap = words.filter((w) => qSet.has(w)).length;
      const density = words.reduce((a, w) => a + (freq.get(w) || 0), 0) / (words.length || 1);
      const score = overlap * 4 + density + Math.max(0, 11 - words.length);
      return { c, score };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.c || cleanQ;
  const bestTokens = new Set(tokenize(best));
  const extras = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !bestTokens.has(w) && !qSet.has(w))
    .slice(0, 2);

  return unique([best, ...extras]).join(" ").replace(/\s+/g, " ").trim();
};

const buildPromotedQueries = (
  rawQuery: string,
  improvedBase: string,
  suggestions: string[],
  tops: TopResult[],
  tags: string[]
): QueryCandidate[] => {
  const year = new Date().getFullYear();
  const origin = sanitizeQueryText(rawQuery);
  const base = sanitizeQueryText(improvedBase || rawQuery);
  const sourcePool = unique([base, origin, ...suggestions.map(sanitizeQueryText), ...tops.map((t) => sanitizeQueryText(t.query))])
    .filter((x) => tokenize(x).length >= 2)
    .slice(0, 12);

  const trend = mergeWeights(
    buildWordWeight(suggestions, 1.5),
    buildWordWeight(tops.map((t) => `${t.title} ${t.query}`), 1.35),
    buildWordWeight(tags.map(deTag), 1.2),
    buildWordWeight([origin], 2)
  );
  const trendTail = [...trend.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !STOP_WORDS.has(w))
    .slice(0, 5);
  const tailVariants = unique([
    trendTail.slice(0, 2).join(" "),
    trendTail.slice(1, 3).join(" "),
    trendTail.slice(2, 4).join(" "),
  ]).filter(Boolean);

  const candidates = unique(
    sourcePool.flatMap((seed, i) => {
      const tail = tailVariants[i % Math.max(1, tailVariants.length)] || "";
      return [
        seed,
        `${seed} ${year}`,
        `как ${seed} пошагово`,
        `${seed} полный гайд`,
        `${seed} с нуля`,
        `${seed} без ошибок`,
        tail ? `${seed} ${tail}` : "",
      ];
    })
  )
    .map(sanitizeQueryText)
    .filter((x) => tokenize(x).length >= 3)
    .slice(0, 40);

  const qWords = new Set(tokenize(origin));
  const topWords = new Set(tokenize(tops.map((t) => `${t.title} ${t.query}`).join(" ")));
  const ranked = candidates
    .map((text) => {
      const words = tokenize(text);
      const overlap = words.filter((w) => qWords.has(w)).length;
      const topOverlap = words.filter((w) => topWords.has(w)).length;
      const trendScore = words.reduce((a, w) => a + (trend.get(w) || 0), 0) / words.length;
      const intentBoost = VIDEO_INTENT_WORDS.reduce((a, kw) => a + (text.includes(kw) ? 1 : 0), 0);
      const lenBonus = Math.max(0, 14 - Math.abs(8 - words.length));
      const score = overlap * 5 + topOverlap * 1.8 + trendScore + intentBoost * 2 + lenBonus;
      return { text, score, lastWord: words[words.length - 1] || "" };
    })
    .sort((a, b) => b.score - a.score);

  const selected: QueryCandidate[] = [];
  const usedLastWords = new Set<string>();
  ranked.forEach((r) => {
    if (selected.length >= 8) return;
    if (!r.lastWord || !usedLastWords.has(r.lastWord)) {
      selected.push({ text: r.text, score: r.score });
      if (r.lastWord) usedLastWords.add(r.lastWord);
    }
  });
  if (selected.length < 8) {
    ranked.forEach((r) => {
      if (selected.length >= 8) return;
      if (!selected.some((x) => x.text === r.text)) selected.push({ text: r.text, score: r.score - 2 });
    });
  }
  return selected;
};

const improveTags = (query: string, results: ResultMap) => {
  const fromSources = (["google", "youtube", "shorts", "tiktok"] as Source[]).flatMap((source) => {
    const data = results[source];
    if (!data || data.error) return [] as string[];
    const srcWeight = 1 + data.score / 100;
    return data.tags.map((t, i) => `${deTag(t)}|${Math.max(1, 14 - i) * srcWeight}`);
  });

  const weighted = new Map<string, number>();
  fromSources.forEach((row) => {
    const [tag, w] = row.split("|");
    const val = Number(w || 1);
    if (tag && tag.length > 2) weighted.set(tag, (weighted.get(tag) || 0) + val);
  });

  const freq = mergeWeights(buildWordWeight([query], 1.8), buildWordWeight([...weighted.keys()], 1.2));
  [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .forEach(([w, v]) => weighted.set(w, (weighted.get(w) || 0) + v));

  return [...weighted.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, 20)
    .map(([t]) => `#${t.replace(/\s+/g, "_")}`);
};

const titleScore = (title: string, query: string, freq: Map<string, number>, platform: VideoPlatform) => {
  const qWords = new Set(tokenize(query));
  const words = tokenize(title);
  if (!words.length) return 0;
  const overlap = words.filter((w) => qWords.has(w)).length;
  const trend = words.reduce((a, w) => a + (freq.get(w) || 0), 0) / words.length;
  const idealLen = Math.max(0, 14 - Math.abs(9 - words.length));
  const platformBoost = PLATFORM_INTENT_WORDS[platform].reduce((a, kw) => a + (title.includes(kw) ? 1 : 0), 0);
  const repeatPenalty = words.length - new Set(words).size;
  return overlap * 5 + trend + idealLen + platformBoost * 2 - repeatPenalty * 8;
};

const generateTitlesForPlatform = (
  query: string,
  bestQuery: string,
  platform: VideoPlatform,
  sourceSuggestions: string[],
  tags: string[],
  tops: TopResult[]
): RankedTitleCandidate[] => {
  const year = new Date().getFullYear();
  const primaryTag = deTag(tags[0] || "").split(" ").slice(0, 2).join(" ");
  const platformEndings: Record<VideoPlatform, string[]> = {
    youtube: ["пошагово", "полный гайд", "без ошибок", `${year}`],
    shorts: ["shorts", "за 30 секунд", "коротко и ясно", `${year}`],
    tiktok: ["что залетает", "тренд", "вирусный формат", `${year}`],
  };
  const seeds = unique([
    bestQuery,
    query,
    ...tops.map((t) => t.query),
    ...tops.map((t) => t.title),
    ...sourceSuggestions,
  ])
    .map(clean)
    .filter((s) => tokenize(s).length >= 2)
    .slice(0, 8);

  const freq = mergeWeights(
    buildWordWeight(sourceSuggestions, 1.6),
    buildWordWeight(tags.map(deTag), 1.2),
    buildWordWeight([query, bestQuery], 2)
  );
  const endings = platformEndings[platform];
  const rawTitles = seeds.flatMap((seed, i) => {
    const ending = endings[i % endings.length];
    const withTag = primaryTag ? `${cap(seed)} ${primaryTag} ${ending}` : "";
    return [
      `${cap(seed)} ${ending}`,
      `Как ${seed} ${ending}`,
      `${cap(seed)} ${i % 2 === 0 ? "разбор" : "инструкция"} ${year}`,
      `${cap(seed)} ${PLATFORM_LABEL[platform]} ${year}`,
      withTag,
    ];
  });

  return unique(rawTitles)
    .map((text) => sanitizeTitle(text))
    .filter((text) => {
      const words = tokenize(text);
      return words.length >= 3 && words.length === new Set(words).size;
    })
    .map((text) => ({ text, score: titleScore(text, bestQuery || query, freq, platform), last: tokenize(text).slice(-1)[0] || "" }))
    .sort((a, b) => b.score - a.score);
};

const pickDiverseTitles = (ranked: RankedTitleCandidate[], limit = 6): TitleCandidate[] => {
  const out: TitleCandidate[] = [];
  const lastUsed = new Set<string>();
  ranked.forEach((x) => {
    if (out.length >= limit) return;
    if (!x.last || !lastUsed.has(x.last)) {
      out.push({ text: x.text, score: x.score });
      if (x.last) lastUsed.add(x.last);
    }
  });
  if (out.length < limit) {
    ranked.forEach((x) => {
      if (out.length >= limit) return;
      if (!out.some((i) => i.text === x.text)) out.push({ text: x.text, score: x.score - 1 });
    });
  }
  return out;
};

const buildPlatformTitles = (
  query: string,
  bestQuery: string,
  results: ResultMap,
  tags: string[],
  tops: TopResult[]
) => {
  const platforms: VideoPlatform[] = ["youtube", "shorts", "tiktok"];
  const titlesByPlatform = platforms.reduce(
    (acc, platform) => {
      const sourceSuggestions = unique([
        ...(results[platform]?.suggestions || []),
        ...(results[platform]?.top ? [results[platform]?.top?.query || "", results[platform]?.top?.title || ""] : []),
      ]).slice(0, 16);
      const ranked = generateTitlesForPlatform(query, bestQuery, platform, sourceSuggestions, tags, tops);
      acc[platform] = pickDiverseTitles(ranked, 6);
      return acc;
    },
    { youtube: [], shorts: [], tiktok: [] } as Record<VideoPlatform, TitleCandidate[]>
  );
  const bestTitles: Record<VideoPlatform, string> = {
    youtube: titlesByPlatform.youtube[0]?.text || cap(bestQuery || query),
    shorts: titlesByPlatform.shorts[0]?.text || cap(bestQuery || query),
    tiktok: titlesByPlatform.tiktok[0]?.text || cap(bestQuery || query),
  };
  return { titlesByPlatform, bestTitles };
};

const jsonp = (url: string) =>
  new Promise<string[]>((resolve, reject) => {
    const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 99999)}`;
    const globalWindow = window as unknown as Record<string, unknown>;
    let settled = false;
    let timer = 0;
    const script = document.createElement("script");
    const cleanup = () => {
      script.remove();
      delete globalWindow[cb];
      clearTimeout(timer);
    };
    globalWindow[cb] = (data: unknown) => {
      if (settled) return;
      settled = true;
      try {
        if (Array.isArray(data) && Array.isArray(data[1])) resolve(data[1].slice(0, 12) as string[]);
        else reject(new Error("Некорректный ответ"));
      } finally {
        cleanup();
      }
    };
    script.src = `${url}&callback=${cb}`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Сервис временно недоступен"));
    };
    document.body.append(script);
    timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Таймаут запроса"));
    }, 6000);
  });

const fetchText = async (url: string, timeout = 7000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("Сервис недоступен");
    return (await res.text()).trim();
  } finally {
    clearTimeout(timer);
  }
};

const proxyUrls = (target: string) => [
  `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
  `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
  `https://cors.isomorphic-git.org/${target}`,
  `https://r.jina.ai/http://${target.replace(/^https?:\/\//, "")}`,
];

const fetchThroughProxies = async (target: string) => {
  for (const url of proxyUrls(target)) {
    try {
      const text = await fetchText(url);
      if (text) return text;
    } catch {
      // Try next proxy mirror.
    }
  }
  throw new Error("Сервис временно недоступен");
};

const parseGoogleTopSite = (html: string, query: string): TopResult | undefined => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchor = [...doc.querySelectorAll("a")].find((a) => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("/url?q=http") && !href.includes("webcache") && !href.includes("google.com");
  });
  const raw = anchor?.getAttribute("href") || "";
  const link = raw.match(/\/url\?q=([^&]+)/)?.[1];
  const title = anchor?.querySelector("h3")?.textContent?.trim() || anchor?.textContent?.trim() || "Релевантный сайт";
  if (!link) return undefined;
  return { title, url: decodeURIComponent(link), query, kind: "site" };
};

const parseYoutubeSearchTopVideo = (
  html: string,
  query: string,
  opts?: { preferShorts?: boolean; musicOnly?: boolean }
): TopResult | undefined => {
  const preferShorts = Boolean(opts?.preferShorts);
  const musicOnly = Boolean(opts?.musicOnly);
  const uniqueShortIds = unique([...html.matchAll(/(?:"url":"\\\/shorts\\\/|\/shorts\/)([a-zA-Z0-9_-]{11})/g)].map((m) => m[1] || "")).filter(
    (id) => /^[a-zA-Z0-9_-]{11}$/.test(id)
  );
  if (preferShorts && uniqueShortIds.length) {
    const topShortId = uniqueShortIds[0];
    return {
      title: `YouTube Shorts: ${query}`,
      url: `https://www.youtube.com/shorts/${topShortId}`,
      query,
      kind: "video",
    };
  }
  const idMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].slice(0, 20);
  const musicScore = (title: string) => {
    const t = clean(title);
    const plus = MUSIC_POSITIVE_WORDS.reduce((a, kw) => a + (t.includes(kw) ? 1 : 0), 0);
    const minus = MUSIC_NEGATIVE_WORDS.reduce((a, kw) => a + (t.includes(kw) ? 1 : 0), 0);
    const qOverlap = tokenOverlapRatio(title, query);
    return plus * 5 + qOverlap * 6 - minus * 6;
  };
  const videoItems = idMatches.map((m) => {
    const id = m[1];
    const idx = m.index || 0;
    const chunk = html.slice(Math.max(0, idx - 60), idx + 1000);
    const title =
      unescapeJsonText(chunk.match(/"title":\{"runs":\[\{"text":"([^"]+)/)?.[1] || "") ||
      unescapeJsonText(chunk.match(/"headline":\{"simpleText":"([^"]+)/)?.[1] || "");
    const isShort = /"url":"\\\/shorts\\\//.test(chunk) || /"overlayMetadata"/.test(chunk);
    return { id, title, isShort, musicRank: musicScore(title) };
  });

  const picked = musicOnly
    ? [...videoItems].sort((a, b) => b.musicRank - a.musicRank).find((v) => v.musicRank > 0)
    : preferShorts
      ? videoItems.find((v) => v.isShort)
      : videoItems.find((v) => !v.isShort) || videoItems[0];
  if (picked)
    return {
      title: picked.title || `YouTube видео: ${query}`,
      url: `https://www.youtube.com/watch?v=${picked.id}`,
      query,
      kind: "video",
    };

  const shortId = html.match(/"url":"\\\/shorts\\\/([a-zA-Z0-9_-]{11})/)?.[1];
  if (preferShorts && shortId)
    return {
      title: `YouTube Shorts: ${query}`,
      url: `https://www.youtube.com/shorts/${shortId}`,
      query,
      kind: "video",
    };

  if (preferShorts) return undefined;
  const watchId = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1];
  if (!watchId) return undefined;
  return { title: `YouTube видео: ${query}`, url: `https://www.youtube.com/watch?v=${watchId}`, query, kind: "video" };
};

const parseYoutubeFeedTopVideo = (xml: string, query: string): TopResult | undefined => {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const entry = doc.querySelector("entry");
  if (!entry) return undefined;
  const idRaw = entry.querySelector("yt\\:videoId")?.textContent?.trim() || "";
  const id = /^[a-zA-Z0-9_-]{11}$/.test(idRaw) ? idRaw : "";
  const title = entry.querySelector("title")?.textContent?.trim() || `YouTube видео: ${query}`;
  const link = entry.querySelector("link[rel='alternate']")?.getAttribute("href") || "";
  const url = id ? `https://www.youtube.com/watch?v=${id}` : link;
  if (!url) return undefined;
  return { title, url, query, kind: "video" };
};

const parseLooseJson = (raw: string) => {
  if (!raw) return null;
  const direct = raw.trim();
  if (!direct) return null;
  const variants = [direct, unescapeJsonText(direct)];
  for (const variant of variants) {
    try {
      return JSON.parse(variant);
    } catch {
      // Keep trying lightweight extraction below.
    }
  }

  const starts = [...direct.matchAll(/[\[{]/g)].map((m) => m.index || 0).slice(0, 24);
  for (const start of starts) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < direct.length; i += 1) {
      const ch = direct[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "{" || ch === "[") depth += 1;
      if (ch === "}" || ch === "]") depth -= 1;
      if (depth === 0) {
        const piece = direct.slice(start, i + 1);
        try {
          return JSON.parse(piece);
        } catch {
          break;
        }
      }
    }
  }
  return null;
};

const extractTikTokSuggestions = (raw: string) => {
  const data = parseLooseJson(raw) as Record<string, unknown> | null;
  const out: string[] = [];
  const push = (value: string) => {
    const text = unescapeJsonText(String(value || "")).trim();
    if (!text || text.length < 3 || text.length > 96) return;
    if (/https?:\/\//i.test(text) || /\.(jpg|jpeg|png|gif|mp4|webm)/i.test(text)) return;
    if (/^[\d\W_]+$/.test(text)) return;
    out.push(text);
  };

  const lists = [
    data?.sug_list,
    data?.sug_list_detail,
    (data?.data as Record<string, unknown> | undefined)?.sug_list,
    data?.data,
  ].filter(Array.isArray) as Array<Array<Record<string, unknown> | string>>;

  lists
    .flat()
    .forEach((x) => {
      if (typeof x === "string") {
        push(x);
        return;
      }
      push(String((x.content || x.keyword || x.title || x.challenge_name || x.text || "") as string));
    });

  const stack: unknown[] = data ? [data] : [];
  let guard = 0;
  while (stack.length && guard < 1800) {
    guard += 1;
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    Object.entries(cur as Record<string, unknown>).forEach(([k, v]) => {
      if (!v) return;
      if (typeof v === "string") {
        if (/(keyword|content|title|desc|query|challenge|sug|text)/i.test(k)) push(v);
        return;
      }
      if (typeof v === "object") stack.push(v);
    });
  }

  const fromRegex = [
    ...[...raw.matchAll(/"(?:content|keyword|title|challenge_name|desc|query)"\s*:\s*"([^"]+)"/g)].map((m) => m[1]),
    ...[...raw.matchAll(/#([\p{L}\p{N}_]{3,40})/gu)].map((m) => `#${m[1]}`),
  ];
  fromRegex.forEach(push);

  return unique(out).slice(0, 12);
};

const rankSuggestionsByQuery = (query: string, items: string[]) =>
  unique(items)
    .map((text, i) => {
      const overlap = tokenOverlapRatio(text, query);
      const fullMatch = clean(text).includes(clean(query)) ? 0.3 : 0;
      const lenFit = Math.max(0, 1 - Math.abs(tokenize(text).length - 4) * 0.12);
      const score = overlap * 0.65 + fullMatch + lenFit * 0.25 + Math.max(0, (12 - i) / 100);
      return { text, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.text)
    .slice(0, 12);

const extractTikTokTopVideo = (raw: string, query: string): TopResult | undefined => {
  const qWords = new Set(tokenize(query));
  const scoreCandidate = (title: string, rank = 0) => {
    const words = tokenize(title);
    if (!words.length || !qWords.size) return Math.max(0, 15 - rank);
    const inter = words.filter((w) => qWords.has(w)).length;
    return inter * 8 + (15 - rank);
  };

  const candidates: Array<{ url: string; title: string; score: number; id: string }> = [];
  const pushCandidate = (url: string, title: string, rank = 0, idHint = "") => {
    const fullUrl = url.startsWith("http") ? url : `https://www.tiktok.com${url}`;
    const id = idHint || getTikTokId(fullUrl);
    if (!id) return;
    const canonicalUrl = fullUrl.includes("/video/") ? fullUrl : `https://www.tiktok.com/@_/video/${id}`;
    const cleaned = unescapeJsonText(title).trim();
    candidates.push({
      url: canonicalUrl,
      title: cleaned || `TikTok видео по запросу: ${query}`,
      score: scoreCandidate(cleaned || query, rank) + (canonicalUrl.includes("/@") ? 4 : 0),
      id,
    });
  };

  const data = parseLooseJson(raw);
  const stack: unknown[] = data ? [data] : [];
  let guard = 0;
  while (stack.length && guard < 1600) {
    guard += 1;
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    const obj = cur as Record<string, unknown>;
    const aweme = (obj.aweme_info as Record<string, unknown> | undefined) || obj;
    const id = String((aweme.aweme_id || obj.aweme_id || obj.item_id || "") as string).trim();
    const uid = String(
      ((aweme.author as Record<string, unknown> | undefined)?.unique_id ||
        (obj.author as Record<string, unknown> | undefined)?.unique_id ||
        obj.unique_id ||
        "") as string
    ).trim();
    const title = String((aweme.desc || obj.desc || obj.title || "") as string).trim();
    const shareUrl = String((aweme.share_url || obj.share_url || "") as string).trim();
    if (id) pushCandidate(`https://www.tiktok.com/@${uid || "_"}/video/${id}`, title, 0, id);
    if (shareUrl) pushCandidate(shareUrl, title, 2, id);
    Object.values(obj).forEach((v) => v && typeof v === "object" && stack.push(v));
  }

  const rawUrls = [
    ...[...raw.matchAll(/"share_url"\s*:\s*"(https?:\\\/\\\/www\.tiktok\.com\\\/@[^"\\]+\\\/video\\\/\d+)"/g)].map((m, i) => ({
      url: unescapeJsonText(m[1].replace(/\\\//g, "/")),
      title: unescapeJsonText(raw.slice(Math.max(0, (m.index || 0) - 260), (m.index || 0) + 260).match(/"desc"\s*:\s*"([^"]{2,140})"/)?.[1] || ""),
      rank: i,
    })),
    ...[...raw.matchAll(/https?:\/\/www\.tiktok\.com\/@[^\s"']+\/video\/\d+/g)].map((m, i) => ({
      url: m[0],
      title: "",
      rank: i + 3,
    })),
    ...[...raw.matchAll(/\/@[^\s"']+\/video\/\d+/g)].map((m, i) => ({
      url: m[0],
      title: "",
      rank: i + 5,
    })),
  ];
  rawUrls.forEach((item) => pushCandidate(item.url, item.title, item.rank));

  const uniq = new Map<string, { url: string; title: string; score: number; id: string }>();
  candidates.forEach((c) => {
    const key = c.id || c.url;
    const prev = uniq.get(key);
    if (!prev || prev.score < c.score) uniq.set(key, c);
  });
  const best = [...uniq.values()].sort((a, b) => b.score - a.score)[0];
  if (!best) return undefined;
  return {
    title: best.title,
    url: best.url || `https://www.tiktok.com/@_/video/${best.id}`,
    query: best.title || query,
    kind: "video",
  };
};

const parseTikTokSearchTopVideo = (raw: string, query: string): TopResult | undefined => {
  const links = [...raw.matchAll(/(https?:\/\/www\.tiktok\.com\/@[^\s"']+\/video\/(\d{8,})(?:\?[^\s"']*)?)/g)]
    .slice(0, 12)
    .map((m, i) => ({ url: m[1], id: m[2], rank: i, idx: m.index || 0 }));
  if (!links.length) return undefined;
  const q = tokenize(query);
  const best = links
    .map((item) => {
      const chunk = raw.slice(Math.max(0, item.idx - 240), item.idx + 240);
      const title = unescapeJsonText(chunk.match(/"(?:desc|title)"\s*:\s*"([^"]{2,140})"/)?.[1] || "");
      const overlap = tokenize(title).filter((w) => q.includes(w)).length;
      return { ...item, title, score: overlap * 9 + (12 - item.rank) };
    })
    .sort((a, b) => b.score - a.score)[0];
  return {
    title: best.title || `TikTok видео: ${query}`,
    url: best.url,
    query: best.title || query,
    kind: "video",
  };
};

const parseTikTokTopFromSearchEngine = (raw: string, query: string): TopResult | undefined => {
  const decoded = safeDecode(raw);
  const urls = unique([
    ...[...decoded.matchAll(/https?:\/\/www\.tiktok\.com\/@[^\s"'<>]+\/video\/\d{8,}(?:\?[^\s"'<>]*)?/g)].map((m) => m[0]),
    ...[...decoded.matchAll(/uddg=(https%3A%2F%2Fwww\.tiktok\.com%2F%40[^&\s]+%2Fvideo%2F\d{8,}[^&\s]*)/gi)].map((m) => safeDecode(m[1])),
  ]).slice(0, 14);
  if (!urls.length) return undefined;
  const ranked = urls
    .map((url, rank) => {
      const id = getTikTokId(url);
      const idx = decoded.indexOf(url);
      const chunk = idx >= 0 ? decoded.slice(Math.max(0, idx - 220), idx + 220) : "";
      const title =
        unescapeJsonText(chunk.match(/(?:title|snippet|desc)\s*[:=]\s*"([^"]{4,140})"/i)?.[1] || "") ||
        `TikTok видео: ${query}`;
      const rel = tokenOverlapRatio(`${title} ${url}`, query);
      return { url, id, title, score: rel * 100 + (14 - rank) };
    })
    .filter((x) => x.id)
    .sort((a, b) => b.score - a.score)[0];
  if (!ranked) return undefined;
  return {
    title: ranked.title,
    url: ranked.url,
    query: ranked.title || query,
    kind: "video",
  };
};

const parseFollowerWeight = (value: string) => {
  const t = clean(value).replace(/,/g, ".");
  const n = Number(t.match(/\d+(?:\.\d+)?/)?.[0] || "0");
  if (!n) return 0;
  if (/[mb]n|млн|million|m\b/.test(t)) return n * 1000000;
  if (/тыс|k\b/.test(t)) return n * 1000;
  return n;
};

const fetchPopularYoutubeChannels = async (query: string): Promise<ChannelItem[]> => {
  const html = await fetchThroughProxies(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAg%253D%253D`
  );
  const blocks = [...html.matchAll(/"channelRenderer":\{([\s\S]*?)\},"trackingParams"/g)].slice(0, 24);
  const picked = blocks
    .map((m, i) => {
      const chunk = m[1];
      const title =
        unescapeJsonText(chunk.match(/"title":\{"simpleText":"([^"]+)"/)?.[1] || "") ||
        unescapeJsonText(chunk.match(/"title":\{"runs":\[\{"text":"([^"]+)"/)?.[1] || "");
      const handle = unescapeJsonText(chunk.match(/"canonicalBaseUrl":"(\\\/@[^"]+)"/)?.[1] || "").replace(/\\\//g, "/");
      const channelId = chunk.match(/"channelId":"([^"]+)"/)?.[1] || "";
      const followers =
        unescapeJsonText(chunk.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1] || "") ||
        unescapeJsonText(chunk.match(/"subscriberCountText":\{"runs":\[\{"text":"([^"]+)"/)?.[1] || "");
      const url = handle ? `https://www.youtube.com${handle}` : channelId ? `https://www.youtube.com/channel/${channelId}` : "";
      if (!title || !url) return null;
      const rel = tokenOverlapRatio(`${title} ${query}`, query) * 100;
      const followerWeight = Math.log10(parseFollowerWeight(followers) + 10) * 12;
      const score = rel + followerWeight + Math.max(0, 10 - i);
      return { platform: "youtube", name: title, url, followers, score } as ChannelItem;
    })
    .filter(Boolean) as ChannelItem[];

  if (picked.length) {
    return unique(picked.map((c) => c.url))
      .map((url) => picked.find((c) => c.url === url)!)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  // Fallback if channelRenderer is hidden in proxied response.
  return unique([...html.matchAll(/"url":"\\\/@([a-zA-Z0-9._-]{3,40})"/g)].map((m) => m[1]))
    .slice(0, 8)
    .map((handle, i) => ({
      platform: "youtube" as const,
      name: `@${handle}`,
      url: `https://www.youtube.com/@${handle}`,
      score: 70 - i,
    }));
};

const fetchPopularTikTokChannels = async (query: string): Promise<ChannelItem[]> => {
  const endpoints = [
    `https://www.tiktok.com/api/search/user/full/?keyword=${encodeURIComponent(query)}&from_source=search_box`,
    `https://www.tiktok.com/search/user?q=${encodeURIComponent(query)}`,
  ];
  let out: ChannelItem[] = [];
  for (const endpoint of endpoints) {
    for (const url of proxyUrls(endpoint)) {
      try {
        const raw = await fetchText(url);
        const data = parseLooseJson(raw);
        const stack: unknown[] = data ? [data] : [];
        let guard = 0;
        while (stack.length && guard < 1800) {
          guard += 1;
          const cur = stack.pop();
          if (!cur || typeof cur !== "object") continue;
          const obj = cur as Record<string, unknown>;
          const uid = String((obj.unique_id || obj.uniqueId || obj.sec_uid || "") as string).trim();
          const nickname = String((obj.nickname || obj.nick_name || obj.title || "") as string).trim();
          const follower = String((obj.follower_count || obj.followerCount || obj.fans || "") as string).trim();
          if (uid && uid.length > 1) {
            const name = nickname ? `${nickname} (@${uid})` : `@${uid}`;
            const rel = tokenOverlapRatio(`${name} ${query}`, query) * 100;
            const score = rel + Math.log10((Number(follower) || 0) + 10) * 12;
            out.push({ platform: "tiktok", name, url: `https://www.tiktok.com/@${uid}`, followers: follower, score });
          }
          Object.values(obj).forEach((v) => v && typeof v === "object" && stack.push(v));
        }

        const regexUsers = unique([
          ...[...raw.matchAll(/https?:\/\/www\.tiktok\.com\/@([a-zA-Z0-9._-]{2,40})/g)].map((m) => m[1]),
          ...[...raw.matchAll(/"unique_id"\s*:\s*"([a-zA-Z0-9._-]{2,40})"/g)].map((m) => m[1]),
        ]);
        regexUsers.slice(0, 12).forEach((uid, i) => {
          out.push({
            platform: "tiktok",
            name: `@${uid}`,
            url: `https://www.tiktok.com/@${uid}`,
            score: tokenOverlapRatio(uid, query) * 100 + (8 - i),
          });
        });

        if (out.length >= 8) break;
      } catch {
        // Next proxy.
      }
    }
    if (out.length >= 8) break;
  }
  return unique(out.map((x) => x.url))
    .map((url) => out.find((x) => x.url === url)!)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
};

const analyzeVideoByLink = async (url: string): Promise<VideoSeoAnalysis> => {
  const src = url.trim();
  if (!src) throw new Error("Введите ссылку на видео");
  const isYt = /youtu\.be|youtube\.com/i.test(src);
  const isTikTok = /tiktok\.com/i.test(src);
  if (!isYt && !isTikTok) throw new Error("Поддерживаются только YouTube и TikTok ссылки");

  if (isYt) {
    const id = getYoutubeId(src);
    if (!id) throw new Error("Не удалось определить YouTube video ID");
    const canonical = `https://www.youtube.com/watch?v=${id}`;
    const oembedRaw = await fetchThroughProxies(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`
    );
    const meta = (parseLooseJson(oembedRaw) || {}) as Record<string, unknown>;
    const title = String(meta.title || "").trim() || "YouTube video";
    const author = String(meta.author_name || "").trim() || "Unknown author";
    let description = "";
    let tags: string[] = [];
    try {
      const html = await fetchThroughProxies(canonical);
      description =
        unescapeJsonText(html.match(/"shortDescription":"([\s\S]*?)","isCrawlable"/)?.[1] || "")
          .replace(/\\n/g, " ")
          .slice(0, 320) || "";
      const kwRaw = html.match(/"keywords":\[([^\]]*)\]/)?.[1] || "";
      tags = unique([...kwRaw.matchAll(/"([^"]+)"/g)].map((m) => `#${deTag(m[1]).replace(/\s+/g, "_")}`)).slice(0, 12);
    } catch {
      // Metadata already enough for analysis.
    }

    const related = await jsonp(
      `https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&hl=ru&gl=ru&q=${encodeURIComponent(title)}`
    ).catch(() => [] as string[]);
    const trend = buildWordWeight(related.length ? related : [title], 1.4);
    const score = textSeoScore(title, title, trend);
    const titleWords = tokenize(title);
    const recs = [
      titleWords.length < 5 ? "Увеличьте длину названия до 6-10 слов для более точного SEO-интента." : "Длина названия в рабочем диапазоне для поиска.",
      score < 60 ? "Добавьте в начало названия главный ключ и конкретную выгоду пользователя." : "Название достаточно релевантно запросному кластеру.",
      tags.length < 5 ? "Добавьте 8-12 релевантных тегов, включая long-tail формулировки." : "Теги присутствуют, проверьте первые 5 на точное ядро.",
      !/(как|гайд|обзор|shorts|тренд|пошагово)/i.test(clean(title))
        ? "Добавьте intent-слово (как, обзор, гайд, shorts, тренд) для роста CTR и релевантности."
        : "Intent-слова в названии уже помогают ранжированию.",
    ];
    const improvedTitles = buildPromotedQueries(title, title, related, [], tags)
      .slice(0, 4)
      .map((x) => cap(sanitizeTitle(x.text)));

    return {
      platform: src.includes("/shorts/") ? "shorts" : "youtube",
      url: canonical,
      title,
      author,
      description,
      tags,
      score,
      recommendations: recs,
      improvedTitles,
    };
  }

  const html = await fetchThroughProxies(src);
  const title =
    unescapeJsonText(html.match(/"desc":"([^"]{4,220})"/)?.[1] || "") ||
    unescapeJsonText(html.match(/<title>([^<]{4,220})<\/title>/i)?.[1] || "") ||
    "TikTok video";
  const author =
    unescapeJsonText(html.match(/"nickname":"([^"]{2,120})"/)?.[1] || "") ||
    unescapeJsonText(html.match(/"uniqueId":"([^"]{2,80})"/)?.[1] || "") ||
    "TikTok author";
  const hashtags = unique([...html.matchAll(/#([\p{L}\p{N}_]{2,40})/gu)].map((m) => `#${m[1]}`)).slice(0, 12);
  const related = await jsonp(
    `https://suggestqueries.google.com/complete/search?client=chrome&hl=ru&gl=ru&q=${encodeURIComponent(`${title} tiktok`)}`
  ).catch(() => [] as string[]);
  const trend = buildWordWeight(related.length ? related : [title], 1.35);
  const score = textSeoScore(title, title, trend);
  const recs = [
    score < 58 ? "Добавьте в первые 4-6 слов названия главный запрос и формат ролика." : "Текст ролика хорошо совпадает с live-подсказками.",
    hashtags.length < 4 ? "Увеличьте число целевых хэштегов до 5-8 и добавьте 2 long-tail тега." : "Хэштеги присутствуют, держите баланс между широкими и узкими.",
    !/(тренд|вирус|лайфхак|челлендж|short)/i.test(clean(title))
      ? "Добавьте вирусный маркер (тренд, лайфхак, челлендж) для TikTok-интента."
      : "TikTok-интент выражен, это плюс для рекомендаций.",
  ];
  const improvedTitles = buildPromotedQueries(title, title, related, [], hashtags)
    .slice(0, 4)
    .map((x) => cap(sanitizeTitle(x.text)));

  return {
    platform: "tiktok",
    url: src,
    title,
    author,
    description: "",
    tags: hashtags,
    score,
    recommendations: recs,
    improvedTitles,
  };
};

const fetchGoogle = async (query: string): Promise<FetchPayload> => {
  const [suggestions, html] = await Promise.all([
    jsonp(`https://suggestqueries.google.com/complete/search?client=chrome&hl=ru&gl=ru&q=${encodeURIComponent(query)}`),
    fetchThroughProxies(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ru`),
  ]);
  return { suggestions, top: parseGoogleTopSite(html, query) };
};

const fetchYoutubeSearchPage = async (query: string) =>
  fetchThroughProxies(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=ru`);

const fetchYoutube = async (query: string): Promise<FetchPayload> => {
  const [suggestions, html] = await Promise.all([
    jsonp(`https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&hl=ru&gl=ru&q=${encodeURIComponent(query)}`),
    fetchYoutubeSearchPage(query),
  ]);
  let top = parseYoutubeSearchTopVideo(html, query);
  if (!top) {
    try {
      const xml = await fetchThroughProxies(`https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(query)}`);
      top = parseYoutubeFeedTopVideo(xml, query);
    } catch {
      // Keep undefined and show link fallback in UI.
    }
  }
  return { suggestions, top };
};

const fetchYoutubeShorts = async (query: string): Promise<FetchPayload> => {
  const shortQuery = `${query} shorts`;
  const [suggestions, html] = await Promise.all([
    jsonp(
      `https://suggestqueries.google.com/complete/search?client=chrome&ds=yt&hl=ru&gl=ru&q=${encodeURIComponent(shortQuery)}`
    ),
    fetchYoutubeSearchPage(shortQuery),
  ]);
  let top = parseYoutubeSearchTopVideo(html, query, { preferShorts: true });
  if (!top) {
    top = {
      title: `YouTube Shorts поиск: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(shortQuery)}&sp=EgIYAQ%253D%253D`,
      query: shortQuery,
      kind: "video",
    };
  }
  return { suggestions: suggestions.length ? suggestions : [shortQuery], top };
};

const fetchTiktok = async (query: string): Promise<FetchPayload> => {
  const endpoints = [
    `https://www.tiktok.com/api/search/general/full/?keyword=${encodeURIComponent(query)}&from_source=search_box`,
    `https://www.tiktok.com/api/search/item/full/?keyword=${encodeURIComponent(query)}&from_source=search_box`,
    `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`,
  ];
  let mergedSuggestions: string[] = [];
  let bestTop: TopResult | undefined;
  for (const target of endpoints) {
    for (const url of proxyUrls(target)) {
      try {
        const text = await fetchText(url);
        const suggestions = extractTikTokSuggestions(text);
        if (suggestions.length) mergedSuggestions = unique([...mergedSuggestions, ...suggestions]).slice(0, 12);
        const top = extractTikTokTopVideo(text, query);
        if (!bestTop && top) bestTop = top;
        if (!bestTop) bestTop = parseTikTokSearchTopVideo(text, query);
        if (mergedSuggestions.length >= 6 && bestTop) {
          return { suggestions: mergedSuggestions, top: bestTop };
        }
      } catch {
        // Try next mirror.
      }
    }
  }

  if (!bestTop) {
    try {
      const html = await fetchThroughProxies(`https://www.tiktok.com/search?q=${encodeURIComponent(query)}`);
      bestTop = extractTikTokTopVideo(html, query) || parseTikTokSearchTopVideo(html, query);
    } catch {
      // Keep fallback logic below.
    }
  }

  if (!bestTop) {
    try {
      const ddg = await fetchThroughProxies(`https://duckduckgo.com/html/?q=${encodeURIComponent(`site:tiktok.com/@/video ${query}`)}`);
      bestTop = parseTikTokTopFromSearchEngine(ddg, query);
    } catch {
      // Keep fallback logic below.
    }
  }

  if (!bestTop) {
    try {
      const y = await fetchThroughProxies(`https://yandex.ru/search/?text=${encodeURIComponent(`site:tiktok.com/video ${query}`)}`);
      bestTop = parseTikTokTopFromSearchEngine(y, query);
    } catch {
      // Keep fallback logic below.
    }
  }

  let fallbackSuggestions: string[] = [];
  try {
    const fallback = await jsonp(
      `https://suggestqueries.google.com/complete/search?client=chrome&hl=ru&gl=ru&q=${encodeURIComponent(`${query} tiktok`)}`
    );
    fallbackSuggestions = fallback.map((s) => s.replace(/\btiktok\b/gi, "").trim()).filter(Boolean);
  } catch {
    // Keep deterministic fallback below.
  }
  const rankedSuggestions = rankSuggestionsByQuery(query, [...mergedSuggestions, ...fallbackSuggestions]);
  const finalSuggestions = rankedSuggestions.length ? rankedSuggestions : [query];

  if (!bestTop) {
    const firstMatch = rankedSuggestions.find((s) => tokenOverlapRatio(s, query) >= 0.35) || query;
    bestTop = {
      title: `TikTok поиск: ${firstMatch}`,
      url: `https://www.tiktok.com/search?q=${encodeURIComponent(firstMatch)}`,
      query: firstMatch,
      kind: "video",
    };
  }

  return { suggestions: finalSuggestions, top: bestTop };
};

const scoreMusicTrack = (
  title: string,
  query: string,
  musicQuery: string,
  intent: keyof typeof MUSIC_INTENT_MAP,
  trendTokens: string[]
) => {
  const merged = `${title} ${musicQuery}`;
  const words = tokenize(merged);
  const qWords = new Set(tokenize(query));
  const overlap = words.filter((w) => qWords.has(w)).length;
  const trendHit = words.filter((w) => trendTokens.includes(w)).length;
  const intentHit = MUSIC_INTENT_MAP[intent].reduce((a, kw) => a + (clean(title).includes(kw) ? 1 : 0), 0);
  const positive = MUSIC_POSITIVE_WORDS.reduce((a, kw) => a + (clean(merged).includes(kw) ? 1 : 0), 0);
  const negative = MUSIC_NEGATIVE_WORDS.reduce((a, kw) => a + (clean(merged).includes(kw) ? 1 : 0), 0);
  return overlap * 5 + trendHit * 2 + intentHit * 3 + positive * 2 - negative * 6;
};

const buildMusicQueries = (query: string, bestQuery: string, intent: keyof typeof MUSIC_INTENT_MAP, trendTokens: string[]) => {
  const basis = unique([sanitizeQueryText(bestQuery), sanitizeQueryText(query)]).filter(Boolean);
  const intentWords = MUSIC_INTENT_MAP[intent];
  const trendTail = trendTokens.slice(0, 2).join(" ");
  const out = unique(
    basis.flatMap((seed) => [
      `${seed} музыка`,
      `${seed} ${intentWords[0]} music`,
      `${seed} ${intentWords[1]} instrumental`,
      `${seed} soundtrack`,
      trendTail ? `${seed} ${trendTail} soundtrack` : "",
    ])
  );
  return out.filter(Boolean).slice(0, 6);
};

const parseYandexMusicTracks = (raw: string, musicQuery: string): MusicTrack[] => {
  const parsed = parseLooseJson(raw) as Record<string, unknown> | null;
  const trackLists = [
    parsed?.tracks,
    (parsed?.result as Record<string, unknown> | undefined)?.tracks,
    (parsed?.results as Record<string, unknown> | undefined)?.tracks,
  ];
  const directTracks = trackLists
    .flatMap((node) => {
      if (!node || typeof node !== "object") return [] as unknown[];
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results;
      if (Array.isArray(obj.items)) return obj.items;
      return [] as unknown[];
    })
    .filter((x) => x && typeof x === "object") as Array<Record<string, unknown>>;

  const mapped = directTracks
    .map((row) => {
      const title = String(row.title || "").trim();
      const artists = (Array.isArray(row.artists) ? row.artists : [])
        .map((a) => (typeof a === "object" && a ? String((a as Record<string, unknown>).name || "") : ""))
        .filter(Boolean)
        .join(", ");
      const album = (Array.isArray(row.albums) ? row.albums[0] : undefined) as Record<string, unknown> | undefined;
      const albumId = String((album?.id || row.albumId || "") as string).trim();
      const trackId = String((row.id || row.trackId || "") as string).trim();
      const titleFull = [title, artists].filter(Boolean).join(" - ");
      const url = trackId && albumId ? `https://music.yandex.ru/album/${albumId}/track/${trackId}` : "";
      return {
        title: titleFull || title,
        url,
        query: musicQuery,
        score: 0,
        reason: "Результат Яндекс Музыки по релевантности запроса",
      } as MusicTrack;
    })
    .filter((x) => x.title && x.url);

  if (mapped.length) return mapped.slice(0, 8);

  const regexTracks = [
    ...[...raw.matchAll(/https?:\\\/\\\/music\.yandex\.(?:ru|com)\\\/album\\\/(\d+)\\\/track\\\/(\d+)/g)].map((m) => ({
      albumId: m[1],
      trackId: m[2],
      index: m.index || 0,
    })),
    ...[...raw.matchAll(/https?:\/\/music\.yandex\.(?:ru|com)\/album\/(\d+)\/track\/(\d+)/g)].map((m) => ({
      albumId: m[1],
      trackId: m[2],
      index: m.index || 0,
    })),
    ...[...raw.matchAll(/\/album\/(\d+)\/track\/(\d+)/g)].map((m) => ({
      albumId: m[1],
      trackId: m[2],
      index: m.index || 0,
    })),
  ];
  const uniq = new Map<string, MusicTrack>();
  regexTracks.forEach((m) => {
    const key = `${m.albumId}_${m.trackId}`;
    if (uniq.has(key)) return;
    const chunk = raw.slice(Math.max(0, m.index - 220), m.index + 220);
    const t = unescapeJsonText(chunk.match(/"title"\s*:\s*"([^"]{2,120})"/)?.[1] || "").trim();
    uniq.set(key, {
      title: t || `Трек ${m.trackId}`,
      url: `https://music.yandex.ru/album/${m.albumId}/track/${m.trackId}`,
      query: musicQuery,
      score: 0,
      reason: "Результат Яндекс Музыки по релевантности запроса",
    });
  });
  return [...uniq.values()].slice(0, 8);
};

const parseYandexMusicSuggest = (raw: string) => {
  const jsonpArray = raw.match(/\((\s*\[[\s\S]*\])\s*\)\s*;?$/)?.[1] || "";
  const parsed = parseLooseJson(jsonpArray || raw);
  if (!Array.isArray(parsed)) return [] as string[];
  const suggestions = Array.isArray(parsed[1]) ? parsed[1] : [];
  const fromArray = unique(
    suggestions
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .filter((x) => tokenize(x).length > 1)
  ).slice(0, 10);
  if (fromArray.length) return fromArray;
  return unique(
    [...raw.matchAll(/"([^"\n]{4,80})"/g)]
      .map((m) => m[1])
      .filter((x) => tokenize(x).length > 1)
      .filter((x) => /music|музык|трек|саундтрек|instrumental|lofi/i.test(x))
  ).slice(0, 10);
};

const fetchYandexMusicSuggestions = async (musicQuery: string) => {
  const endpoint = `https://suggest.yandex.ru/suggest-ya.cgi?v=4&uil=ru&srv=music&part=${encodeURIComponent(musicQuery)}`;
  try {
    const suggestions = await jsonp(endpoint);
    if (suggestions.length) return suggestions;
  } catch {
    // Continue with fetch fallback.
  }
  try {
    const raw = await fetchText(endpoint);
    const suggestions = parseYandexMusicSuggest(raw);
    if (suggestions.length) return suggestions;
  } catch {
    // Direct request may fail due CORS in some browsers.
  }
  try {
    const viaProxy = await fetchThroughProxies(endpoint);
    return parseYandexMusicSuggest(viaProxy);
  } catch {
    return [];
  }
};

const fetchYandexMusicQuery = async (musicQuery: string) => {
  const endpoint = `https://music.yandex.ru/handlers/music-search.jsx?type=tracks&text=${encodeURIComponent(musicQuery)}`;
  const pageEndpoint = `https://music.yandex.ru/search?text=${encodeURIComponent(musicQuery)}&type=tracks`;
  const ySearch = `https://yandex.ru/search/?text=${encodeURIComponent(`site:music.yandex.ru ${musicQuery}`)}`;
  try {
    const jsonRaw = await fetchThroughProxies(endpoint);
    const tracks = parseYandexMusicTracks(jsonRaw, musicQuery);
    if (tracks.length) return tracks;
  } catch {
    // Try html search fallback.
  }
  try {
    const htmlRaw = await fetchThroughProxies(pageEndpoint);
    const tracks = parseYandexMusicTracks(htmlRaw, musicQuery);
    if (tracks.length) return tracks;
  } catch {
    // Try Yandex web search fallback.
  }
  const yRaw = await fetchThroughProxies(ySearch);
  return parseYandexMusicTracks(yRaw, musicQuery);
};

const fetchMusicRecommendations = async (
  query: string,
  bestQuery: string,
  analytics: Pick<AnalyticsReport, "intent" | "trendTokens">
): Promise<MusicTrack[]> => {
  const intent = (analytics.intent in MUSIC_INTENT_MAP ? analytics.intent : "Информационный") as keyof typeof MUSIC_INTENT_MAP;
  const queries = buildMusicQueries(query, bestQuery, intent, analytics.trendTokens);
  const settled = await Promise.allSettled(
    queries.map(async (musicQuery) => {
      const tracks = await fetchYandexMusicQuery(musicQuery);
      return tracks.slice(0, 3).map(
        (track) =>
          ({
            ...track,
            query: musicQuery,
            score: scoreMusicTrack(track.title, query, musicQuery, intent, analytics.trendTokens),
            reason: "Релевантный трек из Яндекс Музыки по теме запроса и интенту",
          }) as MusicTrack
      );
    })
  );
  const uniq = new Map<string, MusicTrack>();
  settled.forEach((res) => {
    if (res.status !== "fulfilled" || !res.value?.length) return;
    res.value.forEach((track) => {
      const key = track.url;
      const prev = uniq.get(key);
      if (!prev || prev.score < track.score) uniq.set(key, track);
    });
  });
  const ranked = [...uniq.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  if (ranked.length) return ranked;

  // Hard fallback: Yandex Music live suggestions -> direct Yandex Music search links.
  const fallbackQueries = unique([bestQuery, query, ...queries]).slice(0, 4);
  const fallbackSettled = await Promise.allSettled(
    fallbackQueries.map(async (musicQuery) => {
      const suggestions = await fetchYandexMusicSuggestions(musicQuery);
      return suggestions.map((title) => {
        const url = `https://music.yandex.ru/search?text=${encodeURIComponent(title)}&type=tracks`;
        return {
          title,
          url,
          query: musicQuery,
          score: scoreMusicTrack(title, query, musicQuery, intent, analytics.trendTokens),
          reason: "Рекомендация из live-подсказок Яндекс Музыки по вашему запросу",
        } as MusicTrack;
      });
    })
  );
  const fallbackUniq = new Map<string, MusicTrack>();
  fallbackSettled.forEach((res) => {
    if (res.status !== "fulfilled") return;
    res.value.forEach((track) => {
      const prev = fallbackUniq.get(track.url);
      if (!prev || prev.score < track.score) fallbackUniq.set(track.url, track);
    });
  });
  const fallbackRanked = [...fallbackUniq.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  if (fallbackRanked.length) return fallbackRanked;

  // Final live-safe fallback: direct Yandex Music search links for the best generated queries.
  const safeQueries = fallbackQueries.length ? fallbackQueries : [sanitizeQueryText(query) || "популярная музыка для видео"];
  return safeQueries.slice(0, 5).map((musicQuery) => ({
    title: `Яндекс Музыка: ${musicQuery}`,
    url: `https://music.yandex.ru/search?text=${encodeURIComponent(musicQuery)}&type=tracks`,
    query: musicQuery,
    score: scoreMusicTrack(musicQuery, query, musicQuery, intent, analytics.trendTokens),
    reason: "Откройте поиск Яндекс Музыки по готовому релевантному запросу",
  }));
};

const fallbackCopy = (text: string) => {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
};

const copyText = async (text: string) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopy(text);
  }
};

function TermHint({ term }: { term: keyof typeof GLOSSARY }) {
  return (
    <span className="term group relative inline-flex cursor-help items-center border-b border-dotted border-zinc-400 text-zinc-800">
      {term}
      <span className="term-tooltip pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-xs leading-relaxed text-zinc-700 opacity-0 shadow-2xl transition group-hover:opacity-100">
        {GLOSSARY[term]}
      </span>
    </span>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [results, setResults] = useState<ResultMap>({});
  const [popularChannels, setPopularChannels] = useState<Record<ChannelPlatform, ChannelItem[]>>({ youtube: [], tiktok: [] });
  const [channelTab, setChannelTab] = useState<ChannelPlatform>("youtube");
  const [generated, setGenerated] = useState<GeneratedData | null>(null);
  const [videoAnalysis, setVideoAnalysis] = useState<VideoSeoAnalysis | null>(null);
  const [selectedTitles, setSelectedTitles] = useState<Partial<Record<VideoPlatform, string>>>({});
  const [selectedQuery, setSelectedQuery] = useState("");
  const [appError, setAppError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("maze-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("maze-theme", theme);
  }, [theme]);

  const overall = useMemo(() => {
    const values = Object.values(results).filter((r) => r?.score).map((r) => r!.score);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  }, [results]);

  const run = async (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setAppError("");
    setGenerated(null);
    setAnalysisProgress(4);
    setEtaSeconds(18);
    const startedAt = Date.now();
    const expectedMs = 18000;
    let completedWeight = 0;
    const updateProgress = () => {
      const elapsed = Date.now() - startedAt;
      const timed = (elapsed / expectedMs) * 62;
      const completed = completedWeight * 100;
      const next = clamp(Math.round(Math.max(timed, completed, 4)), 0, 97);
      setAnalysisProgress((prev) => Math.max(prev, next));
      setEtaSeconds(Math.max(0, Math.round((expectedMs - elapsed) / 1000)));
    };
    const track = <T,>(promise: Promise<T>, weight: number) =>
      promise.finally(() => {
        completedWeight += weight;
        updateProgress();
      });
    const timer = window.setInterval(updateProgress, 250);
    try {
      const [google, youtube, shorts, tiktok] = await Promise.allSettled([
        track(fetchGoogle(q), 0.17),
        track(fetchYoutube(q), 0.17),
        track(fetchYoutubeShorts(q), 0.17),
        track(fetchTiktok(q), 0.17),
      ]);

      const asData = (source: Source, res: PromiseSettledResult<FetchPayload>): SourceData =>
        res.status === "fulfilled"
          ? {
              suggestions: res.value.suggestions,
              tags: toTags(res.value.suggestions, source),
              score: scoreRelevance(q, res.value.suggestions),
              top: res.value.top,
            }
          : { suggestions: [], tags: [], score: 0, error: res.reason?.message || "Ошибка" };

      const next = {
        google: asData("google", google),
        youtube: asData("youtube", youtube),
        shorts: asData("shorts", shorts),
        tiktok: asData("tiktok", tiktok),
      };
      const allSuggestions = unique(
        (Object.values(next) as SourceData[]).flatMap((x) => (x.error ? [] : x.suggestions)).slice(0, 60)
      );
      const improvedQueryText = improveQuery(q, allSuggestions);
      const improvedTagsText = improveTags(q, next);
      const tops = (Object.values(next) as SourceData[]).flatMap((x) => (x.top ? [x.top] : []));
      const queryOptions = buildPromotedQueries(q, improvedQueryText, allSuggestions, tops, improvedTagsText);
      const bestQuery = queryOptions[0]?.text || improvedQueryText;
      const { titlesByPlatform, bestTitles } = buildPlatformTitles(q, bestQuery, next, improvedTagsText, tops);
      const bestTitle = bestTitles.youtube;
      const analytics = buildAnalytics(q, next, allSuggestions, tops, improvedTagsText, bestQuery, bestTitles, queryOptions);
      completedWeight = Math.max(completedWeight, 0.78);
      updateProgress();
      const [ytChannels, ttChannels] = await Promise.allSettled([
        track(fetchPopularYoutubeChannels(q), 0.09),
        track(fetchPopularTikTokChannels(q), 0.09),
      ]);
      const musicTracks = await track(fetchMusicRecommendations(q, bestQuery, analytics), 0.2);

      setResults(next);
      setPopularChannels({
        youtube: ytChannels.status === "fulfilled" ? ytChannels.value : [],
        tiktok: ttChannels.status === "fulfilled" ? ttChannels.value : [],
      });
      setGenerated({
        improvedQuery: bestQuery,
        improvedTags: improvedTagsText,
        bestTitle,
        bestTitles,
        titlesByPlatform,
        bestQuery,
        queryOptions,
        musicTracks,
        analytics,
      });
      setSelectedQuery(bestQuery);
      setSelectedTitles(bestTitles);
    } catch (err) {
      setAppError(err instanceof Error ? err.message : "Не удалось завершить анализ");
    } finally {
      window.clearInterval(timer);
      setAnalysisProgress(100);
      setEtaSeconds(0);
      setLoading(false);
      window.setTimeout(() => setAnalysisProgress(0), 800);
    }
  };

  const runVideoAnalysis = async (e: FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    setVideoLoading(true);
    setVideoError("");
    try {
      const report = await analyzeVideoByLink(videoUrl);
      setVideoAnalysis(report);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Не удалось проанализировать ссылку");
      setVideoAnalysis(null);
    } finally {
      setVideoLoading(false);
    }
  };

  return (
    <main className={`theme-${theme} relative min-h-screen overflow-hidden text-zinc-900`}>
      <div className="aurora pointer-events-none absolute inset-[-8%] opacity-65" />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 md:py-12">
        <header className="glass liquid-card fade-up rounded-[2rem] p-6 md:p-9">
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs tracking-[0.28em] text-zinc-500">LIVE SEO ANALYTICS</p>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="glass-btn rounded-xl px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-900"
            >
              {theme === "light" ? "Темная тема" : "Светлая тема"}
            </button>
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 md:text-6xl">MAZE TAGS</h1>
          <p className="mt-3 max-w-3xl text-zinc-600">
            Реальный анализ релевантности запроса, подбор тегов и SEO-названий для Google Search, YouTube, Shorts и TikTok.
          </p>
        </header>

        <form onSubmit={run} className="glass-soft liquid-card-soft fade-up group flex flex-col gap-3 rounded-3xl p-3 md:flex-row md:p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите запрос, например: ремонт квартиры 2026"
            className="glass-input h-12 flex-1 rounded-2xl px-4 text-base text-zinc-900 outline-none transition"
          />
          <button
            disabled={loading}
            className="glass-btn h-12 rounded-2xl px-6 text-sm font-medium uppercase tracking-wide text-zinc-900 transition hover:bg-white/70 disabled:opacity-60"
          >
            {loading ? "Анализ..." : "Анализировать"}
          </button>
        </form>
        <form onSubmit={runVideoAnalysis} className="glass-soft liquid-card-soft fade-up flex flex-col gap-3 rounded-3xl p-3 md:flex-row md:p-4">
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Вставьте ссылку на YouTube/TikTok видео для SEO-анализа"
            className="glass-input h-12 flex-1 rounded-2xl px-4 text-base text-zinc-900 outline-none transition"
          />
          <button
            disabled={videoLoading}
            className="glass-btn h-12 rounded-2xl px-6 text-sm font-medium uppercase tracking-wide text-zinc-900 transition hover:bg-white/70 disabled:opacity-60"
          >
            {videoLoading ? "Проверка..." : "Анализ видео по ссылке"}
          </button>
        </form>
        {appError && <p className="glass-soft rounded-xl px-4 py-2 text-sm text-rose-700">{appError}</p>}
        {videoError && <p className="glass-soft rounded-xl px-4 py-2 text-sm text-rose-700">{videoError}</p>}
        {videoAnalysis && (
          <section className="glass liquid-card fade-up rounded-3xl p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
              <span>Анализ видео</span>
              <span>•</span>
              <span>{PLATFORM_LABEL[videoAnalysis.platform]}</span>
              <span>•</span>
              <span>SEO score: {videoAnalysis.score}%</span>
            </div>
            <h3 className="mt-2 text-xl font-medium text-zinc-900">{videoAnalysis.title}</h3>
            <p className="text-sm text-zinc-600">Автор: {videoAnalysis.author}</p>
            {!!videoAnalysis.description && <p className="mt-2 text-sm text-zinc-700">{videoAnalysis.description}</p>}
            {!!videoAnalysis.tags.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {videoAnalysis.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => copyText(tag)}
                    className="glass-chip rounded-xl px-2 py-1 text-xs text-zinc-700"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {videoAnalysis.recommendations.map((row) => (
                <p key={row} className="glass-soft liquid-card-soft rounded-xl px-3 py-2 text-xs text-zinc-700">
                  {row}
                </p>
              ))}
            </div>
            {!!videoAnalysis.improvedTitles.length && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-zinc-600">Варианты улучшенного названия</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {videoAnalysis.improvedTitles.map((row) => (
                    <button
                      key={row}
                      type="button"
                      onClick={() => copyText(row)}
                      className="glass-soft liquid-card-soft rounded-xl px-3 py-2 text-left text-sm text-zinc-800"
                    >
                      {row}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {(loading || analysisProgress > 0) && (
          <div className="glass-soft fade-up rounded-2xl px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-sm text-zinc-600">
              <span>Прогресс live-анализа</span>
              <span>{analysisProgress}% {loading ? `· ~${etaSeconds} c` : ""}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200/70">
              <div className="progress-stripe h-full rounded-full bg-zinc-800 transition-all duration-500" style={{ width: `${analysisProgress}%` }} />
            </div>
          </div>
        )}

        <div className="glass-soft liquid-card-soft fade-up flex items-center gap-4 rounded-2xl px-4 py-3">
          <span className="text-sm text-zinc-600">Итоговая релевантность</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-zinc-800 transition-all duration-700" style={{ width: `${overall}%` }} />
          </div>
          <strong className="min-w-12 text-right text-lg">{overall}%</strong>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {(["google", "youtube", "shorts", "tiktok"] as Source[]).map((source, i) => {
            const data = results[source];
            const ytId = data?.top && (source === "youtube" || source === "shorts") ? getYoutubeId(data.top.url) : "";
            const ttId = data?.top && source === "tiktok" ? getTikTokId(data.top.url) : "";
            return (
              <article
                key={source}
                className={`glass liquid-card liquid-float fade-up rounded-3xl bg-gradient-to-b ${sourceMeta[source].color} p-4`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <h2 className="mb-3 text-lg font-medium">{sourceMeta[source].title}</h2>
                {!data && <p className="text-sm text-zinc-500">Запустите анализ, чтобы получить теги.</p>}
                {data?.error && <p className="text-sm text-rose-700">{data.error}</p>}
                {data && !data.error && (
                  <>
                    <p className="mb-3 text-sm text-zinc-600">Релевантность: {data.score}%</p>
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => copyText(tag)}
                          className="glass-chip rounded-xl px-2 py-1 text-xs text-zinc-700 transition hover:border-zinc-500/70 hover:text-zinc-900"
                          title="Скопировать"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {data.top && (
                      <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                         <p className="text-xs uppercase tracking-wide text-zinc-500">
                           {source === "google"
                             ? "Самый релевантный сайт"
                             : source === "shorts"
                               ? "Самый релевантный shorts"
                               : "Самое релевантное видео"}
                        </p>
                        <p className="text-sm text-zinc-700">{data.top.query}</p>
                        {(source === "youtube" || source === "shorts") && ytId && (
                          <iframe
                            src={`https://www.youtube.com/embed/${ytId}`}
                            className="h-40 w-full rounded-2xl border border-white/15"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            title={data.top.title}
                          />
                        )}
                        {(source === "youtube" || source === "shorts") && !ytId && (
                          <p className="text-xs text-amber-700">Не удалось извлечь ID видео, откройте результат по ссылке ниже.</p>
                        )}
                        {source === "tiktok" && ttId && (
                          <iframe
                            src={`https://www.tiktok.com/player/v1/${ttId}`}
                            className="h-40 w-full rounded-2xl border border-white/15"
                            loading="lazy"
                            allowFullScreen
                            title={data.top.title}
                          />
                        )}
                        {source === "tiktok" && !ttId && (
                          <p className="text-xs text-amber-700">Не удалось извлечь ID TikTok видео, откройте ролик по ссылке ниже.</p>
                        )}
                        <a
                          href={data.top.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-zinc-800 underline decoration-zinc-400/60 underline-offset-2"
                        >
                          {data.top.title}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}

            <article className="glass liquid-card liquid-float fade-up rounded-3xl p-4" style={{ animationDelay: "300ms" }}>
            <h2 className="mb-3 text-lg font-medium">Теги через запятую</h2>
            {!generated && <p className="text-sm text-zinc-500">Появятся после анализа.</p>}
            {generated && (
              <>
                <textarea
                  readOnly
                  value={generated.improvedTags.map((t) => deTag(t)).join(", ")}
                  className="glass-soft liquid-card-soft min-h-44 w-full resize-y rounded-2xl p-3 text-sm text-zinc-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyText(generated.improvedTags.map((t) => deTag(t)).join(", "))}
                  className="glass-btn mt-3 h-10 w-full rounded-xl px-4 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
                >
                  Копировать CSV теги
                </button>
              </>
            )}
          </article>
        </div>

        <section className="glass liquid-card fade-up rounded-3xl p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xl font-medium">Популярные каналы по запросу</h3>
            <div className="glass-soft inline-flex rounded-xl p-1">
              {(["youtube", "tiktok"] as ChannelPlatform[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setChannelTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wide transition ${
                    channelTab === tab ? "bg-white/85 text-zinc-900" : "text-zinc-600"
                  }`}
                >
                  {tab === "youtube" ? "YouTube" : "TikTok"}
                </button>
              ))}
            </div>
          </div>
          {!popularChannels[channelTab].length && (
            <p className="text-sm text-zinc-500">После анализа запроса появится список наиболее подходящих каналов.</p>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            {popularChannels[channelTab].map((channel) => (
              <div key={channel.url} className="glass-soft liquid-card-soft flex items-center justify-between gap-3 rounded-xl px-3 py-2">
                <div>
                  <a href={channel.url} target="_blank" rel="noreferrer" className="text-sm text-zinc-900 underline decoration-zinc-400/60 underline-offset-2">
                    {channel.name}
                  </a>
                  <p className="text-xs text-zinc-500">
                    {channel.followers ? `Аудитория: ${channel.followers}` : "Профиль по запросу"} · rel {Math.round(channel.score)}
                  </p>
                </div>
                <button type="button" onClick={() => copyText(channel.url)} className="glass-btn rounded-lg px-3 py-1 text-xs uppercase tracking-wide text-zinc-900">
                  Копировать
                </button>
              </div>
            ))}
          </div>
        </section>

        {generated && (
          <section className="glass liquid-card fade-up space-y-4 rounded-3xl p-4 md:p-5">
            <h3 className="text-xl font-medium">Улучшения и автогенерация</h3>

            <div className="glass-soft liquid-card-soft grid gap-3 rounded-2xl p-3 text-sm md:grid-cols-3">
              <p>
                Интент: <strong>{generated.analytics.intent}</strong>
              </p>
              <p>
                Конкуренция: <strong>{generated.analytics.competition.label}</strong> ({generated.analytics.competition.score}%)
              </p>
              <p>
                Спрос: <strong>{generated.analytics.demandScore}%</strong>
              </p>
              <p>
                Сложность: <strong>{generated.analytics.difficultyScore}%</strong>
              </p>
              <p>
                Виральный потенциал: <strong>{generated.analytics.viralPotential}%</strong>
              </p>
              <p>
                Надежность источников: <strong>{generated.analytics.sourceReliability}%</strong>
              </p>
              <p>
                <TermHint term="Live signals" />: <strong>{generated.analytics.liveSignals}%</strong>
              </p>
              <p>
                <TermHint term="Data freshness" />: <strong>{generated.analytics.dataFreshness}%</strong>
              </p>
              <p>
                Уверенность анализа: <strong>{generated.analytics.overallConfidence}%</strong>
              </p>
              <p>
                Покрытие запроса: <strong>{generated.analytics.coverage}%</strong>
              </p>
              <p>
                <TermHint term="SERP" /> совпадение: <strong>{generated.analytics.serpMatch}%</strong>
              </p>
              <p>
                Покрытие ключа тегами: <strong>{generated.analytics.tagSeoCoverage}%</strong>
              </p>
              <p>
                Лучшая платформа сейчас: <strong>{generated.analytics.bestPlatform}</strong>
              </p>
              <p>
                 <TermHint term="SEO" /> score: запрос <strong>{generated.analytics.querySeo}%</strong>, название <strong>{generated.analytics.titleSeo}%</strong>
              </p>
              <p>
                <TermHint term="Long-tail" /> потенциал: <strong>{generated.analytics.longTailPotential}%</strong>
              </p>
              <p>
                <TermHint term="CTR" /> потенциал: <strong>{generated.analytics.ctrPotential}%</strong>
              </p>
              <p>
                <TermHint term="SEO Opportunity" />: <strong>{generated.analytics.seoOpportunity}%</strong>
              </p>
              <p>
                <TermHint term="SEO Power" />: <strong>{generated.analytics.seoPower}%</strong>
              </p>
              <p>
                <TermHint term="Query-title alignment" />: <strong>{generated.analytics.queryTitleAlignment}%</strong>
              </p>
              <p>
                <TermHint term="Keyword cluster quality" />: <strong>{generated.analytics.keywordClusterQuality}%</strong>
              </p>
              <p>
                <TermHint term="Intent consistency" />: <strong>{generated.analytics.intentConsistency}%</strong>
              </p>
              <p>
                <TermHint term="SERP volatility" />: <strong>{generated.analytics.serpVolatility}%</strong>
              </p>
              <p>
                <TermHint term="Content readiness" />: <strong>{generated.analytics.contentReadiness}%</strong>
              </p>
              <p>
                <TermHint term="Trend coverage" />: <strong>{generated.analytics.trendCoverage}%</strong>
              </p>
              <p>
                <TermHint term="SERP title match" />: <strong>{generated.analytics.titleMatchTopSerp}%</strong>
              </p>
              <p>
                <TermHint term="Top result relevance" />: <strong>{generated.analytics.topResultRelevance}%</strong>
              </p>
              <p>
                <TermHint term="TikTok signal" />: <strong>{generated.analytics.tiktokSignal}%</strong>
              </p>
              <p>
                <TermHint term="Exact match" />: <strong>{generated.analytics.exactMatchScore}%</strong>
              </p>
              <p>
                <TermHint term="Source consensus" />: <strong>{generated.analytics.sourceConsensus}%</strong>
              </p>
              <p>
                <TermHint term="Semantic stability" />: <strong>{generated.analytics.semanticStability}%</strong>
              </p>
              <p>
                <TermHint term="Win probability" />: <strong>{generated.analytics.winProbability}%</strong>
              </p>
              <p>
                Пробел семантики: <strong>{generated.analytics.keywordGap}%</strong>
              </p>
              <p>
                <TermHint term="Intent match" />: <strong>{generated.analytics.keywordIntentMatch}%</strong>
              </p>
              <p>
                <TermHint term="Keyword Density" />: <strong>{generated.analytics.keywordDensity}%</strong>
              </p>
              <p>
                <TermHint term="Cross-platform consistency" />: <strong>{generated.analytics.crossPlatformConsistency}%</strong>
              </p>
              <p>
                Семантическая релевантность: <strong>{generated.analytics.semanticRelevance}%</strong>
              </p>
              <p>
                Качество названий: <strong>{generated.analytics.titleQuality}%</strong>
              </p>
              <p>
                Уникальность названий: <strong>{generated.analytics.titleUniqueness}%</strong>
              </p>
              <p>
                SEO YouTube/Shorts/TikTok: <strong>{generated.analytics.platformTitleSeo.youtube}%</strong> /{" "}
                <strong>{generated.analytics.platformTitleSeo.shorts}%</strong> / <strong>{generated.analytics.platformTitleSeo.tiktok}%</strong>
              </p>
              <p>
                <TermHint term="Platform Intent Fit" />: <strong>{generated.analytics.platformIntentFit.youtube}%</strong> /{" "}
                <strong>{generated.analytics.platformIntentFit.shorts}%</strong> / <strong>{generated.analytics.platformIntentFit.tiktok}%</strong>
              </p>
              <div className="md:col-span-3">
                 <p className="mb-2 text-zinc-600">Трендовые токены:</p>
                <div className="flex flex-wrap gap-2">
                  {generated.analytics.trendTokens.map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => copyText(token)}
                       className="glass-chip rounded-lg px-2 py-1 text-xs text-zinc-700 transition hover:border-zinc-500/70 hover:text-zinc-900"
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-3">
                 <p className="mb-2 text-zinc-600">SEO рекомендации:</p>
                <div className="grid gap-2">
                  {generated.analytics.recommendations.map((row) => (
                     <p key={row} className="glass-soft liquid-card-soft rounded-xl px-3 py-2 text-xs text-zinc-700">
                      {row}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <p className="text-sm text-zinc-600">Запросы для продвижения видео</p>
              <div className="grid gap-2">
                {generated.queryOptions.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => setSelectedQuery(item.text)}
                    className={`liquid-card-soft flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                      selectedQuery === item.text
                        ? "border-zinc-500/80 bg-white/85 text-zinc-900"
                        : "border-white/50 bg-white/55 text-zinc-700 hover:border-zinc-400/60"
                    }`}
                  >
                    <span>{item.text}</span>
                    <span className="ml-2 shrink-0 text-xs text-zinc-500">{Math.round(item.score)}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuery(generated.bestQuery)}
                className="glass-btn h-10 rounded-xl px-4 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
              >
                Выбрать самый релевантный запрос
              </button>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <p className="glass-soft flex-1 rounded-xl px-3 py-2 text-sm">
                  {selectedQuery || generated.improvedQuery}
                </p>
                <button
                  type="button"
                  onClick={() => copyText(selectedQuery || generated.improvedQuery)}
                  className="glass-btn h-10 rounded-xl px-4 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
                >
                  Копировать запрос
                </button>
              </div>
            </div>

            <div className="space-y-2">
               <p className="text-sm text-zinc-600">Улучшенные теги (общий пул)</p>
              <div className="flex flex-wrap gap-2">
                {generated.improvedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => copyText(tag)}
                    className="glass-chip rounded-xl px-2 py-1 text-xs text-zinc-700 transition hover:border-zinc-500/70 hover:text-zinc-900"
                    title="Скопировать"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyText(generated.improvedTags.join(" "))}
                className="glass-btn h-10 rounded-xl px-4 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
              >
                Копировать все теги
              </button>
            </div>

            <div className="space-y-2">
               <p className="text-sm text-zinc-600">Наиболее подходящая музыка для видео</p>
              {!generated.musicTracks.length && (
                  <p className="glass-soft rounded-xl px-3 py-2 text-xs text-zinc-600">
                  Не удалось получить музыку из Яндекс Музыки сейчас. Перезапустите анализ для обновления live-результатов.
                </p>
              )}
              <div className="grid gap-2">
                {generated.musicTracks.map((track) => {
                  const ym = getYandexTrackInfo(track.url);
                  return (
                    <div key={track.url} className="glass-soft liquid-card-soft space-y-2 rounded-2xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-zinc-900">{track.title}</p>
                        <span className="shrink-0 text-xs text-zinc-700">{Math.round(track.score)}</span>
                      </div>
                      <p className="text-xs text-zinc-500">Запрос: {track.query}</p>
                      <p className="text-xs text-zinc-600">{track.reason}</p>
                      {ym && (
                        <iframe
                          src={`https://music.yandex.ru/iframe/#track/${ym.trackId}/${ym.albumId}`}
                          className="h-36 w-full rounded-xl border border-white/15"
                          loading="lazy"
                          allowFullScreen
                          title={track.title}
                        />
                      )}
                      <div className="flex gap-2">
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noreferrer"
                          className="glass-soft flex-1 rounded-xl px-3 py-2 text-xs text-zinc-800"
                        >
                          Открыть трек
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(track.query)}
                          className="glass-btn rounded-xl px-3 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
                        >
                          Копировать запрос
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
               <p className="text-sm text-zinc-600">Варианты названия и выбор самого релевантного</p>
              <div className="grid gap-3 md:grid-cols-3">
                {(["youtube", "shorts", "tiktok"] as VideoPlatform[]).map((platform) => (
                  <div key={platform} className="glass-soft liquid-card-soft space-y-2 rounded-2xl p-3">
                    <p className="text-sm text-zinc-800">{PLATFORM_LABEL[platform]}</p>
                    <div className="grid gap-2">
                      {generated.titlesByPlatform[platform].map((item) => (
                        <button
                          key={`${platform}_${item.text}`}
                          type="button"
                          onClick={() => setSelectedTitles((prev) => ({ ...prev, [platform]: item.text }))}
                          className={`liquid-card-soft flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            (selectedTitles[platform] || generated.bestTitles[platform]) === item.text
                              ? "border-zinc-500/80 bg-white/85 text-zinc-900"
                              : "border-white/50 bg-white/55 text-zinc-700 hover:border-zinc-400/60"
                          }`}
                        >
                          <span>{item.text}</span>
                          <span className="ml-2 shrink-0 text-xs text-zinc-500">{Math.round(item.score)}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTitles((prev) => ({ ...prev, [platform]: generated.bestTitles[platform] }))}
                      className="glass-btn h-10 w-full rounded-xl px-4 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
                    >
                      Выбрать самое релевантное
                    </button>
                    <div className="flex gap-2">
                      <p className="glass-soft flex-1 rounded-xl px-3 py-2 text-sm">
                        {selectedTitles[platform] || generated.bestTitles[platform]}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(selectedTitles[platform] || generated.bestTitles[platform])
                        }
                        className="glass-btn h-10 rounded-xl px-3 text-xs uppercase tracking-wide text-zinc-900 transition hover:bg-white/70"
                      >
                        Копировать
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
