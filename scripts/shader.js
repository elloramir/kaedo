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

export default Shader;
