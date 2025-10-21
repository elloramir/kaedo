// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { createWhitePixel } from "./utils.js";
import { orthoMat4 } from "./math.js";
import Texture from "./texture.js";
import Shader from "./shader.js";

function Batcher(gl, maxVertices = 4096, maxIndices = 6144) {
    this.gl = gl;
    this.vbo = this.gl.createBuffer();
    this.ibo = this.gl.createBuffer();

    // 8 floats per vertex: x, y, u, v, r, g, b, a
    this.vertices = new Float32Array(maxVertices * 8);
    this.indices = new Uint16Array(maxIndices);

    this.maxVertices = maxVertices;
    this.maxIndices = maxIndices;
    this.currVert = 0;
    this.currVertCount = 0;
    this.currIndex = 0;

    this.texture = null;
    this.shader = null;
    this.color = [1, 1, 1, 1];
    this.currentTarget = null; // Current render target (null = canvas)

    this.proj = orthoMat4(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);

    this.defaultShader = Shader.default(gl);
    this.setShader(null);

    this.whitePixel = new Texture(this.gl, createWhitePixel());
    this.setTexture(this.whitePixel);
}

Batcher.prototype.frame = function () {
    this.gl.enable(this.gl.BLEND);
    this.gl.disable(this.gl.CULL_FACE);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
};

Batcher.prototype.clear = function (r, g, b, a = 1) {
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
}

Batcher.prototype.flush = function () {
    if (this.currIndex === 0 || !this.texture || !this.shader) {
        return;
    }

    const aPosition = this.shader.getAttrib('a_position');
    const aTexcoords = this.shader.getAttrib('a_texcoords');
    const aColor = this.shader.getAttrib('a_color');

    const stride = 32; // 8 floats * 4 bytes

    if (aPosition !== null && aTexcoords !== null && aColor !== null) {
        this.gl.useProgram(this.shader.id);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices.subarray(0, this.currVert), this.gl.DYNAMIC_DRAW);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.ibo);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices.subarray(0, this.currIndex), this.gl.DYNAMIC_DRAW);

        this.gl.enableVertexAttribArray(aPosition);
        this.gl.enableVertexAttribArray(aTexcoords);
        this.gl.enableVertexAttribArray(aColor);

        this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, stride, 0);
        this.gl.vertexAttribPointer(aTexcoords, 2, this.gl.FLOAT, false, stride, 8);
        this.gl.vertexAttribPointer(aColor, 4, this.gl.FLOAT, false, stride, 16);

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture.id);
        this.gl.drawElements(this.gl.TRIANGLES, this.currIndex, this.gl.UNSIGNED_SHORT, 0);

        this.currVert = 0;
        this.currVertCount = 0;
        this.currIndex = 0;
    } else {
        throw new Error("Shader is missing required attributes (a_position, a_texcoords or a_color)");
    }
};

Batcher.prototype.setColor = function (r, g, b, a = 1) {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
    this.color[3] = a;
};

Batcher.prototype.setTexture = function (texture) {
    if (this.texture !== texture) {
        this.flush();
        this.texture = texture;
    }
};

Batcher.prototype.setShader = function (shader) {
    shader = shader || this.defaultShader;

    if (this.shader !== shader) {
        this.flush();
        this.shader = shader;

        this.gl.useProgram(shader.id);
        this.gl.uniformMatrix4fv(shader.getUniform('u_proj'), false, this.proj);
    }
};

Batcher.prototype.setRenderTarget = function (framebuffer) {
    this.flush();

    if (framebuffer === null) {
        // Render to canvas
        if (this.currentTarget) {
            // Restore canvas viewport
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        }
        this.currentTarget = null;
        // Update projection for canvas dimensions
        this.proj = orthoMat4(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);
    } else {
        // Render to framebuffer
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer.fbo);
        this.gl.viewport(0, 0, framebuffer.width, framebuffer.height);
        this.currentTarget = framebuffer;
        // Update projection for framebuffer dimensions
        this.proj = orthoMat4(0, framebuffer.width, framebuffer.height, 0, -1, 1);
    }

    // Update shader projection matrix
    if (this.shader) {
        this.gl.useProgram(this.shader.id);
        this.gl.uniformMatrix4fv(this.shader.getUniform('u_proj'), false, this.proj);
    }
};

