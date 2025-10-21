### Kaedo
Kaedo is a framework designed to help you create games without getting in your way.
Its philosophy is to make development simpler, while still giving you the freedom to build things your own way.

Unlike most JavaScript game and rendering frameworks, Kaedo takes an immediate-mode approach, giving you direct control and flexibility over how everything works.

For example, you can create batchers to efficiently handle multiple draw calls.
The short example below walks you through the basic steps for setting up a simple 2D scene.

```js
const canvas = document.getElementById("screen");
const gl = canvas.getContext("webgl");
const batcher = new Kaedo.Batcher(gl);
const cat = await Kaedo.Texture.loadFromFile(gl, "assets/cat.jpg", "nearest");
const font = await Kaedo.Font.load(gl, "monospace", 24, "nearest");
const framebuffer = new Kaedo.Framebuffer(gl, 512, 512, "nearest");

batcher.frame();
batcher.setShader(null);
batcher.setRenderTarget(framebuffer);
batcher.clear(0.1, 0.1, 0.2, 1);
batcher.setColor(1, 1, 0, 1);
batcher.drawCircle(256, 256, 100);
batcher.setColor(1, 1, 1, 1);
batcher.drawStr(font, "Offscreen!", 180, 240);
batcher.flush();

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
batcher.flush();
```

The result of the above operation will look like this.
The framebuffer texture is flipped because the Y axis is actually -1 in OpenGL screen space.
You can solve this by multiplying the UV coordinates in the draw texture pass by -1.

<p align="center">
  <img src="https://i.imgur.com/9GXQBUG.png" width="600" />
</p>
