// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

/**
 * Creates an orthogonal projection matrix (4x4, column-major).
 * @param {number} left The coordinate for the left vertical clipping plane.
 * @param {number} right The coordinate for the right vertical clipping plane.
 * @param {number} bottom The coordinate for the bottom horizontal clipping plane.
 * @param {number} top The coordinate for the top horizontal clipping plane.
 * @param {number} near The coordinate for the near depth clipping plane.
 * @param {number} far The coordinate for the far depth clipping plane.
 * @returns {Float32Array} The resulting 4x4 orthogonal projection matrix.
 */
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

    // Matrix in column-major order (WebGL standard)
    return new Float32Array([
        m00,    0,    0, 0,
          0,  m11,    0, 0,
          0,    0,  m22, 0,
        m30,  m31,  m32, 1
    ]);
}

/**
 * Moves a value towards a target value by a fixed step, ensuring it doesn't overshoot.
 * This is useful for fixed-speed movement/animation.
 * @param {number} v The current value.
 * @param {number} target The value to approach.
 * @param {number} step The maximum distance to move in one call (must be positive).
 * @returns {number} The new value.
 */
export function approach(v, target, step) {
    return v < target ? Math.min(v + step, target) : Math.max(v - step, target);
}

/**
 * Linearly interpolates between a current value and a target value.
 * This is useful for smooth, diminishing-speed movement/animation.
 * @param {number} v The current value.
 * @param {number} target The target value.
 * @param {number} step The interpolation factor (typically between 0 and 1).
 * @returns {number} The new interpolated value.
 */
export function lerp(v, target, step) {
    return v + (target - v) * step;
}