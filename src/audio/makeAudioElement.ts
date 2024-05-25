export function makeAudioElement(name: string) {
	const sfxElement = document.createElement("audio");
	sfxElement.setAttribute("preload", "auto");
	sfxElement.style.display = "none";
	document.body.appendChild(sfxElement);
	const codecDatas = [
		["mp3", "mpeg"],
		["ogg", "ogg"],
	];
	for (const codecData of codecDatas) {
		const src = document.createElement("source");
		src.setAttribute("src", `assets/sounds/${name}.${codecData[0]}`);
		src.setAttribute("type", `audio/${codecData[1]}`);
		sfxElement.appendChild(src);
	}
	return sfxElement;
}
