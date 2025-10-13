// vim :set ts=2 sw=2 sts=2 et :
// @ts-check

// ---- setup ----
// :verbose setlocal shiftwidth? tabstop? softtabstop? expandtab?
//

const canvas =
  /** @type {HTMLCanvasElement & {_cssWidth: number,_cssHeight: number} } */ (
    document.getElementById("game")
  );
const ctx = canvas.getContext("2d");

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

/**
 * @param {number} miliseconds
 */
function sleep(miliseconds) {
  var currentTime = new Date().getTime();

  while (currentTime + miliseconds >= new Date().getTime()) {}
}

/**
 *
 * @param {Point} A
 * @param {number} rad
 */
function debugPoint(A, rad) {
  // let slashA = new Line(
  //   new Point(A.x - 10, A.y - 10),
  //   new Point(A.x + 10, A.y + 10),
  // );
  // let slashB = new Line(
  //   new Point(A.x + 10, A.y - 10),
  //   new Point(A.x - 10, A.y + 10),
  // );
  // drawALine(slashA, "yellow");
  // drawALine(slashB, "yellow");
  ctx.beginPath();
  ctx.arc(A.x, A.y, rad, 0, 2 * Math.PI);
  // ctx.fillStyle = "red";
  // ctx.fill();
  // ctx.lineWidth = 4;
  // ctx.strokeStyle = "blue";
  ctx.stroke();
}

const cssW = canvas.clientWidth || window.innerWidth;
const cssH = (canvas.clientHeight || window.innerHeight) - 100;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas._cssWidth = cssW;
  canvas._cssHeight = cssH;
}
window.addEventListener("resize", resize);
resize();

/**
 * @param {Point} A
 * @param {Point} B
 * @param {Point} C
 * @returns {boolean}
 */
function ccw(A, B, C) {
  return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
}

/**
 * @param {Point} A
 * @param {Point} B
 * @param {Point} C
 * @param {Point} D
 * @returns {{x: number, y: number, seg1: boolean, seg2: boolean }}
 */
function line_intersect(A, B, C, D) {
  let ua,
    ub,
    denom = (C.y - A.y) * (B.x - A.x) - (B.y - A.y) * (C.x - A.x);
  if (denom == 0) {
    return null;
  }
  ua = ((D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x)) / denom;
  ub = ((B.x - A.x) * (A.y - C.y) - (B.y - A.y) * (A.x - C.x)) / denom;
  return {
    x: A.x + ua * (B.x - A.x),
    y: A.y + ua * (B.y - A.y),
    seg1: ua >= 0 && ua <= 1,
    seg2: ub >= 0 && ub <= 1,
  };
}

/**
 * @param {Line} theLine
 * @param {string} color
 */
function drawALine(theLine, color) {
  let A = theLine.A;
  let B = theLine.B;

  // ctx.beginPath();
  let oldStyle = ctx.strokeStyle;
  let oldLW = ctx.lineWidth;
  ctx.lineWidth = 5;
  ctx.strokeStyle = color;
  ctx.moveTo(...A.toParam());
  ctx.lineTo(...B.toParam());
  ctx.stroke();
  ctx.strokeStyle = oldStyle;
  ctx.lineWidth = oldLW;
  // ctx.closePath();
}

/**
 * @param {Line} userLine
 * @param {Line} otherLine
 * @returns {boolean}
 */
