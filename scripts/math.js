// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

// Creates an orthogonal projection matrix (column-major order for WebGL)
export function orthoMat4(left, right, bottom, top, near, far) {
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
export function approach(v, target, step) {
    return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

// Linearly interpolates between current value and target
export function lerp(v, target, step) {
    return v + (target - v) * step;
}
