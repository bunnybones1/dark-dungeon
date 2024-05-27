const halfSearchDistance = 10;

const LEFT = -1n;
const RIGHT = 1n;
const UP = -0x10000n;
const DOWN = 0x10000n;

const workingMems = [
	[new Array<bigint>(1000), new Array<bigint>(1000), new Array<bigint>(1000)],
	[new Array<bigint>(1000), new Array<bigint>(1000), new Array<bigint>(1000)],
];

const breadcrumbs = new Map<bigint, bigint>();

function expand(
	coord: bigint,
	mapData: bigint[][],
	previous: bigint[],
	current: bigint[],
	next: bigint[],
	otherCurrent: bigint[],
) {
	const x = Number(coord & 0xffn);
	const y = Number(coord >> 0x10n);
	const right = coord + RIGHT;
	if (
		mapData[y][x + 1] !== 0n &&
		!previous.includes(right) &&
		!current.includes(right)
	) {
		if (otherCurrent.includes(right)) {
			return right;
		}
		next.push(right);
		breadcrumbs.set(right, coord);
	}
	const left = coord + LEFT;
	if (
		mapData[y][x - 1] !== 0n &&
		!previous.includes(left) &&
		!current.includes(left)
	) {
		if (otherCurrent.includes(left)) {
			return left;
		}
		next.push(left);
		breadcrumbs.set(left, coord);
	}
	const down = coord + DOWN;
	if (
		mapData[y + 1][x] !== 0n &&
		!previous.includes(down) &&
		!current.includes(down)
	) {
		if (otherCurrent.includes(down)) {
			return down;
		}
		next.push(down);
		breadcrumbs.set(down, coord);
	}
	const up = coord + UP;
	if (
		mapData[y - 1][x] !== 0n &&
		!previous.includes(up) &&
		!current.includes(up)
	) {
		if (otherCurrent.includes(up)) {
			return up;
		}
		next.push(up);
		breadcrumbs.set(up, coord);
	}
	return undefined;
}

export class PathFinder {
	static workingMems = workingMems;
	j: number;
	probableTX = -1;
	probableTY = -1;
	constructor(
		private mapData: bigint[][],
		private tileUnitSize: number,
	) {
		//
	}
	solve(startX: number, startY: number, endX: number, endY: number) {
		const tileUnitSize = this.tileUnitSize;
		const mapData = this.mapData;

		const startTX = Math.round(startX / tileUnitSize);
		const startTY = Math.round(startY / tileUnitSize);
		const tileStart = this.mapData[startTY][startTX];
		if (tileStart === 0n) {
			throw new Error("start tile not free");
		}

		const endTX = Math.round(endX / tileUnitSize);
		const endTY = Math.round(endY / tileUnitSize);
		const tileEnd = this.mapData[endTY][endTX];
		if (tileEnd === 0n) {
			throw new Error("end tile not free");
		}

		breadcrumbs.clear();

		for (const workingMem of workingMems) {
			workingMem[0].length = 0;
			workingMem[1].length = 0;
			workingMem[2].length = 0;
		}

		const tx1 = Math.round(startX / tileUnitSize);
		const ty1 = Math.round(startY / tileUnitSize);
		const c1 = BigInt(tx1 + (ty1 << 0x10));
		workingMems[0][1].push(c1);

		const tx2 = Math.round(endX / tileUnitSize);
		const ty2 = Math.round(endY / tileUnitSize);
		const c2 = BigInt(tx2 + (ty2 << 0x10));
		workingMems[1][1].push(c2);

		let j = 0;
		let connector: bigint | undefined;
		let connector2: bigint | undefined;
		let iMem = 0;
		search: for (; j < halfSearchDistance; j++) {
			for (iMem = 0; iMem < 2; iMem++) {
				const workingMem = workingMems[iMem];
				const previous = workingMem[j % 3];
				const current = workingMem[(j + 1) % 3];
				const next = workingMem[(j + 2) % 3];

				next.length = 0;

				const otherWorkingMem = workingMems[(iMem + 1) % 2];
				const otherCurrent = otherWorkingMem[(j + 1 + iMem) % 3];

				for (const coord of current) {
					connector = expand(
						coord,
						mapData,
						previous,
						current,
						next,
						otherCurrent,
					);
					if (connector !== undefined) {
						connector2 = coord;
						break search;
					}
				}
			}
		}
		this.j = j;
		if (connector !== undefined && connector2 !== undefined) {
			const tx1 = Number(connector & 0xffn);
			const ty1 = Number(connector >> 0x10n);
			const tx2 = Number(connector2 & 0xffn);
			const ty2 = Number(connector2 >> 0x10n);
			const path: bigint[] = [];
			while (connector2) {
				path.push(connector2);
				connector2 = breadcrumbs.get(connector2);
			}
			path.reverse();
			while (connector) {
				path.push(connector);
				connector = breadcrumbs.get(connector);
			}
			if (iMem === 1) {
				path.reverse();
			}
			path.shift();
			const startTX = startX / tileUnitSize;
			const startTY = startY / tileUnitSize;
			let probableTX = startTX;
			let probableTY = startTY;
			for (const coord of path) {
				const tx = Number(coord & 0xffn);
				const ty = Number(coord >> 0x10n);
				const dx = startTX - tx;
				const dy = startTY - ty;
				const angle = Math.atan2(dy, dx);
				const txLoS = tx + Math.cos(angle);
				const tyLoS = ty + Math.sin(angle);
				if (mapData[Math.round(tyLoS)][Math.round(txLoS)] === 0n) {
					break;
				}
				probableTX = tx;
				probableTY = ty;
			}
			this.probableTX = probableTX;
			this.probableTY = probableTY;
		} else {
			this.probableTX = -1;
			this.probableTY = -1;
		}
	}
}
