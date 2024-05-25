import { ChiptuneJsPlayer } from "https://DrSnuggles.github.io/chiptune/chiptune3.js";
import {
	type AudioListener,
	type Object3D,
	type PerspectiveCamera,
	PositionalAudio,
} from "three";

let initd = false;
export function initMerchantMusic(
	pivot: Object3D,
	camera: PerspectiveCamera,
	listener: AudioListener,
) {
	if (initd) {
		return;
	}
	initd = true;
	const chiptune = new ChiptuneJsPlayer({ context: listener.context });
	chiptune.onInitialized(() => {
		chiptune.load("assets/music/test.mod");
		const a = new PositionalAudio(listener);
		a.setMaxDistance(4);
		const bqf = new BiquadFilterNode(listener.context, {
			Q: 0.5,
		});
		a.setFilters([bqf]);

		// const convolver = listener.context.createConvolver();

		setInterval(() => {
			bqf.frequency.value = 6000 / a.position.distanceTo(camera.position) ** 2;
		}, 100);
		pivot.add(a);
		a.position.set(22, 1, 8);
		a.setNodeSource(chiptune.processNode);
	});
}
