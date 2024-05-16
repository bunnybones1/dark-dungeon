export function unlerp(min: number, max: number, value: number) {
	return (value - min) / (max - min);
}
