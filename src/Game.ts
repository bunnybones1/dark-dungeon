import { update } from "@tweenjs/tween.js";
import {
	AdditiveBlending,
	Color,
	DirectionalLight,
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
import { initMerchantMusic } from "./audio/initMerchantMusic";
import { getGLTF } from "./getGLTF";
import { loadMapDataFromImage } from "./loadMapDataFromImage";
import { clamp01 } from "./utils/math/clamp01";
import { lerp } from "./utils/math/lerp";
import { wrap } from "./utils/math/wrap";
import { withinXTiles } from "./utils/withinXTiles";

const showMap = false;

const TILE_UNIT_SIZE = 2;
export class Game {
	map: bigint[][];
	torchLight: SpotLight;
	flames: Object3D[] = [];
	campfires: Object3D[] = [];
	skyLights: Object3D[] = [];
	chesters: Object3D[] = [];
	crabs: Object3D[] = [];

	physicsMap: PhysicsMap | undefined;

	constructor(
		private pivot: Object3D,
		private camera: PerspectiveCamera,
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

		initMerchantMusic(this.pivot, this.camera);

		document.addEventListener("keypress", this.onKeyPress);

		const ambientLight = new HemisphereLight(
			new Color(0, 0, 1).multiplyScalar(0.1),
			new Color(0, 0.5, 1).multiplyScalar(0.2),
		);
		this.pivot.add(ambientLight);

		const torchLight = new SpotLight(0xffdfaf, 2, 6);
		torchLight.shadow.mapSize.setScalar(1024);
		torchLight.shadow.camera.near = 0.2;
		torchLight.shadow.camera.far = 6;
		torchLight.shadow.bias = -0.005;
		torchLight.shadow.radius = 0.01;
		torchLight.shadow.camera.updateProjectionMatrix();
		this.pivot.add(torchLight);
		torchLight.castShadow = true;
		this.pivot.add(torchLight.target);
		this.torchLight = torchLight;

		const worldContainer = new Object3D();
		this.pivot.add(worldContainer);

		this.map = await loadMapDataFromImage("assets/maps/beanbeam.png");

		const physicsMap = new PhysicsMap(this.map, TILE_UNIT_SIZE);
		physicsMap.visuals.scale.setScalar(0.01);
		if (showMap) {
			this.pivot.add(physicsMap.visuals);
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

		const protoFloor = tileset.scene.getObjectByName("floor")!;
		protoFloor.castShadow = false;
		protoFloor.receiveShadow = true;
		const mat = protoFloor.material as MeshPhysicalMaterial;
		// mat.roughness = 0.75;
		// mat.metalness = 0;
		mat.sheen = 0.4;
		mat.sheenRoughness = 0.35;
		mat.sheenColor = new Color(0, 0.2, 0.05);

		const protoCeiling = tileset.scene.getObjectByName("ceiling")!;
		protoCeiling.castShadow = true;
		protoCeiling.receiveShadow = true;

		const protoWall = tileset.scene.getObjectByName("wall")!;
		protoWall.receiveShadow = true;
		protoWall.castShadow = true;

		const protoWallInnerCorner =
			tileset.scene.getObjectByName("wall-inner-corner")!;
		protoWallInnerCorner.receiveShadow = true;
		protoWallInnerCorner.castShadow = true;

		const protoGoldCoin = tileset.scene.getObjectByName("coin")!;
		protoGoldCoin.receiveShadow = true;
		protoGoldCoin.castShadow = true;

		const protoKey = tileset.scene.getObjectByName("key")!;
		protoKey.receiveShadow = true;
		protoKey.castShadow = true;

		const protoColumn = tileset.scene.getObjectByName("column")!;
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
			const m = tileset.scene
				.getObjectByName(`wall-merchant${wallMerchantChunkName}`)
				?.clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoWallMarket.add(m);
		}

		const protoBarrel = new Object3D();
		for (const barrelChunkName of ["-wood", "-rings"]) {
			// for (const barrelChunkName of ['-wood','-rings','-lid']) {
			const m = tileset.scene
				.getObjectByName(`barrel${barrelChunkName}`)
				?.clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoBarrel.add(m);
		}

		const protoBarrelClosed = new Object3D();
		for (const barrelChunkName of ["-wood", "-rings", "-lid"]) {
			const m = tileset.scene
				.getObjectByName(`barrel${barrelChunkName}`)
				?.clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoBarrelClosed.add(m);
		}

		const protoCrab = tileset.scene.getObjectByName("crab-armature")!;
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
			const m = tileset.scene
				.getObjectByName(`chest${chestChunkName}`)
				?.clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoChest.add(m);
		}

		const protoCampfire = new Object3D();
		for (const campfireChunkName of ["-stones", "-wood"]) {
			const m = tileset.scene
				.getObjectByName(`campfire${campfireChunkName}`)
				?.clone();
			m.receiveShadow = true;
			m.castShadow = true;
			m.position.set(0, 0, 0);
			protoCampfire.add(m);
		}
		const flame = tileset.scene.getObjectByName("flame")?.clone();
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

		for (let i = 0; i < 0; i++) {
			const chester = protoChest.clone();
			worldContainer.add(chester);
			chester.position.set(
				this.camera.position.x + randFloatSpread(6),
				0,
				this.camera.position.z + randFloatSpread(6),
			);
			chester.rotation.y = Math.PI * 2 * Math.random();
			this.chesters.push(chester);
		}

		for (let i = 0; i < 24; i++) {
			const goldCoin = protoGoldCoin.clone();
			worldContainer.add(goldCoin);
			goldCoin.position.set(
				this.camera.position.x + randFloatSpread(6),
				0.045,
				this.camera.position.z + randFloatSpread(6),
			);
			goldCoin.rotation.y = Math.PI * 2 * Math.random();
		}
		for (let i = 0; i < 6; i++) {
			const key = protoKey.clone();
			worldContainer.add(key);
			key.position.set(
				this.camera.position.x + randFloatSpread(6),
				0.045,
				this.camera.position.z + randFloatSpread(6),
			);
			key.rotation.x = Math.PI * 0.5;
			key.rotation.z = Math.PI * 2 * Math.random();
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
					worldContainer.add(floor);
					floor.position.set(x, 0, y);

					if (cx === x && cz === y) {
						const skyLight = new RectAreaLight(0x9fcfff, 10, 2.6, 2.6);
						this.pivot.add(skyLight);
						skyLight.position.set(cx, 2.8, cz);
						skyLight.rotation.x = Math.PI * -0.5;
						this.skyLights.push(skyLight);
						const sunLight = new SpotLight(0xffcf9f, 1000, 10, Math.PI * 0.15);
						sunLight.target.position.set(cx - 2, 0, cz - 1);
						this.pivot.add(sunLight);
						this.pivot.add(sunLight.target);
						sunLight.position.set(cx + 2, 4, cz + 1);
						sunLight.shadow.mapSize.setScalar(1024);
						sunLight.shadow.bias = -0.0001;
						sunLight.castShadow = true;
						this.skyLights.push(sunLight);
						const ceiling = new Mesh(
							new PlaneGeometry(4.6, 4.6, 1, 1),
							new MeshBasicMaterial({ color: new Color(0.75, 0.95, 1.1) }),
						);
						ceiling.rotation.x = Math.PI * 0.5;
						worldContainer.add(ceiling);
						ceiling.position.set(x, 2.5, y);
					} else {
						const ceiling = protoCeiling.clone();
						worldContainer.add(ceiling);
						ceiling.position.set(x, 0, y);
					}

					if (here === 0xff00ffn) {
						const barrel = protoBarrel.clone();
						worldContainer.add(barrel);
						barrel.position.set(x, 0, y);
						barrel.userData.radius = 0.3;
						barrel.userData.mass = 100;
						this.physicsMap.addActor(barrel, false);
					} else if (here === 0x0000ffn) {
						const barrel = protoBarrelClosed.clone();
						worldContainer.add(barrel);
						barrel.position.set(x, 0, y);
						barrel.userData.radius = 0.3;
						barrel.userData.mass = 100;
						this.physicsMap.addActor(barrel, false);
					} else if (here === 0xe66400n) {
						const crab = SkeletonUtils.clone(protoCrab);
						worldContainer.add(crab);
						crab.traverse((n) => {
							n.userData.originalRotation = n.rotation.clone();
							n.userData.originalPosition = n.position.clone();
						});
						crab.position.set(x, 0, y);
						crab.rotation.y = Math.PI * 2 * Math.random();
						this.crabs.push(crab);
						crab.userData.radius = 0.65;
						crab.userData.mass = 450;
						this.physicsMap.addActor(crab, false);
					} else if (here === 0x00ff00n) {
						const campfire = protoCampfire.clone();
						worldContainer.add(campfire);
						campfire.position.set(x, 0, y);
						campfire.rotation.y = Math.PI * 0.5;
						const flame = campfire.getObjectByName("flame");
						if (flame) {
							this.flames.push(flame);
						}
						campfire.position.set(x, 0, y);
						campfire.userData.radius = 0.3;
						campfire.userData.mass = 100000000;
						this.campfires.push(campfire);
						this.physicsMap.addActor(campfire, false);
					} else if (here === 0xffff00n) {
						const chest = protoChest.clone();
						worldContainer.add(chest);
						chest.position.set(x, 0, y);
						chest.rotation.y = Math.PI * 0.5;
						chest.userData.radius = 0.5;
						chest.userData.mass = 100;
						this.physicsMap.addActor(chest, false);
					}
					if (this.map[iy][ix + 1] === 0n) {
						const wall = protoWall.clone();
						worldContainer.add(wall);
						wall.position.set((ix + 0.5) * TILE_UNIT_SIZE, 0, y);
						wall.rotation.z = Math.PI * -0.5;
					}
					if (this.map[iy][ix - 1] === 0n) {
						const wall = protoWall.clone();
						worldContainer.add(wall);
						wall.position.set((ix - 0.5) * TILE_UNIT_SIZE, 0, y);
						wall.rotation.z = Math.PI * 0.5;
					}
					if (this.map[iy + 1][ix] === 0n) {
						const wall = protoWall.clone();
						worldContainer.add(wall);
						wall.position.set(x, 0, (iy + 0.5) * TILE_UNIT_SIZE);
						wall.rotation.z = 0;
					}
					if (this.map[iy - 1][ix] === 0n) {
						const wall = protoWall.clone();
						worldContainer.add(wall);
						wall.position.set(x, 0, (iy - 0.5) * TILE_UNIT_SIZE);
						wall.rotation.z = Math.PI;
					} else if (this.map[iy - 1][ix] === 0xff0000n) {
						const wall = protoWallMarket.clone();
						worldContainer.add(wall);
						wall.position.set(x, 0, (iy - 0.5) * TILE_UNIT_SIZE);
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
					worldContainer.add(column);
					column.position.set(
						(ix + 0.5) * TILE_UNIT_SIZE,
						0,
						(iy + 0.5) * TILE_UNIT_SIZE,
					);
					// column.rotation.z = Math.PI
				} else if (openCounter === 1) {
					const wallInnerCorner = protoWallInnerCorner.clone();
					worldContainer.add(wallInnerCorner);
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
				}
			}
		}
	}

	time = 1;
	simulate = (dt: number) => {
		this.camera.position.y -=
			(this.camera.position.y - (this.crouching ? 0.5 : 1.2)) * 0.1;
		if (this.physicsMap) {
			this.physicsMap.simulate();
			this.camera.updateMatrix();
			this.physicsMap.visuals.position
				.set(0.1, 0.05, -0.1)
				.applyMatrix4(this.camera.matrix);
			this.physicsMap.visuals.rotation.copy(this.camera.rotation);
			this.physicsMap.visuals.rotateX(Math.PI * 0.5);
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
		for (let i = 0; i < this.flames.length; i++) {
			const flame = this.flames[i];
			const myTime = i * 0.7321 + this.time;
			flame.rotation.x = Math.sin(myTime * 12) * 0.1;
			flame.rotation.z = Math.sin(myTime * 15) * 0.1;
			flame.position.y = Math.sin(myTime * 17) * 0.03 + 0.1;
			// flame.visible = myTime % 8 > 4
		}
		const temp = new Vector3();
		for (let i = 0; i < this.chesters.length; i++) {
			const chest = this.chesters[i];
			const myTime = i * 0.7321 + this.time;
			temp.subVectors(chest.position, this.camera.position);
			temp.y = 0;
			if (temp.length() > (i + 1) * 0.75) {
				temp.normalize();
				chest.rotation.x = Math.sin(myTime * 12) * 0.1;
				chest.rotation.z = Math.sin(myTime * 15) * 0.1;
				chest.position.y = Math.abs(Math.sin(myTime * 17) * 0.03);
				chest.rotation.y -=
					(chest.rotation.y - (Math.atan2(-temp.z, temp.x) - Math.PI * 0.5)) *
					0.1;
				temp.multiplyScalar(-0.01);
				chest.position.add(temp);
			} else {
				chest.rotation.x = 0;
				chest.rotation.z = 0;
				chest.position.y = 0;
			}
		}
		for (let i = 0; i < this.crabs.length; i++) {
			const crab = this.crabs[i];
			const myTime = i * 0.7321 + this.time;
			const bones = crab.children;
			const crabHead = bones[1];
			const legTime = myTime * 16;
			temp.subVectors(crab.position, this.camera.position);
			temp.y = 0;
			const distanceFromPlayer = temp.length();
			crab.userData.awake = distanceFromPlayer < 8;
			const giveChase = crab.userData.awake && distanceFromPlayer > 2;
			const running = clamp01(
				(crab.userData.running || 0) + (giveChase ? 0.1 : -0.05),
			);
			for (let i = 2; i < 4; i++) {
				const bone = bones[i];
				bone.position.y =
					Math.max(0, Math.sin(legTime + Math.PI * i)) * 0.3 * running;
				bone.position.z = Math.cos(legTime + Math.PI * i) * -0.15 * running;
			}
			temp.normalize();
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
				Math.abs(Math.sin(myTime * 8.5) * 0.03),
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
				crab.rotation.y - (Math.atan2(-temp.z, temp.x) - Math.PI * 0.5),
				-Math.PI,
				Math.PI,
			);
			crab.rotation.y -= deltaAngle * 0.1 * running;
			temp.multiplyScalar(-0.033 * running * dt * 60);
			crab.position.add(temp);
			crab.userData.running = running;
		}
		this.time += dt;
	};
	cleanup = () => {
		document.removeEventListener("keypress", this.onKeyPress);
	};
}
