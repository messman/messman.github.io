"use strict";

document.addEventListener("DOMContentLoaded", function () {
	console.log("ready");

	var colorIndex = 0;
	var colors = [
		"#56C0FF",
		"#2CB1FF",
		"#0091E7",
		"#027CC4",
	]

	var CANVAS_ID = "render-canvas";
	var LINE_HEIGHT = 70;
	var LINE_WIDTH_MIN = 1200;
	var LINE_WIDTH_MAX = 2000;
	var LINE_SPACING = 5;
	var LINE_END_PADDING = 20;
	var CREATE_MS_MIN = 2000;
	var CREATE_MS_MAX = 2000;
	var TIME_MAX = 20000;
	var PX_PER_MS = .2;

	var TOTAL_LINE = LINE_HEIGHT + LINE_SPACING;
	var HALF_LINE_HEIGHT = LINE_HEIGHT / 2;

	var START_X = -HALF_LINE_HEIGHT;
	var START_Y = LINE_SPACING + LINE_HEIGHT + HALF_LINE_HEIGHT;

	var lineMaximumX = 0;
	var lineMaximumY = 0;
	var linesX = {};
	var linesY = {};
	var forX = true;

	// All the lines we will need to draw in the canvas.
	var linesToDraw = [];
	// When we started the app.
	var appStartTime = Date.now();

	// The canvas we will draw to.
	var canvas = document.getElementById(CANVAS_ID);
	var canvasWidth = 0;
	var canvasHeight = 0;
	// Figure out the (diagonal) length of our window (which is the canvas size).
	var canvasDiagonal = 0;
	var devicePixelRatio = window.devicePixelRatio || 1;

	// Resize function.
	function resize() {
		var ctx = canvas.getContext("2d");
		var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
			ctx.mozBackingStorePixelRatio ||
			ctx.msBackingStorePixelRatio ||
			ctx.oBackingStorePixelRatio ||
			ctx.backingStorePixelRatio || 1;
		var ratio = devicePixelRatio / backingStoreRatio;

		var size = canvas.getBoundingClientRect();
		canvasWidth = size.width;
		canvasHeight = size.height;

		// Update canvas "crispness"
		canvas.width = canvasWidth * ratio;
		canvas.height = canvasHeight * ratio;
		ctx.scale(ratio, ratio);

		// Length of the diagonal, for knowing when to free up a line
		canvasDiagonal = Math.sqrt(Math.pow(canvasWidth, 2) + Math.pow(canvasHeight, 2));
		lineMaximumX = Math.ceil(canvasWidth / (LINE_HEIGHT + LINE_SPACING));
		lineMaximumY = Math.ceil(canvasHeight / (LINE_HEIGHT + LINE_SPACING));
	};
	window.onresize = resize;
	resize();

	function getNextLineTime() {
		return (Math.random() * (CREATE_MS_MAX - CREATE_MS_MIN)) + CREATE_MS_MIN;
	}

	var timeOfLastLine = appStartTime;
	var timeOfNextLine = getNextLineTime();

	// The animation loop.
	function animate() {
		var now = Date.now();
		var elapsedSinceLastLine = now - timeOfLastLine;
		if (elapsedSinceLastLine > timeOfNextLine) {
			addLine(now);
			timeOfNextLine = getNextLineTime();
			timeOfLastLine = now;
		}

		draw(now);
		requestAnimationFrame(animate);
	}
	animate();

	// Top-left corner is the first X
	// We need to offset Y by spacing + 1/2 height
	// We need to offset X by -1/2 height
	// XXXXXXXXXXXX
	// Y
	// Y
	// Y
	// Y

	function getStartingPoint() {
		var isX = forX;
		forX = !forX;
		lineMaximumY = 5;
		lineMaximumX = 5;
		if (isX)
			return getStartingPointOnAxis(true, lineMaximumX, linesX);
		else
			return getStartingPointOnAxis(false, lineMaximumY, linesY);
	}

	function getStartingPointOnAxis(isX, lineMaximum, lines) {
		var possible = [];
		for (var i = 0; i < lineMaximum; i++) {
			if (!lines[i])
				possible.push(i);
		}
		if (!possible.length)
			return null;
		var index = possible[Math.floor(Math.random() * possible.length)];
		lines[index] = true;
		return {
			isX: isX,
			index: index
		};
	}

	function getWidth() {
		return (Math.random() * (LINE_WIDTH_MAX - LINE_WIDTH_MIN)) + LINE_WIDTH_MIN;
	}

	function getColor() {
		var color = colors[colorIndex];
		colorIndex = (colorIndex + 1) % colors.length;
		return color;
	}

	function addLine(now) {
		var startingPoint = getStartingPoint();
		console.log(startingPoint);
		if (!startingPoint)
			return;
		var width = getWidth();
		var diagonal = Math.sqrt(Math.pow(width, 2) + Math.pow(width, 2));
		var diagonalCutOfPage = 0;
		if (startingPoint.isX)
			diagonalCutOfPage = Math.sqrt(Math.pow(width, 2) + Math.pow(width, 2));

		var color = getColor();

		linesToDraw.push({
			created: now,
			start: startingPoint,
			width: width,
			diagonal: diagonal,
			color: color
		})
	}

	// Draws.
	function draw(now) {

		// Clear the canvas.
		var ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Filter out null (done in the singleDraw if off-screen)
		linesToDraw = linesToDraw.filter(function (a) {
			return !!a;
		});

		// If no keys, get outta here.
		if (!linesToDraw.length)
			return;

		for (var i = 0; i < linesToDraw.length; i++) {
			var ob = linesToDraw[i];
			var keep = drawSingle(ctx, now, ob);
			if (!keep) {
				//console.log(ob);
				linesToDraw[i] = null;
			}
			if (!keep || ob.openLine) {
				var lines = ob.start.isX ? linesX : linesY;
				delete lines[ob.start.index];
			}
		}
	}

	function drawSingle(ctx, now, lineOb) {
		var timePassed = now - lineOb.created;
		var xDistanceTraveled = PX_PER_MS * timePassed;
		var width = lineOb.width;
		if (xDistanceTraveled > width)
			lineOb.openLine = true;


		var lineDistance = Math.sqrt(Math.pow(xDistanceTraveled, 2) + Math.pow(xDistanceTraveled, 2));
		if (lineDistance > canvasDiagonal + lineOb.diagonal || timePassed > TIME_MAX)
			return false;

		var index = lineOb.start.index;
		var start = index * TOTAL_LINE;
		var x = 0;
		var y = 0;
		if (lineOb.start.isX)
			x += START_X + start;
		else
			y += START_Y + start;

		x += xDistanceTraveled;
		y += xDistanceTraveled;

		ctx.fillStyle = lineOb.color;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x - width, y - width);
		ctx.lineTo(x - width, y - width - LINE_HEIGHT);
		ctx.lineTo(x, y - LINE_HEIGHT);
		ctx.closePath();
		ctx.fill();

		return true;
	}
});