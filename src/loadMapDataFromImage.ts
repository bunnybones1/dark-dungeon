export function loadMapDataFromImage(imagePath: string) {
	return new Promise<bigint[][]>((resolve) => {
		const mini_map: bigint[][] = [];
		// 2b) Load an image from which to get data
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement("canvas");
			const w = img.width;
			const h = img.height;
			canvas.width = w;
			canvas.height = h;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				throw new Error("Canvas could not get 2d context");
			}
			ctx.drawImage(img, 0, 0);
			const data = ctx.getImageData(0, 0, w, h);
			const arr = data.data;
			for (let iy = 0; iy < h; iy++) {
				const row: bigint[] = [];
				for (let ix = 0; ix < w; ix++) {
					const i = (iy * w + ix) * 4;
					const r = BigInt(arr[i]);
					const g = BigInt(arr[i + 1]);
					const b = BigInt(arr[i + 2]);
					row[ix] = (r << 16n) | (g << 8n) | b;
				}
				mini_map.push(row);
			}
			resolve(mini_map);
		};
		img.src = imagePath; // set this *after* onload
	});
}
