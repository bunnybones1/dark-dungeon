import type { Object3D } from "three";

export function withinXTiles(a: Object3D, b: Object3D, tileDist: number) {
	return (
		Math.abs(a.position.x - b.position.x) < tileDist &&
		Math.abs(a.position.z - b.position.z) < tileDist
	);
}
