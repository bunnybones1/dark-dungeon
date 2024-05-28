class SharedSpatialAudioScheduler {
	callbacks: (() => void)[] = [];
	intervalID: number;
	constructor() {
		this.intervalID = setInterval(() => {
			for (const callback of this.callbacks) {
				callback();
			}
		}, 100);
	}
	add(callback: () => void) {
		this.callbacks.push(callback);
	}
	remove(callback: () => void) {
		const i = this.callbacks.indexOf(callback);
		if (i === -1) {
			console.warn("could not remove callback, because could not find it");
		} else {
			this.callbacks.splice(i, 1);
		}
	}
}

let sharedSpatialAudioScheduler: SharedSpatialAudioScheduler | undefined;
export function getSharedSpatialAudioScheduler() {
	if (!sharedSpatialAudioScheduler) {
		sharedSpatialAudioScheduler = new SharedSpatialAudioScheduler();
	}
	return sharedSpatialAudioScheduler;
}
