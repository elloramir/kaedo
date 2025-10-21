import Kaedo from "./index.js";

const canvas = document.getElementById("screen");
const gl = canvas.getContext("webgl");
const batcher = new Kaedo.Batcher(gl);
const cat = await Kaedo.Texture.loadFromFile(gl, "assets/cat.jpg", "nearest");
const font = await Kaedo.Font.load(gl, "monospace", 24, "nearest");

batcher.frame();
batcher.setShader(null);
batcher.clear(0.2, 0.3, 0.3, 1);
batcher.setColor(1, 1, 1, 1);
batcher.drawTex(cat, 0, 0);
batcher.drawCircle(200, 200, 50);
batcher.setColor(1, 0, 0, 1);
batcher.drawPolygon([300, 300, 350, 320, 370, 360, 320, 400, 280, 350]);
batcher.setColor(0, 0, 1, 1);
batcher.drawFillRect(400, 100, 100, 150, Math.PI / 6);
batcher.setColor(1, 1, 1, 1);
batcher.drawStr(font, "Hello, Kaedo!", 10, 10);
batcher.flush();