Batcher.prototype.vertex = function (x, y, u, v, r, g, b, a) {
    this.vertices[this.currVert++] = x;
    this.vertices[this.currVert++] = y;
    this.vertices[this.currVert++] = u;
    this.vertices[this.currVert++] = v;
    this.vertices[this.currVert++] = r;
    this.vertices[this.currVert++] = g;
    this.vertices[this.currVert++] = b;
    this.vertices[this.currVert++] = a;
    this.currVertCount++;
};

Batcher.prototype.ensureSpace = function (numVertices, numIndices) {
    if (this.currVertCount + numVertices > this.maxVertices ||
        this.currIndex + numIndices > this.maxIndices) {
        this.flush();
    }
};

Batcher.prototype.drawTex = function (tex, x, y, rot = 0, sx = 1, sy = 1, px = 0, py = 0, u1 = 0, v1 = 0, u2 = 1, v2 = 1) {
    this.setTexture(tex);
    this.ensureSpace(4, 6);

    // Calculate the actual pixel size of the UV region
    const uvWidth = u2 - u1;
    const uvHeight = v2 - v1;
    const w = tex.width * uvWidth * sx;
    const h = tex.height * uvHeight * sy;

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
    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    const a = this.color[3];

    const baseVert = this.currVertCount;

    this.vertex(x + x1 * cos - y1 * sin, y + x1 * sin + y1 * cos, u1, v1, r, g, b, a);
    this.vertex(x + x2 * cos - y2 * sin, y + x2 * sin + y2 * cos, u2, v1, r, g, b, a);
    this.vertex(x + x3 * cos - y3 * sin, y + x3 * sin + y3 * cos, u2, v2, r, g, b, a);
    this.vertex(x + x4 * cos - y4 * sin, y + x4 * sin + y4 * cos, u1, v2, r, g, b, a);

    this.indices[this.currIndex++] = baseVert;
    this.indices[this.currIndex++] = baseVert + 1;
    this.indices[this.currIndex++] = baseVert + 2;
    this.indices[this.currIndex++] = baseVert;
    this.indices[this.currIndex++] = baseVert + 2;
    this.indices[this.currIndex++] = baseVert + 3;
};

Batcher.prototype.drawFillRect = function (x, y, w, h, rot = 0) {
    this.setTexture(this.whitePixel);
    this.ensureSpace(4, 6);

    const x1 = 0;
    const y1 = 0;
    const x2 = w;
    const y2 = 0;
    const x3 = w;
    const y3 = h;
    const x4 = 0;
    const y4 = h;

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    const a = this.color[3];

    const baseVert = this.currVertCount;

    this.vertex(x + x1 * cos - y1 * sin, y + x1 * sin + y1 * cos, 0.5, 0.5, r, g, b, a);
    this.vertex(x + x2 * cos - y2 * sin, y + x2 * sin + y2 * cos, 0.5, 0.5, r, g, b, a);
    this.vertex(x + x3 * cos - y3 * sin, y + x3 * sin + y3 * cos, 0.5, 0.5, r, g, b, a);
    this.vertex(x + x4 * cos - y4 * sin, y + x4 * sin + y4 * cos, 0.5, 0.5, r, g, b, a);

    this.indices[this.currIndex++] = baseVert;
    this.indices[this.currIndex++] = baseVert + 1;
    this.indices[this.currIndex++] = baseVert + 2;
    this.indices[this.currIndex++] = baseVert;
    this.indices[this.currIndex++] = baseVert + 2;
    this.indices[this.currIndex++] = baseVert + 3;
};

Batcher.prototype.drawCircle = function (x, y, radius, segments = 32) {
    this.setTexture(this.whitePixel);

    const numVertices = segments + 1;
    const numIndices = segments * 3;

    this.ensureSpace(numVertices, numIndices);

    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    const a = this.color[3];
    const baseVert = this.currVertCount;

    this.vertex(x, y, 0.5, 0.5, r, g, b, a);

    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        this.vertex(px, py, 0.5, 0.5, r, g, b, a);
    }

    for (let i = 0; i < segments; i++) {
        this.indices[this.currIndex++] = baseVert;
        this.indices[this.currIndex++] = baseVert + 1 + i;
        this.indices[this.currIndex++] = baseVert + 1 + ((i + 1) % segments);
    }
};

