import { type AudioListener, PositionalAudio } from "three";
import { SpatialAudioEffects } from "./SpatialAudioEffects";
import { makeAudioElement } from "./makeAudioElement";

export function makePositionalSoundEffect(
	name: string,
	listener: AudioListener,
	loop = false,
) {
	const sfxElement = makeAudioElement(name);

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

	positionalAudio.setMediaElementSource(sfxElement);
	positionalAudio.setRefDistance(20);
	positionalAudio.loop = loop;
	return positionalAudio;
}
