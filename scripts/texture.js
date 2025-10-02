// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { isPowerOf2 } from "./utils.js";

/**
 * @class
 * @description Manages a WebGL texture object, handling image loading, filtering, and wrap modes.
 */
export default
class Texture {
    /**
     * Creates an instance of Texture from an image source.
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {TexImageSource} img The source image data (e.g., HTMLImageElement, ImageData).
     * @param {number} [filter=gl.NEAREST] The texture filtering mode (e.g., gl.NEAREST, gl.LINEAR).
     */
    constructor(gl, img, filter = gl.NEAREST) {
        this.gl = gl;
        this.id = gl.createTexture();
        this.width = img.width;
        this.height = img.height;

        // Note: The original logic checks if (width * height) is a power of 2.
        // WebGL 1 technically only requires texture dimensions (width and height) to be power of 2 for REPEAT and mipmaps.
        // Assuming 'isPowerOf2' checks both dimensions or the intent is for stricter compliance.
        const isBase2 = isPowerOf2(img.width) && isPowerOf2(img.height);
        const wrapMode = isBase2 ? gl.REPEAT : gl.CLAMP_TO_EDGE;

        gl.bindTexture(gl.TEXTURE_2D, this.id);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);

        // Upload the image data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        if (isBase2) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }

        // Unbind texture
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    /**
     * Loads an image from a file path and creates a Texture object.
     * @static
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {string} file The URL or path to the image file.
     * @param {number} [filter] Optional texture filtering mode. Defaults to gl.NEAREST if omitted.
     * @returns {Promise<Texture>} A promise that resolves with the created Texture object.
     */
    static loadFromFile(gl, file, filter) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(new Texture(gl, img, filter));
            };
            img.onerror = (e) => {
                reject(new Error(`Failed to load texture file: ${file}`, e));
            };
            img.src = file;
        });
    }
}