Batcher.prototype.drawLines = function (points, thickness = 1, closed = false) {
    if (points.length < 4) {
        throw new Error("At least two points (4 values) are required to draw lines.");
    }

    this.setTexture(this.whitePixel);

    const numPoints = points.length / 2;
    const numSegments = closed ? numPoints : numPoints - 1;
    const numVertices = numPoints * 2;
    const numIndices = numSegments * 6;

    this.ensureSpace(numVertices, numIndices);

    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    const a = this.color[3];
    const halfThickness = thickness * 0.5;
    const baseVert = this.currVertCount;

    for (let i = 0; i < numPoints; i++) {
        const x1 = points[i * 2];
        const y1 = points[i * 2 + 1];

        let nx, ny;
        if (i < numPoints - 1 || closed) {
            const nextIdx = (i + 1) % numPoints;
            const x2 = points[nextIdx * 2];
            const y2 = points[nextIdx * 2 + 1];
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0.001) {
                nx = -dy / len;
                ny = dx / len;
            } else {
                nx = 0;
                ny = 1;
            }
        } else {
            const x0 = points[(i - 1) * 2];
            const y0 = points[(i - 1) * 2 + 1];
            const dx = x1 - x0;
            const dy = y1 - y0;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 0.001) {
                nx = -dy / len;
                ny = dx / len;
            } else {
                nx = 0;
                ny = 1;
            }
        }

        this.vertex(x1 + nx * halfThickness, y1 + ny * halfThickness, 0.5, 0.5, r, g, b, a);
        this.vertex(x1 - nx * halfThickness, y1 - ny * halfThickness, 0.5, 0.5, r, g, b, a);
    }

    for (let i = 0; i < numSegments; i++) {
        const curr = baseVert + i * 2;
        const next = baseVert + ((i + 1) % numPoints) * 2;

        this.indices[this.currIndex++] = curr;
        this.indices[this.currIndex++] = curr + 1;
        this.indices[this.currIndex++] = next;
        this.indices[this.currIndex++] = curr + 1;
        this.indices[this.currIndex++] = next + 1;
        this.indices[this.currIndex++] = next;
    }
};

Batcher.prototype.drawPolygon = function (points) {
    if (points.length < 6) {
        throw new Error("A polygon requires at least 3 points (6 values).");
    }

    this.setTexture(this.whitePixel);

    const numPoints = points.length / 2;
    const numVertices = numPoints;
    const numIndices = (numPoints - 2) * 3;

    this.ensureSpace(numVertices, numIndices);

    const r = this.color[0];
    const g = this.color[1];
    const b = this.color[2];
    const a = this.color[3];
    const baseVert = this.currVertCount;

    for (let i = 0; i < numPoints; i++) {
        this.vertex(points[i * 2], points[i * 2 + 1], 0.5, 0.5, r, g, b, a);
    }

    for (let i = 1; i < numPoints - 1; i++) {
        this.indices[this.currIndex++] = baseVert;
        this.indices[this.currIndex++] = baseVert + i;
        this.indices[this.currIndex++] = baseVert + i + 1;
    }
};

Batcher.prototype.drawStr = function (font, text, x, y) {
    let cursorX = x;
    let cursorY = y;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\n') {
            cursorX = x;
            cursorY += font.fontSize;
            continue;
        }

        const charData = font.getChar(char);
        if (!charData) {
            continue;
        }

        const texWidth = font.texture.width;
        const texHeight = font.texture.height;

        // Calculate UV coordinates
        const u1 = charData.x / texWidth;
        const v1 = charData.y / texHeight;
        const u2 = (charData.x + charData.width) / texWidth;
        const v2 = (charData.y + charData.height) / texHeight;

        // Use drawTex with custom UVs
        this.drawTex(
            font.texture,
            cursorX,
            cursorY,
            0,      // rot
            1,      // sx
            1,      // sy
            0,      // px
            0,      // py
            u1,     // u1
            v1,     // v1
            u2,     // u2
            v2      // v2
        );

        cursorX += charData.width;
    }
};

export default Batcher;
