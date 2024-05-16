import { type GLTF, GLTFLoader } from "three/examples/jsm/Addons.js";

const gltfBank = new Map<string, Promise<GLTF>>();

export function getGLTF(filePath: string) {
	if (!gltfBank.has(filePath)) {
		const l = new GLTFLoader();
		const p = l.loadAsync(filePath);
		gltfBank.set(filePath, p);
	}
	return gltfBank.get(filePath)!;
}
