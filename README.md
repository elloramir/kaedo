### Kaedo
A framework that helps you create games without making choices for you.
The philosophy behind Kaedo is to provide a toolchain that makes the boring stuff easier, while still letting you do things your own way.
Unlike most JavaScript gaming and rendering frameworks, Kaedo is designed to be as immediate-mode as possible, giving you greater control and flexibility to make your own decisions.

You can create batchers to handle multiple draw calls efficiently, as shown in the example below.
This short example covers the essential steps needed to create a 2D scene.

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