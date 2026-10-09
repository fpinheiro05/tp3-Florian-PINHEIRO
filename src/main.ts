import "./styles.css";
import { LEVELS, type Level } from "./game/levels";
import {
  checkAttempt,
  clearProgress,
  isGameComplete,
  isLevelSolved,
  loadProgress,
  saveProgress,
  scoreForLevel,
  solvedCount,
  totalScore,
  type AttemptResult,
  type GameProgress,
} from "./game/engine";
import { Ui, levelBadgeRows } from "./game/ui";
import { createWorld, type Interactable, type World } from "./game/world";
import { Sfx } from "./game/audio";

interface AppState {
  progress: GameProgress;
  currentLevel: Level;
  hintsUsedThisLevel: number;
  wrongThisLevel: number;
  lastResult: AttemptResult | null;
  running: boolean;
}

function main(): void {
  const mount = document.getElementById("app");
  if (!mount) throw new Error("#app introuvable");

  const canvas = document.createElement("canvas");
  canvas.id = "scene";
  mount.appendChild(canvas);

  const sfx = new Sfx();

  const state: AppState = {
    progress: loadProgress(),
    currentLevel: LEVELS[0]!,
    hintsUsedThisLevel: 0,
    wrongThisLevel: 0,
    lastResult: null,
    running: false,
  };

  const ui = new Ui(mount, {
    onStart: () => {
      ui.hideTitle();
      startGame();
    },
    onSubmit: (selection) => onAuditSubmit(selection),
    onUseHint: () => useHint(),
    onNextRoom: () => goNextRoom(),
    onClosePuzzle: () => closePuzzle(),
    onPauseToggle: () => void 0,
    onRestart: () => restart(),
  });

  function startGame(): void {
    state.running = true;
    sfx.click();
    world.start();
    refreshHud();
  }

  function refreshHud(): void {
    const solved = solvedCount(state.progress);
    ui.setHud({
      room: `${state.currentLevel.roomName.split(" — ")[0]}` + ` — <b>${state.currentLevel.vulnerability}</b>`,
      score: totalScore(state.progress),
      solved,
    });
  }

  function openLevel(level: Level): void {
    state.currentLevel = level;
    state.hintsUsedThisLevel = state.progress.solved[level.id]?.hintsUsed ?? 0;
    state.wrongThisLevel = state.progress.solved[level.id]?.wrongAttempts ?? 0;
    state.lastResult = null;
    const solved = isLevelSolved(state.progress, level.id);
    ui.setHintsLeft(Math.max(0, 3 - state.hintsUsedThisLevel));
    ui.openPuzzle({
      level,
      selection: [],
      hintsUsed: state.hintsUsedThisLevel,
      wrongAttempts: state.wrongThisLevel,
      solved,
      lastResult: null,
    });
    ui.showPrompt(null);
    if (document.pointerLockElement) document.exitPointerLock();
    refreshHud();
  }

  function onAuditSubmit(selection: number[]): AttemptResult {
    const level = state.currentLevel;
    const result = checkAttempt(level, selection);
    state.lastResult = result;

    if (result.success) {
      if (!isLevelSolved(state.progress, level.id)) {
        const score = scoreForLevel(level, state.hintsUsedThisLevel, state.wrongThisLevel);
        state.progress.solved[level.id] = {
          hintsUsed: state.hintsUsedThisLevel,
          wrongAttempts: state.wrongThisLevel,
          score,
          timeMs: Date.now() - state.progress.startedAt,
        };
        saveProgress(state.progress);
        world.setDoorOpen(level.index, true);
        sfx.success();
        ui.toast(`Porte déverrouillée ! +${score} pts`, "ok");
      } else {
        sfx.success();
      }
      refreshHud();
      checkVictory();
    } else {
      state.wrongThisLevel += 1;
      sfx.error();
    }
    return result;
  }

  function useHint(): void {
    const level = state.currentLevel;
    if (isLevelSolved(state.progress, level.id)) return;
    if (state.hintsUsedThisLevel >= 3) {
      ui.toast("Plus d'indice disponible pour cette salle.", "ko");
      return;
    }
    state.hintsUsedThisLevel += 1;
    sfx.hint();
    ui.openPuzzle({
      level,
      selection: ui.getSelection(),
      hintsUsed: state.hintsUsedThisLevel,
      wrongAttempts: state.wrongThisLevel,
      solved: false,
      lastResult: state.lastResult,
    });
    ui.setHintsLeft(3 - state.hintsUsedThisLevel);
    if (state.hintsUsedThisLevel === 3) {
      ui.toast("Indice 3 : la réponse est révélée (−500 pts).", "ko");
    }
  }

  function goNextRoom(): void {
    const idx = state.currentLevel.index;
    const next = LEVELS[idx + 1];
    closePuzzle();
    if (!next) {
      checkVictory();
      return;
    }
    world.teleportToRoom(next.index);
    state.currentLevel = next;
    refreshHud();
    ui.toast(`${next.roomName} — ${next.title}`, "info");
  }

  function closePuzzle(): void {
    ui.closePuzzle();
    if (state.running) canvas.requestPointerLock();
    refreshHud();
  }

  function checkVictory(): void {
    if (!isGameComplete(state.progress)) return;
    const score = totalScore(state.progress);
    const rows = levelBadgeRows(state.progress.solved);
    const totalTime = Object.values(state.progress.solved).reduce((m, r) => Math.max(m, r.timeMs), 0);
    const minutes = Math.round(totalTime / 60000);
    const hints = Object.values(state.progress.solved).reduce((s, r) => s + r.hintsUsed, 0);
    let comment = `Évasion en ${minutes} min, ${hints} indice(s) utilisé(s). `;
    comment += score >= 5500 ? "Auditeur d'élite." : score >= 4000 ? "Excellent travail." : score >= 2500 ? "Bien joué." : "L'essentiel est d'être sorti.";
    ui.showWin(score, comment, rows, true);
    sfx.win();
    if (document.pointerLockElement) document.exitPointerLock();
  }

  function restart(): void {
    state.progress = clearProgress();
    state.currentLevel = LEVELS[0]!;
    state.hintsUsedThisLevel = 0;
    state.wrongThisLevel = 0;
    state.lastResult = null;
    LEVELS.forEach((_lvl, i) => world.setDoorOpen(i, false));
    world.teleportToRoom(0);
    ui.hideTitle();
    ui.closePuzzle();
    refreshHud();
    startGame();
    ui.toast("Nouvelle partie.", "info");
  }

  function onInteract(target: Interactable): void {
    const level = LEVELS[target.levelIndex];
    if (!level) return;
    if (target.kind === "terminal") {
      sfx.select();
      openLevel(level);
      return;
    }
    // Porte
    if (isLevelSolved(state.progress, level.id)) {
      ui.toast("La porte est ouverte. Avancez.", "ok");
      sfx.door();
    } else {
      ui.toast("🔒 Porte verrouillée : validez l'audit du contrat pour l'ouvrir.", "ko");
      sfx.error();
    }
  }

  const world: World = createWorld(canvas, {
    onInteract: (t) => {
      if (ui.isPuzzleOpen()) return;
      onInteract(t);
    },
    onPointerLockChange: (locked) => {
      if (!state.running) return;
      ui.setPauseVisible(!locked && !ui.isPuzzleOpen());
    },
  });

  // Restaure les portes des salles déjà résolues.
  LEVELS.forEach((l, i) => {
    if (isLevelSolved(state.progress, l.id)) world.setDoorOpen(i, true);
  });

  // Suivi du focus pour le prompt d'interaction.
  window.setInterval(() => {
    if (!state.running || ui.isPuzzleOpen()) {
      ui.showPrompt(null);
      return;
    }
    const f = world.getFocus();
    if (!f) {
      ui.showPrompt(null);
      return;
    }
    if (f.kind === "terminal") {
      const l = LEVELS[f.levelIndex]!;
      ui.showPrompt(`Examiner le contrat <b>${l.id}.sol</b> — <kbd>E</kbd>`);
    } else {
      const l = LEVELS[f.levelIndex]!;
      ui.showPrompt(
        isLevelSolved(state.progress, l.id)
          ? `Porte ouverte — <kbd>E</kbd>`
          : `Porte verrouillée (${l.vulnerability})`,
      );
    }
  }, 120);

  // Échap : ferme le puzzle ou sort du pointer lock (pause).
  document.addEventListener("keydown", (e) => {
    if (e.code !== "Escape") return;
    if (ui.isPuzzleOpen()) {
      closePuzzle();
    }
  });

  // Affiche les salles déjà validées au démarrage.
  refreshHud();
  ui.showTitle();
  state.running = false;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}

export { main };
