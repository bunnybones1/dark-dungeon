export function wrap(val: number, min: number, max: number) {
	const range = max - min;
	return ((((val - min) % range) + range) % range) + min;
}
