// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { createWhitePixel } from "./utils.js";
import { orthoMat4 } from "./math.js";
import Texture from "./texture.js";
import Shader from "./shader.js";

/**
 * @class
 * @description A WebGL batch renderer for drawing 2D quads efficiently.
 */
export default
class Batcher {
    /**
     * Creates an instance of Batcher.
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {number} [maxQuads=1024] The maximum number of quads the batcher can hold before a flush is required.
     */
    constructor(gl, maxQuads = 1024) {
        this.gl = gl;
        this.vbo = this.gl.createBuffer();
        this.ibo = this.gl.createBuffer();

        // 4 vertices per quad, 7 floats per vertex (x, y, u, v, r, g, b, a) -> should be 8 floats per vertex!
        // The original code has 7 floats per vertex in the constructor, but 8 floats when filling in `vertex`.
        // I will assume 8 floats per vertex as per the `vertex` method's implementation:
        // x, y, u, v, r, g, b, a (8 components)
        // Stride in `flush` is 32 (8 components * 4 bytes/float), which confirms 8 components.
        this.vertices = new Float32Array(maxQuads * 4 * 8); // Corrected size: 4 vertices * 8 floats
        this.maxQuads = maxQuads;
        this.currVert = 0;
        this.currQuad = 0;

        this.whitePixel = new Texture(this.gl, createWhitePixel());
        /** @type {Texture} */
        this.texture = null;
        /** @type {Shader} */
        this.shader = null;
        /** @type {number[]} */
        this.color = [1, 1, 1, 1];

        // @todo: Should I do it every frame?
        this.proj = orthoMat4(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);

        // Quads are super predictable, so we can just
        // pre-allocate the indices buffer before have the vertices.
        const indices = new Uint16Array(maxQuads * 6);
        for (let i = 0, j = 0; i < indices.length; i += 6, j += 4) {
            indices[i + 0] = j + 0;
            indices[i + 1] = j + 1;
            indices[i + 2] = j + 2;
            indices[i + 3] = j + 0;
            indices[i + 4] = j + 2;
            indices[i + 5] = j + 3;
        }
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
    }

    /**
     * Prepares the WebGL context for a new frame.
     */
    frame() {
        this.gl.enable(this.gl.BLEND);
        this.gl.disable(this.gl.CULL_FACE);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        this.gl.clearColor(0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    /**
     * Draws all batched quads and resets the batch counter.
     */
    flush() {
        if (this.currQuad === 0 || !this.texture || !this.shader) {
            return;
        }

        const aPosition = this.shader.getAttrib('a_position');
        const aTexcoords = this.shader.getAttrib('a_texcoords');
        const aColor = this.shader.getAttrib('a_color');

        // Stride is 8 components * 4 bytes/float = 32 bytes
        const stride = 32;

        if (aPosition !== null && aTexcoords !== null && aColor !== null) {
            this.gl.useProgram(this.shader.id);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
            // Use subData or a smaller buffer slice for performance, but keeping original logic with bufferData
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices.subarray(0, this.currVert), this.gl.DYNAMIC_DRAW);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo);

            this.gl.enableVertexAttribArray(aPosition);
            this.gl.enableVertexAttribArray(aTexcoords);
            this.gl.enableVertexAttribArray(aColor);

            // a_position: offset 0 (x, y)
            this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, stride, 0);
            // a_texcoords: offset 8 (u, v)
            this.gl.vertexAttribPointer(aTexcoords, 2, this.gl.FLOAT, false, stride, 8);
            // a_color: offset 16 (r, g, b, a)
            this.gl.vertexAttribPointer(aColor, 4, this.gl.FLOAT, false, stride, 16);

            this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture.id);
            this.gl.drawElements(this.gl.TRIANGLES, this.currQuad * 6, this.gl.UNSIGNED_SHORT, 0);

