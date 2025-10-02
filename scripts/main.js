import Kaedo from "./index.js"

const game = new Kaedo.App(640, 480);

game.preload().then(() => {
	document.body.append(game.canvas);
});