"use strict";
// Background animation script
// ES5

// Background constants
// Debugging
var DEBUG = false;

// Carolina blue theme
var COLORS = [
	"#8EC9EC",
	"#92C4E0",
	"#C6E8FC",
	"#C1DAE8"
];
var CANVAS_ALPHA = .3;

var CANVAS_ID = "render-canvas";
// Height/thickness of each line (note, becomes the width if the axes are flipped)
var LINE_HEIGHT = 100;
// Minimum/maximum width of a line (long side)
var LINE_WIDTH_MIN = 200;
var LINE_WIDTH_MAX = 800;
// Empty space between each row of lines
var LINE_SPACING = 5;
// Spacing at the start and end of each line
var LINE_END_PADDING = 20;
// Maximum/minimum time between adding a new line
var CREATE_MS_MIN = 400;
var CREATE_MS_MAX = 800;
// Maximum break time, in case something goes wrong
var TIME_MAX = 30000;
// Speed coefficient
var PX_PER_MS = .06;

/**
 * Runs a background animation using <canvas>.
 * Auto-resizes.
 */
function runBackground() {

	var getColor = (function () {
		var colorIndex = 0;
		return function getColor() {
			var color = COLORS[colorIndex];
			colorIndex = (colorIndex + 1) % COLORS.length;
			return color;
		}
	})();

	// The total height of a line is its height plus the spacing between rows
	var TOTAL_LINE = LINE_HEIGHT + LINE_SPACING;
	var HALF_LINE_HEIGHT = LINE_HEIGHT / 2;

	// Top-left corner is the first X
	// We need to offset Y by spacing + 1/2 height
	// We need to offset X by -1/2 height
	// XXXXXXXXXXXX
	// Y
	// Y
	// Y
	// Y
	// Our X rows start left by half the line height so they straddle the top-left corner
	var START_X = -HALF_LINE_HEIGHT;
	// So the Y rows must start down a little bit
	var START_Y = LINE_SPACING + LINE_HEIGHT + HALF_LINE_HEIGHT;

	// Based on the size of the canvas, the maximum rows for X and Y
	var lineMaximumX = 0;
	var lineMaximumY = 0;
	// If not undefined for an index, then a new line can't be placed in this row.
	var linesX = {};
	var linesY = {};

	// All the lines we will need to draw in the canvas.
	var linesToDraw = [];

	// The width and height of the canvas.
	var canvasWidth = 0;
	var canvasHeight = 0;

	// The canvas we will draw to.
	var canvas = document.getElementById(CANVAS_ID);
	var resize = (function () {
		var devicePixelRatio = window.devicePixelRatio || 1;
		var ctx = canvas.getContext("2d");
		var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
			ctx.mozBackingStorePixelRatio ||
			ctx.msBackingStorePixelRatio ||
			ctx.oBackingStorePixelRatio ||
			ctx.backingStorePixelRatio || 1;
		var ratio = devicePixelRatio / backingStoreRatio;

		// Resize function.
		function resize() {
			var size = canvas.getBoundingClientRect();
			canvasWidth = size.width;
			canvasHeight = size.height;

			// Update canvas "crispness" with the ratio
			canvas.width = canvasWidth * ratio;
			canvas.height = canvasHeight * ratio;
			ctx.scale(ratio, ratio);

			// Length of the diagonal, for knowing when to free up a line
			lineMaximumX = Math.ceil(canvasWidth / TOTAL_LINE);
			lineMaximumY = Math.ceil(canvasHeight / TOTAL_LINE);
		};
		window.onresize = resize;
		return resize;
	})();
	resize();

	// Get a random time until the next line is added.
	function getNextLineTime() {
		return (Math.random() * (CREATE_MS_MAX - CREATE_MS_MIN)) + CREATE_MS_MIN;
	}
	var timeOfNextLine = Date.now() + getNextLineTime();

	// The animation loop.
	function animate() {
		// If enough time is passed, add a new line.
		var now = Date.now();
		if (now > timeOfNextLine) {
			addLine(now);
			timeOfNextLine = now + getNextLineTime();
		}

		// Draw all lines
		draw(now);
		// Animate
		requestAnimationFrame(animate);
	}
	animate();

	function getStartingPoint() {
		// Choose first between adding a Y line or X line.
		var isX = (Math.floor(Math.random() * (lineMaximumX + lineMaximumY))) > lineMaximumY;
		if (isX)
			return getStartingPointOnAxis(true, lineMaximumX, linesX);
		else
			return getStartingPointOnAxis(false, lineMaximumY, linesY);
	}

	/**
	 * Gets a random index for either the X or Y columns.
	 * @param {boolean} isX - X or Y.
	 * @param {number} lineMaximum - The maximum number of columns.
	 * @param {Object} lines - A dictionary of indices. If not undefined, a value indicates that the column can't take another line.
	 */
	function getStartingPointOnAxis(isX, lineMaximum, lines) {
		// Build an array of possible choices
		var possible = [];
		for (var i = 0; i < lineMaximum; i++) {
			if (lines[i] === undefined)
				possible.push(i);
		}
		if (!possible.length)
			return null;
		// Choose one
		var index = possible[Math.floor(Math.random() * possible.length)];
		if (DEBUG)
			console.log(isX ? "x" : "y", index, possible.length);
		return {
			isX: isX,
			index: index
		};
	}

	// Gets a random line width
	function getWidth() {
		return (Math.random() * (LINE_WIDTH_MAX - LINE_WIDTH_MIN)) + LINE_WIDTH_MIN;
	}

	// Creates a line object and adds it to the array of lines to be drawn.
	function addLine(now) {
		var startingPoint = getStartingPoint();
		// A starting point can be null if no columns are open.
		if (!startingPoint)
			return;
		var width = getWidth();
		var color = getColor();
		var line = {
			created: now,
			isX: startingPoint.isX,
			index: startingPoint.index,
			width: width,
			color: color
		};
		// Add to the draw array
		linesToDraw.push(line);
	}

	// Draws all the lines.
	function draw(now) {
		// Clear the canvas.
		var ctx = canvas.getContext("2d");
		ctx.globalAlpha = CANVAS_ALPHA;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Clear our dictionaries, because we're about to shift lines in the array.
		linesX = {};
		linesY = {};

		// Filter out null (done in the singleDraw if off-screen)
		linesToDraw = linesToDraw.filter(function (a) {
			return !!a;
		});
		// If no keys, get outta here.
		if (!linesToDraw.length)
			return;

		// Draw each line, and rebuild the line dictionary at the same time.
		for (var i = 0; i < linesToDraw.length; i++) {
			var line = linesToDraw[i];
			var keep = drawSingle(ctx, now, line);
			if (!keep) {
				// Mark it to be removed in the next filter().
				linesToDraw[i] = null;
			}
			else if (!line.openLine) {
				// Add it back to our map so when a new line is added we know what is open.
				var lines = line.isX ? linesX : linesY;
				lines[line.index] = true;
			}
		}
	}

	function drawSingle(ctx, now, lineOb) {
		// Use the passage of time to mark distance travelled.
		var timePassed = now - lineOb.created;
		var distance = PX_PER_MS * timePassed;
		var width = lineOb.width;

		// If we have moved the width of the line, a new line can be drawn in this "row".
		if (!lineOb.openLine && (distance > width + LINE_END_PADDING))
			lineOb.openLine = true;

		// Get the starting index of this line on our "grid"
		var index = lineOb.index;
		var start = index * TOTAL_LINE;
		var x = 0;
		var y = 0;
		if (lineOb.isX)
			x = START_X + start;
		else
			y = START_Y + start;

		x += distance;
		y += distance;

		// Check if we're really done drawing the line.
		var finishedInX = x - width - LINE_END_PADDING > canvasWidth;
		var finishedInY = y - width - LINE_HEIGHT - LINE_END_PADDING > canvasHeight;
		// TIME_MAX || finished in X || finished in Y
		if (timePassed > TIME_MAX || finishedInX || finishedInY)
			return false;

		// Otherwise, draw it.
		ctx.fillStyle = lineOb.color;
		ctx.beginPath();
		// Start in the right-bottom point.
		ctx.moveTo(x, y);
		// Move to the left-bottom point.
		ctx.lineTo(x - width, y - width);
		// Move to the left-top point.
		ctx.lineTo(x - width, y - width - LINE_HEIGHT);
		// Back to the right.
		ctx.lineTo(x, y - LINE_HEIGHT);
		ctx.closePath();
		ctx.fill();
		if (DEBUG)
			ctx.strokeText(`${lineOb.isX ? "x" : "y"}${index}`, x, y);

		return true;
	}
};
// This script is async and defer, so the page made already be "ready" by the time it starts execution.
(function (callback) {
	if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) callback();
	else document.addEventListener("DOMContentLoaded", callback);
})(runBackground);