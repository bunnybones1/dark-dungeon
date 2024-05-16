import {
	AdditiveBlending,
	Color,
	HemisphereLight,
	Mesh,
	MeshBasicMaterial,
	Object3D,
	type PerspectiveCamera,
	PointLight,
	SpotLight,
} from "three";
import { update } from "three/examples/jsm/libs/tween.module.js";
import { getGLTF } from "./getGLTF";
import { loadMapDataFromImage } from "./loadMapDataFromImage";

const TILE_UNIT_SIZE = 2;
export class Game {
	map: bigint[][];
	torchLight: SpotLight;
	flames: Object3D[] = [];

	constructor(
		private pivot: Object3D,
		private camera: PerspectiveCamera,
	) {
		this.init();
	}
	initd = false;
	private async init() {
		if (this.initd) {
			return;
		}
		this.initd = true;

		const ambientLight = new HemisphereLight(
			new Color(0, 0, 1).multiplyScalar(0.1),
			new Color(0, 0.5, 1).multiplyScalar(0.2),
		);
		this.pivot.add(ambientLight);

		const torchLight = new SpotLight(0xffdfaf, 2, 6);
		torchLight.shadow.mapSize.setScalar(1024);
		torchLight.shadow.camera.far = 6;
		this.pivot.add(torchLight);
		torchLight.castShadow = true;
		this.pivot.add(torchLight.target);
		this.torchLight = torchLight;

		const tileHolder = new Object3D();
		this.pivot.add(tileHolder);

		this.map = await loadMapDataFromImage("/maps/beanbeam.png");

		const tileset = await getGLTF("/models/tileset.glb");

		const protoFloor = tileset.scene.getObjectByName("floor")!;
		protoFloor.castShadow = false;
		protoFloor.receiveShadow = true;

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

		const protoColumn = tileset.scene.getObjectByName("column")!;
		protoWall.receiveShadow = true;
		protoWall.castShadow = true;

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
		// fireLight.shadow.camera.fov = 170
		// fireLight.castShadow = true
		fireLight.name = "fireLight";
		fireLight.position.y = 0.2;
		// fireLight.position.z = 0.25
		flame.add(fireLight);
		protoCampfire.add(flame);

		for (let iy = 1, lx = this.map.length - 1; iy < lx; iy++) {
			for (let ix = 1, ly = this.map[ix].length - 1; ix < ly; ix++) {
				const here = this.map[iy][ix];
				const isOpen = here !== 0n && here !== 0xff0000n;
				if (isOpen) {
					const floor = protoFloor.clone();
					tileHolder.add(floor);
					floor.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);
					const ceiling = protoCeiling.clone();
					tileHolder.add(ceiling);
					ceiling.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);

					if (here === 0xff00ffn) {
						const barrel = protoBarrel.clone();
						tileHolder.add(barrel);
						barrel.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);
					} else if (here === 0x0000ffn) {
						const barrel = protoBarrelClosed.clone();
						tileHolder.add(barrel);
						barrel.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);
					} else if (here === 0x00ff00n) {
						const campfire = protoCampfire.clone();
						tileHolder.add(campfire);
						campfire.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);
						campfire.rotation.y = Math.PI * 0.5;
						const flame = campfire.getObjectByName("flame");
						this.flames.push(flame);
					} else if (here === 0xffff00n) {
						const chest = protoChest.clone();
						tileHolder.add(chest);
						chest.position.set(ix * TILE_UNIT_SIZE, 0, iy * TILE_UNIT_SIZE);
						chest.rotation.y = Math.PI * 0.5;
					}
					if (this.map[iy][ix + 1] === 0n) {
						const wall = protoWall.clone();
						tileHolder.add(wall);
						wall.position.set(
							(ix + 0.5) * TILE_UNIT_SIZE,
							0,
							iy * TILE_UNIT_SIZE,
						);
						wall.rotation.z = Math.PI * -0.5;
					}
					if (this.map[iy][ix - 1] === 0n) {
						const wall = protoWall.clone();
						tileHolder.add(wall);
						wall.position.set(
							(ix - 0.5) * TILE_UNIT_SIZE,
							0,
							iy * TILE_UNIT_SIZE,
						);
						wall.rotation.z = Math.PI * 0.5;
					}
					if (this.map[iy + 1][ix] === 0n) {
						const wall = protoWall.clone();
						tileHolder.add(wall);
						wall.position.set(
							ix * TILE_UNIT_SIZE,
							0,
							(iy + 0.5) * TILE_UNIT_SIZE,
						);
						wall.rotation.z = 0;
					}
					if (this.map[iy - 1][ix] === 0n) {
						const wall = protoWall.clone();
						tileHolder.add(wall);
						wall.position.set(
							ix * TILE_UNIT_SIZE,
							0,
							(iy - 0.5) * TILE_UNIT_SIZE,
						);
						wall.rotation.z = Math.PI;
					} else if (this.map[iy - 1][ix] === 0xff0000n) {
						const wall = protoWallMarket.clone();
						tileHolder.add(wall);
						wall.position.set(
							ix * TILE_UNIT_SIZE,
							0,
							(iy - 0.5) * TILE_UNIT_SIZE,
						);
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
					tileHolder.add(column);
					column.position.set(
						(ix + 0.5) * TILE_UNIT_SIZE,
						0,
						(iy + 0.5) * TILE_UNIT_SIZE,
					);
					// column.rotation.z = Math.PI
				} else if (openCounter === 1) {
					const wallInnerCorner = protoWallInnerCorner.clone();
					tileHolder.add(wallInnerCorner);
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

	time = 0;
	simulate = (dt: number) => {
		this.camera.position.y = 1.2;
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
		for (const flame of this.flames) {
			flame.rotation.x = Math.sin(this.time * 12) * 0.1;
			flame.rotation.z = Math.sin(this.time * 15) * 0.1;
			flame.position.y = Math.sin(this.time * 17) * 0.03 + 0.1;
		}
		this.time += dt;
	};
	cleanup = () => {
		//
	};
}
