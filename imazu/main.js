import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  SIZE,
  PIECE,
  PLAYER,
  createBoard,
  dropPiece,
  checkWinner,
  isBoardFull,
  isColumnFull,
  findBestMove,
} from "./game.js";

const PIECE_RADIUS = 0.48;
const STEP_Y = PIECE_RADIUS * 2;
const STEP_XZ = PIECE_RADIUS * 3;
const BOARD_OFFSET_Y = ((SIZE - 1) * STEP_Y) / 2;
const BOARD_OFFSET_XZ = ((SIZE - 1) * STEP_XZ) / 2;
const AXIS_RADIUS = 0.045;

const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset-btn");
const container = document.getElementById("canvas-container");

let board = createBoard();
let currentPlayer = PLAYER.HUMAN;
let gameOver = false;
let isAnimating = false;
let hoveredColumn = null;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);
scene.fog = new THREE.Fog(0x808080, 18, 32);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(7, 6, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 5;
controls.maxDistance = 22;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0xaaaaaa, 0.55));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xcccccc, 0.35);
fillLight.position.set(-8, 4, -6);
scene.add(fillLight);

const boardGroup = new THREE.Group();
const columnGroups = [];
const pieceMeshes = new Map();
const columnAxes = [];

scene.add(boardGroup);

function gridToWorld(x, y, z) {
  return new THREE.Vector3(
    x * STEP_XZ - BOARD_OFFSET_XZ,
    y * STEP_Y - BOARD_OFFSET_Y,
    z * STEP_XZ - BOARD_OFFSET_XZ
  );
}

function createBoardFrame() {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.2,
    roughness: 0.65,
    transparent: true,
    opacity: 0.35,
  });

  const edgeGeo = new THREE.BoxGeometry(
    SIZE * STEP_XZ + 0.15,
    SIZE * STEP_Y + 0.15,
    SIZE * STEP_XZ + 0.15
  );
  const edges = new THREE.EdgesGeometry(edgeGeo);
  const frame = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x999999, transparent: true, opacity: 0.7 })
  );
  boardGroup.add(frame);

  const axisHeight = SIZE * STEP_Y;
  const axisGeo = new THREE.CylinderGeometry(AXIS_RADIUS, AXIS_RADIUS, axisHeight, 12);

  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      const colGroup = new THREE.Group();
      colGroup.userData = { x, z };

      const axisMat = new THREE.MeshBasicMaterial({
        color: 0xbbbbbb,
        transparent: true,
        opacity: 0.75,
      });
      const axis = new THREE.Mesh(axisGeo, axisMat);
      axis.position.copy(gridToWorld(x, (SIZE - 1) / 2, z));
      axis.userData = { x, z, isAxis: true };
      colGroup.add(axis);
      columnAxes.push(axis);

      columnGroups.push(colGroup);
      boardGroup.add(colGroup);
    }
  }

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(SIZE * STEP_XZ + 0.4, 0.2, SIZE * STEP_XZ + 0.4),
    frameMat
  );
  base.position.y = -BOARD_OFFSET_Y - PIECE_RADIUS - 0.12;
  boardGroup.add(base);
}

function pieceKey(x, y, z) {
  return `${x},${y},${z}`;
}

function createPieceMesh(piece) {
  const color = piece === PIECE.BLACK ? 0x1a1a1a : 0xf0f0f0;
  const emissive = piece === PIECE.BLACK ? 0x000000 : 0x222222;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(PIECE_RADIUS, 32, 32),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      metalness: piece === PIECE.BLACK ? 0.35 : 0.15,
      roughness: piece === PIECE.BLACK ? 0.4 : 0.35,
    })
  );
  return mesh;
}

function addPieceVisual(x, y, z, piece, animateFromTop = false) {
  const mesh = createPieceMesh(piece);
  const target = gridToWorld(x, y, z);

  if (animateFromTop) {
    mesh.position.set(target.x, BOARD_OFFSET_Y + STEP_Y * 1.5, target.z);
    animateDrop(mesh, target);
  } else {
    mesh.position.copy(target);
  }

  boardGroup.add(mesh);
  pieceMeshes.set(pieceKey(x, y, z), mesh);
  return mesh;
}

function animateDrop(mesh, target) {
  isAnimating = true;
  const startY = mesh.position.y;
  const duration = 420;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    mesh.position.y = startY + (target.y - startY) * eased;

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      mesh.position.copy(target);
      isAnimating = false;
      afterMoveAnimation();
    }
  }

  requestAnimationFrame(tick);
}

