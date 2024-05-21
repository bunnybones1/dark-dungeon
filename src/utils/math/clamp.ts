export function clamp(low: number, high: number, val: number) {
	return Math.min(high, Math.max(low, val));
}
