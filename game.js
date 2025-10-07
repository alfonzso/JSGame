// @ts-check

// ---- setup ----

const canvas = /** @type {HTMLCanvasElement & {_cssWidth: number,_cssHeight: number} } */ (document.getElementById("game"));
const ctx = canvas.getContext('2d');

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 */
function fillTextMultiLine(ctx, text, x, y) {
	var lineHeight = ctx.measureText("M").width * 1.2;
	var lines = text.split("\n");
	for (var i = 0; i < lines.length; ++i) {
		ctx.fillText(lines[i], x, y);
		y += lineHeight;
	}
}

const cssW = canvas.clientWidth  || window.innerWidth;
const cssH = ( canvas.clientHeight || window.innerHeight ) - 100 ;

function resize() {
	const dpr = window.devicePixelRatio || 1;
	canvas.width = Math.floor(cssW * dpr);
	canvas.height = Math.floor(cssH * dpr);
	canvas.style.width = cssW + 'px';
	canvas.style.height = cssH + 'px';
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	canvas._cssWidth = cssW;
	canvas._cssHeight = cssH;
}
window.addEventListener('resize', resize);
resize();

/**
 * @param {Point} A
 * @param {Point} B
 * @param {Point} C
 * @returns {boolean}
 */
function ccw(A,B,C){
    return (C.y-A.y) * (B.x-A.x) > (B.y-A.y) * (C.x-A.x)
}

/**
 * @param {Line} theLine
 * @param {string} color
 */
function drawALine(theLine,color){
	let A = theLine.A
	let B = theLine.B

	ctx.strokeStyle = color ;
	ctx.beginPath();
	ctx.moveTo(...A.toParam());
	ctx.lineTo(...B.toParam());
	ctx.stroke();
}

/**
 * @param {Line} userLine
 * @param {Line} otherLine
 * @returns {boolean}
 */
function intersect(userLine,otherLine){
	let A = userLine.A
	let B = userLine.B
	let C = otherLine.A
	let D = userLine.B
	drawALine(userLine,'green')
	drawALine(otherLine,'white')
	return ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D)
}

/**
 *
 * @class
 * @classdesc [TODO:class]
 */
class Line {
	/**
	 * @param {Point} A
	 * @param {Point} B
	 */
	constructor(A,B) {
		this.A = A ;
		this.B = B ;
	}
}

/**
 *
 * @class
 * @classdesc Point
 */
class Point {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x,y) {
		this.x = x ;
		this.y = y ;
	}

	/**
	 * @returns {[number,number]}
	 */
	toParam(){
		return [this.x,this.y]
	}
}

/**
 *
 * @class
 * @classdesc Box
 */
