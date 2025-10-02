// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

/**
 * @class
 * @description Manages the creation, compilation, and linking of a WebGL shader program.
 */
export default
class Shader {
    /**
     * Creates an instance of Shader.
     * Compiles and links the provided vertex and fragment shader sources.
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {string} vsSource The source code for the vertex shader.
     * @param {string} fsSource The source code for the fragment shader.
     */
    constructor(gl, vsSource, fsSource) {
        this.gl = gl;
        /** @type {?WebGLProgram} */
        this.id = null;
        /** @type {Map<string, WebGLUniformLocation>} */
        this.uniforms = new Map();
        /** @type {Map<string, number>} */
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
                // Early exit if linking fails
                gl.deleteShader(vs);
                gl.deleteShader(fs);
                return;
            }

            gl.deleteShader(vs);
            gl.deleteShader(fs);

            this.cacheLocations(gl);
        }
    }

    /**
     * Iterates through all active uniforms and attributes and caches their locations.
     * @private
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     */
    cacheLocations(gl) {
        if (!this.id) return;

        // Cache Uniform Locations
        const numUniforms = gl.getProgramParameter(this.id, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(this.id, i);
            this.uniforms.set(info.name, gl.getUniformLocation(this.id, info.name));
        }

        // Cache Attribute Locations
        const numAttribs = gl.getProgramParameter(this.id, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttribs; i++) {
            const info = gl.getActiveAttrib(this.id, i);
            this.attribs.set(info.name, gl.getAttribLocation(this.id, info.name));
        }
    }

    /**
     * Retrieves the location of a uniform variable.
     * Logs an error if the uniform is not found.
     * @param {string} name The name of the uniform.
     * @returns {?WebGLUniformLocation} The uniform location or null if not found.
     */
    getUniform(name) {
        const location = this.uniforms.get(name);
        if (location === undefined) {
            console.error(`Uniform not found or inactive: ${name}`);
            return null;
        }
        return location;
    }

    /**
     * Retrieves the location of an attribute variable.
     * Logs an error if the attribute is not found.
     * @param {string} name The name of the attribute.
     * @returns {number} The attribute location (a non-negative integer or -1 if not found).
     */
    getAttrib(name) {
        const location = this.attribs.get(name);
        if (location === undefined || location === -1) {
            // Note: getAttribLocation returns -1 if not found.
            // However, our Map only stores active attributes, so checking against the Map is better.
            // The original logic only checks Map existence, which is fine, but location should be checked too.
            // Since the map stores the return value of gl.getAttribLocation, we check its existence.
            console.error(`Attribute not found or inactive: ${name}`);
            return -1;
        }
        return location;
    }

    /**
     * Compiles a single shader from source code.
     * @static
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {number} type The type of shader (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
     * @param {string} source The shader source code.
     * @returns {?WebGLShader} The compiled shader object or null on failure.
     */
    static compile(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    /**
     * Loads shader sources from files and creates a new Shader object.
     * @static
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @param {string} vsFile The path to the vertex shader file.
     * @param {string} fsFile The path to the fragment shader file.
     * @returns {Promise<Shader>} A promise that resolves with the created Shader object.
     */
    static loadFromFile(gl, vsFile, fsFile) {
        const vsPromise = fetch(vsFile).then(r => r.text());
        const fsPromise = fetch(fsFile).then(r => r.text());

        return Promise.all([vsPromise, fsPromise]).then(([vsSource, fsSource]) => {
            return new Shader(gl, vsSource, fsSource);
        });
    }

    /**
     * Creates a default 2D shader program (for textured quads with color tint).
     * @static
     * @param {WebGLRenderingContext} gl The WebGL rendering context.
     * @returns {Shader} The default Shader object.
     */
    static default(gl) {
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
    }
}