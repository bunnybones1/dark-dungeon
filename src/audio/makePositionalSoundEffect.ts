import {
	type AudioListener,
	type PerspectiveCamera,
	PositionalAudio,
} from "three";
import { makeAudioElement } from "./makeAudioElement";

export function makePositionalSoundEffect(
	name: string,
	listener: AudioListener,
	camera: PerspectiveCamera,
) {
	const sfxElement = makeAudioElement(name);

	const soundDoorSlam = new PositionalAudio(listener);

	soundDoorSlam.setMaxDistance(4);
	const bqf = new BiquadFilterNode(listener.context, {
		Q: 0.5,
	});
	soundDoorSlam.setFilters([bqf]);

	// const convolver = listener.context.createConvolver();

	setInterval(() => {
		bqf.frequency.value =
			6000 / soundDoorSlam.position.distanceTo(camera.position) ** 2;
	}, 100);
	soundDoorSlam.position.set(27, 1, 10);
	soundDoorSlam.setMediaElementSource(sfxElement);
	soundDoorSlam.setRefDistance(20);
	return soundDoorSlam;
}
