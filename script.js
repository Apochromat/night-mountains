let perlin = {
	rand_vect: function () {
		let theta = Math.random() * 2 * Math.PI;
		return { x: Math.cos(theta), y: Math.sin(theta) };
	},
	dot_prod_grid: function (x, y, vx, vy) {
		let g_vect;
		let d_vect = { x: x - vx, y: y - vy };
		if (this.gradients[[vx, vy]]) {
			g_vect = this.gradients[[vx, vy]];
		} else {
			g_vect = this.rand_vect();
			this.gradients[[vx, vy]] = g_vect;
		}
		return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
	},
	smootherstep: function (x) {
		return 6 * x ** 5 - 15 * x ** 4 + 10 * x ** 3;
	},
	interp: function (x, a, b) {
		return a + this.smootherstep(x) * (b - a);
	},
	seed: function () {
		this.gradients = {};
		this.memory = {};
	},
	get: function (x, y) {
		if (this.memory.hasOwnProperty([x, y])) return this.memory[[x, y]];
		let xf = Math.floor(x);
		let yf = Math.floor(y);
		//interpolate
		let tl = this.dot_prod_grid(x, y, xf, yf);
		let tr = this.dot_prod_grid(x, y, xf + 1, yf);
		let bl = this.dot_prod_grid(x, y, xf, yf + 1);
		let br = this.dot_prod_grid(x, y, xf + 1, yf + 1);
		let xt = this.interp(x - xf, tl, tr);
		let xb = this.interp(x - xf, bl, br);
		let v = this.interp(y - yf, xt, xb);
		this.memory[[x, y]] = v;
		return v;
	},
};
perlin.seed();

function map_range(value, low1, high1, low2, high2) {
	return low2 + ((high2 - low2) * (value - low1)) / (high1 - low1);
}

var canvas = document.getElementById("landscape"),
	ctx = canvas.getContext("2d"),
	dWidth = document.body.clientWidth,
	dHeight = Math.max(
		document.documentElement["clientHeight"],
		document.body["scrollHeight"],
		document.documentElement["scrollHeight"],
		document.body["offsetHeight"],
		document.documentElement["offsetHeight"]
	),
	mountains = {},
	config = {
		segments: 256,
		perlin: 0.02,
		roughness: 0.7,
		splashHeight: 20,
		mountainsHeight: 50,
		bias: 0,
		filtered: 5,
	},
	roughness = config.roughness,
	stepCounter = 0,
	generate = true,
	points = [];

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#110d17";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#191a4a";
	ctx.beginPath();
	console.log(points);
	ctx.moveTo(-100, canvas.height);
	for (let point of points) {
		ctx.lineTo(point.x, point.y);
	}
	ctx.lineTo(canvas.width + 100, canvas.height);
	ctx.closePath();
	ctx.fill();
}

function step() {
	update();
	draw();

	setTimeout(function () {
		requestAnimationFrame(step);
	}, 10);
}

function update() {
	if (generate) {
		while (points[points.length - 1].x < canvas.width * 3) {
			stepCounter++;
			points.push({
				x: points[points.length - 1].x + canvas.width / config.segments,
				y: map_range(
					perlin.get(1, stepCounter * config.perlin + 0.1),
					-1,
					1,
					(canvas.height * config.mountainsHeight) / 100 + config.bias,
					canvas.height + config.bias
				),
			});
		}

		heightrange = (config.splashHeight * config.splashHeight * canvas.height) / 10000;
		for (let p of points) {
			p.y += ((Math.random() - 0.5) * (heightrange * 2 + 1) - heightrange) * roughness;
		}

		// Фильтрация N высочайших гор
		for (let index = 0; index < config.filtered; index++) {
			let min = canvas.height;
			let minPoint;
			for (let point of points) {
				if (min > point.y) {
					min = point.y;
					minPoint = point;
				}
			}
			points.splice(points.indexOf(minPoint), 1);
		}

		generate = false;
	} else {
		for (let point of points) {
			point.x -= 1;
		}
		for (let point of points) {
			if (point.x < -canvas.width) {
				points.push({
					x: point.x + canvas.width * 3,
					y: point.y,
				});
				points.splice(points.indexOf(point), 1);
			}
		}

		// Фильтрация нависших уступов
		for (let point of points) {
			let index = points.indexOf(point);
			if (index + 1 < points.length && index != 0) {
				let left = points[index - 1];
				let right = points[index + 1];
				if (point.x < left.x || point.x > right.x) {
					points.splice(index, 1);
					for (let p of points) {
						if (p.x === point.x) {
							points.splice(points.indexOf(p), 1);
							break;
						}
					}
				}
			}
		}
	}
}

canvas.width = dWidth;
canvas.height = dHeight;
points.push({ x: 0, y: canvas.height / 2 });
points.push({ x: canvas.width / config.segments, y: canvas.height / 2 });
generate = true;
step();
