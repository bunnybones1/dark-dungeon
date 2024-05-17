import type { PerspectiveCamera } from "three";
import type WebGPURenderer from "three/examples/jsm/renderers/webgpu/WebGPURenderer.js";

export function initResizeHandler(
	camera: PerspectiveCamera,
	renderer: WebGPURenderer,
) {
	// Resize handler
	function onWindowResize() {
		// Update camera aspect ratio
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		// Update renderer size
		renderer.setSize(window.innerWidth, window.innerHeight);
	}
	window.addEventListener("resize", onWindowResize);
}