            this.currVert = 0;
            this.currQuad = 0;
        }
        else {
            console.error("Your shader is missing some attributes: a_position, a_texcoords, or a_color.");
        }
    }

    /**
     * Sets the current tint color for subsequent drawing operations.
     * @param {number} r Red component (0.0 to 1.0).
     * @param {number} g Green component (0.0 to 1.0).
     * @param {number} b Blue component (0.0 to 1.0).
     * @param {number} a Alpha component (0.0 to 1.0).
     */
    setColor(r, g, b, a) {
        this.color[0] = r;
        this.color[1] = g;
        this.color[2] = b;
        this.color[3] = a;
    }

    /**
     * Sets the current texture. Flushes the batch if the texture changes.
     * @param {Texture} texture The new texture to use.
     */
    setTexture(texture) {
        if (this.texture !== texture) {
            this.flush();
            this.texture = texture;
        }
    }

    /**
     * Sets the current shader program. Flushes the batch if the shader changes and uploads the projection matrix.
     * @param {Shader} shader The new shader to use.
     */
    setShader(shader) {
        if (this.shader !== shader) {
            this.flush();
            this.shader = shader;

            this.gl.useProgram(shader.id);
            this.gl.uniformMatrix4fv(shader.getUniform('u_proj'), false, this.proj);
        }
    }

    /**
     * Adds a vertex to the current batch buffer.
     * @private
     * @param {number} x The x-coordinate.
     * @param {number} y The y-coordinate.
     * @param {number} u The u texture coordinate.
     * @param {number} v The v texture coordinate.
     * @param {number} r The red color component.
     * @param {number} g The green color component.
     * @param {number} b The blue color component.
     * @param {number} a The alpha color component.
     */
    vertex(x, y, u, v, r, g, b, a) {
        this.vertices[this.currVert++] = x;
        this.vertices[this.currVert++] = y;
        this.vertices[this.currVert++] = u;
        this.vertices[this.currVert++] = v;
        this.vertices[this.currVert++] = r;
        this.vertices[this.currVert++] = g;
        this.vertices[this.currVert++] = b;
        this.vertices[this.currVert++] = a;
    }

    /**
     * Pushes a quad defined by its transformed coordinates into the batch buffer.
     * Flushes the batch if the capacity is reached.
     * @private
     * @param {number} x The world x-position of the quad's origin.
     * @param {number} y The world y-position of the quad's origin.
     * @param {number} w The width of the quad.
     * @param {number} h The height of the quad.
     * @param {number} [rot=0] The rotation angle in radians.
     * @param {number} [sx=1] The scale factor on the x-axis.
     * @param {number} [sy=1] The scale factor on the y-axis.
     * @param {number} [px=0.5] The pivot point x-coordinate (0.0 to 1.0).
     * @param {number} [py=0.5] The pivot point y-coordinate (0.0 to 1.0).
     * @param {number} [u1=0] The left u texture coordinate.
     * @param {number} [v1=0] The top v texture coordinate.
     * @param {number} [u2=1] The right u texture coordinate.
     * @param {number} [v2=1] The bottom v texture coordinate.
     */
    // @note: We are doing the matrix transformation manually here because
    // it is too much expensive to have matrices multiplication on web devices.
    pushQuad(x, y, w, h, rot = 0, sx = 1, sy = 1, px = 0.5, py = 0.5, u1 = 0, v1 = 0, u2 = 1, v2 = 1) {
        if (this.currQuad >= this.maxQuads) {
            this.flush();
        }

        w = w * sx;
        h = h * sy;

        // Vertices relative to the pivot (unrotated)
        const x1 = -px * w;
        const y1 = -py * h;
        const x2 = x1 + w;
        const y2 = y1;
        const x3 = x1 + w;
        const y3 = y1 + h;
        const x4 = x1;
        const y4 = y1 + h;

        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const [r, g, b, a] = this.color;

        // Rotation and translation: x' = x*cos - y*sin + tx, y' = x*sin + y*cos + ty
        // Top-left
        this.vertex(x + x1 * cos - y1 * sin, y + x1 * sin + y1 * cos, u1, v1, r, g, b, a);
        // Top-right
        this.vertex(x + x2 * cos - y2 * sin, y + x2 * sin + y2 * cos, u2, v1, r, g, b, a);
        // Bottom-right
        this.vertex(x + x3 * cos - y3 * sin, y + x3 * sin + y3 * cos, u2, v2, r, g, b, a);
        // Bottom-left
        this.vertex(x + x4 * cos - y4 * sin, y + x4 * sin + y4 * cos, u1, v2, r, g, b, a);

        this.currQuad++;
    }

    /**
     * Draws a texture with optional transformations.
     * @param {Texture} tex The texture to draw.
     * @param {number} x The world x-position.
     * @param {number} y The world y-position.
     * @param {number} [rot=0] The rotation angle in radians.
     * @param {number} [sx=1] The scale factor on the x-axis.
     * @param {number} [sy=1] The scale factor on the y-axis.
     * @param {number} [px=0.5] The pivot point x-coordinate (0.0 to 1.0).
     * @param {number} [py=0.5] The pivot point y-coordinate (0.0 to 1.0).
     * @param {number} [u1=0] The left u texture coordinate.
     * @param {number} [v1=0] The top v texture coordinate.
     * @param {number} [u2=1] The right u texture coordinate.
     * @param {number} [v2=1] The bottom v texture coordinate.
     */
    drawTex(tex, x, y, rot = 0, sx = 1, sy = 1, px = 0.5, py = 0.5, u1 = 0, v1 = 0, u2 = 1, v2 = 1) {
        this.setTexture(tex);
        this.pushQuad(x, y, tex.width, tex.height, rot, sx, sy, px, py, u1, v1, u2, v2);
    }

    /**
     * Draws a solid colored rectangle using the current color.
     * @param {number} x The world x-position.
     * @param {number} y The world y-position.
     * @param {number} w The width of the rectangle.
     * @param {number} h The height of the rectangle.
     * @param {number} [rot=0] The rotation angle in radians.
     */
    fillRect(x, y, w, h, rot = 0) {
        this.setTexture(this.whitePixel);
        this.pushQuad(x, y, w, h, rot);
    }
}