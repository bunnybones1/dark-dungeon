import { type AudioListener, PositionalAudio, Vector3 } from "three";
import { SpatialAudioEffects } from "./SpatialAudioEffects";
import { makeAudioElement } from "./makeAudioElement";
import { getSharedSpatialAudioScheduler } from "./sharedSpatialAudioScheduler";

const MAX_DISTANCE = 12;
export class PositionalSoundEffect {
	soundName: string;
	physicalPosition = new Vector3();
	updateSpatialization: () => void;
	private _withinEarshot: boolean;
	public get withinEarshot(): boolean {
		return this._withinEarshot;
	}
	public set withinEarshot(value: boolean) {
		if (this._withinEarshot === value) {
			return;
		}
		this._withinEarshot = value;
		this.updateAudible();
	}
	moveTo(position: Vector3) {
		this.moveToXYZ(position.x, position.y, position.z);
	}
	moveToXYZ(x: number, y: number, z: number) {
		this.physicalPosition.set(x, y, z);
		this.positionalAudio.position.set(x, y, z);
		this.positionalAudio.updateMatrixWorld();
	}
	positionalAudio: PositionalAudio;
	private _mediaElement: HTMLAudioElement | undefined;
	public get mediaElement(): HTMLAudioElement {
		if (!this._mediaElement) {
			const mediaElement = makeAudioElement(this.soundName);
			mediaElement.loop = this.loop;
			this.positionalAudio.setMediaElementSource(mediaElement);
			this._mediaElement = mediaElement;
		}
		return this._mediaElement;
	}
	public set mediaElement(value: HTMLAudioElement) {
		throw new Error("nope");
	}
	updateAudible() {
		const shouldBeAudible = this._withinEarshot && this._shouldPlay;
		if (shouldBeAudible) {
			if (this._mediaElement?.paused) {
				this._mediaElement.play();
			} else {
				this.mediaElement.play();
			}
			this.positionalAudio.updateMatrixWorld();
		} else {
			if (this._mediaElement && !this._mediaElement.paused) {
				this.mediaElement.pause();
				document.body.removeChild(this._mediaElement);
				this._mediaElement = undefined;
			}
		}
	}
	private _shouldPlay: boolean;
	public get shouldPlay(): boolean {
		return this._shouldPlay;
	}
	public set shouldPlay(value: boolean) {
		if (this._shouldPlay === value) {
			return;
		}
		this._shouldPlay = value;
		this.updateAudible();
	}
	constructor(
		name: string,
		listener: AudioListener,
		mapData: bigint[][],
		private loop = false,
	) {
		this.soundName = name;

		const positionalAudio = new PositionalAudio(listener);
		positionalAudio.name = name;
		positionalAudio.setMaxDistance(4);

		let effects = new SpatialAudioEffects(positionalAudio);

		if (import.meta.hot) {
			import.meta.hot.accept("./SpatialAudioEffects", (mod) => {
				effects.cleanup();
				effects = new mod.SpatialAudioEffects(positionalAudio);
				positionalAudio.setFilters(effects.filters);
			});
		}

		positionalAudio.setRefDistance(2);
		this.positionalAudio = positionalAudio;
		const updateSpatialization = () => {
			const dist = Math.max(
				0.05,
				positionalAudio.position.distanceTo(positionalAudio.listener.position),
			);
			this.withinEarshot = dist < MAX_DISTANCE;
		};
		getSharedSpatialAudioScheduler().add(updateSpatialization);
		this.updateSpatialization = updateSpatialization;
	}
	play() {
		this.shouldPlay = true;
	}
	pause() {
		this.shouldPlay = false;
	}
	cleanup() {
		getSharedSpatialAudioScheduler().remove(this.updateSpatialization);
	}
}
