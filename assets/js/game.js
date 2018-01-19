if (typeof window.yodorada === 'undefined') {
	window.yodorada = {};
}

(function($) {
	"use strict";
	// browser check
	$.uaMatch = function(ua) {
	  ua = ua.toLowerCase();

	  var match = /(chrome)[ \/]([\w.]+)/.exec(ua) ||
	    /(webkit)[ \/]([\w.]+)/.exec(ua) ||
	    /(opera)(?:.*version|)[ \/]([\w.]+)/.exec(ua) ||
	    /(msie) ([\w.]+)/.exec(ua) ||
	    ua.indexOf("compatible") < 0 && /(mozilla)(?:.*? rv:([\w.]+)|)/.exec(ua) ||
	    [];

	  return {
	    browser: match[1] || "",
	    version: match[2] || "0"
	  };
	};
	// Don't clobber any existing $.browser in case it's different
	if (!$.browser) {
	  var matched = $.uaMatch(navigator.userAgent);
	  var browser = {};

	  if (matched.browser) {
	    browser[matched.browser] = true;
	    browser.version = matched.version;
	  }

	  // Chrome is Webkit, but Webkit is also Safari.
	  if (browser.chrome) {
	    browser.webkit = true;
	  } else if (browser.webkit) {
	    browser.safari = true;
	  }

	  $.browser = browser;
	}
	function shuffle(array) {
	    let counter = array.length;

	    // While there are elements in the array
	    while (counter > 0) {
	        // Pick a random index
	        let index = Math.floor(Math.random() * counter);

	        // Decrease counter by 1
	        counter--;

	        // And swap the last element with it
	        let temp = array[counter];
	        array[counter] = array[index];
	        array[index] = temp;
	    }

	    return array;
	}
	window.yodorada.game = function() {
		var gameID = 'blahHunt';

		var randBetween = function(min, max) {
			return Math.floor(Math.random() * (max - min + 1) + min);
		};

		var imageRepository = new function() {

			this.assets = [{
					name: "spaceship",
					src: "rocket.png"
				}, {
					name: "spaceshipmed",
					src: "rocketmed.png"
				}, {
					name: "spaceshiphi",
					src: "rockethi.png"
				}, {
					name: "enemy",
					src: "enemy.png"
				}, {
					name: "enemyalt",
					src: "enemy2.png"
				}

			];
			this.spaceship = new Image();
			this.spaceshipmed = new Image();
			this.spaceshiphi = new Image();
			this.bullet = new Image();
			this.enemy = new Image();
			this.enemyalt = new Image();

			this.count = 0;

			this.loadImg = function() {
				this[this.assets[this.count].name].onload = function() {
					imageRepository.count++;
					if (imageRepository.count != imageRepository.assets.length) {
						imageRepository.loadImg();
					} else {
						window.yodorada.blahHunt.init();
					}
				};
				this[this.assets[this.count].name].src = 'assets/images/' + this.assets[this.count].src;
			};

			this.loadImg();

		};

		



		function Drawable() {
			this.init = function(x, y, width, height) {
				// Defualt variables
				this.x = x;
				this.y = y;
				this.width = width;
				this.height = height;
			}

			this.speed = 0;
			this.canvasWidth = 0;
			this.canvasHeight = 0;
			this.collidableWith = [];
			this.isColliding = false;
			this.type = "";

			// Define abstract function to be implemented in child objects
			this.inVicinity = function() {};
			this.draw = function() {};
			this.move = function() {};
			this.isCollidableWith = function(object) {
				return (this.collidableWith.indexOf(object) !== -1);
			};
		}



		function Pool(maxSize) {
			var size = maxSize; // Max itms allowed in the pool
			var pool = [];

			this.getPool = function() {
				var obj = [];
				for (var i = 0; i < size; i++) {
					if (pool[i].alive) {
						obj.push(pool[i]);
					}
				}
				return obj;
			}

			/*
			 * Populates the pool array with the given object
			 */
			this.init = function(object) {
				if (object == "bullet") {
					for (var i = 0; i < size; i++) {
						// Initalize the object
						var bullet = new Bullet("bullet");
						bullet.init(0, 0, 80, 3);
						pool[i] = bullet;
					}
				} else if (object == "enemy" ||  object == "enemyalt") {
					for (var i = 0; i < size; i++) {
						var enemy = new Enemy();
						enemy.init(0, 0, imageRepository.enemy.width, imageRepository.enemy.height);
						pool[i] = enemy;
					}
				}
			};

			/*
			 * Grabs the last item in the list and initializes it and
			 * pushes it to the front of the array.
			 */
			this.get = function(x, y, speed) {
				if (!pool[size - 1].alive) {
					pool[size - 1].spawn(x, y, speed);
					pool.unshift(pool.pop());
				}
			};

			/*
			 * Grabs the last item in the list and initializes it and
			 * pushes it to the front of the array.
			 */
			this.getEnemy = function(x, y, aimX, aimY, wait) {
				if (!pool[size - 1].alive) {
					pool[size - 1].spawn(x, y, aimX, aimY, wait);
					pool.unshift(pool.pop());
				}
			};

			this.getBullet = function(x, y, direction) {
				if (!pool[size - 1].alive) {
					pool[size - 1].spawn(x, y, direction);
					pool.unshift(pool.pop());
				}
			};

			/*
			 * Draws any in use Bullets. If a bullet goes off the screen,
			 * clears it and pushes it to the front of the array.
			 */
			this.animate = function() {
				for (var i = 0; i < size; i++) {
					// Only draw until we find a bullet that is not alive


					if (pool[i].alive) {
						if (pool[i].draw()) {
							pool[i].clear();
							pool.push((pool.splice(i, 1))[0]);
						}
					} else {
						break;
					}
				}
			};
		}



		function Ship() {
			this.speed = 0.2;
			this.bulletPool = new Pool(50);
			var counter = 0;
			this.collidableWith = [] /*["enemy", "enemyalt"]*/ ;
			this.type = "ship";
			this.images = [imageRepository.spaceship, imageRepository.spaceshipmed, imageRepository.spaceshiphi];
			this.img = 0;
			this.anim = 1;
			this.fireDirection = "";

			this.init = function(x, y, width, height) {
				this.x = x;
				this.y = y;
				this.width = width;
				this.height = height;
				this.alive = true;
				this.isColliding = false;
				this.bulletPool.init("bullet");
				this.adjustmentPoint = [x, y];
				this.aimX = 0;
				this.aimY = 0;
				this.xp = x;
				this.yp = y;
				this.numlaser = 50;

			}

			this.draw = function() {
				this.context.save();
				this.context.translate(this.x, this.y);
				this.context.rotate(this.angle);
				this.context.drawImage(this.images[this.img], -(this.width / 2), -(this.height / 2));

				this.context.restore();
			};
			this.inVicinity = function() {
				var dx = this.aimX - this.x;
				var dy = this.aimY - this.y;

				dx *= (dx < 0 ? -1 : 1);
				dy *= (dy < 0 ? -1 : 1);
				if (
					dx < 5 &&
					dy < 5

				) {
					return true;
				}
				return false;
			};
			this.move = function() {
				counter++;

				this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);



				this.aimX = this.adjustmentPoint[0];
				this.aimY = this.adjustmentPoint[1];

				if (this.inVicinity()) {
					this.img = 0;
				} else {
					this.img = this.anim;
					this.anim = this.anim > 1 ? 1 : 2;
				}

				var dx = this.aimX - this.x;
				var dy = this.aimY - this.y;
				this.x += dx * this.speed;
				this.y += dy * this.speed;


				this.angle = (90 * (Math.PI / 180)) + Math.atan2(dy, dx);



				// Redraw the ship
				if (!this.isColliding) {
					this.draw();
					if (this.isFiring) {
						this.fire();
						this.isFiring = false;
					}
					this.bulletPool.animate();
				} else {
					this.alive = false;
					// game.gameOver();
				}


			};

			/*
			 * Fires  bullet
			 */
			this.fire = function() {
				if (this.numlaser) {
					this.bulletPool.getBullet(this.x, this.y, this.fireDirection);
					this.numlaser--;
				}

				// game.laser.get();
			};
		}
		Ship.prototype = new Drawable();

		/**
		 * Create the Enemy ship object.
		 */
		function Enemy() {
			this.alive = false;
			this.collidableWith = ["bullet"];
			this.type = "enemy";
			this.img = randBetween(1, 2);

			/*
			 * Sets the Enemy values
			 */
			this.spawn = function(x, y, aimX, aimY, wait) {
				this.x = x;
				this.y = y;
				this.aimX = aimX;
				this.aimY = aimY;
				this.count = 0;
				this.cycles = 0;
				this.wait = wait;
				this.randomSpecs();

				this.alive = true;
			};


			this.randomSpecs = function() {
				var minSpeed = 70,
					maxSpeed = 190;

				if (this.cycles > 100) {
					this.cycles = 10;
				}
				if (minSpeed - this.cycles > 10) {
					minSpeed -= this.cycles;
				}
				if (maxSpeed - this.cycles * 2 > minSpeed + 10) {
					maxSpeed -= this.cycles * 2;
				}
				this.speed = randBetween(minSpeed, maxSpeed) + randBetween(10, 400) / 10;
				this.speedX = this.speed + randBetween(-.5, .1);
				this.speedY = this.speed + randBetween(-.5, .1);

				if (randBetween(1, 20) > 17) {
					var randomized = window.yodorada.blahHunt.randomizeCoord();
					this.aimX = randomized.aimX;
					this.aimY = randomized.aimY;
				} else {
					this.aimX += randBetween(20, 80) * (randBetween(1, 2) == 2 ? -1 : 1);
					this.aimY += randBetween(20, 80) * (randBetween(1, 2) == 2 ? -1 : 1);
				}


				if (this.aimX < 0) {
					this.aimX = 30;
				}
				if (this.aimY < 0) {
					this.aimY = 30;
				}
				if (this.aimX > this.canvas.width) {
					this.aimX = this.canvas.width - 30;
				}
				if (this.aimY > this.canvas.height) {
					this.aimY = this.canvas.height - 30;
				}

				this.speedOffMap = randBetween(.5, 2);
				var minCount = 150 - this.cycles * 2,
					maxCount = 300 - this.cycles * 2;
				if (minCount < 30) {
					minCount = 30;
				}
				if (maxCount < 45) {
					maxCount = 45;
				}
				this.countUntilFollow = randBetween(minCount, maxCount);
			};

			this.offMap = function() {
				if (
					this.x > this.canvas.width - 15 ||
					this.x < 15 ||
					this.y > this.canvas.height - 15 ||
					this.y < 15

				) {
					return true;
				}
				return false;
			};

			this.inVicinity = function() {
				var dx = this.aimX - this.x;
				var dy = this.aimY - this.y;
				dx *= (dx < 0 ? -1 : 1);
				dy *= (dy < 0 ? -1 : 1);
				if (
					dx < 10 &&
					dy < 10

				) {
					return true;
				}
				return false;
			};

			/*
			 * Move the enemy
			 */
			this.draw = function() {

				this.count++;

				if (this.wait > 0) {
					this.wait--;
					return false;
				}

				if (this.count == this.countUntilFollow || (this.count > 30 && this.inVicinity())) {
					this.aimX = window.yodorada.blahHunt.mousecoords[0];
					this.aimY = window.yodorada.blahHunt.mousecoords[1];
					this.cycles++;
					this.count = 0;
					this.randomSpecs();
				}


				if (this.offMap()) {
					var addX, addY;
					addX = this.aimX > this.x ? this.speedOffMap : -this.speedOffMap;
					addY = this.aimY > this.y ? this.speedOffMap : -this.speedOffMap;

					if (addX > 0) {
						if (this.x + addX <= this.aimX) {
							this.x += addX;
						}
					} else {
						if (this.x + addX >= this.aimX) {
							this.x += addX;
						}
					}

					if (addY > 0) {
						if (this.y + addY <= this.aimY) {
							this.y += addY;
						}
					} else {
						if (this.y + addY >= this.aimY) {
							this.y += addY;
						}
					}

				} else {
					var dx = this.aimX - this.x;
					var dy = this.aimY - this.y;
					this.x += dx / this.speedX;
					this.y += dy / this.speedY;
				}



				if (!this.isColliding) {
					var imgSrc = imageRepository.enemy;
					if (this.img == 2) {
						imgSrc = imageRepository.enemyalt;
					}
					this.context.drawImage(imgSrc, this.x, this.y);


					return false;
				} else {
					window.yodorada.blahHunt.playerScore += 10;
					window.yodorada.blahHunt.boom(this.x, this.y);
					return true;
				}
			};

			/*
			 * Resets the enemy values
			 */
			this.clear = function() {
				this.x = 0;
				this.y = 0;
				this.speed = 0;
				this.speedX = 0;
				this.speedY = 0;
				this.alive = false;
				this.isColliding = false;
			};
		}
		Enemy.prototype = new Drawable();



		/**
		 * Creates the Bullet object which the ship fires. The bullets are
		 * drawn on the "main" canvas.
		 */
		function Bullet(object) {
			this.alive = false; // Is true if the bullet is currently in use
			var self = object;
			this.lifespan = 0;

			this.width = 0;
			this.height = 0;
			this.sideLong = 100;
			this.sideShort = 5;
			this.collidableWith = ["enemy"];
			this.type = "bullet";
			/*
			 * Sets the bullet values
			 */
			this.spawn = function(x, y, direction) {
				this.x = x;
				this.y = y;
				this.spawnX = x;
				this.spawnY = y;
				this.direction = direction;
				this.alive = true;
				this.lifespan = 5;
				this.alphaVal = 1 / this.lifespan;
				this.count = 0;
				this.collisions = 0;
			};

			this.draw = function() {
				if (this.lifespan < 1 || this.collisions > 4 || !this.alive) {
					return true;
				} else if (
					this.y <= 0 - this.canvas.height ||
					this.y > this.canvas.height ||
					this.x > this.canvas.width ||
					this.x <= 0 - this.canvas.width
				) {
					return true;
				} else {
					var origX = this.spawnX,
						origY = this.spawnY,
						rect, grd;

					if (this.direction == "RIGHT") {
						origX += imageRepository.spaceship.width / 1.5 + this.count;
						rect = {
							x: origX,
							y: origY,
							width: this.sideLong,
							height: this.sideShort
						};
						grd = this.context.createLinearGradient(origX, origY, origX + this.width, 0);
					} else if (this.direction == "LEFT") {
						origX += (imageRepository.spaceship.width / 1.5 + this.sideLong + this.count) * -1;
						rect = {
							x: origX,
							y: origY,
							width: this.sideLong,
							height: this.sideShort
						};
						grd = this.context.createLinearGradient(origX, origY, origX + this.width, 0);
					} else if (this.direction == "UP") {
						origY += (imageRepository.spaceship.height / 1.5 + this.sideLong + this.count) * -1;
						rect = {
							x: origX,
							y: origY,
							width: this.sideShort,
							height: this.sideLong
						};
						grd = this.context.createLinearGradient(origX, origY, 0, origY + this.height);
					} else if (this.direction == "DOWN") {
						origY += imageRepository.spaceship.height / 1.5 + this.count;
						rect = {
							x: origX,
							y: origY,
							width: this.sideShort,
							height: this.sideLong
						};
						grd = this.context.createLinearGradient(origX, origY, 0, origY + this.height);
					} else {
						return true;
					}

					this.x = rect.x;
					this.y = rect.y;
					this.width = rect.width;
					this.height = rect.height;

					this.context.strokeStyle = 'rgba(239, 140, 241,' + (this.alphaVal * this.lifespan) + ')';
					this.context.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);


					grd.addColorStop(0, 'rgba(239, 140, 241,' + (this.alphaVal * this.lifespan) + ')');
					grd.addColorStop(1, 'rgba(255,255,255,' + (this.alphaVal * this.lifespan) + ')');
					this.context.fillStyle = grd;
					this.context.fillRect(this.x, this.y, this.width, this.height);

					this.count += 2;
					this.lifespan--;

					return false;
				}
			};

			/*
			 * Resets the bullet values
			 */
			this.clear = function() {
				this.x = 0;
				this.y = 0;
				this.speed = 0;
				this.alive = false;
				this.isColliding = false;
			};
		}
		Bullet.prototype = new Drawable();

		window.yodorada.blahHunt =   {
			bgCanvas: {},
			bgContext: {},
			shipCanvas: {},
			shipContext: {},
			enemyCanvas: {},
			enemyContext: {},
			actionCanvas: {},
			actionContext: {},
			emitterCanvas: {},
			emitterContext: {},
			explosions: {},
			parent: {},
			gameID: '',
			mousecoords: [0, 0],
			mouseX: -1,
			mouseY: -1,
			initFn: [],
			keyCode: -1,
			keyLetter: "",
			bulletDirection: "",
			spawns: 15,
			spawnsPlus: 15,
			playerScore: 0,
			gameLevel: 1,
			resize: function() {
				var self = window.yodorada.blahHunt;
				self.bgCanvas.width = self.parent.width();
				self.bgCanvas.height = self.parent.height();
				self.shipCanvas.width = self.parent.width();
				self.shipCanvas.height = self.parent.height();
				self.enemyCanvas.width = self.parent.width();
				self.enemyCanvas.height = self.parent.height();
				self.actionCanvas.width = self.parent.width();
				self.actionCanvas.height = self.parent.height();
				self.emitterCanvas.width = self.parent.width();
				self.emitterCanvas.height = self.parent.height();
			},
			detectCollision: function() {
				var self = window.yodorada.blahHunt;

				var bullets = self.ship.bulletPool.getPool();
				var enemies = self.enemyPool.getPool();

				for (var x = 0; x < enemies.length; x++) {
					if (!enemies[x].alive) {
						break;
					}
					if (	enemies[x].isCollidableWith(self.ship.type) &&
							(enemies[x].x < self.ship.x + self.ship.width &&
							enemies[x].x + enemies[x].width > self.ship.x &&
							enemies[x].y < self.ship.y + self.ship.height &&
							enemies[x].y + enemies[x].height > self.ship.y)
						) {
						enemies[x].isColliding = true;
						self.ship.isColliding = true;
						console.log(enemies[x], self.ship);
						break;
					}

					for (var y = 0; y < bullets.length; y++) {
						if (!bullets[y].alive) {
							continue;
						}
						if (enemies[x].isCollidableWith("bullet") &&
							(enemies[x].x < bullets[y].x + bullets[y].width &&
								enemies[x].x + enemies[x].width > bullets[y].x &&
								enemies[x].y < bullets[y].y + bullets[y].height &&
								enemies[x].y + enemies[x].height > bullets[y].y)
						) {
							enemies[x].isColliding = true;
							bullets[y].collision++;
						}
					}
				}
			},
			displayVars: function() {
				var self = window.yodorada.blahHunt;
				self.display.find('#numlaser span').eq(0).html(self.ship.numlaser);
				self.display.find('#numlevel span').eq(0).html(self.gameLevel);
				self.display.find('#playerscore span').eq(0).html(self.playerScore);
			},

			animate: function() {
				var self = window.yodorada.blahHunt;

				self.detectCollision();
				self.displayVars();

				requestAnimFrame(self.animate);
				if (self.mouseX > -1 && self.mouseY > -1) {
					var offset = $("#" + window.yodorada.blahHunt.gameID).offset();
					self.mousecoords = [self.mouseX - offset.left, self.mouseY - offset.top];
					var pt = [(self.mousecoords[0] - (self.bgCanvas.width / 2)) / 25, (self.mousecoords[1] - (self.bgCanvas.height / 2)) / 25];
					self.starfield.adjustmentPoint = pt;
					self.ship.adjustmentPoint = self.mousecoords;
				}
				self.starfield.animate();

				if (self.enemyPool.getPool().length === 0) {
					self.levelUp();
				}

				self.actionContext.clearRect(0, 0, self.actionCanvas.width, self.actionCanvas.height);

				

				self.ship.move();
				self.enemyContext.clearRect(0, 0, self.enemyCanvas.width, self.enemyCanvas.height);
				self.enemyPool.animate();


			},
			levelUp: function() {
				var self = window.yodorada.blahHunt;
				self.gameLevel++;
				self.spawns = self.spawnsPlus * self.gameLevel;

				self.enemyPool = null;

				self.enemyPool = new Pool(self.spawns);
				self.enemyPool.init("enemy");
				self.spawnWave();

			},
			spawnWave: function() {
				var self = window.yodorada.blahHunt;
				var height = imageRepository.enemy.height;
				var width = imageRepository.enemy.width;
				var randomized = self.randomizeCoord();
				var x = randomized.x,
					y = randomized.y,
					aimY = randomized.aimY,
					aimX = randomized.aimX;
				var wait = 0;

				for (var i = 1; i <= self.spawns; i++) {
					x = randBetween(1, self.enemyCanvas.width);
					if (i % 15 === 0) {
						wait += 15;
					}
					if (i % 8 === 0) {
						aimX = randBetween(50, self.enemyCanvas.width - 50);
						aimY = randBetween(self.enemyCanvas.height - 120, self.enemyCanvas.height - 60);
						if (randBetween(1, 2) === 1) {
							y = randBetween(-120, -height);
							aimY = randBetween(self.enemyCanvas.height - 120, self.enemyCanvas.height - 60);
						} else {
							y = randBetween(self.enemyCanvas.height + height, self.enemyCanvas.height + 120);
							aimY = randBetween(50, 90);
						}
					}
					this.enemyPool.getEnemy(x, y, aimX, aimY, wait);

				}
			},
			randomizeCoord: function() {
				var self = window.yodorada.blahHunt;

				var height = imageRepository.enemy.height;
				var width = imageRepository.enemy.width;
				var x, y;
				var aimY, aimX = randBetween(50, self.enemyCanvas.width - 50);
				if (randBetween(1, 2) === 1) {
					y = randBetween(-120, -height);
					aimY = randBetween(self.enemyCanvas.height - 120, self.enemyCanvas.height - 60);
				} else {
					y = randBetween(self.enemyCanvas.height + height, self.enemyCanvas.height + 120);
					aimY = randBetween(50, 90);
				}
				return {
					x: x,
					y: y,
					aimX: aimX,
					aimY: aimY
				};
			},
			boom: function(x, y) {
				// var self = window.yodorada.blahHunt;
				// var size = 5,
				// 	c = 'rgba(255,255,255,1)',
				// 	props = {
				// 		vx: 0,
				// 		vx: 0,
				// 		decay: 0.04
				// 	};
				// for (var i = 0, l = 12; i < l; i++) {
				// 	props.vx = Math.random() * 4 - 2;
				// 	props.vy = Math.random() * 4 - 2;
				// 	self.explosions.create(x, y, size, c, props);
				// }
			},
			fire: function() {
				var self = window.yodorada.blahHunt;
				self.ship.fireDirection = self.bulletDirection;
				self.ship.isFiring = true;
			},
			init: function() {
				var self = this;
				self.gameID = gameID;
				self.parent = $("#" + gameID).find('#blahHuntCanvases');
				self.display = $("#" + gameID).find('#blahHuntVars');
				self.bgCanvas = document.getElementById('bgcanvas');
				self.bgContext = self.bgCanvas.getContext("2d");
				self.enemyCanvas = document.getElementById('enemycanvas');
				self.enemyContext = self.enemyCanvas.getContext("2d");
				self.shipCanvas = document.getElementById('shipcanvas');
				self.shipContext = self.shipCanvas.getContext("2d");
				self.actionCanvas = document.getElementById('actioncanvas');
				self.actionContext = self.actionCanvas.getContext("2d");
				self.emitterCanvas = document.getElementById('emittercanvas');
				self.emitterContext = self.emitterCanvas.getContext("2d");


				$(window).resize(function() {
					window.yodorada.blahHunt.resize();
				})
				$(window).trigger('resize');

				$(document).keyup(function(evt) {
					var key = evt.which,
						letter = "",
						direction = "";
					switch (key) {
						case 87:
							letter = "W";
							direction = "UP";
							break;
						case 65:
							letter = "A";
							direction = "LEFT";
							break;
						case 83:
							letter = "S";
							direction = "DOWN";
							break;
						case 68:
							letter = "D";
							direction = "RIGHT";
							break;
						default:
							key = -1;
							break;
					}
					window.yodorada.blahHunt.keyCode = key;
					window.yodorada.blahHunt.keyLetter = letter;
					window.yodorada.blahHunt.bulletDirection = direction;
					if (key > 0) {
						window.yodorada.blahHunt.fire();
					}
					evt.preventDefault();
				});


				Ship.prototype.canvas = self.shipCanvas;
				Ship.prototype.context = self.shipContext;
				Ship.prototype.canvasWidth = self.shipCanvas.width;
				Ship.prototype.canvasHeight = self.shipCanvas.height;

				Enemy.prototype.canvas = self.enemyCanvas;
				Enemy.prototype.context = self.enemyContext;
				Enemy.prototype.canvasWidth = self.enemyCanvas.width;
				Enemy.prototype.canvasHeight = self.enemyCanvas.height;

			

				Bullet.prototype.canvas = self.actionCanvas;
				Bullet.prototype.context = self.actionContext;
				Bullet.prototype.canvasWidth = self.actionCanvas.width;
				Bullet.prototype.canvasHeight = self.actionCanvas.height;

				self.ship = new Ship();
				// Set the ship to start near the bottom middle of the canvas
				var shipStartX = self.shipCanvas.width / 2 - imageRepository.spaceship.width / 2;
				var shipStartY = self.shipCanvas.height / 2 - imageRepository.spaceship.height / 2;
				self.ship.init(shipStartX, shipStartY, imageRepository.spaceship.width, imageRepository.spaceship.height);
				self.ship.draw();

				// Initialize the enemy pool object
				self.enemyPool = new Pool(self.spawns);
				self.enemyPool.init("enemy");
				self.spawnWave();




				$("#" + window.yodorada.blahHunt.gameID).mousemove(function(evt) {
					self.mouseX = evt.pageX;
					self.mouseY = evt.pageY;
				});

				self.initFn.forEach(function(obj) {
					obj.bgCanvas = self.bgCanvas;
					obj.bgContext = self.bgContext;
					obj.enemyCanvas = self.enemyCanvas;
					obj.enemyContext = self.enemyContext;
					obj.shipCanvas = self.shipCanvas;
					obj.shipContext = self.shipContext;
					obj.init();
				});

				self.animate();

			}
		};

		window.yodorada.blahHunt.starfield = {
			bgCanvas: {},
			context: {},
			stars: {},
			adjustmentPoint: [0, 0],
			starDensity: 20,

			makeStars: function(density) {
				var self = window.yodorada.blahHunt.starfield;
				var totalStars = (Math.floor(self.bgCanvas.width / 72)) * (Math.floor(self.bgCanvas.height / 72)) * density;

				var randomX, randomY, randomZ;
				var sortable = [];
				for (var i = 0; i < totalStars; i++) {
					randomX = Math.random() * (self.bgCanvas.width - 1) + 1;
					randomY = Math.random() * (self.bgCanvas.height - 1) + 1;
					randomZ = Math.random() * 2;
					self.stars[i] = [randomX, randomY, randomZ];
					sortable.push(randomZ);
				}
				sortable.sort();


				for (var i in self.stars) {
					self.stars[i][2] = sortable[i];
				}
			},

			animate: function() {
				var self = window.yodorada.blahHunt.starfield;
				self.bgContext.clearRect(0, 0, self.bgCanvas.width, self.bgCanvas.height);
				self.bgContext.fillStyle = "#FF0000";
				for (var i in self.stars) {
					self.bgContext.fillStyle = self.blendColors("#FFFFFF", "#ef8cf1", 1 - self.stars[i][2] / 10 * 2);
					self.bgContext.fillRect(self.stars[i][0], self.stars[i][1], self.stars[i][2], self.stars[i][2]);
				}
				self.updateStars();
			},

			updateStars: function() {
				var self = window.yodorada.blahHunt.starfield;
				for (var i in self.stars) {
					self.stars[i][0] -= self.adjustmentPoint[0] * self.stars[i][2] / 20;
					self.stars[i][1] -= self.adjustmentPoint[1] * self.stars[i][2] / 20;
					if (self.stars[i][0] >= self.bgCanvas.width) {
						self.stars[i][0] = -5;
					}
					if (self.stars[i][1] >= self.bgCanvas.height) {
						self.stars[i][1] = -5;
					}
					if (self.stars[i][0] < -6) {
						self.stars[i][0] = self.bgCanvas.width;
					}
					if (self.stars[i][1] < -6) {
						self.stars[i][1] = self.bgCanvas.height;
					}
				}
			},

			blendColors: function(c0, c1, p) {
				var f = parseInt(c0.slice(1), 16),
					t = parseInt(c1.slice(1), 16),
					R1 = f >> 16,
					G1 = f >> 8 & 0x00FF,
					B1 = f & 0x0000FF,
					R2 = t >> 16,
					G2 = t >> 8 & 0x00FF,
					B2 = t & 0x0000FF;
				return "#" + (0x1000000 + (Math.round((R2 - R1) * p) + R1) * 0x10000 + (Math.round((G2 - G1) * p) + G1) * 0x100 + (Math.round((B2 - B1) * p) + B1)).toString(16).slice(1);
			},


			init: function() {
				var self = window.yodorada.blahHunt.starfield;
				self.makeStars(self.starDensity);


			}
		};

		window.yodorada.blahHunt.initFn.push(window.yodorada.blahHunt.starfield);
		

		window.requestAnimFrame = (function() {
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function( /* function */ callback, /* DOMElement */ element) {
					window.setTimeout(callback, 1000 / 60);
				};
		})();

	};
})(jQuery);