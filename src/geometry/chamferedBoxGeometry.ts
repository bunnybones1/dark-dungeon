import { Memoizer } from "memoizer-ts";
import { SphereGeometry, Vector3 } from "three";
import { inferDirection } from "../utils/math/inferDirection";

export function createChamferedBoxGeometry(
	width: number,
	height: number,
	depth: number,
	chamfer = 0.005,
) {
	const geo = new SphereGeometry(0.02, 8, 5, Math.PI * 0.125);
	const posArr = geo.attributes.position.array;
	const normArr = geo.attributes.normal.array;
	const tempVec = new Vector3();
	const tempPos = new Vector3();
	const halfWidth = width * 0.5 - chamfer;
	const halfHeight = height * 0.5 - chamfer;
	const halfDepth = depth * 0.5 - chamfer;
	for (let i3 = 0; i3 < normArr.length; i3 += 3) {
		tempVec.fromArray(normArr, i3);
		tempPos.fromArray(posArr, i3);
		tempVec.round();
		if (tempVec.y === 1) {
			tempVec.set(0, 1, 0);
		}
		if (tempVec.y === -1) {
			tempVec.set(0, -1, 0);
		}
		tempVec.toArray(normArr, i3);
		tempVec.multiplyScalar(chamfer);
		tempVec.x += halfWidth * inferDirection(tempPos.x);
		tempVec.y += halfHeight * inferDirection(tempPos.y);
		tempVec.z += halfDepth * inferDirection(tempPos.z);
		tempVec.toArray(posArr, i3);
	}
	return geo;
}

export const getChamferedBoxGeometry = Memoizer.makeMemoized(
	createChamferedBoxGeometry,
);
