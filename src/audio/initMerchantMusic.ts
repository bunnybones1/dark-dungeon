import { ChiptuneJsPlayer } from "https://DrSnuggles.github.io/chiptune/chiptune3.js";
import {
	type AudioListener,
	type Object3D,
	type PerspectiveCamera,
	PositionalAudio,
} from "three";
import { SpatialAudioEffects } from "./SpatialAudioEffects";

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
	const context = listener.context;
	const chiptune = new ChiptuneJsPlayer({ context });
	chiptune.onInitialized(() => {
		chiptune.load("assets/music/test.mod");
		const positionalAudio = new PositionalAudio(listener);
		positionalAudio.setMaxDistance(4);
		let effects = new SpatialAudioEffects(positionalAudio);

		if (import.meta.hot) {
			import.meta.hot.accept("./SpatialAudioEffects", (mod) => {
				effects.cleanup();
				effects = new mod.SpatialAudioEffects(positionalAudio);
				positionalAudio.setFilters(effects.filters);
			});
		}
		positionalAudio.setFilters(effects.filters);

		// const convolver = listener.context.createConvolver();

		pivot.add(positionalAudio);
		positionalAudio.position.set(22, 1, 8);
		positionalAudio.setNodeSource(chiptune.processNode);
	});
}
