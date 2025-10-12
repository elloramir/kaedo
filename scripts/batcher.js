// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import { createWhitePixel } from "./utils.js";
import { orthoMat4 } from "./math.js";
import Texture from "./texture.js";
import Shader from "./shader.js";

/**
 * @class
 * @description A WebGL batch renderer for drawing 2D primitives efficiently.
 */
export default
class Batcher {
    /**
     * Creates an instance of Batcher.
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {number} [maxVertices=4096] The maximum number of vertices the batcher can hold.
     * @param {number} [maxIndices=6144] The maximum number of indices the batcher can hold.
     */
    constructor(gl, maxVertices = 4096, maxIndices = 6144) {
        this.gl = gl;
        this.vbo = this.gl.createBuffer();
        this.ibo = this.gl.createBuffer();

        // 8 floats per vertex: x, y, u, v, r, g, b, a
        this.vertices = new Float32Array(maxVertices * 8);
        this.indices = new Uint16Array(maxIndices);
        
        this.maxVertices = maxVertices;
        this.maxIndices = maxIndices;
        this.currVert = 0;
        this.currVertCount = 0; // Number of vertices added (not float count)
        this.currIndex = 0;

        /** @type {Texture} */
        this.texture = null;
        /** @type {Shader} */
        this.shader = null;
        /** @type {number[]} */
        this.color = [1, 1, 1, 1];

        this.proj = orthoMat4(0, this.gl.canvas.width, this.gl.canvas.height, 0, -1, 1);

        // Use a default shader
        this.defaultShader = Shader.default(gl);
        this.setShader(null);

        // Create a white pixel texture for colored shapes
        this.whitePixel = new Texture(this.gl, createWhitePixel());
        this.setTexture(this.whitePixel);
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
     * Draws all batched primitives and resets the batch counter.
     */
    flush() {
        if (this.currIndex === 0 || !this.texture || !this.shader) {
            return; // Nothing to draw
        }

        const aPosition = this.shader.getAttrib('a_position');
        const aTexcoords = this.shader.getAttrib('a_texcoords');
        const aColor = this.shader.getAttrib('a_color');

        const stride = 32; // 8 floats * 4 bytes

        if (aPosition !== null && aTexcoords !== null && aColor !== null) {
            this.gl.useProgram(this.shader.id);

            // Upload vertex data
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vbo);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, this.vertices.subarray(0, this.currVert), this.gl.DYNAMIC_DRAW);
            
            // Upload index data
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
    }

    /**
     * Sets the current tint color for subsequent drawing operations.
     * @param {number} r Red component (0.0 to 1.0).
     * @param {number} g Green component (0.0 to 1.0).
     * @param {number} b Blue component (0.0 to 1.0).
     * @param {number} [a=1] Alpha component (0.0 to 1.0).
     */
    setColor(r, g, b, a = 1) {
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
     * Sets the current shader program. Flushes the batch if the shader changes.
     * @param {Shader|null} shader The new shader to use, or null for the default shader.
     */
    setShader(shader) {
        shader = shader || this.defaultShader;

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
        this.currVertCount++;
    }

    /**
     * Checks if there's enough space for vertices and indices, flushes if needed.
     * @private
     * @param {number} numVertices Number of vertices needed.
     * @param {number} numIndices Number of indices needed.
     */
    ensureSpace(numVertices, numIndices) {
        if (this.currVertCount + numVertices > this.maxVertices || 
            this.currIndex + numIndices > this.maxIndices) {
            this.flush();
        }
    }

    /**
     * Draws a textured quad with transformations.
     * @param {Texture} tex The texture to draw.
     * @param {number} x The world x-position.
     * @param {number} y The world y-position.
     * @param {number} [rot=0] The rotation angle in radians.
     * @param {number} [sx=1] The scale factor on the x-axis.
     * @param {number} [sy=1] The scale factor on the y-axis.
     * @param {number} [px=0] The pivot point x-coordinate (0.0 to 1.0).
     * @param {number} [py=0] The pivot point y-coordinate (0.0 to 1.0).
     * @param {number} [u1=0] The left u texture coordinate.
     * @param {number} [v1=0] The top v texture coordinate.
     * @param {number} [u2=1] The right u texture coordinate.
     * @param {number} [v2=1] The bottom v texture coordinate.
     */
    drawTex(tex, x, y, rot = 0, sx = 1, sy = 1, px = 0, py = 0, u1 = 0, v1 = 0, u2 = 1, v2 = 1) {
        this.setTexture(tex);
        this.ensureSpace(4, 6);

        const w = tex.width * sx;
        const h = tex.height * sy;

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

        const baseVert = this.currVertCount;

        // Add 4 vertices
        this.vertex(x + x1 * cos - y1 * sin, y + x1 * sin + y1 * cos, u1, v1, r, g, b, a);
        this.vertex(x + x2 * cos - y2 * sin, y + x2 * sin + y2 * cos, u2, v1, r, g, b, a);
        this.vertex(x + x3 * cos - y3 * sin, y + x3 * sin + y3 * cos, u2, v2, r, g, b, a);
        this.vertex(x + x4 * cos - y4 * sin, y + x4 * sin + y4 * cos, u1, v2, r, g, b, a);

        // Add 6 indices for 2 triangles
        this.indices[this.currIndex++] = baseVert;
        this.indices[this.currIndex++] = baseVert + 1;
        this.indices[this.currIndex++] = baseVert + 2;
        this.indices[this.currIndex++] = baseVert;
        this.indices[this.currIndex++] = baseVert + 2;
        this.indices[this.currIndex++] = baseVert + 3;
    }

    /**
     * Draws a solid colored rectangle.
     * @param {number} x The world x-position.
     * @param {number} y The world y-position.
     * @param {number} w The width of the rectangle.
     * @param {number} h The height of the rectangle.
     * @param {number} [rot=0] The rotation angle in radians.
     */
    drawFillRect(x, y, w, h, rot = 0) {
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
        const [r, g, b, a] = this.color;

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
    }

    /**
     * Draws a filled circle.
     * @param {number} x The center x-position.
     * @param {number} y The center y-position.
     * @param {number} radius The radius of the circle.
     * @param {number} [segments=32] The number of segments (higher = smoother).
     */
    drawCircle(x, y, radius, segments = 32) {
        this.setTexture(this.whitePixel);
        
        // Need center vertex + perimeter vertices
        const numVertices = segments + 1;
        const numIndices = segments * 3;
        
        this.ensureSpace(numVertices, numIndices);

        const [r, g, b, a] = this.color;
        const baseVert = this.currVertCount;

        // Center vertex
        this.vertex(x, y, 0.5, 0.5, r, g, b, a);

        // Perimeter vertices
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            this.vertex(px, py, 0.5, 0.5, r, g, b, a);
        }

        // Create triangles (fan from center)
        for (let i = 0; i < segments; i++) {
            this.indices[this.currIndex++] = baseVert; // center
            this.indices[this.currIndex++] = baseVert + 1 + i;
            this.indices[this.currIndex++] = baseVert + 1 + ((i + 1) % segments);
        }
    }

