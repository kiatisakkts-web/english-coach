import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  Home,
  Menu,
  Mic,
  Play,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Square,
  Target,
  TrendingUp,
  Volume2,
} from "lucide-react";
import "./styles.css";
import { lessons as lessonContent, LessonContent } from "./data/lessons";
import { placementQuestions } from "./data/placement";
import {
  db,
  exportProgress,
  importProgress,
  loadProgress,
  saveProgress,
  validateImportPayload,
  Settings as StoredSettings,
  VocabularyRecord,
} from "./services/storage";
import { scorePlacement } from "./services/placementScoring";
import { startSpeechMatch } from "./services/speechRecognition";
import { LanguageMode, languageModes, translate, TranslationKey } from "./i18n";
/* The lesson view synchronizes its persisted translation preference when entering a lesson. */
/* eslint-disable react-hooks/set-state-in-effect */

type Lesson = LessonContent & {
  skill: string;
  progress: number;
  color: string;
  icon: React.ReactNode;
  description: string;
};
const icons = [
  "☕",
  "🧭",
  "💬",
  "✨",
  "🍜",
  "⏰",
  "🚕",
  "📍",
  "🍽️",
  "🛍️",
  "🛎️",
  "✈️",
  "📅",
  "💼",
  "☎️",
  "🌤️",
  "🎧",
  "🗂️",
  "🤝",
  "💡",
  "🧩",
  "🧳",
  "💻",
  "🧑‍💼",
  "⚖️",
  "🧾",
  "📊",
  "🌐",
  "🧠",
  "🏆",
];
const lessons: Lesson[] = lessonContent.map((lesson, index) => ({
  ...lesson,
  skill: "Listening · Speaking",
  progress: 0,
  color: ["mint", "lavender", "peach", "blue"][index % 4],
  icon: <span className="emoji">{icons[index]}</span>,
  description: lesson.objectives[0],
}));
const nav = [
  ["dashboard", "dashboard", Home],
  ["learn", "learn", BookOpen],
  ["reading", "reading", BookOpen],
  ["practice", "practice", Target],
  ["vocabulary", "vocabulary", Brain],
  ["progress", "progress", TrendingUp],
  ["placement", "placement", Check],
  ["settings", "settings", Settings],
] as const;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function App() {
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState<Lesson>(lessons[3]);
  const [xp, setXp] = useState(0);
  const [goal, setGoal] = useState(10);
  const [minutes, setMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [level, setLevel] = useState<"A1" | "A2" | "B1" | "B2">("A2");
  const [settings, setSettings] = useState<StoredSettings>({
    goal: 10,
    translation: true,
    sound: true,
    voice: "US English",
    speechRate: 1,
    uiLanguage: "bilingual",
  });
  const [completedLessons, setCompletedLessons] = useState(0);
  const [reviewedWords, setReviewedWords] = useState(0);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [profileName, setProfileName] = useState("");
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };
  useEffect(() => {
    loadProgress()
      .then(async (p) => {
        const [profile, storedSettings, completed, vocabulary] =
          await Promise.all([
            db.profile.get("current"),
            db.settings.get("current"),
            db.lessonProgress.toArray(),
            db.vocabulary.toArray(),
          ]);
        const normalized = storedSettings
          ? {
              ...storedSettings,
              uiLanguage:
                storedSettings.uiLanguage || ("bilingual" as LanguageMode),
            }
          : undefined;
        setXp(p.xp);
        setGoal(normalized?.goal ?? p.goal);
        setMinutes(p.minutes);
        setStreak(p.streak);
        setBestStreak(p.bestStreak);
        if (p.placementLevel) setLevel(p.placementLevel);
        if (normalized) setSettings(normalized);
        setCompletedLessons(completed.filter((row) => row.completed).length);
        setReviewedWords(vocabulary.length);
        setProfileName(profile?.name || "");
        setReady(true);
      })
      .catch(() => notify("Your local progress is unavailable."));
  }, []);
  useEffect(() => {
    if (ready)
      void saveProgress({
        xp,
        goal,
        minutes,
        streak,
        bestStreak,
        placementLevel: level,
      });
  }, [ready, xp, goal, minutes, streak, bestStreak, level]);
  const finishLesson = async (lesson: Lesson) => {
    const existing = await db.lessonProgress.get(lesson.id);
    if (existing?.completed) {
      notify("Lesson already completed — keep practising for review.");
      setPage("dashboard");
      return;
    }
    const now = new Date().toISOString();
    await db.lessonProgress.put({
      lessonId: lesson.id,
      completed: true,
      xpAwarded: lesson.xp,
      completedAt: now,
    });
    const previous = await db.dailyActivity.get(today());
    await db.dailyActivity.put({
      date: today(),
      minutes: (previous?.minutes || 0) + lesson.duration,
      activities: (previous?.activities || 0) + 1,
    });
    const nextStreak = previous ? streak : streak + 1;
    setStreak(nextStreak);
    setBestStreak(Math.max(bestStreak, nextStreak));
    setXp(xp + lesson.xp);
    setMinutes(minutes + lesson.duration);
    setPage("dashboard");
    notify(`Nice work! +${lesson.xp} XP added.`);
  };
  const speak = (text: string, rate = 1) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    } else notify("Text-to-speech is not available in this browser.");
  };
  if (!ready)
    return (
      <div className="app-shell">
        <main className="main">
          <div className="content">
            <PageTitle
              title="Loading your learning space"
              sub="Restoring your local progress…"
            />
          </div>
        </main>
      </div>
    );
  if (!profileName)
    return (
      <Onboarding
        onComplete={async (
          name,
          nextLevel,
          learningGoal,
          nextGoal,
          uiLanguage,
        ) => {
          await db.profile.put({
            id: "current",
            name,
            level: nextLevel,
            learningGoal,
          });
          await db.settings.put({
            id: "current",
            goal: nextGoal,
            translation: true,
            sound: true,
            voice: "US English",
            speechRate: 1,
            uiLanguage,
          });
          setProfileName(name);
          setLevel(nextLevel);
          setGoal(nextGoal);
          setSettings({
            goal: nextGoal,
            translation: true,
            sound: true,
            voice: "US English",
            speechRate: 1,
            uiLanguage,
          });
          notify("Welcome to English Coach.");
        }}
      />
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">e</div>
          <span>English Coach</span>
        </div>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              aria-label={id === "vocabulary" ? "Vocabulary 5" : translate(label as TranslationKey, "en")}
              className={page === id ? "nav-item active" : "nav-item"}
              onClick={() => setPage(id)}
            >
              <Icon size={18} />
              <span>
                {translate(label as TranslationKey, settings.uiLanguage)}
              </span>
              {id === "vocabulary" && <span className="nav-count">{5}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-profile">
            <div className="avatar">
              {profileName ? profileName[0].toUpperCase() : "M"}
            </div>
            <div>
              <strong>{profileName || "Learner"}</strong>
              <small>{level} · Explorer</small>
            </div>
            <button
              aria-label="Open settings"
              onClick={() => setPage("settings")}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open dashboard"
            onClick={() => setPage("dashboard")}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            English Coach <span>·</span>{" "}
            Keep your rhythm going
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Adjust settings"
              onClick={() => setPage("settings")}
            >
              <SlidersHorizontal size={18} />
            </button>
            <div className="top-avatar">
              {profileName ? profileName[0].toUpperCase() : "M"}
            </div>
          </div>
        </header>
        {page === "dashboard" && (
          <Dashboard
            onStart={(l) => {
              setSelected(l);
              setPage("lesson");
            }}
            mode={settings.uiLanguage}
            xp={xp}
            minutes={minutes}
            goal={goal}
            streak={streak}
            bestStreak={bestStreak}
            level={level}
            setPage={setPage}
            completedLessons={completedLessons}
            reviewedWords={reviewedWords}
          />
        )}{" "}
        {page === "learn" && (
          <Learn
            onStart={(l) => {
              setSelected(l);
              setPage("lesson");
            }}
          />
        )}{" "}
        {page === "lesson" && (
          <LessonView
            lesson={selected}
            speak={speak}
            mode={settings.uiLanguage}
            showTranslation={settings.translation}
            onFinish={() => void finishLesson(selected)}
            notify={notify}
          />
        )}{" "}
        {page === "reading" && (
          <Reading lesson={selected} speak={speak} notify={notify} />
        )}{" "}
        {page === "practice" && <Practice speak={speak} notify={notify} />}{" "}
        {page === "vocabulary" && <Vocabulary speak={speak} notify={notify} />}{" "}
        {page === "progress" && (
          <Progress xp={xp} minutes={minutes} streak={streak} level={level} />
        )}{" "}
        {page === "placement" && (
          <Placement
            onDone={async (result) => {
              setLevel(result.level);
              await db.placement.put({
                id: "current",
                level: result.level,
                completedAt: new Date().toISOString(),
                answers: result.answers,
              });
              setPage("dashboard");
              notify(`Estimated level saved: ${result.level}`);
            }}
          />
        )}{" "}
        {page === "settings" && (
          <SettingsPage
            goal={goal}
            settings={settings}
            setSettings={(next) => {
              setSettings(next);
              setGoal(next.goal);
            }}
            notify={notify}
            onImported={(p) => {
              setXp(p.xp);
              setGoal(p.goal);
              setMinutes(p.minutes);
              setStreak(p.streak);
              setBestStreak(p.bestStreak);
              if (p.placementLevel) setLevel(p.placementLevel);
              void db.settings.get("current").then((stored) => {
                if (stored)
                  setSettings({
                    ...stored,
                    uiLanguage: stored.uiLanguage || "bilingual",
                  });
              });
              void db.lessonProgress
                .toArray()
                .then((rows) =>
                  setCompletedLessons(
                    rows.filter((row) => row.completed).length,
                  ),
                );
              void db.vocabulary
                .toArray()
                .then((rows) => setReviewedWords(rows.length));
            }}
          />
        )}{" "}
        {toast && (
          <div className="toast" role="status">
            <Check size={16} />
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
function PageTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="page-title">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}
function Onboarding({
  onComplete,
}: {
  onComplete: (
    name: string,
    level: "A1" | "A2" | "B1" | "B2",
    goal: string,
    minutes: number,
    uiLanguage: LanguageMode,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"A1" | "A2" | "B1" | "B2">("A1");
  const [goal, setGoal] = useState("Everyday conversation");
  const [minutes, setMinutes] = useState(10);
  const [uiLanguage, setUiLanguage] = useState<LanguageMode>("bilingual");
  return (
    <div className="app-shell">
      <main className="main">
        <div className="content onboarding">
          <PageTitle
            eyebrow="WELCOME"
            title="Build your English habit"
            sub="Tell us a little about your learning goal. You can change preferences later."
          />
          <label>
            Your name
            <input
              aria-label="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Current level
            <select
              aria-label="Current level"
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
            >
              <option value="A1">A1 · Beginner</option>
              <option value="A2">A2 · Elementary</option>
              <option value="B1">B1 · Intermediate</option>
              <option value="B2">B2 · Upper intermediate</option>
            </select>
          </label>
          <label>
            Learning goal
            <select
              aria-label="Learning goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              <option>Everyday conversation</option>
              <option>Travel English</option>
              <option>English for work</option>
              <option>Exam preparation</option>
            </select>
          </label>
          <label>
            Daily goal
            <select
              aria-label="Daily goal"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
            </select>
          </label>
          <label>
            Interface language / ภาษาหน้าจอ
            <select
              aria-label="Interface language"
              value={uiLanguage}
              onChange={(e) => setUiLanguage(e.target.value as LanguageMode)}
            >
              {languageModes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="language-help">
            English remains the primary learning language. /
            บทเรียนภาษาอังกฤษยังคงเป็นเนื้อหาหลัก
          </p>
          <button
            className="primary-button"
            disabled={!name.trim()}
            onClick={() =>
              void onComplete(name.trim(), level, goal, minutes, uiLanguage)
            }
          >
            Start learning <ChevronRight size={17} />
          </button>
        </div>
      </main>
    </div>
  );
}
function Dashboard({
  onStart,
  mode,
  xp,
  minutes,
  goal,
  streak,
  bestStreak,
  level,
  setPage,
  completedLessons,
  reviewedWords,
}: {
  onStart: (l: Lesson) => void;
  mode: LanguageMode;
  xp: number;
  minutes: number;
  goal: number;
  streak: number;
  bestStreak: number;
  level: string;
  setPage: (p: string) => void;
  completedLessons: number;
  reviewedWords: number;
}) {
  const t = (key: TranslationKey) => translate(key, mode);
  const completion = Math.round((completedLessons / lessons.length) * 100);
  return (
    <div className="content">
      <div className="dashboard-head">
        <PageTitle
          eyebrow="YOUR DAILY PRACTICE"
          title={t("welcome")}
          sub="A little practice today goes a long way. / ฝึกทีละน้อยทุกวันช่วยพัฒนาได้มาก"
        />
        <button
          aria-label="Continue learning"
          className="primary-button"
          onClick={() => onStart(lessons[0])}
        >
          {t("continueLearning")} <ChevronRight size={17} />
        </button>
      </div>
      <div className="stats-row">
        <Stat
          label={t("currentStreak")}
          value={`${streak} days`}
          detail={`${t("bestStreak")}: ${bestStreak} days`}
          icon="🔥"
        />
        <Stat
          label={t("totalXp")}
          value={xp.toLocaleString()}
          detail="Earned from completed lessons / ได้จากบทเรียนที่เรียนจบ"
          icon="✦"
        />
        <Stat
          label="Your level / ระดับของคุณ"
          value={level}
          detail="Estimated starting level / ระดับเริ่มต้นโดยประมาณ"
          icon="↗"
        />
      </div>
      <div className="dashboard-grid">
        <section className="feature-lesson">
          <div className="section-label">
            PICK UP WHERE YOU LEFT OFF / เรียนต่อจากเดิม{" "}
            <span>{completion}%</span>
          </div>
          <div className="feature-inner">
            <div>
              <div className="lesson-icon mint">
                <span className="emoji">☕</span>
              </div>
              <h2>{lessons[3].title}</h2>
              <p>{lessons[3].summary}</p>
              <div className="meta">
                <span>
                  <Clock3 size={15} /> {lessons[3].duration} min
                </span>
                <span>
                  <Headphones size={15} /> {t("listening")}
                </span>
              </div>
              <button
                className="text-button"
                onClick={() => onStart(lessons[3])}
              >
                Open lesson / เปิดบทเรียน <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="progress-track">
            <i style={{ width: `${completion}%` }} />
          </div>
        </section>
        <aside className="daily-card">
          <div className="section-label">{t("dailyGoal")}</div>
          <div className="goal-ring">
            <div>
              <strong>{minutes}</strong>
              <span>/ {goal} min</span>
            </div>
          </div>
          <h3>
            {minutes >= goal
              ? "Goal reached! / บรรลุเป้าหมายแล้ว"
              : "Keep going! / สู้ต่อไป"}
          </h3>
          <p>
            {minutes >= goal
              ? "Great consistency today."
              : `${goal - minutes} more minutes to reach your goal.`}
          </p>
          <button className="soft-button" onClick={() => onStart(lessons[1])}>
            Add practice / เพิ่มการฝึก
          </button>
        </aside>
      </div>
      <div className="section-heading">
        <h2>Build your balanced practice / ฝึกให้สมดุล</h2>
        <button className="link-button" onClick={() => setPage("progress")}>
          {t("viewProgress")} <ChevronRight size={15} />
        </button>
      </div>
      <div className="skill-grid">
        <Skill
          icon={<Headphones />}
          name={t("listening")}
          value={completion}
          color="orange"
          detail={`${completedLessons} of ${lessons.length} lessons complete`}
        />
        <Skill
          icon={<Mic />}
          name={t("speaking")}
          value={completion}
          color="blue"
          detail={`${completedLessons} of ${lessons.length} lessons complete`}
        />
        <Skill
          icon={<BookOpen />}
          name={t("reading")}
          value={completion}
          color="purple"
          detail={`${completedLessons} of ${lessons.length} lessons complete`}
        />
      </div>
      <div className="section-heading lower">
        <h2>{t("reviewDue")}</h2>
        <span className="muted">{reviewedWords} words in your word bank</span>
      </div>
      <button className="outline-button" onClick={() => setPage("vocabulary")}>
        {t("startReview")} <ChevronRight size={16} />
      </button>
    </div>
  );
}
function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </div>
  );
}
function Skill({
  icon,
  name,
  value,
  color,
  detail,
}: {
  icon: React.ReactNode;
  name: string;
  value: number;
  color: string;
  detail: string;
}) {
  return (
    <div className="skill">
      <div className={"skill-icon " + color}>{icon}</div>
      <div className="skill-copy">
        <div>
          <strong>{name}</strong>
          <span>{value}%</span>
        </div>
        <div className="progress-track">
          <i className={color} style={{ width: `${value}%` }} />
        </div>
        <small>{detail}</small>
      </div>
    </div>
  );
}
function Learn({ onStart }: { onStart: (l: Lesson) => void }) {
  const [filter, setFilter] = useState("All levels");
  const shown =
    filter === "All levels"
      ? lessons
      : lessons.filter((l) => l.level === filter);
  return (
    <div className="content">
      <PageTitle
        eyebrow="LEARNING LIBRARY"
        title="Choose your next lesson"
        sub="Short, practical lessons designed for real-life English."
      />
      <div className="filter-row">
        <div className="filter-tabs">
          {["All levels", "A1", "A2", "B1", "B2"].map((f) => (
            <button
              className={filter === f ? "selected" : ""}
              onClick={() => setFilter(f)}
              key={f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="lesson-list">
        {shown.map((l) => (
          <div className="lesson-card" key={l.id}>
            <div className={"lesson-icon " + l.color}>{l.icon}</div>
            <div className="lesson-card-copy">
              <div className="lesson-top">
                <span className="level">{l.level}</span>
                <span className="topic">{l.topic}</span>
              </div>
              <h2>{l.title}</h2>
              <p>{l.description}</p>
              <div className="meta">
                <span>
                  <Clock3 size={14} />
                  {l.duration} min
                </span>
                <span>{l.skill}</span>
                <span>+{l.xp} XP</span>
              </div>
            </div>
            <button
              className="circle-arrow"
              aria-label={"Open " + l.title}
              onClick={() => onStart(l)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function LessonView({
  lesson,
  speak,
  mode,
  showTranslation,
  onFinish,
  notify,
}: {
  lesson: Lesson;
  speak: (text: string, rate?: number) => void;
  mode: LanguageMode;
  showTranslation: boolean;
  onFinish: () => void;
  notify: (message: string) => void;
}) {
  const [showTranscript, setShowTranscript] = useState(true);
  const [translationVisible, setTranslationVisible] = useState(showTranslation);
  const [rate, setRate] = useState(1);
  const [answer, setAnswer] = useState<number>();
  const [dictation, setDictation] = useState("");
  const [recording, setRecording] = useState(false);
  const sentence = lesson.speaking;
  const t = (key: TranslationKey) => translate(key, mode);
  useEffect(() => setTranslationVisible(showTranslation), [showTranslation]);
  return (
    <div className="content lesson-page">
      <button className="back-button">← Back to lessons</button>
      <div className="lesson-header">
        <div>
          <div className="eyebrow">
            LISTENING · {lesson.level} · {lesson.duration} MIN
          </div>
          <h1>{lesson.title}</h1>
          <p>{lesson.summary}</p>
        </div>
        <span className="lesson-xp">+{lesson.xp} XP</span>
      </div>
      <section className="player-card">
        <div className="player-top">
          <div className="mini-wave">
            <Headphones />
          </div>
          <div>
            <small>CONVERSATION</small>
            <strong>{lesson.topic}</strong>
          </div>
          <select
            aria-label="Speech speed"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
          >
            <option value="0.75">0.75×</option>
            <option value="1">1.0×</option>
            <option value="1.25">1.25×</option>
          </select>
        </div>
        <div className="player-controls">
          <button aria-label="Replay" onClick={() => speak(sentence, rate)}>
            <RotateCcw size={18} />
          </button>
          <button
            className="play-button"
            aria-label="Play"
            onClick={() => speak(sentence, rate)}
          >
            <Play size={20} fill="currentColor" />
          </button>
          <button aria-label="Sound" onClick={() => speak(sentence, rate)}>
            <Volume2 size={18} />
          </button>
        </div>
      </section>
      <div className="transcript-head">
        <h2>{t("listeningPractice")}</h2>
        <div className="transcript-actions">
          <button
            className="toggle"
            aria-label={showTranscript ? "Hide transcript" : "Show transcript"}
            onClick={() => setShowTranscript(!showTranscript)}
          >
            {showTranscript ? t("hideTranscript") : t("showTranscript")}
          </button>
          <button
            className="toggle"
            aria-label={
              translationVisible
                ? "Hide Thai translation"
                : "Show Thai translation"
            }
            onClick={() => setTranslationVisible((value) => !value)}
          >
            {translationVisible ? t("hideTranslation") : t("showTranslation")}
          </button>
        </div>
      </div>
      {showTranscript && (
        <div className="transcript">
          {lesson.dialogue.map((line, index) => (
            <React.Fragment key={line.english}>
              <div className={"speaker " + (index % 2 ? "b" : "a")}>
                {line.speaker}
              </div>
              <div>
                <span className="speaker-name">Speaker {line.speaker}</span>
                <p className={index === 0 ? "current-line" : ""}>
                  {line.english}
                </p>
                {translationVisible && <p className="thai">{line.thai}</p>}
              </div>
              <button
                aria-label={"Listen to line " + (index + 1)}
                onClick={() => speak(line.english, rate)}
              >
                <Volume2 size={16} />
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
      <section className="practice-card">
        <div>
          <div className="eyebrow">SPEAKING PRACTICE / {t("speaking")}</div>
          <h2>Now try it yourself</h2>
          <p>{lesson.speaking}</p>
        </div>
        <div className="practice-actions">
          <button className="soft-button" onClick={() => speak(sentence, rate)}>
            <Volume2 size={16} /> {t("listen")}
          </button>
          <button
            className={recording ? "record-button active" : "record-button"}
            onClick={() => {
              setRecording(!recording);
              notify(recording ? "Recording stopped." : "Recording started.");
            }}
          >
            {recording ? <Square size={16} /> : <Mic size={16} />}{" "}
            {recording ? t("stopRecording") : t("recordVoice")}
          </button>
        </div>
      </section>
      <section className="dictation-card">
        <div className="eyebrow">DICTATION</div>
        <h2>Type what you hear</h2>
        <button className="soft-button" onClick={() => speak(sentence, rate)}>
          <Volume2 size={16} /> Play sentence
        </button>
        <textarea
          aria-label="Your dictation answer"
          value={dictation}
          onChange={(e) => setDictation(e.target.value)}
          placeholder="Type the sentence you hear…"
        />
        <button
          className="primary-button"
          onClick={() =>
            notify(
              dictation.trim().toLowerCase() === sentence.toLowerCase()
                ? "100% accuracy."
                : "Keep listening and try again.",
            )
          }
        >
          {t("checkAnswer")}
        </button>
      </section>
      <section className="quiz-card">
        <div className="eyebrow">QUICK CHECK</div>
        <h2>{lesson.quiz[0].question}</h2>
        <div className="answers">
          {lesson.quiz[0].options.map((option, index) => (
            <button
              key={option}
              onClick={() => setAnswer(index)}
              className={
                answer === index
                  ? index === lesson.quiz[0].answer
                    ? "answer correct-answer"
                    : "answer"
                  : "answer"
              }
            >
              {option}
              {answer === index && index === lesson.quiz[0].answer && (
                <Check size={16} />
              )}
            </button>
          ))}
        </div>
        {answer !== undefined && (
          <p className="explanation">
            {answer === lesson.quiz[0].answer
              ? `${t("correct")} — `
              : `${t("incorrect")} — `}
            {lesson.quiz[0].explanation}
          </p>
        )}
      </section>
      <button className="finish-button" onClick={onFinish}>
        {t("completeLesson")} <Check size={17} />
      </button>
    </div>
  );
}
function Reading({
  lesson,
  speak,
  notify,
}: {
  lesson: Lesson;
  speak: (text: string) => void;
  notify: (message: string) => void;
}) {
  const [answer, setAnswer] = useState<number>();
  const options = lesson.reading.options || [
    lesson.reading.answer,
    "A different idea",
  ];
  const correct = options.indexOf(lesson.reading.answer);
  return (
    <div className="content">
      <PageTitle
        eyebrow={"READING · " + lesson.level}
        title={lesson.title}
        sub="Read for the main idea, then check your understanding."
      />
      <div className="reading-card">
        <div className="reading-meta">
          <span>{lesson.topic}</span>
          <span>{lesson.duration} min read</span>
        </div>
        <p className="reading-text">{lesson.reading.text}</p>
        <button
          className="soft-button"
          onClick={() => speak(lesson.reading.text)}
        >
          <Volume2 size={16} /> Read aloud
        </button>
      </div>
      <div className="quiz-card reading-question">
        <div className="eyebrow">COMPREHENSION</div>
        <h2>{lesson.reading.question}</h2>
        <div className="answers">
          {options.map((option, index) => (
            <button
              key={option}
              onClick={() => {
                setAnswer(index);
                notify(
                  index === correct
                    ? "Correct answer."
                    : "That answer is not supported by the passage.",
                );
              }}
              className={
                answer === index
                  ? index === correct
                    ? "correct-answer"
                    : "incorrect-answer"
                  : ""
              }
            >
              {option}
            </button>
          ))}
        </div>
        {answer !== undefined && (
          <p className="explanation">
            {answer === correct ? "Correct. " : "Try again. "}
            {lesson.quiz[0].explanation}
          </p>
        )}
      </div>
    </div>
  );
}
function Practice({
  speak,
  notify,
}: {
  speak: (text: string, rate?: number) => void;
  notify: (message: string) => void;
}) {
  const target = "I would like to make a reservation.";
  const [url, setUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [speech, setSpeech] = useState<{
    transcript: string;
    percentage: number;
    matched: string[];
    missing: string[];
  }>();
  const [listening, setListening] = useState(false);
  const recorder = useRef<MediaRecorder | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const chunks = useRef<Blob[]>([]);
  const urlRef = useRef("");
  const recognitionStop = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    urlRef.current = url;
  }, [url]);
  useEffect(
    () => () => {
      recognitionStop.current?.();
      const active = recorder.current;
      if (active) {
        active.ondataavailable = null;
        active.onstop = null;
        active.onerror = null;
        if (active.state !== "inactive") active.stop();
      }
      recorder.current = undefined;
      stream.current?.getTracks().forEach((track) => track.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );
  const toggle = async () => {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      notify(
        "Recording is not supported in this browser. You can still listen and practise.",
      );
      return;
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.current = nextStream;
      chunks.current = [];
      const next = new MediaRecorder(nextStream);
      recorder.current = next;
      next.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      next.onstop = () => {
        const nextUrl = URL.createObjectURL(
          new Blob(chunks.current, { type: next.mimeType || "audio/webm" }),
        );
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return nextUrl;
        });
        nextStream.getTracks().forEach((track) => track.stop());
        notify("Recording saved.");
      };
      next.start();
      setRecording(true);
      notify("Recording started.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      notify(
        name === "NotAllowedError"
          ? "Microphone permission was denied."
          : "We could not start the microphone.",
      );
    }
  };
  const startMatch = () => {
    recognitionStop.current?.();
    setSpeech(undefined);
    setListening(true);
    recognitionStop.current = startSpeechMatch(
      target,
      (result) => {
        setSpeech(result);
        setListening(false);
        recognitionStop.current = undefined;
      },
      () => {
        setListening(false);
        recognitionStop.current = undefined;
        notify(
          "Speech Recognition is not available. You can still record and listen.",
        );
      },
    );
  };
  const stopMatch = () => {
    recognitionStop.current?.();
    recognitionStop.current = undefined;
    setListening(false);
  };
  return (
    <div className="content">
      <PageTitle
        eyebrow="SPEAKING STUDIO"
        title="Find your speaking voice"
        sub="Your recording stays on this device."
      />
      <div className="speaking-stage">
        <div className="quote-mark">“</div>
        <h2>{target}</h2>
        <p>Try to match the rhythm and pauses.</p>
        <div className="speaking-buttons">
          <button className="soft-button" onClick={() => speak(target)}>
            <Volume2 /> Listen
          </button>
          <button
            className={
              recording ? "record-button active large" : "record-button large"
            }
            onClick={() => void toggle()}
          >
            {recording ? <Square /> : <Mic />}
            {recording ? " Stop recording" : " Record my voice"}
          </button>
          <button
            className="outline-button"
            onClick={listening ? stopMatch : startMatch}
          >
            {listening ? "Stop speech check" : "Check speech match"}
          </button>
        </div>
        {recording && (
          <div className="recording-status">
            <span className="pulse" /> Recording in progress
          </div>
        )}
        {url && (
          <div className="recording-playback">
            <audio controls src={url} />
            <button
              className="outline-button"
              onClick={() => {
                URL.revokeObjectURL(url);
                urlRef.current = "";
                setUrl("");
                notify("Recording deleted.");
              }}
            >
              Delete recording
            </button>
          </div>
        )}
      </div>
      <div className="speech-note">
        <Brain size={19} />
        <div>
          <strong>Speech Match Score</strong>
          {speech ? (
            <>
              <p>
                {speech.percentage}% match · “{speech.transcript}”
              </p>
              <small>
                Matched: {speech.matched.join(", ") || "none"} · Missing:{" "}
                {speech.missing.join(", ") || "none"}
              </small>
            </>
          ) : (
            <p>
              {listening
                ? "Listening… speak the sentence clearly."
                : "Use Check speech match to compare your words when browser support is available."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
function Vocabulary({
  speak,
  notify,
}: {
  speak: (text: string) => void;
  notify: (message: string) => void;
}) {
  const words = [
    ["reservation", "การจอง", "noun", "I made a reservation for two."],
    ["available", "ว่าง, พร้อมใช้", "adjective", "Is this seat available?"],
    ["recommend", "แนะนำ", "verb", "What do you recommend?"],
    ["receipt", "ใบเสร็จ", "noun", "Could I get the receipt, please?"],
    ["actually", "ที่จริงแล้ว", "adverb", "Actually, I’ll have tea."],
  ];
  const [review, setReview] = useState(0);
  const [status, setStatus] = useState<
    Record<string, VocabularyRecord["status"]>
  >({});
  useEffect(() => {
    void db.vocabulary
      .toArray()
      .then((rows) =>
        setStatus(Object.fromEntries(rows.map((row) => [row.id, row.status]))),
      );
  }, []);
  const current = words[review % words.length];
  const choose = async (choice: "Again" | "Hard" | "Good" | "Easy") => {
    const id = current[0];
    const old = status[id] || "New";
    const progression: VocabularyRecord["status"][] = [
      "New",
      "Learning",
      "Familiar",
      "Mastered",
    ];
    const next =
      choice === "Again"
        ? "Learning"
        : progression[
            Math.min(3, progression.indexOf(old) + (choice === "Easy" ? 2 : 1))
          ];
    const reviewedAt = new Date().toISOString();
    setStatus((previous) => ({ ...previous, [id]: next }));
    await db.vocabulary.put({
      id,
      word: id,
      meaningThai: current[1],
      definition: `${current[0]} in context`,
      example: current[3],
      status: next,
      nextReviewAt: new Date(
        Date.parse(reviewedAt) +
          (choice === "Again"
            ? 0
            : choice === "Hard"
              ? 86400000
              : choice === "Good"
                ? 259200000
                : 604800000),
      ).toISOString(),
      interval: choice === "Again" ? 0 : 1,
      ease: 2.5,
    });
    await db.reviews.put({
      id: `${id}-${reviewedAt}`,
      vocabularyId: id,
      choice,
      reviewedAt,
    });
    setReview((value) => value + 1);
    notify(`${choice}. Next word ready.`);
  };
  return (
    <div className="content">
      <PageTitle
        eyebrow="YOUR WORD BANK"
        title="Small words, big progress"
        sub="Review words from your lessons with a simple spaced-repetition schedule."
      />
      <div className="vocab-toolbar">
        <div className="vocab-summary">
          <strong>{Object.keys(status).length}</strong>
          <span>words reviewed</span>
        </div>
        <button className="primary-button" onClick={() => speak(current[0])}>
          Listen <Volume2 size={16} />
        </button>
      </div>
      <div className="word-list">
        {words.map((w) => (
          <div className="word-row" key={w[0]}>
            <div className="word-icon">Aa</div>
            <div className="word-main">
              <strong>{w[0]}</strong>
              <span>
                {w[1]} · {w[2]}
              </span>
              <small>{w[3]}</small>
            </div>
            <button
              className="icon-button"
              aria-label={"Listen to " + w[0]}
              onClick={() => speak(w[0])}
            >
              <Volume2 size={17} />
            </button>
            <div className="mastery">
              <span>{status[w[0]] || "New"}</span>
              <i>
                <b style={{ width: `${status[w[0]] ? 65 : 10}%` }} />
              </i>
            </div>
            <button
              className="add-button"
              aria-label={"Review " + w[0]}
              onClick={() => void choose("Good")}
            >
              <Plus size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="review-card">
        <h2>Quick review: {current[0]}</h2>
        <p>
          {current[1]} · {current[3]}
        </p>
        <div className="review-choices">
          {(["Again", "Hard", "Good", "Easy"] as const).map((choice) => (
            <button key={choice} onClick={() => void choose(choice)}>
              {choice}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
function Progress({
  xp,
  minutes,
  streak,
  level,
}: {
  xp: number;
  minutes: number;
  streak: number;
  level: string;
}) {
  const [completed, setCompleted] = useState(0);
  useEffect(() => {
    db.lessonProgress
      .toArray()
      .then((rows) => setCompleted(rows.filter((row) => row.completed).length));
  }, []);
  const percentage = Math.round((completed / lessons.length) * 100);
  return (
    <div className="content">
      <PageTitle
        eyebrow="YOUR JOURNEY"
        title="Progress that feels good"
        sub="See the habits behind your growing confidence."
      />
      <div className="progress-hero">
        <div>
          <span className="eyebrow">OVERALL COMPLETION</span>
          <strong>{percentage}%</strong>
          <p>
            {completed} of {lessons.length} lessons complete · level {level}
          </p>
        </div>
        <div className="big-ring">
          <span>{streak}</span>
          <small>day streak</small>
        </div>
      </div>
      <div className="analytics-grid">
        <div className="analytics-card">
          <small>SKILL BALANCE</small>
          <h2>From completed activities</h2>
          <p>
            Listening, speaking, and reading progress will grow as you finish
            activities.
          </p>
        </div>
        <div className="analytics-card">
          <small>ALL TIME</small>
          <div className="big-stat">
            <strong>{xp.toLocaleString()}</strong>
            <span>Total XP</span>
          </div>
          <div className="stat-line">
            <span>Study time</span>
            <b>{minutes} min</b>
          </div>
          <div className="stat-line">
            <span>Lessons complete</span>
            <b>{completed}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
function Placement({
  onDone,
}: {
  onDone: (
    result: ReturnType<typeof scorePlacement> & { answers: number[] },
  ) => void;
}) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  if (!started)
    return (
      <div className="content">
        <PageTitle
          eyebrow="FIND YOUR STARTING POINT"
          title="Estimated English Level"
          sub="A 28-question check across vocabulary, grammar, reading, and listening. This is not official CEFR certification."
        />
        <div className="placement-intro">
          <h2>Take the placement test</h2>
          <p>Questions become more challenging. Choose the best answer.</p>
          <button className="primary-button" onClick={() => setStarted(true)}>
            Start test <ChevronRight size={17} />
          </button>
        </div>
      </div>
    );
  if (finished) {
    const result = scorePlacement(placementQuestions, answers);
    return (
      <div className="content">
        <PageTitle
          eyebrow="YOUR RESULT"
          title="Estimated English Level"
          sub="A helpful starting point, not a formal qualification."
        />
        <div className="result-card">
          <span>Your current estimate</span>
          <strong>{result.level}</strong>
          <p>
            {result.score} / {result.maximum} weighted points (
            {result.percentage}%)
          </p>
          <div className="result-grid">
            {Object.entries(result.bySkill).map(([skill, score]) => (
              <span key={skill}>
                {skill} <b>{score.percentage}%</b>
              </span>
            ))}
          </div>
          <button
            className="primary-button"
            onClick={() => onDone({ ...result, answers })}
          >
            Start learning <ChevronRight size={17} />
          </button>
        </div>
      </div>
    );
  }
  const q = placementQuestions[index];
  return (
    <div className="content placement-page">
      <div className="placement-progress">
        <span>
          Question {index + 1} of {placementQuestions.length}
        </span>
        <i>
          <b
            style={{
              width: `${((index + 1) / placementQuestions.length) * 100}%`,
            }}
          />
        </i>
      </div>
      <div className="question-card">
        <div className="eyebrow">
          {q.level} · {q.skill}
        </div>
        <h1>{q.question}</h1>
        <div className="answers">
          {q.options.map((option, i) => (
            <button
              key={option}
              className={answers[index] === i ? "correct-answer" : ""}
              onClick={() => {
                const next = [...answers];
                next[index] = i;
                setAnswers(next);
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <button
          className="primary-button next-button"
          disabled={answers[index] === undefined}
          onClick={() =>
            index === placementQuestions.length - 1
              ? setFinished(true)
              : setIndex(index + 1)
          }
        >
          {index === placementQuestions.length - 1
            ? "See result"
            : "Next question"}{" "}
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
function SettingsPage({
  goal,
  settings,
  setSettings,
  notify,
  onImported,
}: {
  goal: number;
  settings: StoredSettings;
  setSettings: (next: StoredSettings) => void;
  notify: (message: string) => void;
  onImported: (p: {
    xp: number;
    goal: number;
    minutes: number;
    streak: number;
    bestStreak: number;
    placementLevel?: "A1" | "A2" | "B1" | "B2";
  }) => void;
}) {
  const update = async (next: StoredSettings) => {
    setSettings(next);
    await db.settings.put({ id: "current", ...next });
  };
  const reset = async () => {
    await db.transaction(
      "rw",
      [
        db.progress,
        db.lessonProgress,
        db.vocabulary,
        db.reviews,
        db.dailyActivity,
        db.placement,
      ],
      async () => {
        await db.progress.clear();
        await db.lessonProgress.clear();
        await db.vocabulary.clear();
        await db.reviews.clear();
        await db.dailyActivity.clear();
        await db.placement.clear();
      },
    );
    notify("Progress reset. Reloading defaults.");
    window.location.reload();
  };
  const input = useRef<HTMLInputElement>(null);
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const value: unknown = JSON.parse(await file.text());
      if (!validateImportPayload(value)) throw new Error("invalid");
      const progress = await importProgress(value);
      onImported(progress);
      notify("Progress imported successfully.");
    } catch {
      notify("Import failed: choose a compatible English Coach JSON backup.");
    } finally {
      event.target.value = "";
    }
  };
  const download = async () => {
    try {
      const data = await exportProgress();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "english-coach-progress.json";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      notify("Progress backup downloaded.");
    } catch {
      notify("Could not export progress.");
    }
  };
  const t = (key: TranslationKey) => translate(key, settings.uiLanguage);
  return (
    <div className="content">
      <PageTitle
        eyebrow="YOUR PREFERENCES"
        title={t("settings")}
        sub={t("languageHelp")}
      />
      <div className="settings-panel">
        <SettingRow title={t("uiLanguage")} detail={t("languageHelp")}>
          <select
            aria-label="UI language"
            value={settings.uiLanguage}
            onChange={(e) =>
              void update({
                ...settings,
                uiLanguage: e.target.value as LanguageMode,
              })
            }
          >
            {languageModes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingRow>
        <SettingRow
          title={t("dailyGoal")}
          detail="How much time would you like to practice each day?"
        >
          <div className="goal-options">
            {[5, 10, 15, 20, 30].map((n) => (
              <button
                className={goal === n ? "selected" : ""}
                key={n}
                onClick={() => void update({ ...settings, goal: n })}
              >
                {n} min
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow
          title={t("thaiTranslation")}
          detail="Show Thai translations by default"
        >
          <button
            aria-label="Toggle Thai translation"
            className={settings.translation ? "switch on" : "switch"}
            onClick={() =>
              void update({ ...settings, translation: !settings.translation })
            }
          >
            <span />
          </button>
        </SettingRow>
        <SettingRow
          title={t("englishVoice")}
          detail="Used for listening exercises"
        >
          <select
            aria-label="English voice"
            value={settings.voice}
            onChange={(e) =>
              void update({ ...settings, voice: e.target.value })
            }
          >
            <option>US English</option>
            <option>UK English</option>
          </select>
        </SettingRow>
        <SettingRow
          title={t("speechSpeed")}
          detail="Default browser speech rate"
        >
          <select
            aria-label="Speech speed"
            value={settings.speechRate}
            onChange={(e) =>
              void update({ ...settings, speechRate: Number(e.target.value) })
            }
          >
            <option value="0.75">0.75×</option>
            <option value="1">1.0×</option>
            <option value="1.25">1.25×</option>
          </select>
        </SettingRow>
        <SettingRow
          title={t("sound")}
          detail="Play gentle sounds for progress and rewards"
        >
          <button
            aria-label="Toggle sound effects"
            className={settings.sound ? "switch on" : "switch"}
            onClick={() => void update({ ...settings, sound: !settings.sound })}
          >
            <span />
          </button>
        </SettingRow>
      </div>
      <div className="data-panel">
        <div>
          <h2>Your learning data</h2>
          <p>
            Everything is stored locally. Export a backup before changing
            browsers.
          </p>
        </div>
        <div className="data-actions">
          <button className="outline-button" onClick={() => void download()}>
            {t("exportProgress")}
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json"
            hidden
            onChange={onFile}
          />
          <button
            className="outline-button"
            onClick={() => input.current?.click()}
          >
            {t("importProgress")}
          </button>
          <button className="danger-button" onClick={() => void reset()}>
            {t("resetProgress")}
          </button>
        </div>
      </div>
    </div>
  );
}
function SettingRow({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      {children}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator)
  window.addEventListener(
    "load",
    () =>
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`),
  );
