const intentionMap = {
	KeyA: "strafeLeft",
	KeyD: "strafeRight",
	KeyW: "forward",
	KeyS: "back",
	KeyE: "up",
	KeyQ: "down",
	ShiftLeft: "run",
} as const;
type IntentionKeys = keyof typeof intentionMap;
const intentionKeys = Object.keys(intentionMap) as IntentionKeys[];
function isIntentionKey(key: string): key is IntentionKeys {
	return intentionKeys.includes(key as any);
}
export default class KeyboardNavigation3D {
	intention = {
		forward: false,
		back: false,
		strafeLeft: false,
		strafeRight: false,
		up: false,
		down: false,
		run: false,
	};
	private changeIntention(keyCode: string, status: boolean) {
		if (isIntentionKey(keyCode)) {
			this.intention[intentionMap[keyCode]] = status;
		}
	}
	private onKeyDown = (event: KeyboardEvent) => {
		this.changeIntention(event.code, true);
	};
	private onKeyUp = (event: KeyboardEvent) => {
		this.changeIntention(event.code, false);
	};
	constructor() {
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
	}
}
