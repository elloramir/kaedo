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
const cat = await Kaedo.Texture.loadFromFile(gl, "assets/cat.jpg");

batcher.frame();
batcher.setShader(null);
batcher.setColor(1, 1, 1, 1);
batcher.drawTex(cat, 0, 0);
batcher.drawCircle(200, 200, 50);
batcher.setColor(1, 0, 0, 1);
batcher.drawPolygon([300, 300, 350, 320, 370, 360, 320, 400, 280, 350]);
batcher.setColor(0, 0, 1, 1);
batcher.drawFillRect(400, 100, 100, 150, Math.PI / 6);
batcher.flush();
```
