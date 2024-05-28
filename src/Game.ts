import { update } from "@tweenjs/tween.js";
import {
	AdditiveBlending,
	AudioListener,
	Color,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	type MeshPhysicalMaterial,
	Object3D,
	type PerspectiveCamera,
	PlaneGeometry,
	PointLight,
	RectAreaLight,
	SkinnedMesh,
	SpotLight,
	Vector3,
} from "three";
import { SkeletonUtils } from "three/examples/jsm/Addons.js";
import { randFloatSpread } from "three/src/math/MathUtils.js";
import { PhysicsMap } from "./PhysicsMap";
import { PositionalSoundEffect } from "./audio/PositionalSoundEffect";
import { initMerchantMusic } from "./audio/initMerchantMusic";
import { getGLTF } from "./getGLTF";
import { loadMapDataFromImage } from "./loadMapDataFromImage";
import { testDoorX, testDoorY } from "./testConstants";
import { clamp01 } from "./utils/math/clamp01";
import { lerp } from "./utils/math/lerp";
import { wrap } from "./utils/math/wrap";
import { withinXTiles } from "./utils/withinXTiles";

const showMap = true;

const tempVec3 = new Vector3();

const TILE_UNIT_SIZE = 2;
export class Game {
	map: bigint[][];
	torchLight: SpotLight;
	flames: Object3D[] = [];
	campfires: Object3D[] = [];
	skyLights: Object3D[] = [];
	chesters: Object3D[] = [];
	crabs: Object3D[] = [];
	doorPivots: Object3D[] = [];

	physicsMap: PhysicsMap | undefined;
	soundDoorSlam: PositionalSoundEffect;
	audioListener: AudioListener;

