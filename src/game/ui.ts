import { highlightSolidity } from "./highlight";
import { MAX_HINTS, type Level, LEVELS } from "./levels";
import { type AttemptResult } from "./engine";

export interface UiCallbacks {
  onStart: () => void;
  onSubmit: (selection: number[]) => AttemptResult;
  onUseHint: () => void;
  onNextRoom: () => void;
  onClosePuzzle: () => void;
  onPauseToggle: () => void;
  onRestart: () => void;
}

export interface PuzzleSnapshot {
  level: Level;
  selection: number[];
  hintsUsed: number;
  wrongAttempts: number;
  solved: boolean;
  lastResult: AttemptResult | null;
}

export class Ui {
  private root: HTMLDivElement;
  private cb: UiCallbacks;
  private selection = new Set<number>();
  private current: Level | null = null;
  private puzzleSolved = false;
  private codeEl!: HTMLDivElement;
  private feedbackEl!: HTMLDivElement;
  private hintListEl!: HTMLDivElement;
  private submitBtn!: HTMLButtonElement;
  private hintBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private titleEl!: HTMLDivElement;
  private selectionCountEl!: HTMLSpanElement;

  constructor(mount: HTMLElement, cb: UiCallbacks) {
    this.cb = cb;
    this.root = document.createElement("div");
    this.root.id = "ui-root";
    mount.appendChild(this.root);
    this.buildBase();
  }

