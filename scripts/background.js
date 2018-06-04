"use strict";

document.addEventListener("DOMContentLoaded", function () {
	console.log("ready");

	var colors = [
		"#57DBAB", // mint
		"#576FDB", // blue
		"#DB5757", // red
	]

	var CANVAS_ID = "render-canvas";
	var CANVAS_ALPHA = .5;
	var LINE_HEIGHT = 50;
	var LINE_WIDTH_MIN = 150;
	var LINE_WIDTH_MAX = 600;
	var CREATE_MS_MIN = 1000;
	var CREATE_MS_MAX = 3000;
	var PX_PER_MS = .2;

	// All the lines we will need to draw in the canvas.
	var linesToDraw = [];
	// When we started the app.
	var appStartTime = Date.now();

	// The canvas we will draw to.
	var canvas = document.getElementById(CANVAS_ID);
	var canvasWidth = 0;
	var canvasHeight = 0;
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

		canvasWidth = window.innerWidth;
		canvasHeight = window.innerHeight;
		canvas.width = canvasWidth * ratio;
		canvas.height = canvasHeight * ratio;
		canvas.style.width = canvasWidth + "px";
		canvas.style.height = canvasHeight + "px";

		ctx.scale(ratio, ratio);
		// ringRadius = (canvasWidth < 500) ? smallRingRadius : largeRingRadius;
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

	function getStartingPoint() {
		var random = Math.random() * (canvasWidth + canvasHeight);
		var x = 0;
		var y = 0;
		if (random > canvasWidth)
			y = random - canvasWidth;
		else
			x = random;
		return { x: x, y: y };
	}

	function getWidth() {
		return (Math.random() * (LINE_WIDTH_MAX - LINE_WIDTH_MIN)) + LINE_WIDTH_MIN;
	}

	function getColor() {
		return colors[Math.floor(Math.random() * colors.length)];
	}

	function addLine(now) {
		var startingPoint = getStartingPoint();
		var width = getWidth();
		var diagonal = Math.sqrt(Math.pow(width, 2) + Math.pow(width, 2));
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

		// Figure out the (diagonal) length of our window (which is the canvas size).
		var diagonal = Math.sqrt(Math.pow(canvasWidth, 2) + Math.pow(canvasHeight, 2));

		for (var i = 0; i < linesToDraw.length; i++) {
			var keep = drawSingle(ctx, now, diagonal, linesToDraw[i]);
			if (!keep)
				linesToDraw[i] = null;
		}
	}

	function drawSingle(ctx, now, diagonal, lineOb) {

		var time = PX_PER_MS * (now - lineOb.created);
		var lineDistance = Math.sqrt(Math.pow(time, 2) + Math.pow(time, 2));
		if (lineDistance > diagonal + lineOb.diagonal)
			return false;

		var width = lineOb.width;
		var x = lineOb.start.x - width + time;
		var y = lineOb.start.y - width + time;

		ctx.fillStyle = lineOb.color;
		ctx.globalAlpha = CANVAS_ALPHA;
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + width, y + width);
		ctx.lineTo(x + width, y + width + LINE_HEIGHT);
		ctx.lineTo(x, y + LINE_HEIGHT);
		ctx.closePath();
		ctx.fill();

		return true;
	}
});