class Box {
	/**
	 * @param {Point} point
	 * @param {number} h
	 * @param {number} w
	 * @param {string} color
	 */
	constructor(point, h, w, color) {
		this.point = point
		this.w = w
		this.h = h
		this.vx = 0
		this.vy = 0
		this.onGround = false
		this.color = color
		this.calcPoint(point.x,point.y,w,h)
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	calcPoint(x,y,w,h) {
		this.A = new Point(x,y)
		this.B = new Point(x+w,y)
		this.C = new Point(x,y+h)
		this.D = new Point(x+w,y+h)
		this.lines = [
			new Line(this.A,this.B),
			new Line(this.B,this.D),
			new Line(this.D,this.C),
			new Line(this.C,this.A)
		]
	}

	/** [TODO:description] */
	drawer() {
		ctx.fillStyle = this.color ;
		ctx.fillRect(this.point.x, this.point.y, this.w, this.h);
	}

}

const box = new Box(new Point(100,20),60,60,'blue')

let yX = innerWidth / 2 - 240 / 2;
let yY = innerHeight - 240 - 100 ;
const yellowB = new Box(new Point(yX,yY), 240, 240, 'yellow')

const groundB = new Box(new Point(0,cssH/2), 50, cssW , 'brown')
let boxList = [ yellowB , groundB ]

// ---- input ----
const keys = { left: false, right: false, jump: false };
window.addEventListener('keydown', (e) => {
	if (e.key === 'a') keys.left = true;
	if (e.key === 'd') keys.right = true;
	if (e.key === 'w') keys.jump = true;
});
window.addEventListener('keyup', (e) => {
	if (e.key === 'a') keys.left = false;
	if (e.key === 'd') keys.right = false;
	if (e.key === 'w') keys.jump = false;
});

// ---- physics params (tweak these for feel) ----
const GRAVITY = 2000;	      // px / s^2
const MOVE_ACCEL = 6000;      // px / s^2 (horizontal accel)
const MAX_SPEED = 600;	      // px / s (max horizontal speed)
const AIR_DRAG = 0.9;	      // multiplier applied per second in air
const GROUND_FRICTION = 10;   // when no input on ground, reduce vx (px / s^2)
const JUMP_SPEED = 900;       // initial jump velocity px / s
const MAX_DT = 0.05;	      // clamp dt to avoid huge jumps (50 ms)

// ---- game loop (uses deltaTime) ----
let lastTime = performance.now();

/**
 * @param {number} now
 */
function loop(now) {
	let dt = (now - lastTime) / 1000;
	if (dt > MAX_DT) dt = MAX_DT;
	lastTime = now;

	update(dt);
	draw();

	requestAnimationFrame(loop);
}

// ---- update (time-based) ----
/**
 * @param {number} dt - delta time for update
 */
function update(dt) {
	// horizontal input -> acceleration
	if (keys.left && !keys.right) {
		box.vx -= MOVE_ACCEL * dt;
	} else if (keys.right && !keys.left) {
		box.vx += MOVE_ACCEL * dt;
	}

	if (box.onGround) {
		let lorf = box.vx > 0 ? -1 : 1 ;
		let grnd = GROUND_FRICTION * 100 * dt * lorf;
		box.vx += grnd
		if ( box.vx / grnd >= 0 && box.vx / grnd <= 1 ) box.vx = 0 ;
	} else {
		box.vx *= Math.pow(AIR_DRAG, dt);
	}

	// clamp horizontal speed
	if (box.vx > MAX_SPEED) box.vx = MAX_SPEED;
	if (box.vx < -MAX_SPEED) box.vx = -MAX_SPEED;

	// jumping (only if on ground)
	if (keys.jump && box.onGround) {
		box.vy = -JUMP_SPEED;
		box.onGround = false;
	}

	// gravity
	box.vy += GRAVITY * dt;

	// integrate position
	box.point.x += box.vx * dt;
	box.point.y += box.vy * dt;

	// world bounds and floor collision
	const floorY = canvas._cssHeight - box.h;
	if (box.point.y >= floorY) {
		box.point.y = floorY;
		box.vy = 0;
		box.onGround = true;
	} else {
		box.onGround = false;
	}

	let userLine = new Line(box.C,new Point(box.C.x,9999))
	let interCount = groundB.lines.map((boxLine) => intersect(userLine,boxLine)).filter(Boolean).length
	console.log(interCount)
	debugger

	// keep inside horizontal bounds (simple clamp + small bounce)
	if (box.point.x < 0) { box.point.x = 0; box.vx = 0; }
	if (box.point.x + box.w > canvas._cssWidth) {
		box.point.x = canvas._cssWidth - box.w - 10;
		box.vx = 0;
	}
}

// ---- draw ----
function draw() {
	const W = canvas._cssWidth, H = canvas._cssHeight;
	ctx.clearRect(0,0,W,H);

	ctx.fillStyle = '#09f';
	ctx.fillRect(box.point.x, box.point.y, box.w, box.h);

	for ( const bx of boxList) {
			bx.drawer()
	}

	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.font = '12px sans-serif';

		// x: ${box01.x} innerH: ${innerHeight}
		// y: ${box01.y} innerW: ${innerWidth}

		// w: ${box01.w}
		// h: ${box01.h}

	fillTextMultiLine(ctx, `
		vx: ${Math.round(box.vx)} px/s
		vy: ${Math.round(box.vy)} px/s
	`, 10, 18);
}

// start
requestAnimationFrame(loop);