  private el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    html?: string,
  ): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  private buildBase(): void {
    // HUD
    const hud = this.el("div");
    hud.id = "hud";
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-stack">
          <div class="chip" id="chip-room">Salle 01 — <b>Le Coffre</b></div>
          <div class="chip" id="chip-hint">Visez un <b>terminal</b> puis <b>[E]</b></div>
        </div>
        <div class="hud-stack">
          <div class="chip">Score : <span class="score" id="chip-score">0</span></div>
          <div class="chip">Salles : <b><span id="chip-solved">0</span>/5</b></div>
        </div>
      </div>
      <div id="crosshair"></div>
      <div id="prompt"></div>
      <div id="pause-hint"><b>Pause</b><br><small>Cliquez pour reprendre</small></div>
    `;
    this.root.appendChild(hud);

    // Puzzle overlay
    const puzzle = this.el("div", "overlay");
    puzzle.id = "ov-puzzle";
    puzzle.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <span class="tag" id="pz-tag">Salle</span>
            <h2 id="pz-title">Titre</h2>
            <div class="sub" id="pz-desc"></div>
          </div>
          <button class="ghost" id="pz-close" title="Fermer (Échap)">✕</button>
        </div>
        <div class="code-wrap">
          <div class="code-title">
            <span id="pz-file">Vault.sol</span>
            <span><span id="pz-count">0</span> ligne(s) sélectionnée(s)</span>
          </div>
          <div class="code-body" id="pz-code"></div>
        </div>
        <div class="feedback" id="pz-feedback"></div>
        <div class="hint-list" id="pz-hints"></div>
        <div class="btn-row">
          <button class="primary" id="pz-submit">Valider l'audit</button>
          <button class="hint" id="pz-hint">Demander un indice</button>
          <button class="ghost" id="pz-clear">Effacer</button>
          <button class="primary" id="pz-next" style="display:none">Salle suivante →</button>
        </div>
      </div>
    `;
    this.root.appendChild(puzzle);

    // Title overlay
    const title = this.el("div", "overlay open");
    title.id = "ov-title";
    title.innerHTML = `
      <div class="panel screen">
        <span class="tag">Audit · Solidity · Escape game 3D</span>
        <h1>SOLIDITY ESCAPE 3D</h1>
        <p>
          Vous êtes enfermé dans le labo. Cinq smart contracts piégés bloquent autant de portes.
          Repérez <b>toutes</b> les lignes buguées de chaque contrat, validez l'audit et évadez-vous.
          Trois indices par salle — le troisième donne la réponse, mais coûte cher en score.
        </p>
        <div class="controls">
          <div class="ctrl"><b>ZQSD / WASD</b><br>Se déplacer</div>
          <div class="ctrl"><b>Souris</b><br>Regarder</div>
          <div class="ctrl"><b>Maj</b><br>Courir</div>
          <div class="ctrl"><b>E</b><br>Interagir / examiner</div>
          <div class="ctrl"><b>Échap</b><br>Fermer / pause</div>
          <div class="ctrl"><b>Cliquer sur une ligne</b><br>Marquer un bug</div>
        </div>
        <div class="btn-row" style="justify-content:center">
          <button class="primary" id="btn-start">Entrer dans le labo</button>
        </div>
      </div>
    `;
    this.root.appendChild(title);

    // Victory overlay
    const win = this.el("div", "overlay");
    win.id = "ov-win";
    win.innerHTML = `
      <div class="panel screen">
        <span class="tag">Évasion réussie</span>
        <h1>Vous êtes libre.</h1>
        <div class="final-score" id="win-score">0</div>
        <p id="win-comment"></p>
        <div class="badge-list" id="win-list"></div>
        <div class="btn-row" style="justify-content:center">
          <button class="primary" id="btn-restart">Rejouer</button>
          <button class="ghost" id="btn-replay">Revoir le labo</button>
        </div>
      </div>
    `;
    this.root.appendChild(win);

    // Toast
    const toast = this.el("div");
    toast.id = "toast";
    this.root.appendChild(toast);

    this.codeEl = puzzle.querySelector("#pz-code") as HTMLDivElement;
    this.feedbackEl = puzzle.querySelector("#pz-feedback") as HTMLDivElement;
    this.hintListEl = puzzle.querySelector("#pz-hints") as HTMLDivElement;
    this.submitBtn = puzzle.querySelector("#pz-submit") as HTMLButtonElement;
    this.hintBtn = puzzle.querySelector("#pz-hint") as HTMLButtonElement;
    this.nextBtn = puzzle.querySelector("#pz-next") as HTMLButtonElement;
    this.titleEl = puzzle.querySelector("#pz-title") as HTMLDivElement;
    this.selectionCountEl = puzzle.querySelector("#pz-count") as HTMLSpanElement;

    (title.querySelector("#btn-start") as HTMLButtonElement).addEventListener("click", () => this.cb.onStart());
    this.submitBtn.addEventListener("click", () => this.submit());
    this.hintBtn.addEventListener("click", () => this.cb.onUseHint());
    this.nextBtn.addEventListener("click", () => this.cb.onNextRoom());
    (puzzle.querySelector("#pz-close") as HTMLButtonElement).addEventListener("click", () => this.cb.onClosePuzzle());
    (puzzle.querySelector("#pz-clear") as HTMLButtonElement).addEventListener("click", () => {
      this.selection.clear();
      this.renderCode();
      this.syncControls();
    });
    (win.querySelector("#btn-restart") as HTMLButtonElement).addEventListener("click", () => this.cb.onRestart());
    (win.querySelector("#btn-replay") as HTMLButtonElement).addEventListener("click", () => {
      this.close("ov-win");
    });
  }

  private byId<T extends HTMLElement>(id: string): T {
    return this.root.querySelector(`#${id}`) as T;
  }

  private open(id: string): void {
    this.byId(id).classList.add("open");
  }

  private close(id: string): void {
    this.byId(id).classList.remove("open");
  }

  showTitle(): void {
    this.open("ov-title");
  }

  hideTitle(): void {
    this.close("ov-title");
  }

  showWin(score: number, comment: string, rows: { label: string; pts: number }[], done: boolean): void {
    this.byId("win-score").textContent = `${score} pts`;
    this.byId("win-comment").textContent = comment;
    const list = this.byId<HTMLDivElement>("win-list");
    list.innerHTML = "";
    for (const r of rows) {
      const b = this.el("div", `badge ${r.pts > 0 ? "done" : "locked"}`);
      b.innerHTML = `<span>${r.label}</span><span class="pts">${r.pts} pts</span>`;
      list.appendChild(b);
    }
    if (!done) {
      const b = this.el("div", "badge locked", `<span>Toutes les salles doivent être validées.</span><span class="pts">—</span>`);
      list.appendChild(b);
    }
    this.open("ov-win");
  }

  setHud(opts: { room: string; score: number; solved: number }): void {
    this.byId("chip-room").innerHTML = opts.room;
    this.byId("chip-score").textContent = String(opts.score);
    this.byId("chip-solved").textContent = String(opts.solved);
  }

  showPrompt(html: string | null): void {
    const p = this.byId<HTMLDivElement>("prompt");
    if (html) {
      p.innerHTML = html;
      p.classList.add("show");
    } else {
      p.classList.remove("show");
    }
  }

  setPauseVisible(v: boolean): void {
    this.byId("pause-hint").classList.toggle("show", v);
  }

  toast(msg: string, kind: "ok" | "ko" | "info" = "info"): void {
    const t = this.byId<HTMLDivElement>("toast");
    t.textContent = msg;
    t.className = `show ${kind === "info" ? "" : kind}`.trim();
    window.clearTimeout((t as HTMLDivElement & { _t?: number })._t);
    (t as HTMLDivElement & { _t?: number })._t = window.setTimeout(() => {
      t.classList.remove("show");
    }, 2600);
  }

  isPuzzleOpen(): boolean {
    return this.byId("ov-puzzle").classList.contains("open");
  }

  openPuzzle(snap: PuzzleSnapshot): void {
    this.current = snap.level;
    this.selection = new Set(snap.selection);
    this.puzzleSolved = snap.solved;
    this.titleEl = this.byId("pz-title");
    this.titleEl.textContent = snap.level.title;
    this.byId("pz-tag").className = `tag diff-${snap.level.difficulty}`;
    this.byId("pz-tag").textContent = `${snap.level.roomName} · ${snap.level.vulnerability} · ${snap.level.difficulty}`;
    this.byId("pz-desc").textContent = snap.level.description;
    this.byId("pz-file").textContent = `${snap.level.id}.sol`;

    this.renderCode();
    this.renderHints(snap.level, snap.hintsUsed);
    this.setFeedback(snap.lastResult, snap.solved);
    this.syncControls();
    this.open("ov-puzzle");
  }

  private renderCode(): void {
    const level = this.current;
    if (!level) return;
    this.codeEl.innerHTML = "";
    level.code.forEach((line, i) => {
      const n = i + 1;
      const row = this.el("div", "code-line");
      row.dataset["line"] = String(n);
      const ln = this.el("span", "ln", String(n));
      const txt = this.el("span", "txt", highlightSolidity(line) || "&nbsp;");
      row.appendChild(ln);
      row.appendChild(txt);
      if (this.selection.has(n)) row.classList.add("selected");
      row.addEventListener("click", () => this.toggleLine(n));
      this.codeEl.appendChild(row);
    });
    this.updateSelectionCount();
  }

  private toggleLine(n: number): void {
    if (this.byId("pz-submit").hasAttribute("disabled")) return;
    if (this.selection.has(n)) this.selection.delete(n);
    else this.selection.add(n);
    const row = this.codeEl.querySelector(`.code-line[data-line="${n}"]`);
    row?.classList.toggle("selected", this.selection.has(n));
    this.updateSelectionCount();
  }

  private updateSelectionCount(): void {
    this.byId("pz-count").textContent = String(this.selection.size);
  }

  private renderHints(level: Level, hintsUsed: number): void {
    this.hintListEl.innerHTML = "";
    for (let i = 0; i < hintsUsed && i < MAX_HINTS; i++) {
      const h = level.hints[i];
      if (!h) continue;
      const item = this.el("div", `hint-item${i === 2 ? " reveal" : ""}`);
      item.innerHTML = `<span class="hl">${i === 2 ? "•" : "•"}</span>${h}`;
      this.hintListEl.appendChild(item);
    }
  }

  private setFeedback(result: AttemptResult | null, solved: boolean): void {
    const f = this.feedbackEl;
    if (solved) {
      f.className = "feedback show ok";
      f.innerHTML = "✅ <b>Audit validé.</b> La porte s'ouvre. Passez à la salle suivante.";
      return;
    }
    if (!result) {
      f.className = "feedback";
      f.innerHTML = "";
      return;
    }
    if (result.success) {
      f.className = "feedback show ok";
      f.innerHTML = "✅ <b>Correct !</b>";
    } else {
      f.className = "feedback show ko";
      const parts: string[] = [`❌ <b>Audit incomplet.</b> ${result.found}/${result.total} bug(s) repéré(s).`];
      if (result.missing.length) parts.push(`${result.missing.length} ligne(s) buguée(s) non identifiée(s).`);
      if (result.falsePositives.length) parts.push(`${result.falsePositives.length} fausse(s) piste(s) marquée(s).`);
      parts.push("−50 pts.");
      f.innerHTML = parts.join(" ");
    }
  }

  private syncControls(): void {
    const level = this.current;
    if (!level) return;
    const solved = this.puzzleSolved;
    this.submitBtn.style.display = solved ? "none" : "";
    this.hintBtn.style.display = solved ? "none" : "";
    this.nextBtn.style.display = solved ? "" : "none";
    if (!solved) {
      this.submitBtn.disabled = this.selection.size === 0;
      this.hintBtn.disabled = this.hintBtn.dataset["hintsLeft"] === "0";
    }
  }

  setHintsLeft(left: number): void {
    this.hintBtn.dataset["hintsLeft"] = String(left);
    this.hintBtn.textContent = left > 0 ? `Demander un indice (${left})` : "Indices épuisés";
    this.hintBtn.disabled = left === 0;
  }

  getSelection(): number[] {
    return [...this.selection].sort((a, b) => a - b);
  }

  private submit(): void {
    const level = this.current;
    if (!level) return;
    const stored = this.cb.onSubmit([...this.selection]);
    this.markResult(stored);
    this.puzzleSolved = stored.success;
    this.setFeedback(stored, stored.success);
    this.syncControls();
  }

  private markResult(result: AttemptResult): void {
    // Réinitialise les marques puis colore correct/incorrect.
    this.codeEl.querySelectorAll(".code-line").forEach((r) => r.classList.remove("correct", "wrong"));
    for (const n of result.correctPicked) {
      this.codeEl.querySelector(`.code-line[data-line="${n}"]`)?.classList.add("correct");
    }
    for (const n of result.falsePositives) {
      this.codeEl.querySelector(`.code-line[data-line="${n}"]`)?.classList.add("wrong");
    }
  }

  closePuzzle(): void {
    this.close("ov-puzzle");
  }
}

export function levelBadgeRows(
  solved: Record<string, { score: number }>,
): { label: string; pts: number }[] {
  return LEVELS.map((l) => ({ label: `${l.roomName} — ${l.vulnerability}`, pts: solved[l.id]?.score ?? 0 }));
}
