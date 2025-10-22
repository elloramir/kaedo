import Kaedo from "./index.js";

const canvas = document.getElementById("screen");
const gl = canvas.getContext("webgl");
const batcher = new Kaedo.Batcher(gl);
const cat = await Kaedo.Texture.loadFromFile(gl, "assets/cat.jpg");
const font = await Kaedo.Font.load(gl, "monospace", 24);
const framebuffer = new Kaedo.Framebuffer(gl, 512, 512);

batcher.beginFrame();
{
    batcher.setShader(null);
    batcher.setRenderTarget(framebuffer);
    batcher.clear(0.1, 0.1, 0.2, 1);
    batcher.setColor(0, 0, 0, 1);
    batcher.drawCircle(256, 256, 100);
    batcher.setColor(1, 1, 1, 1);
    batcher.drawStr(font, "Offscreen!", 180, 240);

    batcher.setRenderTarget(null);
    batcher.clear(0.2, 0.3, 0.3, 1);
    batcher.setColor(1, 1, 1, 1);
    batcher.drawTex(framebuffer, 0, 50);
    batcher.drawTex(cat, 0, 0);
    batcher.drawCircle(200, 200, 50);
    batcher.setColor(1, 0, 0, 1);
    batcher.drawPolygon([300, 300, 350, 320, 370, 360, 320, 400, 280, 350]);
    batcher.setColor(0, 0, 1, 1);
    batcher.drawFillRect(400, 100, 100, 150, Math.PI / 6);
    batcher.setColor(1, 1, 1, 1);
    batcher.drawStr(font, "Hello, Kaedo!", 10, 10);

    batcher.pushTransform();
    batcher.pushTranslate(100, 200);
    batcher.pushRotate(Math.PI / 4);
    batcher.pushScale(1.2);
    batcher.setColor(0, 1, 0, 1);
    batcher.drawFillRect(0, 0, 50, 50);
    batcher.popTransform();
}
batcher.endFrame();
