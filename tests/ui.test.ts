import { describe, expect, it } from "vitest";
import { Ui } from "../src/game/ui";
import { getLevel, type Level } from "../src/game/levels";
import { checkAttempt } from "../src/game/engine";

function makeUi(level: Level) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const ui = new Ui(mount, {
    onStart: () => undefined,
    onSubmit: (selection) => checkAttempt(level, selection),
    onUseHint: () => undefined,
    onNextRoom: () => undefined,
    onClosePuzzle: () => undefined,
    onPauseToggle: () => undefined,
    onRestart: () => undefined,
  });
  return { ui, mount };
}

function open(ui: Ui, level: Level, solved = false): void {
  ui.openPuzzle({
    level,
    selection: [],
    hintsUsed: 0,
    wrongAttempts: 0,
    solved,
    lastResult: null,
  });
}

describe("Ui — sélection des lignes", () => {
  const level = getLevel("access-control")!; // bug ligne 19

  it("autorise le PREMIER clic sur une ligne (régression)", () => {
    const { ui, mount } = makeUi(level);
    open(ui, level);
    const row = mount.querySelector('.code-line[data-line="19"]') as HTMLElement;
    expect(row).toBeTruthy();
    row.click();
    expect(ui.getSelection()).toEqual([19]);
  });

  it("permet de valider après sélection (bouton réactivé)", () => {
    const { ui, mount } = makeUi(level);
    open(ui, level);
    const submit = mount.querySelector("#pz-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    (mount.querySelector('.code-line[data-line="19"]') as HTMLElement).click();
    expect(submit.disabled).toBe(false);
  });

  it("un second clic désélectionne et re-désactive le bouton", () => {
    const { ui, mount } = makeUi(level);
    open(ui, level);
    const row = mount.querySelector('.code-line[data-line="19"]') as HTMLElement;
    row.click();
    row.click();
    expect(ui.getSelection()).toEqual([]);
    expect((mount.querySelector("#pz-submit") as HTMLButtonElement).disabled).toBe(true);
  });

  it("gère plusieurs lignes dans l'ordre", () => {
    const { ui, mount } = makeUi(level);
    open(ui, level);
    (mount.querySelector('.code-line[data-line="3"]') as HTMLElement).click();
    (mount.querySelector('.code-line[data-line="19"]') as HTMLElement).click();
    expect(ui.getSelection()).toEqual([3, 19]);
  });

  it("ne modifie plus la sélection d'une salle déjà validée", () => {
    const { ui, mount } = makeUi(level);
    ui.openPuzzle({
      level,
      selection: [19],
      hintsUsed: 0,
      wrongAttempts: 0,
      solved: true,
      lastResult: checkAttempt(level, [19]),
    });
    (mount.querySelector('.code-line[data-line="3"]') as HTMLElement).click();
    expect(ui.getSelection()).toEqual([19]);
  });

  it("efface la sélection", () => {
    const { ui, mount } = makeUi(level);
    open(ui, level);
    (mount.querySelector('.code-line[data-line="19"]') as HTMLElement).click();
    (mount.querySelector("#pz-clear") as HTMLButtonElement).click();
    expect(ui.getSelection()).toEqual([]);
  });
});
