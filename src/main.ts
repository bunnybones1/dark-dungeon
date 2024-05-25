import { Fog, PCFSoftShadowMap, WebGLRenderer } from "three";
import { PerspectiveCamera } from "three";
import { Scene } from "three";
import { Object3D } from "three";
import type {} from "vite";
import { Game } from "./Game";
import ViewControls from "./ViewControls";
import { initResizeHandler } from "./initResizeHandler";
// import { testModelCluster } from "./testModelCluster"

// Create a scene
const scene = new Scene();

const CAMERA_FAR = 16;

// Create a camera
const camera = new PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.05,
	CAMERA_FAR,
);

scene.add(camera);
scene.fog = new Fog(0, 2, CAMERA_FAR);
camera.position.set(22, 1.15, 16);

// camera.position.set(Number(c[0]), Number(c[1]) + 1, Number(c[2]))
const renderer = new WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;

renderer.autoClear = true;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const viewControls = new ViewControls(camera, 0.2);

let simulate: ((dt: number) => void) | undefined;
let lastNow = performance.now();

function simulationTick() {
	const now = performance.now();
	while (lastNow < now) {
		viewControls.simulate();
		if (simulate) {
			simulate(1 / 60);
		}
		lastNow += 1000 / 60;
	}
}
setInterval(simulationTick, 10);

function animate() {
	renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
initResizeHandler(camera, renderer);

const gamePivot = new Object3D();
scene.add(gamePivot);

const externalData: Map<string, any> = new Map();

if (import.meta.hot) {
	import.meta.hot.accept("./Game", (mod) => {
		while (gamePivot.children.length > 0) {
			gamePivot.remove(gamePivot.children[0]);
		}
		const time = game.time;
		game.cleanup();
		game = new mod.Game(gamePivot, camera, externalData);
		game.time = time;
		simulate = game.simulate;
	});
}
let game = new Game(gamePivot, camera, externalData);
simulate = game.simulate;
