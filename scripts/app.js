// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { createCanvas } from "./utils.js";
import Shader from "./shader.js";
import Batcher from "./batcher.js";

/**
 * @class
 * @description Represents the core application structure, managing the WebGL context,
 * resource loading, and the main game loop.
 */
export default
class App {
    /**
     * Creates an instance of App, initializing the canvas and WebGL context.
     * @param {number} [width=640] The width of the canvas.
     * @param {number} [height=480] The height of the canvas.
     */
    constructor(width = 640, height = 480) {
        this.canvas = createCanvas(width, height);
        /** @type {WebGLRenderingContext} */
        this.gl = this.canvas.getContext("webgl");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        /** @type {Batcher} */
        this.batcher = new Batcher(this.gl);
        /** @type {Map<string, (Promise<any>|any)>} A map to store preloaded media assets. */
        this.medias = new Map();
        this.pastTime = 0;
        this.deltaTime = 0;
        /** @type {Shader} */
        this.shaderQuad = Shader.default(this.gl);
    }

    /**
     * Loads all assets registered in `this.medias` and initializes the default shader.
     * Starts the main game loop upon completion.
     * @async
     */
    async preload() {
        // Resolve all asset promises
        for (const [key, content] of this.medias) {
            this.medias.set(key, await content);
        }

        this.mainLoop(0);
    }

    /**
     * The main application loop. Calculates delta time, performs updates, and triggers rendering.
     * This function is intended to be called by `requestAnimationFrame`.
     * @private
     * @param {number} time The high-resolution timestamp provided by the browser.
     */
    mainLoop(time) {
        this.deltaTime = (time - this.pastTime) / 1000;
        this.pastTime = time;

        // Update game goes here

        this.batcher.frame();
        this.batcher.setShader(this.shaderQuad);

        // Render game goes here

        this.batcher.flush();

        requestAnimationFrame(this.mainLoop.bind(this));
    }
}