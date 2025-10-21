// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { isPowerOf2 } from "./utils.js";

function Texture(gl, img, filter = "linear") {
    this.gl = gl;
    this.id = gl.createTexture();
    this.width = img.width;
    this.height = img.height;

    // Convert string filter to WebGL constant
    const glFilter = filter === "linear" ? gl.LINEAR : gl.NEAREST;
    const isBase2 = isPowerOf2(img.width) && isPowerOf2(img.height);
    const wrapMode = isBase2 ? gl.REPEAT : gl.CLAMP_TO_EDGE;

    gl.bindTexture(gl.TEXTURE_2D, this.id);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

    if (isBase2) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
}

Texture.loadFromFile = function (gl, file, filter) {
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
};

export default Texture;
