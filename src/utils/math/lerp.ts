export function lerp(min: number, max: number, value: number) {
	return min + value * (max - min);
}
