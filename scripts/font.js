// Copyright 2025 Elloramir.
// All rights over the code are under MIT.

import Texture from "./texture.js";


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

export default Font;