function intersect(userLine, otherLine) {
  let A = userLine.A;
  let B = userLine.B;
  let C = otherLine.A;
  let D = otherLine.B;
  // drawALine(userLine, "green");
  // drawALine(otherLine, "white");
  // let intersect = ccw(A,C,D) != ccw(B,C,D) && ccw(A,B,C) != ccw(A,B,D)
  // console.log(A)
  // console.log(B)
  // console.log(C)
  // console.log(D)
  return ccw(A, C, D) != ccw(B, C, D) && ccw(A, B, C) != ccw(A, B, D);
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
  constructor(A, B) {
    this.A = A;
    this.B = B;
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
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * @returns {[number,number]}
   */
  toParam() {
    return [this.x, this.y];
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
    this.point = point;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.onSurface = false;
    this.color = color;
    this.calcPoint(point.x, point.y, w, h);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  calcPoint(x, y, w, h) {
    this.A = new Point(x, y);
    this.B = new Point(x + w, y);
    this.C = new Point(x, y + h);
    this.D = new Point(x + w, y + h);
    this.lines = [
      new Line(this.A, this.B),
      new Line(this.B, this.D),
      new Line(this.D, this.C),
      new Line(this.C, this.A),
    ];
  }

  /** [TODO:description] */
  drawer() {
    // ctx.beginPath()
    // ctx.fillStyle = this.color;
    // ctx.fillRect(this.point.x, this.point.y, this.w, this.h);
    let oldStyle = ctx.strokeStyle;
    ctx.strokeStyle = "white";
    ctx.rect(this.point.x, this.point.y, this.w, this.h);
    this.calcPoint(this.point.x, this.point.y, this.w, this.h);
    ctx.stroke();
    ctx.strokeStyle = oldStyle;
    // ctx.closePath()
  }

  [Symbol.iterator]() {
    let index = 0;
    const keys = Object.keys(this);
    return {
      next: () => {
        if (index < keys.length) {
          return { value: this[keys[index++]], done: false };
        } else {
          return { done: true };
        }
      },
    };
  }
}

const actor = new Box(new Point(100, 20), 60, 60, "#09f");

let yX = innerWidth / 2 - 240 / 2;
let yY = innerHeight - 240 - 100;
const yellowB = new Box(new Point(yX, yY), 240, 240, "yellow");

const groundB = new Box(new Point(0, cssH / 2), 50, cssW / 2, "brown");
let boxList = [yellowB, groundB];

// ---- input ----
const keys = { left: false, right: false, jump: false };
window.addEventListener("keydown", (e) => {
  if (e.key === "a") keys.left = true;
  if (e.key === "d") keys.right = true;
  if (e.key === "w") keys.jump = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key === "a") keys.left = false;
  if (e.key === "d") keys.right = false;
  if (e.key === "w") keys.jump = false;
});

// ---- physics params (tweak these for feel) ----
const GRAVITY = 2000; // px / s^2
const MOVE_ACCEL = 6000; // px / s^2 (horizontal accel)
const MAX_SPEED = 600; // px / s (max horizontal speed)
const AIR_DRAG = 0.9; // multiplier applied per second in air
const GROUND_FRICTION = 10; // when no input on ground, reduce vx (px / s^2)
const JUMP_SPEED = 900; // initial jump velocity px / s
const MAX_DT = 0.05; // clamp dt to avoid huge jumps (50 ms)

// ---- game loop (uses deltaTime) ----
let lastTime = performance.now();

/**
 * @param {number} now
 */
function loop(now) {
  let dt = (now - lastTime) / 1000;
  if (dt > MAX_DT) dt = MAX_DT;
  lastTime = now;

  ctx.beginPath();
  const W = canvas._cssWidth,
    H = canvas._cssHeight;
  ctx.clearRect(0, 0, W, H);

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
    actor.vx -= MOVE_ACCEL * dt;
  } else if (keys.right && !keys.left) {
    actor.vx += MOVE_ACCEL * dt;
  }

  // if (actor.onGround) {
  // let lorf = actor.vx > 0 ? -1 : 1;
  // let grnd = GROUND_FRICTION * 100 * dt * lorf;
  // actor.vx += grnd;
  // if (actor.vx / grnd >= 0 && actor.vx / grnd <= 1) actor.vx = 0;
  // } else {
  // actor.vx *= Math.pow(AIR_DRAG, dt);
  // }

  // clamp horizontal speed
  if (actor.vx > MAX_SPEED) actor.vx = MAX_SPEED;
  if (actor.vx < -MAX_SPEED) actor.vx = -MAX_SPEED;

  // jumping (only if on ground)
  // if (keys.jump) {
  //   actor.vx *= Math.pow(AIR_DRAG, dt);
  //   actor.vy = -JUMP_SPEED;
  //   // actor.onGround = false;
  // }

  // gravity
  actor.vy += GRAVITY * dt;

  // let userLine = new Line(
  //   new Point(actor.C.x - 10, actor.C.y - 10),
  //   new Point(actor.C.x + 10, actor.C.y + 10),
  // );
  // actor.onSurface = false
  // for (const boxes of boxList) {
  //   for (const boxLine of boxes.lines) {
  //     if (intersect(userLine, boxLine)) {
  //       actor.vy = 0;
  //       actor.point.y = boxLine.A.y - actor.h;
  //       // debugger
  //       let lorf = actor.vx > 0 ? -1 : 1;
  //       let grnd = GROUND_FRICTION * 100 * dt * lorf;
  //       actor.vx += grnd;
  //       if (actor.vx / grnd >= 0 && actor.vx / grnd <= 1) actor.vx = 0;
  //       actor.onSurface = true;
  //       continue;
  //     }
  //   }
  // }

  if (keys.jump && actor.onSurface) {
    actor.vx *= Math.pow(AIR_DRAG, dt);
    actor.vy = -JUMP_SPEED;
    actor.onSurface = false;
  }

  // integrate position
  let nextX = actor.point.x + actor.vx * dt;
  let nextY = actor.point.y + actor.vy * dt;

  // actor.point.x +=
  // actor.point.y += actor.vy * dt;

  let userLine = new Line(actor.C, new Point(nextX, nextY));

  // let test = new Line(new Point(100, 100), new Point(200, 200));
  // drawALine(test, "yellow");
  drawALine(userLine, "red");
  // debugger
  let _skip = false;
  for (const boxes of boxList) {
    if (_skip) continue;
    for (const boxLine of boxes.lines) {
      if (intersect(userLine, boxLine)) {
        let interPoint = line_intersect(
          userLine.A,
          userLine.B,
          boxLine.A,
          boxLine.B,
        );
        actor.vy = 0;
        // actor.point.y = boxLine.A.y - actor.h;
        // debugger
        nextX = interPoint.x;
        nextY = interPoint.y - actor.h;

        // console.log("#####################")
        // console.log(nextX,nextY)

        debugPoint(new Point(nextX, nextY), 5);
        debugPoint(new Point(actor.point.x, actor.point.y), 10);
        debugPoint(new Point(interPoint.x, interPoint.y), 15);

        actor.point.x = nextX;
        actor.point.y = nextY - 50;

        // debugger
        // sleep(1000)

        // let test = new Line(new Point(100, 100), new Point(200, 200));
        // drawALine(test, "white");

        debugger;

        let lorf = actor.vx > 0 ? -1 : 1;
        let grnd = GROUND_FRICTION * 100 * dt * lorf;
        actor.vx += grnd;
        if (actor.vx / grnd >= 0 && actor.vx / grnd <= 1) actor.vx = 0;
        actor.onSurface = true;
        _skip = false;
        continue;
      }
    }
  }

  // drawALine(test, "yellow");
  // debugger
  // sleep(100)

  actor.point.x = nextX;
  actor.point.y = nextY;

  // let userLine = new Line(
  //   new Point(actor.C.x - 10, actor.C.y - 10),
  //   new Point(actor.C.x + 10, actor.C.y + 10),
  // );

  // world bounds and floor collision
  const floorY = canvas._cssHeight - actor.h;
  if (actor.point.y >= floorY) {
    actor.point.y = floorY;
    actor.vy = 0;
    actor.onSurface = true;
  } else {
    actor.onSurface = false;
  }

  // let userLine = new Line(box.C, new Point(box.C.x, 9999));
  // let interCount = groundB.lines
  //   .map((boxLine) => intersect(userLine, boxLine))
  //   .filter(Boolean).length;
  // console.log(interCount)
  // debugger

  // keep inside horizontal bounds (simple clamp + small bounce)
  if (actor.point.x < 0) {
    actor.point.x = 0;
    actor.vx = 0;
  }
  if (actor.point.x + actor.w > canvas._cssWidth) {
    actor.point.x = canvas._cssWidth - actor.w - 10;
    actor.vx = 0;
  }
}

// ---- draw ----
function draw() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1
  // ctx.fillStyle = "#09f";
  // ctx.fillRect(actor.point.x, actor.point.y, actor.w, actor.h);
  actor.drawer();

  for (const bx of boxList) {
    bx.drawer();
  }

  // ctx.beginPath();
  // ctx.arc(95, 50, 40, 0, 2 * Math.PI);
  // ctx.strokeStyle = "blue";
  // ctx.stroke();

  // ctx.fillStyle = "rgba(255,255,255,0.85)";
  // ctx.font = "12px sans-serif";

  // x: ${box01.x} innerH: ${innerHeight}
  // y: ${box01.y} innerW: ${innerWidth}

  // w: ${box01.w}
  // h: ${box01.h}

  fillTextMultiLine(
    ctx,
    `
vx: ${Math.round(actor.vx)} px/s
vy: ${Math.round(actor.vy)} px/s
`,
    10,
    18,
  );
}

// start
requestAnimationFrame(loop);
