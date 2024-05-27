import type { PositionalAudio } from "three";
import { clamp01 } from "../utils/math/clamp01";

export class SpatialAudioEffects {
	filters: AudioNode[];
	intervalID: number;
	constructor(private positionalAudio: PositionalAudio) {
		const context = positionalAudio.listener.context;
		const bqf = new BiquadFilterNode(context, {
			Q: 0.5,
		});
		const distanceGain = new GainNode(context, { gain: 0 });

		const delay = new DelayNode(context, { delayTime: 0.0345 * 2 });
		const delay2 = new DelayNode(context, { delayTime: 0.0345 * 2.7 });
		const loopbackGain = new GainNode(context, {
			gain: 0.8,
		});
		const loopbackGain2 = new GainNode(context, {
			gain: 0.8,
		});
		delay.connect(loopbackGain);
		loopbackGain.connect(delay);
		delay2.connect(loopbackGain2);
		loopbackGain2.connect(delay2);

		const filters = [distanceGain, delay, delay2];
		// const filtersBQF = [bqf];
		const filterOff = [];
		this.intervalID = setInterval(() => {
			const dist = Math.max(
				0.05,
				positionalAudio.position.distanceTo(positionalAudio.listener.position),
			);
			distanceGain.gain.value = clamp01(1 - dist / 16) ** 3;
			loopbackGain.gain.value = Math.min(0.8, dist * 0.1) * 0.5;
			loopbackGain2.gain.value = Math.min(0.8, dist * 0.1) * 0.5;
			// bqf.frequency.value = 6000 / dist ** 2;
			// this.changeFilters(
			// 	performance.now() % 2000 > 1000 ? filterOff : filtersBQF,
			// );
		}, 100);
		this.changeFilters(filters);
	}
	private changeFilters(filters: AudioNode[]) {
		if (this.filters === filters) {
			return;
		}
		this.filters = filters;
		this.positionalAudio.setFilters(this.filters);
	}
	cleanup() {
		clearInterval(this.intervalID);
	}
}
