import * as THREE from "three";
import { LEVELS } from "./levels";

export interface Interactable {
  kind: "terminal" | "door";
  levelIndex: number;
  position: THREE.Vector3;
  radius: number;
  locked: boolean;
}

export interface WorldCallbacks {
  onInteract: (target: Interactable) => void;
  onPointerLockChange: (locked: boolean) => void;
}

const ROOM_W = 16;
const ROOM_D = 20;
const ROOM_H = 6;
const WALL = 0.4;
const GAP = 4;

export interface World {
  start: () => void;
  stop: () => void;
  setDoorOpen: (levelIndex: number, open: boolean) => void;
  teleportToRoom: (levelIndex: number) => void;
  getFocus: () => Interactable | null;
  dispose: () => void;
}

interface DoorRef {
  group: THREE.Group;
  panel: THREE.Mesh;
  open: boolean;
  targetOpen: number;
  z: number;
}

export function createWorld(canvas: HTMLCanvasElement, cb: WorldCallbacks): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b14);
  scene.fog = new THREE.Fog(0x070b14, 14, 64);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.7, 6);

  const hemi = new THREE.HemisphereLight(0x9fc0e8, 0x0b1220, 1.15);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xaebfd4, 0.75);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xdce8ff, 1.35);
  key.position.set(6, 12, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  scene.add(key);

  const interactables: Interactable[] = [];
  const doors: DoorRef[] = [];
  const roomCenters: THREE.Vector3[] = [];

  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const matWall = track(new THREE.MeshStandardMaterial({ color: 0x2c3c56, roughness: 0.9, metalness: 0.05 }));
  const matWallAccent = track(new THREE.MeshStandardMaterial({ color: 0x35496a, roughness: 0.8, metalness: 0.12 }));
  const matFloor = track(new THREE.MeshStandardMaterial({ color: 0x18233a, roughness: 0.65, metalness: 0.3 }));
  const matCeil = track(new THREE.MeshStandardMaterial({ color: 0x0e1524, roughness: 1 }));
  const matDoor = track(new THREE.MeshStandardMaterial({ color: 0x2dd4bf, emissive: 0x0f766e, emissiveIntensity: 0.6, roughness: 0.4, metalness: 0.6 }));
  const matDoorLocked = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, emissive: 0x334155, emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.5 }));
  const matBase = track(new THREE.MeshStandardMaterial({ color: 0x1b2740, roughness: 0.5, metalness: 0.7 }));
  const matScreen = track(new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));

  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));

  function addBox(
    parent: THREE.Object3D,
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    castShadow = true,
  ): THREE.Mesh {
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = castShadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  function buildRoom(index: number): THREE.Group {
    const g = new THREE.Group();
    const accent = index % 2 === 0 ? matWall : matWallAccent;

    // Sol / plafond
    addBox(g, matFloor, ROOM_W, 0.4, ROOM_D, 0, -0.2, 0, false);
    addBox(g, matCeil, ROOM_W, 0.3, ROOM_D, 0, ROOM_H + 0.15, 0, false);

    // Murs latéraux
    addBox(g, accent, WALL, ROOM_H, ROOM_D, -ROOM_W / 2, ROOM_H / 2, 0);
    addBox(g, accent, WALL, ROOM_H, ROOM_D, ROOM_W / 2, ROOM_H / 2, 0);

    // Mur d'entrée (derrière)
    addBox(g, accent, ROOM_W, ROOM_H, WALL, 0, ROOM_H / 2, ROOM_D / 2);

    // Mur front avant, avec ouverture au centre
    const side = (ROOM_W - 5) / 2;
    addBox(g, accent, side, ROOM_H, WALL, -(5 / 2 + side / 2), ROOM_H / 2, -ROOM_D / 2);
    addBox(g, accent, side, ROOM_H, WALL, 5 / 2 + side / 2, ROOM_H / 2, -ROOM_D / 2);
    addBox(g, accent, 5, ROOM_H - 4.2, WALL, 0, ROOM_H - (ROOM_H - 4.2) / 2, -ROOM_D / 2);

    // Bandeaux lumineux au plafond
    const neon = track(
      new THREE.MeshBasicMaterial({ color: index % 2 === 0 ? 0x38bdf8 : 0x34d399 }),
    );
    addBox(g, neon, 6, 0.12, 0.4, 0, ROOM_H - 0.2, 2, false);
    addBox(g, neon, 6, 0.12, 0.4, 0, ROOM_H - 0.2, -4, false);

    // Terminal (pupitre + écran)
    const base = addBox(g, matBase, 1.2, 1.1, 1.0, 0, 0.55, 0);
    base.name = "terminal-base";
    const head = new THREE.Mesh(boxGeo, matScreen);
    head.scale.set(1.15, 0.85, 0.14);
    head.position.set(0, 1.6, -0.25);
    head.rotation.x = -0.28;
    head.castShadow = true;
    g.add(head);
    const glow = new THREE.PointLight(index % 2 === 0 ? 0x38bdf8 : 0x34d399, 6, 8, 2);
    glow.position.set(0, 2, -0.5);
    g.add(glow);

    // Panneau titre flottant
    const plate = addBox(g, matWallAccent, 6, 1.4, 0.2, 0, ROOM_H - 1.1, -ROOM_D / 2 + 0.4, false);
    plate.visible = true;

    scene.add(g);
    return g;
  }

  // Construction des salles en ligne sur l'axe Z (négatif = plus loin)
  let zCursor = 0;
  const doorSpacing = ROOM_D + GAP;
  for (let i = 0; i < LEVELS.length; i++) {
    const g = buildRoom(i);
    const cz = zCursor;
    g.position.set(0, 0, cz);
    roomCenters.push(new THREE.Vector3(0, 1.7, cz));
    interactables.push({
      kind: "terminal",
      levelIndex: i,
      position: new THREE.Vector3(0, 1.7, cz),
      radius: 2.6,
      locked: false,
    });

    // Porte dans l'ouverture du mur avant
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, cz - ROOM_D / 2);
    const panel = new THREE.Mesh(boxGeo, matDoorLocked);
    panel.scale.set(4.6, 4.0, 0.3);
    panel.position.set(0, 2.1, 0);
    panel.castShadow = true;
    doorGroup.add(panel);
    scene.add(doorGroup);
    doors.push({ group: doorGroup, panel, open: false, targetOpen: 0, z: cz - ROOM_D / 2 });

    interactables.push({
      kind: "door",
      levelIndex: i,
      position: new THREE.Vector3(0, 1.7, cz - ROOM_D / 2 - 0.5),
      radius: 3.2,
      locked: true,
    });

    zCursor -= doorSpacing;
  }

  // Sol du couloir reliant les salles
  const corridorLen = Math.abs(zCursor) + ROOM_D;
  const corridor = addBox(scene, matFloor, 5, 0.4, corridorLen, 0, -0.2, zCursor / 2 + ROOM_D / 4, false);
  corridor.receiveShadow = true;

  // --- Contrôles caméra (FPS) ---
  const keys = new Set<string>();
  const velocity = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let locked = false;
  let running = false;
  let raf = 0;
  let last = performance.now();
  const clock = { dt: 0 };

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code);
    if (e.code === "KeyE" && locked) {
      const target = pickFocus();
      if (target) cb.onInteract(target);
    }
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);

  const onMouseMove = (e: MouseEvent) => {
    if (!locked) return;
    yaw -= e.movementX * 0.0022;
    pitch -= e.movementY * 0.0022;
    const lim = Math.PI / 2 - 0.05;
    pitch = Math.max(-lim, Math.min(lim, pitch));
  };

  const onLockChange = () => {
    locked = document.pointerLockElement === canvas;
    cb.onPointerLockChange(locked);
    if (!locked) keys.clear();
  };

  const pickFocus = (): Interactable | null => {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of interactables) {
      const toward = it.position.clone().sub(camera.position);
      const dist = toward.length();
      if (dist > it.radius + 1.5 || dist < 0.001) continue;
      if (toward.normalize().dot(dir) < 0.5) continue;
      if (dist < bestD) {
        bestD = dist;
        best = it;
      }
    }
    return best;
  };

  const requestLock = (): void => {
    try {
      const p = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    } catch {
      // pointer lock indisponible : le jeu reste jouable au clic suivant.
    }
  };

  const onClick = () => {
    if (!locked) {
      requestLock();
      return;
    }
    const target = pickFocus();
    if (target) cb.onInteract(target);
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  function collide(next: THREE.Vector3): THREE.Vector3 {
    // Empêche de traverser les murs latéraux et de sortir par les extrémités.
    const halfW = ROOM_W / 2 - 0.6;
    next.x = Math.max(-halfW, Math.min(halfW, next.x));
    // Limite avant / arrière globale
    const front = roomCenters[0]!.z + ROOM_D / 2 - 0.7;
    const back = roomCenters[roomCenters.length - 1]!.z - ROOM_D / 2 + 0.7;
    next.z = Math.max(back, Math.min(front, next.z));
    // Portes verrouillées : bloque le passage à travers le plan de la porte.
    for (const d of doors) {
      if (d.open) continue;
      const from = camera.position.z;
      const to = next.z;
      const r = 0.75;
      if (from > d.z + r && to <= d.z + r) next.z = d.z + r;
      if (from < d.z - r && to >= d.z - r) next.z = d.z - r;
    }
    return next;
  }

  function updateTransform() {
    const euler = new THREE.Euler(pitch, yaw, 0, "YXZ");
    camera.quaternion.setFromEuler(euler);
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    clock.dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() > 0) dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();

    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 9 : 5.2;
    const move = new THREE.Vector3();
    if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(dir);
    if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(dir);
    if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(right);
    if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);

    velocity.lerp(move, 0.15);
    const next = camera.position.clone().addScaledVector(velocity, clock.dt);
    collide(next);
    next.y = 1.7;
    camera.position.copy(next);

    updateTransform();

    // Animation des portes
    for (const d of doors) {
      const y = THREE.MathUtils.damp(d.group.position.y, d.targetOpen, 4, clock.dt);
      d.group.position.y = y;
      d.open = d.targetOpen > 2;
    }

    renderer.render(scene, camera);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    canvas.addEventListener("click", onClick);
    window.addEventListener("resize", onResize);
    tick();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("pointerlockchange", onLockChange);
    canvas.removeEventListener("click", onClick);
    window.removeEventListener("resize", onResize);
  }

  function setDoorOpen(levelIndex: number, open: boolean) {
    const d = doors[levelIndex];
    if (!d) return;
    d.targetOpen = open ? -5.2 : 0;
    d.panel.material = open ? matDoor : matDoorLocked;
  }

  function teleportToRoom(levelIndex: number) {
    const c = roomCenters[levelIndex];
    if (!c) return;
    camera.position.set(c.x, 1.7, c.z + 6);
    yaw = 0;
    pitch = 0;
    updateTransform();
  }

  function dispose() {
    stop();
    for (const d of disposables) d.dispose();
    renderer.dispose();
  }

  return { start, stop, setDoorOpen, teleportToRoom, getFocus: pickFocus, dispose };
}
