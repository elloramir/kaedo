(function (global) {
    'use strict';

    const __modules = {};
    const __cache = {};

    // Define all modules
    const __definitions = {
        'cdf35f96': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            function Shader(gl, vsSource, fsSource) {
                this.gl = gl;
                this.id = null;
                this.uniforms = new Map();
                this.attribs = new Map();

                const vs = Shader.compile(gl, gl.VERTEX_SHADER, vsSource);
                const fs = Shader.compile(gl, gl.FRAGMENT_SHADER, fsSource);

                if (vs !== null && fs !== null) {
                    this.id = gl.createProgram();

                    gl.attachShader(this.id, vs);
                    gl.attachShader(this.id, fs);
                    gl.linkProgram(this.id);

                    if (!gl.getProgramParameter(this.id, gl.LINK_STATUS)) {
                        console.error('Error linking program:', gl.getProgramInfoLog(this.id));
                        gl.deleteProgram(this.id);
                        this.id = null;
                        gl.deleteShader(vs);
                        gl.deleteShader(fs);
                        return;
                    }

                    gl.deleteShader(vs);
                    gl.deleteShader(fs);

                    this.cacheLocations(gl);
                }
            }

            Shader.prototype.cacheLocations = function (gl) {
                if (!this.id) return;

                const numUniforms = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS);
                for (let i = 0; i < numUniforms; i++) {
                    const info = gl.getActiveUniform(this.id, i);
                    this.uniforms.set(info.name, gl.getUniformLocation(this.id, info.name));
                }

                const numAttribs = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES);
                for (let i = 0; i < numAttribs; i++) {
                    const info = gl.getActiveAttrib(this.id, i);
                    this.attribs.set(info.name, gl.getAttribLocation(this.id, info.name));
                }
            };

            Shader.prototype.getUniform = function (name) {
                const location = this.uniforms.get(name);
                if (location === undefined) {
                    console.error(`Uniform not found or inactive: ${name}`);
                    return null;
                }
                return location;
            };

            Shader.prototype.getAttrib = function (name) {
                const location = this.attribs.get(name);
                if (location === undefined || location === -1) {
                    console.error(`Attribute not found or inactive: ${name}`);
                    return -1;
                }
                return location;
            };

            Shader.compile = function (gl, type, source) {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, source);
                gl.compileShader(shader);

                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            };

            Shader.loadFromFile = function (gl, vsFile, fsFile) {
                const vsPromise = fetch(vsFile).then(r => r.text());
                const fsPromise = fetch(fsFile).then(r => r.text());

                return Promise.all([vsPromise, fsPromise]).then(([vsSource, fsSource]) => {
                    return new Shader(gl, vsSource, fsSource);
                });
            };

            Shader.default = function (gl) {
                const frag = `
        precision mediump float;
        
        varying vec2 v_texcoords;
        varying vec4 v_color;

        uniform sampler2D u_texture;

        void main() {
            gl_FragColor = texture2D(u_texture, v_texcoords) * v_color;
        }
    `;

                const vert = `
        attribute vec2 a_position;
        attribute vec2 a_texcoords;
        attribute vec4 a_color;

        varying vec2 v_texcoords;
        varying vec4 v_color;

        uniform mat4 u_proj;

        void main() {
            gl_Position = u_proj * vec4(a_position, 0.0, 1.0);
            v_texcoords = a_texcoords;
            v_color = a_color;
        }
    `;

                return new Shader(gl, vert, frag);
            };

            __exports.default = Shader;

        },

        'db5dfce4': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            function createCanvas(width, height, antialiasing) {
                antialiasing = antialiasing !== undefined ? antialiasing : false;

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                if (!antialiasing) {
                    canvas.style.imageRendering = "pixelated";
                }

                return canvas;
            }

            function isPowerOf2(value) {
                return value > 0 && (value & (value - 1)) === 0;
            }

            function createWhitePixel() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = 1;
                canvas.height = 1;

                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, 1, 1);

                return canvas;
            }

            function unorderedRemove(array, index) {
                if (index >= 0 && index < array.length) {
                    array[index] = array[array.length - 1];
                    array.pop();
                }
            }

            function random(min, max) {
                return Math.floor(Math.random() * max + min);
            }

            function uid(size) {
                size = size !== undefined ? size : 10;

                let result = "";
                for (let i = 0; i < size; i++) {
                    const rand = random(0, 62);

                    let code;
                    if (rand < 10) {
                        code = 48 + rand;
                    } else if (rand < 36) {
                        code = 65 + rand - 10;
                    } else {
                        code = 97 + rand - 36;
                    }

                    result += String.fromCharCode(code);
                }
                return result;
            }

            async function wait(seconds) {
                return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
            }

            __exports.createCanvas = createCanvas;
            __exports.isPowerOf2 = isPowerOf2;
            __exports.createWhitePixel = createWhitePixel;
            __exports.unorderedRemove = unorderedRemove;
            __exports.random = random;
            __exports.uid = uid;
            __exports.wait = wait;
        },

        'c8c9c864': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            // Creates an orthogonal projection matrix (column-major order for WebGL)
            function orthoMat4(left, right, bottom, top, near, far) {
                const lr = 1 / (left - right);
                const bt = 1 / (bottom - top);
                const nf = 1 / (near - far);

                const m00 = -2 * lr;
                const m11 = -2 * bt;
                const m22 = 2 * nf;
                const m30 = (left + right) * lr;
                const m31 = (top + bottom) * bt;
                const m32 = (far + near) * nf;

                return new Float32Array([
                    m00, 0, 0, 0,
                    0, m11, 0, 0,
                    0, 0, m22, 0,
                    m30, m31, m32, 1
                ]);
            }

            // Moves a value towards a target by a fixed step
            function approach(v, target, step) {
                return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
            }

            // Linearly interpolates between current value and target
            function lerp(v, target, step) {
                return v + (target - v) * step;
            }

            __exports.orthoMat4 = orthoMat4;
            __exports.approach = approach;
            __exports.lerp = lerp;
        },

        '9f5c250f': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            const isPowerOf2 = __require('db5dfce4').isPowerOf2;;

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

            __exports.default = Texture;

        },

        'bc9f2012': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            const createWhitePixel = __require('db5dfce4').createWhitePixel;;
            const orthoMat4 = __require('c8c9c864').orthoMat4;;
            const Texture = __require('9f5c250f').default;;
            const Shader = __require('cdf35f96').default;;

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

            __exports.default = Batcher;

        },

        '70930945': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            function Framebuffer(gl, width, height, filter = "linear") {
                this.gl = gl;
                this.width = width;
                this.height = height;

                // Convert string filter to WebGL constant
                const glFilter = filter === "linear" ? gl.LINEAR : gl.NEAREST;

                // Create texture for the framebuffer
                this.id = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, this.id);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

                // Create framebuffer object
                this.fbo = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);

                // Check framebuffer status
                const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
                if (status !== gl.FRAMEBUFFER_COMPLETE) {
                    console.error('Framebuffer is not complete:', status);
                }

                // Unbind
                gl.bindTexture(gl.TEXTURE_2D, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }

            Framebuffer.prototype.destroy = function () {
                if (this.fbo) {
                    this.gl.deleteFramebuffer(this.fbo);
                    this.fbo = null;
                }
                if (this.id) {
                    this.gl.deleteTexture(this.id);
                    this.id = null;
                }
            };

            __exports.default = Framebuffer;

        },

        'a7cc7ff3': function (__exports, __require) {
            // Copyright 2025 Elloramir.
            // All rights over the code are under MIT.

            const Texture = __require('9f5c250f').default;;


            const DEFAULT_CHARS =
                " !\"#$%&'()*+,-./0123456789:;" +
                "@ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
                "[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~" +
                "áàâäãåçéèêëíìîïñóòôöõúùûüýÿÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ";


            function Font(gl, fontFamily, fontSize, filter = "nearest", chars = DEFAULT_CHARS) {
                this.gl = gl;
                this.fontFamily = fontFamily;
                this.fontSize = fontSize;
                this.chars = chars;
                this.filter = filter;

                // Character metrics map: char -> {x, y, width, height}
                this.charMap = new Map();

                // Create texture atlas from the font
                this.texture = this.createAtlas();
            }

            Font.prototype.createAtlas = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                ctx.font = `${this.fontSize}px ${this.fontFamily}`;
                ctx.textBaseline = 'top';

                // Measure all characters
                const charMetrics = [];
                let totalWidth = 0;
                let maxHeight = 0;

                for (let i = 0; i < this.chars.length; i++) {
                    const char = this.chars[i];
                    const metrics = ctx.measureText(char);
                    const width = Math.ceil(metrics.width) + 2; // Add padding
                    const height = this.fontSize + 4; // Add padding

                    charMetrics.push({ char, width, height });
                    totalWidth += width;
                    maxHeight = Math.max(maxHeight, height);
                }

                // Create atlas canvas
                canvas.width = Math.min(2048, Math.ceil(Math.sqrt(totalWidth * maxHeight)));
                canvas.height = 2048;

                ctx.font = `${this.fontSize}px ${this.fontFamily}`;
                ctx.textBaseline = 'top';
                ctx.fillStyle = 'white';

                // Disable smoothing for nearest filter (pixel-perfect rendering)
                if (this.filter === "nearest") {
                    ctx.imageSmoothingEnabled = false;
                }

                // Pack characters into atlas
                let x = 0;
                let y = 0;

                for (let i = 0; i < charMetrics.length; i++) {
                    const { char, width, height } = charMetrics[i];

                    // Move to next row if needed
                    if (x + width > canvas.width) {
                        x = 0;
                        y += maxHeight;
                    }

                    // Draw character
                    ctx.fillText(char, x + 1, y + 2);

                    // Store character metrics
                    this.charMap.set(char, {
                        x: x,
                        y: y,
                        width: width,
                        height: height
                    });

                    x += width;
                }

                // Create texture from canvas with the specified filter
                return new Texture(this.gl, canvas, this.filter);
            };

            Font.prototype.getChar = function (char) {
                return this.charMap.get(char) || this.charMap.get(' ');
            };

            Font.prototype.measureText = function (text) {
                let width = 0;

                for (let i = 0; i < text.length; i++) {
                    const charData = this.getChar(text[i]);
                    if (charData) {
                        width += charData.width;
                    }
                }

                return { width: width, height: this.fontSize };
            };

            Font.load = function (gl, fontFamily, fontSize, filter, chars) {
                return new Promise((resolve) => {
                    // Wait for font to be loaded
                    document.fonts.ready.then(() => {
                        resolve(new Font(gl, fontFamily, fontSize, filter, chars));
                    });
                });
            };

            __exports.default = Font;

        },

        '8361ea49': function (__exports, __require) {
            const Shader = __require('cdf35f96').default;;
            const Batcher = __require('bc9f2012').default;;
            const Texture = __require('9f5c250f').default;;
            const Framebuffer = __require('70930945').default;;
            const Font = __require('a7cc7ff3').default;;
            const utils = __require('db5dfce4');;

            __exports.default = {
                Shader,
                Batcher,
                Texture,
                Framebuffer,
                Font,
                utils
            };

        }
    };

    // Load a module
    function __require(moduleId) {
        if (__cache[moduleId]) {
            return __cache[moduleId];
        }

        const __exports = {};
        __cache[moduleId] = __exports;

        if (__definitions[moduleId]) {
            __definitions[moduleId](__exports, __require);
            __modules[moduleId] = __exports;
        }

        return __exports;
    }

    // Load the entry module
    const entryModule = __require('8361ea49');

    // Expose to global
    global.Kaedo = entryModule.default || entryModule;

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
