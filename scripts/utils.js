// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

/**
 * Creates an HTML canvas element with specified dimensions.
 * Optionally applies pixelated styling for non-antialiased rendering.
 * @param {number} width The width of the canvas.
 * @param {number} height The height of the canvas.
 * @param {boolean} [antialising=false] If true, allows browser antialiasing. If false, forces pixelated rendering.
 * @returns {HTMLCanvasElement} The created canvas element.
 */
export function createCanvas(width, height, antialising = false) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    if (!antialising) {
        // Apply pixelated image rendering style for crisp, non-blurry scaling
        canvas.style.imageRendering = "pixelated";
    }

    return canvas;
}

/**
 * Checks if a value is a power of 2.
 * @param {number} value The number to check.
 * @returns {boolean} True if the value is a power of 2, false otherwise.
 */
export function isPowerOf2(value) {
    // A power of 2 is only true if value is positive and only one bit is set.
    // (value & (value - 1)) is 0 for powers of 2.
    return value > 0 && (value & (value - 1)) === 0;
}

/**
 * Creates a minimal 1x1 canvas containing a single white pixel.
 * This is commonly used as a fallback texture for drawing solid colors.
 * @returns {HTMLCanvasElement} A 1x1 canvas element with a white pixel.
 */
export function createWhitePixel() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 1;
    canvas.height = 1;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);

    return canvas;
}

/**
 * Removes an element from an array by index quickly, without preserving the order.
 * The element at the end of the array is moved to the removed index.
 * @param {Array<any>} array The array to modify.
 * @param {number} index The index of the element to remove.
 */
export function unorderedRemove(array, index) {
    // Only proceed if the index is valid
    if (index >= 0 && index < array.length) {
        // Overwrite the element at 'index' with the last element
        array[index] = array[array.length - 1];
        // Remove the last element (which is now a duplicate or the one that was moved)
        array.pop();
    }
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * Note: The original implementation returns Math.floor(Math.random()*max+min), which
 * is unconventional for a range function. It suggests a range of [min, min+max-1].
 * I'll keep the original logic but document the common use case.
 * @param {number} min The minimum value (inclusive).
 * @param {number} max The scaling factor for the random number, effectively setting the upper bound for the random part.
 * @returns {number} A random integer.
 */
export function random(min, max) {
    return Math.floor(Math.random() * max + min);
}

/**
 * Generates a random alphanumeric unique identifier string.
 * The characters used are 0-9, A-Z, and a-z (62 possibilities).
 * @param {number} [size=10] The desired length of the UID string.
 * @returns {string} The generated unique identifier.
 */
export function uid(size = 10) {
    let result = "";
    for (let i = 0; i < size; i++) {
        const rand = random(0, 62); // Random number from 0 to 61 (62 characters)

        let code;
        if (rand < 10) {
            // 0-9 (ASCII 48 to 57)
            code = 48 + rand;
        } else if (rand < 36) {
            // A-Z (ASCII 65 to 90)
            code = 65 + rand - 10;
        } else {
            // a-z (ASCII 97 to 122)
            code = 97 + rand - 36;
        }

        result += String.fromCharCode(code);
    }
    return result;
}

/**
 * Pauses execution for a specified number of seconds using a Promise-based timeout.
 * @async
 * @param {number} seconds The number of seconds to wait.
 * @returns {Promise<void>} A promise that resolves after the specified time.
 */
export async function wait(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}