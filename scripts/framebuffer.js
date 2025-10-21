// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

function Framebuffer(gl, width, height, filter = "nearest") {
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

export default Framebuffer;
