export function inferDirection(val: number, tolerance = 0.00001) {
	if (val < -tolerance) {
		return -1;
	}
	if (val > tolerance) {
		return 1;
	}
	return 0;
}
