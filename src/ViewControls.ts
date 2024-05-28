import { type PerspectiveCamera, Vector3 } from "three";
import KeyboardNavigation3D from "./KeyboardNavigation3D";
import { clamp01 } from "./utils/math/clamp01";
import { lerp } from "./utils/math/lerp";
import { unlerp } from "./utils/math/unlerp";

const tempVec3 = new Vector3(0, 0, -1);

export default class ViewControls {
	lastMouseX: number | null = null;
	lastMouseY: number | null = null;
	keyNav: KeyboardNavigation3D;
	movement = new Vector3();
	movementEased = new Vector3();
	movementEasedRotated = new Vector3();
	mouseDown = false;
	constructor(
		private camera: PerspectiveCamera,
		private speed = 1,
	) {
		this.keyNav = new KeyboardNavigation3D();

		document.addEventListener("mousedown", this.onMouseDown);
		document.addEventListener("mouseup", this.onMouseUp);

		const fovLow = 30;
		const fovHigh = 90;
		let fovSlider = unlerp(fovLow, fovHigh, camera.fov);
		function onWheel(event: WheelEvent) {
			fovSlider = clamp01(fovSlider + event.deltaY * 0.01);
			camera.fov = lerp(fovLow, fovHigh, fovSlider);
			camera.updateProjectionMatrix();
		}
		document.addEventListener("wheel", onWheel);
	}

	private orbitCamera(deltaX: number, deltaY: number) {
		this.camera.rotateX(deltaY * -0.01);
		this.camera.rotateY(deltaX * -0.01);
	}

	private onMouseDown = (event: MouseEvent) => {
		this.mouseDown = true;
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
		window.addEventListener("mousemove", this.onMouseMove);
	};

	private onMouseUp = (event: MouseEvent) => {
		this.mouseDown = false;
		this.lastMouseX = null;
		this.lastMouseY = null;
		window.removeEventListener("mousemove", this.onMouseMove);
	};

	private onMouseMove = (event: MouseEvent) => {
		if (this.lastMouseX !== null && this.lastMouseY !== null) {
			const deltaX = event.clientX - this.lastMouseX;
			const deltaY = event.clientY - this.lastMouseY;
			this.orbitCamera(deltaX, deltaY);
		}
		this.lastMouseX = event.clientX;
		this.lastMouseY = event.clientY;
	};

	simulate() {
		const int = this.keyNav.intention;
		this.movement.x = (int.strafeLeft ? -1 : 0) + (int.strafeRight ? 1 : 0);
		this.movement.y = (int.down ? -1 : 0) + (int.up ? 1 : 0);
		this.movement.z = (int.forward ? -1 : 0) + (int.back ? 1 : 0);
		this.movement.multiplyScalar((int.run ? 0.2 : 0.1) * this.speed);
		this.movementEased.lerp(this.movement, 0.1);
		this.movementEasedRotated
			.copy(this.movementEased)
			.applyQuaternion(this.camera.quaternion);
		this.camera.position.add(this.movementEasedRotated);
		this.camera.updateMatrix();
		tempVec3.set(0, 0, -1).applyMatrix4(this.camera.matrix);
		this.camera.lookAt(tempVec3);
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
	}
}