	constructor(
		private pivot: Object3D,
		private pivotUI: Object3D,
		private camera: PerspectiveCamera,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		private externalData: Map<string, any>,
	) {
		this.init();
	}
	initd = false;
	crouching = false;
	private onKeyPress = (event: KeyboardEvent) => {
		if (event.code === "KeyC") {
			this.crouching = !this.crouching;
		}
	};
	private async init() {
		if (this.initd) {
			return;
		}
		this.initd = true;
		this.camera.name = "player";

		const worldContainer = new Object3D();
		function addStatic(child: Object3D) {
			worldContainer.add(child);
			child.updateMatrixWorld();
		}
		this.pivot.add(worldContainer);

		const onClickStartAudio = () => {
			window.removeEventListener("mousedown", onClickStartAudio);
			const listener = new AudioListener();
			this.audioListener = listener;
			addStatic(listener);

			initMerchantMusic(worldContainer, listener);

			const soundDoorSlam = new PositionalSoundEffect(
				"door-close-thud",
				listener,
				this.map,
			);

			soundDoorSlam.moveToXYZ(testDoorX, 1, testDoorY);

			addStatic(soundDoorSlam.positionalAudio);
			this.soundDoorSlam = soundDoorSlam;

			for (const crab of this.crabs) {
				const soundIdle = new PositionalSoundEffect(
					"mouth-wet-mushing",
					listener,
					this.map,
					true,
				);
				addStatic(soundIdle.positionalAudio);
				crab.userData.soundIdle = soundIdle;
				const soundWalking = new PositionalSoundEffect(
					"giant-crab-walking",
					listener,
					this.map,
					true,
				);
				addStatic(soundWalking.positionalAudio);
				crab.userData.soundWalking = soundWalking;
			}

			for (const campfire of this.campfires) {
				const soundFire = new PositionalSoundEffect(
					"fire-big",
					this.audioListener,
					this.map,
					true,
				);
				soundFire.play();
				addStatic(soundFire.positionalAudio);
				soundFire.moveTo(campfire.position);
			}
		};
		window.addEventListener("mousedown", onClickStartAudio);

		document.addEventListener("keypress", this.onKeyPress);

		const ambientLight = new HemisphereLight(
			new Color(0, 0, 1).multiplyScalar(0.1),
			new Color(0, 0.5, 1).multiplyScalar(0.2),
		);
		addStatic(ambientLight);

		const torchLight = new SpotLight(0xffdfaf, 2, 6);
		torchLight.shadow.mapSize.setScalar(1024);
		torchLight.shadow.camera.near = 0.2;
		torchLight.shadow.camera.far = 6;
		torchLight.shadow.bias = -0.005;
		torchLight.shadow.radius = 0.01;
		torchLight.shadow.camera.updateProjectionMatrix();
		torchLight.castShadow = true;
		addStatic(torchLight);
		addStatic(torchLight.target);
		this.torchLight = torchLight;

		const urlParams = new URLSearchParams(window.location.search);
		const mapName = urlParams.get("map") || "beanbeam";
		this.map = await loadMapDataFromImage(`assets/maps/${mapName}.png`);

		const physicsMap = new PhysicsMap(this.map, TILE_UNIT_SIZE);
		const mapViz = physicsMap.visuals;
		mapViz.rotation.x = Math.PI * 0.5;
		mapViz.scale.setScalar(1);
		mapViz.position.set(40, 20, 0);
		if (showMap) {
			this.pivotUI.add(mapViz);
			mapViz.updateMatrixWorld();
		}
		this.physicsMap = physicsMap;

		this.camera.userData.radius = 0.3;
		this.camera.userData.mass = 50;
		physicsMap.addActor(this.camera, true);

		const tileset = await getGLTF("assets/models/tileset.glb");
		// tileset.scene.traverse(n => {
		// 	if(n instanceof Mesh) {
		// 		n.material = new MeshPhysicalNodeMaterial()
		// 	}
		// })

		function getProtoObject(name: string) {
			const obj = tileset.scene.getObjectByName(name);
			if (!obj) {
				throw new Error(`Could not find object named ${name}`);
			}
			return obj;
		}
		function getProtoMesh(name: string) {
			const obj = getProtoObject(name);
			if (!(obj instanceof Mesh)) {
				throw new Error(`object named ${name} is not a mesh`);
			}
			return obj;
		}

		const protoFloor = getProtoMesh("floor");
		protoFloor.castShadow = false;
		protoFloor.receiveShadow = true;
		const mat = protoFloor.material as MeshPhysicalMaterial;
		// mat.roughness = 0.75;
		// mat.metalness = 0;
		mat.sheen = 0.4;
		mat.sheenRoughness = 0.35;
		mat.sheenColor = new Color(0, 0.2, 0.05);

		const protoCeiling = getProtoObject("ceiling");
		protoCeiling.castShadow = true;
		protoCeiling.receiveShadow = true;

		const protoWall = getProtoObject("wall");
		protoWall.receiveShadow = true;
		protoWall.castShadow = true;

		const protoWallInnerCorner = getProtoObject("wall-inner-corner");
		protoWallInnerCorner.receiveShadow = true;
		protoWallInnerCorner.castShadow = true;

		const protoGoldCoin = getProtoObject("coin");
		protoGoldCoin.receiveShadow = true;
		protoGoldCoin.castShadow = true;

		const protoKey = getProtoObject("key");
		protoKey.receiveShadow = true;
		protoKey.castShadow = true;

		const protoDoorway = getProtoObject("wall-thin-doorway");
		protoDoorway.traverse((n) => {
			n.receiveShadow = true;
			n.castShadow = true;
		});

		const protoTrophyCrab = getProtoObject("trophy-crab");
		protoTrophyCrab.receiveShadow = true;
		protoTrophyCrab.castShadow = true;

		const protoShelf = getProtoObject("wall-shelf-mid");
		protoShelf.receiveShadow = true;
		protoShelf.castShadow = true;

		const protoColumn = getProtoMesh("column");
		const mat2 = protoColumn.material as MeshPhysicalMaterial;
		// mat.roughness = 0.75;
		// mat.metalness = 0;
		mat2.sheen = 0.2;
		mat2.sheenRoughness = 0.35;
		mat2.sheenColor = new Color(0, 0.2, 0.05);

		protoColumn.receiveShadow = true;
		protoColumn.castShadow = true;

		const protoWallMarket = new Object3D();
		for (const wallMerchantChunkName of [
			"",
			"-bars",
			"-blackout",
			"-counter",
			"-rivets",
		]) {
			const m = getProtoObject(`wall-merchant${wallMerchantChunkName}`).clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoWallMarket.add(m);
		}

		const protoBarrel = new Object3D();
		for (const barrelChunkName of ["-wood", "-rings"]) {
			// for (const barrelChunkName of ['-wood','-rings','-lid']) {
			const m = getProtoObject(`barrel${barrelChunkName}`).clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoBarrel.add(m);
		}

		const protoBarrelClosed = new Object3D();
		for (const barrelChunkName of ["-wood", "-rings", "-lid"]) {
			const m = getProtoObject(`barrel${barrelChunkName}`).clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoBarrelClosed.add(m);
		}

		const protoCrab = getProtoObject("crab-armature");
		protoCrab.rotation.set(0, 0, 0);
		protoCrab.traverse((m) => {
			m.receiveShadow = true;
			m.castShadow = true;
			if (m instanceof Mesh || m instanceof SkinnedMesh) {
				const mat = m.material as MeshPhysicalMaterial;
				// mat.metalness = 0.3
				mat.roughness = 0.8;
				mat.clearcoatRoughness = 0.25;
				mat.clearcoat = 0.1;
				mat.sheen = 1;
				mat.sheenRoughness = mat.name.includes("eye") ? 0.35 : 0.2;
				mat.sheenColor = mat.name.includes("eye")
					? new Color(0.75, -0.05, -0.05)
					: new Color(0.1, 0.03, 0);
				mat.specularIntensity = 0.5;
				// mat.attenuationDistance = 2.5
				// mat.attenuationColor = new Color(1, 0, 0)
				mat.iridescence = 0.4;
				mat.iridescenceIOR = 1.7;
				mat.needsUpdate = true;
				// mat.anisotropyRotation?: number | undefined;
				// mat.clearcoatRoughness?: number | undefined;
				// mat.ior?: number | undefined;
				// mat.reflectivity?: number | undefined;
				// mat.iridescenceIOR?: number | undefined;
				// mat.thickness?: number | undefined;
				// mat.attenuationDistance?: number | undefined;
				// mat.specularIntensity?: number | undefined;
				// mat.anisotropy?: number | undefined;
				// mat.clearcoat?: number | undefined;
				// mat.iridescence?: number | undefined;
				// mat.dispersion?: number | undefined;
				// mat.sheen?: number | undefined;
				// mat.sheenRoughness?: number | undefined;
				// mat.transmission?: number | undefined;
				// mat.sheenColor?: ColorRepresentation | undefined;
				// mat.attenuationColor?: ColorRepresentation | undefined;
				// mat.specularColor?: ColorRepresentation | undefined;

				// mat.color.setRGB(1, 0, 0)
				// console.log(mat.name, mat)
			}
		});

		const protoChest = new Object3D();
		for (const chestChunkName of [
			"-bottom-metal",
			"-bottom-rivets",
			"-bottom",
			"-top-metal",
			"-top-rivets",
			"-top",
			"-lock-blackout",
		]) {
			const m = getProtoObject(`chest${chestChunkName}`).clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoChest.add(m);
		}

		const protoCampfire = new Object3D();
		for (const campfireChunkName of ["-stones", "-wood"]) {
			const m = getProtoObject(`campfire${campfireChunkName}`).clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoCampfire.add(m);
		}
		const flame = getProtoObject("flame").clone();
		if (flame instanceof Mesh) {
			flame.material = new MeshBasicMaterial({
				blending: AdditiveBlending,
				color: new Color(1, 0.9, 0.05).multiplyScalar(0.7),
			});
		}
		flame.position.set(-0.15, 0.2, 0);
		flame.scale.setScalar(2.5);
		const fireLight = new PointLight(new Color(1, 0.7, 0.05), 2, 6);
		fireLight.shadow.camera.near = 0.05;
		fireLight.shadow.camera.far = 6;
		fireLight.shadow.bias = -0.01;
		fireLight.shadow.radius = 0.1;
		// fireLight.castShadow = true;
		// fireLight.shadow.camera.fov = 170
		fireLight.name = "fireLight";
		fireLight.position.y = 0.2;
		// fireLight.position.z = 0.25
		flame.add(fireLight);
		protoCampfire.add(flame);

		const doorway = protoDoorway.clone(true);
		doorway.position.set(testDoorX, 0, testDoorY);
		doorway.rotation.z = Math.PI * 0.5;
		const doorPivot = doorway.getObjectByName("door-pivot");
		if (!doorPivot) {
			throw new Error("could not find door pivot");
		}
		this.doorPivots.push(doorPivot);
		addStatic(doorway);

		for (let i = 0; i < 2; i++) {
			const shelf = protoShelf.clone(true);
			shelf.position.set(19, 0, 14 + i * 2);
			shelf.rotation.y = Math.PI * -0.5;
			addStatic(shelf);
		}

		for (let i = 0; i < 3; i++) {
			const trophy = protoTrophyCrab.clone(true);
			trophy.position.set(19.1 + randFloatSpread(0.1), 0.8, 13.5 + i * 0.5);
			trophy.rotation.y = Math.PI * -0.5 + randFloatSpread(0.75);
			addStatic(trophy);
		}
		//shelf

		//trophy
		for (let i = 0; i < 0; i++) {
			const chester = protoChest.clone();
			chester.position.set(
				this.camera.position.x + randFloatSpread(6),
				0,
				this.camera.position.z + randFloatSpread(6),
			);
			chester.rotation.y = Math.PI * 2 * Math.random();
			addStatic(chester);
			this.chesters.push(chester);
		}

		for (let i = 0; i < 24; i++) {
			const goldCoin = protoGoldCoin.clone();
			goldCoin.position.set(
				this.camera.position.x + randFloatSpread(6),
				0.045,
				this.camera.position.z + randFloatSpread(6),
			);
			goldCoin.rotation.y = Math.PI * 2 * Math.random();
			addStatic(goldCoin);
		}
		for (let i = 0; i < 6; i++) {
			const key = protoKey.clone();
			key.position.set(
				this.camera.position.x + randFloatSpread(6),
				0.045,
				this.camera.position.z + randFloatSpread(6),
			);
			key.rotation.x = Math.PI * 0.5;
			key.rotation.z = Math.PI * 2 * Math.random();
			addStatic(key);
		}
		// const flame2 = campfire.getObjectByName("flame");
		// this.flames.push(flame2);

		// const cx = Math.round(this.camera.position.x / 2) * 2;
		// const cz = Math.round(this.camera.position.z / 2) * 2;
		const cx = 22;
		const cz = 16;

		for (let iy = 1, lx = this.map.length - 1; iy < lx; iy++) {
			const y = iy * TILE_UNIT_SIZE;
			for (let ix = 1, ly = this.map[ix].length - 1; ix < ly; ix++) {
				const x = ix * TILE_UNIT_SIZE;
				const here = this.map[iy][ix];
				const isOpen = here !== 0n && here !== 0xff0000n;
				if (isOpen) {
					const floor = protoFloor.clone();
					floor.position.set(x, 0, y);
					addStatic(floor);

					if (cx === x && cz === y) {
						const skyLight = new RectAreaLight(0x9fcfff, 10, 2.6, 2.6);
						skyLight.position.set(cx, 2.8, cz);
						skyLight.rotation.x = Math.PI * -0.5;
						addStatic(skyLight);
						this.skyLights.push(skyLight);
						const sunLight = new SpotLight(0xffcf9f, 1000, 10, Math.PI * 0.15);
						sunLight.target.position.set(cx - 2, 0, cz - 1);
						sunLight.position.set(cx + 2, 4, cz + 1);
						sunLight.shadow.mapSize.setScalar(1024);
						sunLight.shadow.bias = -0.0001;
						sunLight.castShadow = true;
						addStatic(sunLight);
						addStatic(sunLight.target);
						this.skyLights.push(sunLight);
						const ceiling = new Mesh(
							new PlaneGeometry(4.6, 4.6, 1, 1),
							new MeshBasicMaterial({ color: new Color(0.75, 0.95, 1.1) }),
						);
						ceiling.rotation.x = Math.PI * 0.5;
						ceiling.position.set(x, 2.5, y);
						addStatic(ceiling);
					} else {
						const ceiling = protoCeiling.clone();
						ceiling.position.set(x, 0, y);
						addStatic(ceiling);
					}

					if ((here & 0xffn) === 0x80n) {
						const t = here >> 0x8n;
						for (let i = 0; i < t; i++) {
							const barrel = protoBarrel.clone();
							barrel.position.set(
								x + randFloatSpread(0.25),
								0,
								y + randFloatSpread(0.25),
							);
							addStatic(barrel);
							barrel.userData.radius = 0.42;
							barrel.userData.mass = 100;
							barrel.name = "barrel";
							this.physicsMap.addActor(barrel, false, true);
						}
					} else if ((here & 0xffn) === 0x81n) {
						const t = here >> 0x8n;
						for (let i = 0; i < t; i++) {
							const barrel = protoBarrelClosed.clone();
							barrel.position.set(
								x + randFloatSpread(0.25),
								0,
								y + randFloatSpread(0.25),
							);
							addStatic(barrel);
							barrel.userData.radius = 0.42;
							barrel.userData.mass = 100;
							barrel.name = "barrel";
							this.physicsMap.addActor(barrel, false, true);
						}
					} else if (here === 0xe66400n) {
						const crab = SkeletonUtils.clone(protoCrab);
						crab.traverse((n) => {
							n.userData.originalRotation = n.rotation.clone();
							n.userData.originalPosition = n.position.clone();
						});
						const id = `crab-${(x + y) << 8}`;
						if (!this.externalData.has(id)) {
							this.externalData.set(id, crab.userData);
							crab.position.set(x, 0, y);
							crab.rotation.y = Math.PI * 2 * Math.random();
						} else {
							crab.userData = this.externalData.get(id);
							crab.position.copy(crab.userData.position);
							crab.rotation.copy(crab.userData.rotation);
						}
						crab.userData.position = crab.position;
						crab.userData.rotation = crab.rotation;
						addStatic(crab);
						this.crabs.push(crab);
						crab.userData.radius = 0.65;
						crab.userData.mass = 450;
						this.physicsMap.addActor(crab, false);
					} else if (here === 0x00ff00n) {
						const campfire = protoCampfire.clone();
						campfire.position.set(x, 0, y);
						campfire.rotation.y = Math.PI * 0.5;
						const flame = campfire.getObjectByName("flame");
						if (flame) {
							this.flames.push(flame);
						}
						campfire.position.set(x, 0, y);
						addStatic(campfire);
						campfire.userData.radius = 0.3;
						campfire.userData.mass = 100000000;
						this.campfires.push(campfire);
						this.physicsMap.addActor(campfire, false);
					} else if (here === 0xffff00n) {
						const chest = protoChest.clone();
						chest.position.set(x, 0, y);
						chest.rotation.y = Math.PI * 0.5;
						addStatic(chest);
						chest.userData.radius = 0.5;
						chest.userData.mass = 100;
						this.physicsMap.addActor(chest, false);
					}
					if (this.map[iy][ix + 1] === 0n) {
						const wall = protoWall.clone();
						wall.position.set((ix + 0.5) * TILE_UNIT_SIZE, 0, y);
						wall.rotation.z = Math.PI * -0.5;
						addStatic(wall);
					}
					if (this.map[iy][ix - 1] === 0n) {
						const wall = protoWall.clone();
						wall.position.set((ix - 0.5) * TILE_UNIT_SIZE, 0, y);
						wall.rotation.z = Math.PI * 0.5;
						addStatic(wall);
					}
					if (this.map[iy + 1][ix] === 0n) {
						const wall = protoWall.clone();
						wall.position.set(x, 0, (iy + 0.5) * TILE_UNIT_SIZE);
						wall.rotation.z = 0;
						addStatic(wall);
					}
					if (this.map[iy - 1][ix] === 0n) {
						const wall = protoWall.clone();
						wall.position.set(x, 0, (iy - 0.5) * TILE_UNIT_SIZE);
						wall.rotation.z = Math.PI;
						addStatic(wall);
					} else if (this.map[iy - 1][ix] === 0xff0000n) {
						const wall = protoWallMarket.clone();
						wall.position.set(x, 0, (iy - 0.5) * TILE_UNIT_SIZE);
						addStatic(wall);
						// wall.rotation.z = Math.PI
					}
				}
				let openCounter = 0;
				const openTracker = new Array<boolean>(4);
				for (let oy = 0; oy <= 1; oy++) {
					for (let ox = 0; ox <= 1; ox++) {
						const sample = this.map[iy + oy][ix + ox];
						const isOpen = sample !== 0n && sample !== 0xff0000n;
						openCounter += isOpen ? 1 : 0;
						openTracker[oy * 2 + ox] = isOpen;
					}
				}
				const isBulkyCorner = openCounter === 3;
				const roofNeedsSupport =
					openCounter === 4 && ix % 2 === 0 && iy % 2 === 0;
				if (isBulkyCorner || roofNeedsSupport) {
					const column = protoColumn.clone();
					column.position.set(
						(ix + 0.5) * TILE_UNIT_SIZE,
						0,
						(iy + 0.5) * TILE_UNIT_SIZE,
					);
					// column.rotation.z = Math.PI
					addStatic(column);
				} else if (openCounter === 1) {
					const wallInnerCorner = protoWallInnerCorner.clone();
					wallInnerCorner.position.set(
						(ix + 0.5) * TILE_UNIT_SIZE,
						0,
						(iy + 0.5) * TILE_UNIT_SIZE,
					);
					if (openTracker[0]) {
						wallInnerCorner.rotation.y = Math.PI * -0.5;
					} else if (openTracker[1]) {
						wallInnerCorner.rotation.y = Math.PI;
					} else if (openTracker[2]) {
						wallInnerCorner.rotation.y = 0;
					} else if (openTracker[3]) {
						wallInnerCorner.rotation.y = Math.PI * 0.5;
					}
					addStatic(wallInnerCorner);
				}
			}
		}
	}