function clearPieces() {
  for (const mesh of pieceMeshes.values()) {
    boardGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  pieceMeshes.clear();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function updateStatus() {
  if (gameOver) return;
  if (isAnimating) {
    setStatus("玉を落下中…");
    return;
  }
  if (currentPlayer === PLAYER.HUMAN) {
    setStatus("あなたの番（黒）— 列をダブルクリックで玉を落とす");
  } else {
    setStatus("PCの番（白）— 考え中…");
  }
}

function highlightColumn(x, z, active) {
  for (const axis of columnAxes) {
    const isTarget = axis.userData.x === x && axis.userData.z === z;
    if (active && isTarget) {
      axis.material.color.set(0xffffff);
      axis.material.opacity = 1;
    } else {
      axis.material.color.set(0xbbbbbb);
      axis.material.opacity = 0.75;
    }
  }
}

function clearHighlights() {
  for (const axis of columnAxes) {
    axis.material.color.set(0xbbbbbb);
    axis.material.opacity = 0.75;
  }
  hoveredColumn = null;
}

function endGame(winner) {
  gameOver = true;
  clearHighlights();
  if (winner === PIECE.BLACK) {
    setStatus("あなたの勝ち！（黒が4つ並びました）");
  } else if (winner === PIECE.WHITE) {
    setStatus("PCの勝ち…（白が4つ並びました）");
  } else {
    setStatus("引き分けです");
  }
}

function afterMoveAnimation() {
  const winner = checkWinner(board);
  if (winner) {
    endGame(winner);
    return;
  }
  if (isBoardFull(board)) {
    endGame(null);
    return;
  }

  currentPlayer = currentPlayer === PLAYER.HUMAN ? PLAYER.PC : PLAYER.HUMAN;
  updateStatus();

  if (currentPlayer === PLAYER.PC) {
    setTimeout(pcTurn, 450);
  }
}

function applyMove(x, z, piece, animate = true) {
  const pos = dropPiece(board, x, z, piece);
  if (!pos) return false;
  addPieceVisual(pos.x, pos.y, pos.z, piece, animate);
  return true;
}

function pcTurn() {
  if (gameOver || isAnimating || currentPlayer !== PLAYER.PC) return;

  const move = findBestMove(board, PIECE.WHITE, 5);
  if (!move) {
    endGame(null);
    return;
  }

  highlightColumn(move.x, move.z, true);
  applyMove(move.x, move.z, PIECE.WHITE, true);
  setTimeout(() => clearHighlights(), 300);
}

function handleHumanMove(x, z) {
  if (gameOver || isAnimating || currentPlayer !== PLAYER.HUMAN) return;
  if (isColumnFull(board, x, z)) {
    setStatus("その列は既に満杯です — 別の列を選んでください");
    return;
  }

  highlightColumn(x, z, true);
  applyMove(x, z, PIECE.BLACK, true);
  setTimeout(() => clearHighlights(), 300);
}

function resetGame() {
  board = createBoard();
  currentPlayer = PLAYER.HUMAN;
  gameOver = false;
  isAnimating = false;
  clearPieces();
  clearHighlights();
  updateStatus();
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let clickTimer = null;

function getColumnFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const targets = [];
  for (const col of columnGroups) {
    col.traverse((obj) => {
      if (obj.isMesh) targets.push(obj);
    });
  }

  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length === 0) return null;

  let node = hits[0].object;
  while (node && node.userData.x === undefined && node.parent) {
    node = node.parent;
  }

  if (node?.userData?.x !== undefined) {
    return { x: node.userData.x, z: node.userData.z };
  }

  return null;
}

renderer.domElement.addEventListener("mousemove", (event) => {
  if (gameOver || isAnimating || currentPlayer !== PLAYER.HUMAN) {
    clearHighlights();
    renderer.domElement.style.cursor = "default";
    return;
  }

  const col = getColumnFromEvent(event);
  if (col) {
    if (!hoveredColumn || hoveredColumn.x !== col.x || hoveredColumn.z !== col.z) {
      clearHighlights();
      hoveredColumn = col;
      highlightColumn(col.x, col.z, true);
    }
    renderer.domElement.style.cursor = isColumnFull(board, col.x, col.z)
      ? "not-allowed"
      : "pointer";
  } else {
    clearHighlights();
    renderer.domElement.style.cursor = "default";
  }
});

renderer.domElement.addEventListener("dblclick", (event) => {
  event.preventDefault();
  const col = getColumnFromEvent(event);
  if (col) handleHumanMove(col.x, col.z);
});

renderer.domElement.addEventListener("click", (event) => {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
    return;
  }
  clickTimer = setTimeout(() => {
    clickTimer = null;
  }, 280);
});

resetBtn.addEventListener("click", resetGame);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

createBoardFrame();
updateStatus();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
