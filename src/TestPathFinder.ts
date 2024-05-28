import {
	type ColorRepresentation,
	Mesh,
	MeshBasicMaterial,
	type Object3D,
} from "three";
import { PathFinder } from "./PathFinder";
import { getChamferedBoxGeometry } from "./geometry/chamferedBoxGeometry";
import { getIcoSphereGeometry } from "./geometry/icoSphereGeometry";

const debugColorSets = [
	[0x202040, 0x202060, 0x2020a0],
	[0x204020, 0x206020, 0x20a020],
];
export class TestPathFinder {
	pathFinder: PathFinder;
	constructor(
		private pivot: Object3D,
		private mapData: bigint[][],
		private tileUnitSize: number,
	) {
		this.pathFinder = new PathFinder(mapData, tileUnitSize);
	}
	makeBox(
		x: number,
		y: number,
		size: number,
		color: ColorRepresentation = 0xff0000,
	) {
		const box = new Mesh(
			getChamferedBoxGeometry(size, 0.2, size, 0.05),
			new MeshBasicMaterial({
				color,
			}),
		);
		box.position.set(x, size * -0.1, y);
		this.pivot.add(box);
		return box;
	}
	makeUnitBoxIfFree(x: number, y: number) {
		const tileUnitSize = this.tileUnitSize;
		const tx = Math.round(x / tileUnitSize);
		const ty = Math.round(y / tileUnitSize);
		const tile = this.mapData[ty][tx];
		if (tile === 0n) {
			throw new Error("tile not free");
		}
		return this.makeBox(tx * tileUnitSize, ty * tileUnitSize, 1.5);
	}

	makeBall(
		x: number,
		y: number,
		radius = 0.5,
		color: ColorRepresentation = 0xffff00,
	) {
		const ball = new Mesh(
			getIcoSphereGeometry(radius, 1),
			new MeshBasicMaterial({
				color,
			}),
		);
		ball.position.set(x, 0, y);
		this.pivot.add(ball);
		return ball;
	}
	solve(
		startX: number,
		startY: number,
		endX: number,
		endY: number,
		halfSearchDistance: number,
	) {
		this.pathFinder.solve(startX, startY, endX, endY, halfSearchDistance);

		const pivot = this.pivot;
		const tileUnitSize = this.tileUnitSize;

		while (pivot.children.length > 0) {
			pivot.remove(pivot.children[0]);
		}

		this.makeBall(startX, startY);
		this.makeBall(endX, endY);
		this.makeBall(
			this.pathFinder.probableTX * tileUnitSize,
			this.pathFinder.probableTY * tileUnitSize,
			0.25,
		);

		this.makeBox(startX, startY, 2, 0xff0000);
		this.makeBox(endX, endY, 2, 0xff0000);

		const j = this.pathFinder.j;

		for (let i = 0; i < PathFinder.workingMems.length; i++) {
			const workingMem = PathFinder.workingMems[i];
			const debugColors = debugColorSets[i];
			const j1 = (j + 2) % 3;
			for (const coord of workingMem[j1]) {
				const tx = Number(coord & 0xffn);
				const ty = Number(coord >> 0x10n);
				this.makeBox(
					tx * tileUnitSize,
					ty * tileUnitSize,
					1.7,
					debugColors[j1],
				);
			}
			const j2 = j % 3;
			for (const coord of workingMem[j2]) {
				const tx = Number(coord & 0xffn);
				const ty = Number(coord >> 0x10n);
				this.makeBox(
					tx * tileUnitSize,
					ty * tileUnitSize,
					1.7,
					debugColors[j2],
				);
			}
			const j3 = (j + 1) % 3;
			for (const coord of workingMem[j3]) {
				const tx = Number(coord & 0xffn);
				const ty = Number(coord >> 0x10n);
				this.makeBox(
					tx * tileUnitSize,
					ty * tileUnitSize,
					1.7,
					debugColors[j3],
				);
			}
		}

		// for (const coord of searchedArr2) {
		// 	const tx = Number(coord & 0xffn);
		// 	const ty = Number(coord >> 0x10n);
		// 	makeBox(tx * tileUnitSize, ty * tileUnitSize, 2, 0x002fff);
		// }
		// if(mapData[c1])
		// freeCoords1.add(c1+UP)
		// freeCoords1.add(c1+DOWN)
		// freeCoords1.add(c1+LEFT)
		// freeCoords1.add(c1+RIGHT)
		// const freeCoords2 = [BigInt(X2 + Y2 << 0x10)]
		// freeCoords1.push()
	}
}