    /**
     * Draws a line strip (connected lines).
     * @param {number[]} points Array of points [x1, y1, x2, y2, ...].
     * @param {number} [thickness=1] Line thickness in pixels.
     * @param {boolean} [closed=false] Whether to close the line loop.
     */
    drawLines(points, thickness = 1, closed = false) {
        if (points.length < 4) {
            throw new Error("At least two points (4 values) are required to draw lines.");
        }

        this.setTexture(this.whitePixel);

        const numPoints = points.length / 2;
        const numSegments = closed ? numPoints : numPoints - 1;
        const numVertices = numPoints * 2;
        const numIndices = numSegments * 6;

        this.ensureSpace(numVertices, numIndices);

        const [r, g, b, a] = this.color;
        const halfThickness = thickness * 0.5;
        const baseVert = this.currVertCount;

        // Generate vertices along the line with perpendicular offset
        for (let i = 0; i < numPoints; i++) {
            const x1 = points[i * 2];
            const y1 = points[i * 2 + 1];
            
            // Calculate perpendicular direction
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
                // Last point in open line - use previous segment direction
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

            // Two vertices per point (offset by perpendicular)
            this.vertex(x1 + nx * halfThickness, y1 + ny * halfThickness, 0.5, 0.5, r, g, b, a);
            this.vertex(x1 - nx * halfThickness, y1 - ny * halfThickness, 0.5, 0.5, r, g, b, a);
        }

        // Generate indices for quads
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
    }

    /**
     * Draws a filled polygon.
     * @param {number[]} points Array of points [x1, y1, x2, y2, ...].
     */
    drawPolygon(points) {
        if (points.length < 6) {
            throw new Error("A polygon requires at least 3 points (6 values).");
        }

        this.setTexture(this.whitePixel);

        const numPoints = points.length / 2;
        // Use fan triangulation from first vertex
        const numVertices = numPoints;
        const numIndices = (numPoints - 2) * 3;

        this.ensureSpace(numVertices, numIndices);

        const [r, g, b, a] = this.color;
        const baseVert = this.currVertCount;

        // Add all vertices
        for (let i = 0; i < numPoints; i++) {
            this.vertex(points[i * 2], points[i * 2 + 1], 0.5, 0.5, r, g, b, a);
        }

        // Fan triangulation from first vertex
        for (let i = 1; i < numPoints - 1; i++) {
            this.indices[this.currIndex++] = baseVert;
            this.indices[this.currIndex++] = baseVert + i;
            this.indices[this.currIndex++] = baseVert + i + 1;
        }
    }
}