	time = 1;
	simulate = (dt: number) => {
		this.camera.position.y -=
			(this.camera.position.y - (this.crouching ? 0.5 : 1.2)) * 0.1;
		this.camera.updateMatrix();
		if (this.audioListener) {
			this.audioListener.position.copy(this.camera.position);
			this.audioListener.rotation.copy(this.camera.rotation);
			this.audioListener.updateMatrixWorld();
		}
		if (this.physicsMap) {
			this.physicsMap.simulate();
			// if (showMap) {
			// 	this.physicsMap.visuals.position
			// 		.set(0.1, 0.05, -0.1)
			// 		.applyMatrix4(this.camera.matrix);
			// 	this.physicsMap.visuals.rotation.copy(this.camera.rotation);
			// 	this.physicsMap.visuals.rotateX(Math.PI * 0.5);
			// }
		}
		for (const campfire of this.campfires) {
			campfire.visible = withinXTiles(campfire, this.camera, 16);
		}
		for (const skyLight of this.skyLights) {
			skyLight.visible = withinXTiles(skyLight, this.camera, 16);
		}
		update(); //TWEENER
		this.torchLight.position
			.set(0.3, 0.05, 0.1)
			.applyMatrix4(this.camera.matrix);
		// this.torchLight.quaternion.copy(this.camera.quaternion);
		this.torchLight.angle = Math.PI * 0.4;
		this.torchLight.target.position
			.set(0, 0, -10)
			.applyMatrix4(this.camera.matrix);
		// .rotation.y += 1
		this.torchLight.position.x += Math.sin(this.time * 12) * 0.025;
		this.torchLight.position.y += Math.sin(this.time * 15) * 0.05;
		this.torchLight.position.z += Math.cos(this.time * 17) * 0.025;
		this.torchLight.updateMatrixWorld();
		this.torchLight.target.updateMatrixWorld();
		for (let i = 0; i < this.flames.length; i++) {
			const flame = this.flames[i];
			const myTime = i * 0.7321 + this.time;
			flame.rotation.x = Math.sin(myTime * 12) * 0.1;
			flame.rotation.z = Math.sin(myTime * 15) * 0.1;
			flame.position.y = Math.sin(myTime * 17) * 0.03 + 0.1;
			flame.updateMatrixWorld();
			// flame.visible = myTime % 8 > 4
		}
		for (let i = 0; i < this.chesters.length; i++) {
			const chest = this.chesters[i];
			const myTime = i * 0.7321 + this.time;
			tempVec3.subVectors(chest.position, this.camera.position);
			tempVec3.y = 0;
			if (tempVec3.length() > (i + 1) * 0.75) {
				tempVec3.normalize();
				chest.rotation.x = Math.sin(myTime * 12) * 0.1;
				chest.rotation.z = Math.sin(myTime * 15) * 0.1;
				chest.position.y = Math.abs(Math.sin(myTime * 17) * 0.03);
				chest.rotation.y -=
					(chest.rotation.y -
						(Math.atan2(-tempVec3.z, tempVec3.x) - Math.PI * 0.5)) *
					0.1;
				tempVec3.multiplyScalar(-0.01);
				chest.position.add(tempVec3);
			} else {
				chest.rotation.x = 0;
				chest.rotation.z = 0;
				chest.position.y = 0;
			}
			chest.updateMatrixWorld();
		}
		for (let i = 0; i < this.crabs.length; i++) {
			const crab = this.crabs[i];
			const ud = crab.userData;
			const myTime = i * 0.7321 + this.time;
			const bones = crab.children;
			const crabHead = bones[1];
			const legTime = myTime * 16;
			tempVec3.subVectors(crab.position, this.camera.position);

			tempVec3.y = 0;
			const distanceFromPlayer = tempVec3.length();
			const soundIdle = ud.soundIdle as PositionalSoundEffect | undefined;
			if (soundIdle) {
				const shouldPlay = distanceFromPlayer < 16;
				soundIdle.shouldPlay = shouldPlay;
				if (shouldPlay) {
					soundIdle.moveTo(crab.position);
				}
			}

			ud.awake = distanceFromPlayer < 8;
			const giveChase = ud.awake && distanceFromPlayer > 4;
			const running = clamp01((ud.running || 0) + (giveChase ? 0.1 : -0.05));

			const soundWalking = ud.soundWalking as PositionalSoundEffect | undefined;
			if (soundWalking) {
				const shouldPlay = running > 0;
				soundWalking.shouldPlay = shouldPlay;
				if (shouldPlay) {
					soundWalking.moveTo(crab.position);
				}
			}

			for (let i = 2; i < 4; i++) {
				const bone = bones[i];
				bone.position.y =
					Math.max(0, Math.sin(legTime + Math.PI * i)) * 0.3 * running;
				bone.position.z = Math.cos(legTime + Math.PI * i) * -0.15 * running;
			}
			tempVec3.normalize();
			crabHead.rotation.x = lerp(
				Math.sin(myTime * 3) * 0.05,
				Math.sin(myTime * 6) * 0.1,
				running,
			);
			crabHead.rotation.z = lerp(
				Math.sin(myTime * 4.2) * 0.05,
				Math.sin(myTime * 7.5) * 0.1,
				running,
			);
			crabHead.position.y = lerp(
				Math.sin(myTime * 5.3) * 0.04,
				Math.abs(Math.sin(myTime * 13.5) * 0.08),
				running,
			);
			for (let i = 4; i < 6; i++) {
				const bone = bones[i];
				bone.rotation.copy(bone.userData.originalRotation);

				const dir = i % 2 === 0 ? 1 : -1;
				bone.rotateX(
					lerp(
						Math.sin(myTime * 3 + i) * 0.05,
						Math.sin(myTime * 6 + i) * 0.1,
						running,
					),
				);
				bone.rotateZ(
					lerp(
						Math.sin(myTime * 4.2 + i) * 0.05 * dir,
						Math.sin(myTime * 7.5 + i) * 0.1 * dir,
						running,
					),
				);
				bone.position.copy(bone.userData.originalPosition);
				bone.position.y += lerp(
					Math.sin(myTime * 5.3 + i) * 0.04,
					Math.abs(Math.sin(myTime * 8.5 + i) * 0.03),
					running,
				);
				const bonePincer = bones[i].children[0];
				bonePincer.rotation.copy(bonePincer.userData.originalRotation);

				bonePincer.rotateX(
					Math.max(
						-0.18,
						Math.abs(
							lerp(
								Math.sin(myTime * 4.2) * 0.18 * dir,
								Math.sin(myTime * 13.5 + i * 2) * 1.3 * dir,
								running,
							),
						) - lerp(0.3, 1.1, running),
					),
				);
			}
			const deltaAngle = wrap(
				crab.rotation.y - (Math.atan2(-tempVec3.z, tempVec3.x) - Math.PI * 0.5),
				-Math.PI,
				Math.PI,
			);
			crab.rotation.y -= deltaAngle * 0.1 * running;
			tempVec3.multiplyScalar(-0.033 * running * dt * 60);
			crab.position.add(tempVec3);
			ud.running = running;
			crab.updateMatrixWorld();
		}

		for (const doorPivot of this.doorPivots) {
			const newAngle = -Math.max(0, Math.abs(Math.sin(this.time) * 2.5) - 0.35);
			if (doorPivot.rotation.y !== newAngle && newAngle === 0) {
				console.log("bam!");
				if (this.soundDoorSlam) {
					this.soundDoorSlam.play();
				}
			}
			doorPivot.rotation.y = newAngle;
			doorPivot.updateMatrixWorld();
		}
		this.time += dt;
	};
	cleanup = () => {
		document.removeEventListener("keypress", this.onKeyPress);
	};
}
