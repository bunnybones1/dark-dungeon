import { Color, Mesh, MeshBasicMaterial, Object3D } from "three";
import { TestPathFinder } from "./TestPathFinder";
import { getChamferedBoxGeometry } from "./geometry/chamferedBoxGeometry";
import { getChamferedCylinderGeometry } from "./geometry/chamferedCylinderGeometry";
import { testDoorX, testDoorY } from "./testConstants";
import { clamp } from "./utils/math/clamp";

function copyXZ(to: Object3D, from: Object3D) {
	to.position.x = from.position.x;
	to.position.z = from.position.z;
	return to.position;
}
const pushStrengthWall = 0.5;
const pushStrengthActors = 0.5;

const visualizeFullMap = false;
const debugPhysics = false;

const endX = testDoorX;
const endY = testDoorY;

export class PhysicsMap {
	private actorBindings = new Map<Object3D, Object3D>();
	private actorPhysics: Object3D[] = [];

	visuals = new Object3D();
	mapContainer = new Object3D();
	mainActor: Object3D;
	debugTileMarkerIds: Set<number> = new Set();
	debugTileMarkers: Map<number, Object3D> = new Map();
	extraTest: TestPathFinder;
	constructor(
		private mapData: bigint[][],
		private tileUnitSize: number,
	) {
		this.visuals.add(this.mapContainer);
		const extraTestPivot = new Object3D();
		this.mapContainer.add(extraTestPivot);
		this.extraTest = new TestPathFinder(extraTestPivot, mapData, tileUnitSize);
		setInterval(() => {
			if (this.mainActor && this.extraTest) {
				this.extraTest.solve(
					this.mainActor.position.x,
					this.mainActor.position.z,
					endX,
					endY,
				);
			}
		}, 500);
		if (import.meta.hot) {
			import.meta.hot.accept("./TestPathFinder", (mod) => {
				this.extraTest = new mod.TestPathFinder(
					extraTestPivot,
					mapData,
					tileUnitSize,
				);
			});
		}
		if (visualizeFullMap) {
			for (let iy = 0; iy < mapData.length; iy++) {
				const row = mapData[iy];
				for (let ix = 0; ix < row.length; ix++) {
					const v = row[ix];
					if (v === 0n || v === 0xff0000n) {
						this.addSquare(2, 2, ix * tileUnitSize, iy * tileUnitSize);
					}
				}
			}
		}
	}
	addSquare(width: number, height: number, x: number, y: number) {
		const t = new Mesh(
			getChamferedBoxGeometry(width, 0.11, height, 0.05),
			new MeshBasicMaterial({
				opacity: 0.25,
				transparent: true,
			}),
		);
		t.position.set(x, 0, y);
		this.mapContainer.add(t);
	}
	addCircle(radius: number, x: number, y: number) {
		const mesh = new Mesh(
			getChamferedCylinderGeometry(radius, 0.11, 32, 9, 0.05),
			new MeshBasicMaterial(),
		);
		mesh.position.set(x, 0, y);
		this.mapContainer.add(mesh);
		return mesh;
	}
	addActor(actor: Object3D, main = false, startAwake = false) {
		const radius = actor.userData.radius || 1;
		const circle = this.addCircle(radius, actor.position.x, actor.position.z);
		this.actorPhysics.push(circle);
		circle.userData.radius = radius;
		circle.name = actor.name;
		circle.userData.awakeCounter = startAwake ? 2 : 0;
		circle.userData.mass = actor.userData.mass || 10;
		circle.userData.deltaX = 0;
		circle.userData.deltaY = 0;
		this.actorBindings.set(actor, circle);
		if (main) {
			this.mainActor = actor;
		}
	}
	simulate() {
		if (debugPhysics) {
			for (const markerId of this.debugTileMarkerIds) {
				const marker = this.debugTileMarkers.get(markerId);
				if (marker) {
					this.debugTileMarkers.delete(markerId);
					this.mapContainer.remove(marker);
				}
			}
			this.debugTileMarkerIds.clear();
		}
		for (const [visuals, physics] of this.actorBindings) {
			copyXZ(physics, visuals);
		}
		copyXZ(this.mapContainer, this.mainActor).multiplyScalar(-1);
		const blockHalfSize = 1.2;
		const blockExtraRadius = 0.1;
		const blockShyHalfSize = blockHalfSize - blockExtraRadius;
		for (const physics of this.actorPhysics) {
			if (
				physics.userData.lastX === physics.position.x &&
				physics.userData.lastY === physics.position.y
			) {
				if (physics.userData.awakeCounter > 0) {
					physics.userData.awakeCounter--;
				}
			} else {
				physics.userData.awakeCounter = 2;
			}
		}
		for (const physics of this.actorPhysics) {
			if (physics.userData.awakeCounter === 0) {
				continue;
			}
			const radius = physics.userData.radius;
			let x = physics.position.x;
			let y = physics.position.z;
			const closestTopLeftTileIX = Math.round(
				(physics.position.x + 1) / this.tileUnitSize,
			);
			const closestTopLeftTileIY = Math.round(
				(physics.position.z + 1) / this.tileUnitSize,
			);
			for (
				let iy = closestTopLeftTileIY - 1;
				iy <= closestTopLeftTileIY;
				iy++
			) {
				for (
					let ix = closestTopLeftTileIX - 1;
					ix <= closestTopLeftTileIX;
					ix++
				) {
					if (debugPhysics) {
						const markerId = ix + iy * this.mapData[0].length;
						this.debugTileMarkerIds.add(markerId);
					}
					const v = this.mapData[iy][ix];
					if (v === 0n || v === 0xff0000n) {
						const tx = ix * this.tileUnitSize;
						const ty = iy * this.tileUnitSize;
						if (
							x > tx - blockHalfSize &&
							x < tx + blockHalfSize &&
							y > ty - blockHalfSize &&
							y < ty + blockHalfSize
						) {
							const dx = tx - x;
							const dy = ty - y;
							if (Math.abs(dx) > Math.abs(dy)) {
								x -= Math.sign(dx) * (blockHalfSize - Math.abs(dx));
							} else {
								y -= Math.sign(dy) * (blockHalfSize - Math.abs(dy));
							}
							physics.userData.awakeCounter = 2;
						}
						const cx = clamp(tx - blockShyHalfSize, tx + blockShyHalfSize, x);
						const cy = clamp(ty - blockShyHalfSize, ty + blockShyHalfSize, y);
						const dx = cx - x;
						const dy = cy - y;
						const dist = Math.sqrt(dx * dx + dy * dy);
						if (dist < blockExtraRadius + radius) {
							const overlapPercent = blockExtraRadius + radius - dist;
							x -= dx * overlapPercent * pushStrengthWall;
							y -= dy * overlapPercent * pushStrengthWall;
							physics.userData.awakeCounter = 2;
						}
					}
				}
			}
			physics.position.x = x;
			physics.position.z = y;
		}
		if (debugPhysics) {
			for (const markerId of this.debugTileMarkerIds) {
				const marker = new Mesh(
					getChamferedBoxGeometry(2, 0.01, 2, 0.005),
					new MeshBasicMaterial({
						color: new Color(1, 0, 0),
					}),
				);
				marker.position.set(
					(markerId % this.mapData[0].length) * this.tileUnitSize,
					0,
					Math.floor(markerId / this.mapData[0].length) * this.tileUnitSize,
				);
				this.debugTileMarkers.set(markerId, marker);
				this.mapContainer.add(marker);
				// physics.userData.deltaX += 0.01
			}
		}
		for (let ia = 0; ia < this.actorPhysics.length; ia++) {
			const physicsA = this.actorPhysics[ia];
			for (let ib = ia + 1; ib < this.actorPhysics.length; ib++) {
				const physicsB = this.actorPhysics[ib];
				if (
					physicsA.userData.awakeCounter === 0 &&
					physicsB.userData.awakeCounter === 0
				) {
					continue;
				}
				const uda = physicsA.userData;
				const udb = physicsB.userData;

				const minDist = uda.radius + udb.radius;

				const pax = physicsA.position.x;
				const pbx = physicsB.position.x;
				const dx = pax - pbx;
				if (Math.abs(dx) > minDist) {
					continue;
				}

				const pay = physicsA.position.z;
				const pby = physicsB.position.z;
				const dy = pay - pby;
				if (Math.abs(dy) > minDist) {
					continue;
				}

				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < minDist) {
					uda.awakeCounter = 2;
					udb.awakeCounter = 2;
					const overlapPercent = 1 - dist / minDist;
					const nx = dx * overlapPercent * pushStrengthActors;
					const ny = dy * overlapPercent * pushStrengthActors;
					const ratio = uda.mass / (uda.mass + udb.mass);
					const ratioInv = 1 - ratio;
					uda.deltaX += nx * ratioInv;
					uda.deltaY += ny * ratioInv;
					udb.deltaX -= nx * ratio;
					udb.deltaY -= ny * ratio;
				}
			}
		}
		for (const [visuals, physics] of this.actorBindings) {
			if (physics.userData.awakeCounter > 0) {
				physics.position.x += physics.userData.deltaX;
				physics.position.z += physics.userData.deltaY;
				physics.userData.deltaX = 0;
				physics.userData.deltaY = 0;
				copyXZ(visuals, physics);
			}
			physics.userData.lastX = physics.position.x;
			physics.userData.lastY = physics.position.y;
		}

		// console.log(
		// 	`${this.actorPhysics.reduce((awakeCounter, physics) => {
		// 		return awakeCounter + (physics.userData.awakeCounter > 0 ? 1 : 0);
		// 	}, 0)} / ${this.actorPhysics.length} physics objects awake`,
		// );
	}
}
