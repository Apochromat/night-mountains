let mountainsAmount = 3;
let starsAmount = 500;
let mountainsConfigurations = [
	{
		segments: 256,
		perlin: 0.01,
		roughness: 0.7,
		splashHeight: 10,
		mountainsHeight: 30,
		bias: -100,
		filtered: 5,
		color: "#191a4a",
		scroll: 0.33,
	},
	{
		segments: 256,
		perlin: 0.03,
		roughness: 0.6,
		splashHeight: 10,
		mountainsHeight: 50,
		bias: -50,
		filtered: 5,
		color: "#121327",
		scroll: 0.66,
	},
	{
		segments: 256,
		perlin: 0.06,
		roughness: 0.5,
		splashHeight: 10,
		mountainsHeight: 50,
		bias: 0,
		filtered: 5,
		color: "#090a05",
		scroll: 1,
	},
];

let canvas = document.getElementById("landscape"),
	ctx = canvas.getContext("2d"),
	dWidth = document.body.clientWidth,
	dHeight = Math.max(
		document.documentElement["clientHeight"],
		document.body["scrollHeight"],
		document.documentElement["scrollHeight"],
		document.body["offsetHeight"],
		document.documentElement["offsetHeight"]
	),
	mountains = [],
	stars = [];
canvas.width = dWidth;
canvas.height = dHeight;

for (let i = 0; i < mountainsAmount; i++) {
	mountains[i] = {
		...mountainsConfigurations[i],
		stepCounter: 0,
		generate: true,
		points: [{ x: 0, y: 0 }],
	};
}
for (let i = 0; i < starsAmount; i++) {
	stars[i] = {
		x: canvas.width * Math.random(),
		y: canvas.height * Math.random(),
		r: 2.5 * Math.random(),
		scroll: Math.random() / 20,
	};
}

function randomIntFromInterval(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

function draw() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "#110d17";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.shadowBlur = 10;
	ctx.shadowColor = "white";
	for (let star of stars) {
		ctx.beginPath();
		ctx.fillStyle = "white";
		ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.shadowBlur = 0;
	for (let mountain of mountains) {
		ctx.fillStyle = mountain.color;
		ctx.beginPath();
		console.log(mountain.points);
		ctx.moveTo(-100, canvas.height);
		for (let point of mountain.points) {
			ctx.lineTo(point.x, point.y);
		}
		ctx.lineTo(canvas.width + 100, canvas.height);
		ctx.closePath();
		ctx.fill();
	}
}

function step() {
	update();
	draw();

	setTimeout(function () {
		requestAnimationFrame(step);
	}, 10);
}

function update() {
	for (let mountain of mountains) {
		if (mountain.generate) {
			while (mountain.points[mountain.points.length - 1].x < canvas.width * 3) {
				mountain.stepCounter++;
				mountain.points.push({
					x: mountain.points[mountain.points.length - 1].x + canvas.width / mountain.segments,
					y: map_range(
						perlin.get(mountains.indexOf(mountain), mountain.stepCounter * mountain.perlin + 0.1),
						-1,
						1,
						(canvas.height * mountain.mountainsHeight) / 100 + mountain.bias,
						canvas.height + mountain.bias
					),
				});
			}

			let heightrange = (mountain.splashHeight * mountain.mountainsHeight * canvas.height) / 10000;
			for (let p of mountain.points) {
				p.y += ((Math.random() - 0.5) * (heightrange * 2 + 1) - heightrange) * mountain.roughness;
			}

			// Фильтрация N высочайших гор
			for (let index = 0; index < mountain.filtered; index++) {
				let min = canvas.height;
				let minPoint;
				for (let point of mountain.points) {
					if (min > point.y) {
						min = point.y;
						minPoint = point;
					}
				}
				mountain.points.splice(mountain.points.indexOf(minPoint), 1);
			}

			mountain.generate = false;
		} else {
			for (let point of mountain.points) {
				point.x -= mountain.scroll;
			}
			for (let star of stars) {
				star.x -= star.scroll;
				if (isNaN(star.x)) {
					console.log("NAN");
				}
			}

			for (let point of mountain.points) {
				if (point.x < -canvas.width) {
					mountain.points.push({
						x: point.x + canvas.width * 3,
						y: point.y,
					});
					mountain.points.splice(mountain.points.indexOf(point), 1);
				}
			}
			for (let star of stars) {
				if (star.x < -10) {
					stars.push({
						x: star.x + canvas.width + 10,
						y: canvas.height * Math.random(),
						r: 2.5 * Math.random(),
						scroll: Math.random() / 20,
					});
					stars.splice(stars.indexOf(star), 1);
				}
			}

			// Фильтрация нависших уступов
			for (let point of mountain.points) {
				let index = mountain.points.indexOf(point);
				if (index + 1 < mountain.points.length && index != 0) {
					let left = mountain.points[index - 1];
					let right = mountain.points[index + 1];
					if (point.x < left.x || point.x > right.x) {
						mountain.points.splice(index, 1);
						for (let p of mountain.points) {
							if (p.x === point.x) {
								mountain.points.splice(mountain.points.indexOf(p), 1);
								break;
							}
						}
					}
				}
			}
		}
	}
}

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

step();
