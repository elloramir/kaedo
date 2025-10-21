// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

export function createCanvas(width, height, antialiasing) {
    antialiasing = antialiasing !== undefined ? antialiasing : false;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    if (!antialiasing) {
        canvas.style.imageRendering = "pixelated";
    }

    return canvas;
}

export function isPowerOf2(value) {
    return value > 0 && (value & (value - 1)) === 0;
}

export function createWhitePixel() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 1;
    canvas.height = 1;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);

    return canvas;
}

export function unorderedRemove(array, index) {
    if (index >= 0 && index < array.length) {
        array[index] = array[array.length - 1];
        array.pop();
    }
}

export function random(min, max) {
    return Math.floor(Math.random() * max + min);
}

export function uid(size) {
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

export async function wait(seconds) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
