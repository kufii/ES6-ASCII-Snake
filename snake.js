/* jshint esnext:true */
const settings = {
    size: {
        width: 41,
        height: 41
    },
    bindings: {
        up: 38,
        down: 40,
        left: 37,
        right: 39,
        reset: 32
    },
    difficulty: 'M',
    showFPS: false
};

{
	let popupButtonClick = e => {
		e.preventDefault();
		let target = document.querySelector(`#${e.target.dataset.target}`);
		target.classList.toggle('hidden');
	};
	[].forEach.call(document.querySelectorAll('.popup-button'), button => button.onclick = popupButtonClick);

    let keybindingKeyDown = e => {
        e.preventDefault();
        e.target.value = e.keyCode;
    };
    [].forEach.call(document.querySelectorAll('.keybinding'), keybinding => keybinding.onkeydown = keybindingKeyDown);
}
{
	let difficultyDropdown = document.querySelector('#settings-difficulty');
    let chkShowFPS = document.querySelector('#settings-fps');
    let keyUpBox = document.querySelector('#settings-key-up');
    let keyDownBox = document.querySelector('#settings-key-down');
    let keyLeftBox = document.querySelector('#settings-key-left');
    let keyRightBox = document.querySelector('#settings-key-right');
    let settingsDiv = document.querySelector('#settings-div');
    
    let loadLocalStorage = () => {
        difficultyDropdown.value = localStorage.difficulty || settings.difficulty;
        chkShowFPS.checked = localStorage.showFPS !== undefined ? localStorage.showFPS === 'true' : settings.showFPS;
        keyUpBox.value = localStorage.keyUp || settings.bindings.up;
        keyDownBox.value = localStorage.keyDown || settings.bindings.down;
        keyLeftBox.value = localStorage.keyLeft || settings.bindings.left;
        keyRightBox.value = localStorage.keyRight || settings.bindings.right;
    };
    let saveLocalStorage = () => {
        localStorage.difficulty = difficultyDropdown.value;
        localStorage.showFPS = chkShowFPS.checked;
        localStorage.keyUp = keyUpBox.value;
        localStorage.keyDown = keyDownBox.value;
        localStorage.keyLeft = keyLeftBox.value;
        localStorage.keyRight = keyRightBox.value;
        game.loadSettings();
    };
	
	document.querySelector('#settings-save').onclick = e => {
		e.preventDefault();
		saveLocalStorage();
        settingsDiv.classList.add('hidden');
	};
    document.querySelector('#settings-cancel').onclick = e => {
        e.preventDefault();
        settingsDiv.classList.add('hidden');
        loadLocalStorage();
    };
    
    loadLocalStorage();
}


class Game {
	constructor(container, width, height) {
		this.width = width;
		this.height = height;
		this.container = container;
		this.gameCanvas = [];
        this.showFPS = false;
        this.fps = 0;
		this.pressed = {};
		this.bindings = {};
		this.difficulty = {
			E: 60,
			M: 40,
			H: 20
		};

		this.board = new GameBoard();
		this.snake = new Snake(10, Math.floor(this.height / 2));
		this.fruit = new Fruit(this.width - 10, Math.floor(this.height / 2));
        this.fruitType = '';
		this.mines = [];
		this.chanceOfMine = 0.45;

		this.score = 0;
		this.lastUpdate = 0;
		this.STOP = false;
        this.loadSettings();
		this.bindEvents();
		this.clearCanvas();
	}
    
    loadSettings() {
        this.bindings = {
            UP: localStorage.keyUp || settings.bindings.up,
			DOWN: localStorage.keyDown || settings.bindings.down,
			LEFT: localStorage.keyLeft || settings.bindings.left,
			RIGHT: localStorage.keyRight|| settings.bindings.right,
			RESET: settings.bindings.reset
		};
        this.snake.timeToMove = this.difficulty[localStorage.difficulty || settings.difficulty];
        this.showFPS = localStorage.showFPS !== undefined ? localStorage.showFPS === 'true' : settings.showFPS;
        this.genBindings();
    }

	genBindings() {
		this._bindings = {};
		for(let key in this.bindings) {
			this._bindings[this.bindings[key]] = key;
		}
	}

	bindEvents() {
		window.onkeydown = e => {
			let key = this._bindings[e.keyCode];
			if(!key) return;
			e.preventDefault();

			this.pressed[key] = true;
			if(game.STOP && this.pressed.RESET) {
				game = new Game(canvas, settings.size.width, settings.size.height);
				game.countdownToStart();
			}
		};
		window.onkeyup = e => {
			let key = this._bindings[e.keyCode];
			if(!key) return;
			e.preventDefault();

			this.pressed[key] = false;
		};
	}

	countdownToStart(count = 3) {
		this.draw();
		let id = setInterval(() => {
			if(count > 0) {
				this.drawText(count);
				this.drawCanvas();
				count -= 1;
			} else {
				clearInterval(id);
				this.start();
			}
		}, 1000);
	}

	start() {
		this.lastUpdate = Date.now();
		let numFrames = 0;
		let last = Date.now();
		let frame = () => {
			if(this.STOP) {
				this.drawText('GAME OVER', null, Math.floor((game.height - 1) / 2) - 1);
				this.drawText('(PRESS SPACE)', null, Math.floor((game.height - 1) / 2) + 1);
				this.drawCanvas();
				return;
			}
			let now = Date.now();
			numFrames += 1;
			if(now - last >= 1000) {
				last = now;
				this.fps = numFrames;
				numFrames = 0;
			}
			this.update(now - this.lastUpdate);
			this.draw();
			this.lastUpdate = now;
			window.requestAnimationFrame(frame);
		};
		frame();
	}

	update(delta) {
		this.snake.update(delta);
	}

	draw() {
		this.clearCanvas();
		this.snake.draw();
		this.mines.forEach(mine => mine.draw());
		this.fruit.draw();
		this.board.draw();
		this.drawText(`SCORE: ${this.score} `, 0, 0);
		this.drawText(' ', 0, 1);
        if (this.fruitType) {
            this.drawText(` Mmmm, ${this.fruitType} `, null, this.height - 1);
        }
        if (this.showFPS) {
            let fpsText = ` FPS: ${this.fps}`;
            this.drawText(fpsText, this.width - fpsText.length, 0);
            this.drawText(' ', this.width - 1, 1)
        }
		this.drawCanvas();
	}

	drawText(text, x, y) {
		text = text.toString();
		if(!y && y !== 0) y = Math.floor((this.height - 1) / 2);
		let row = this.gameCanvas[y];
		if(!x && x !== 0) x = Math.floor((row.length - text.length) / 2);
		for(let i = 0; i < text.length; i++) {
			row[x + i] = text[i];
		}
	}

	drawCanvas() {
		let output = this.gameCanvas.map(line => line.join('')).join('\n');
		if(output !== this.lastOutput) {
			this.container.textContent = output;
			this.lastOutput = output;
		}
	}

	clearCanvas() {
		let canvas = [];
		for(let row = 0; row < this.height; row++) {
			canvas[row] = [];
			for(let col = 0; col < this.width; col++) {
				canvas[row].push(' ');
			}
		}
		this.gameCanvas = canvas;
	}
}

class Snake {
	constructor(x, y, timeToMove = 40, startSize = 3, growBy = 2, filler = '#') {
		this.parts = [];
		for (let i = 0; i < startSize; i++) {
			this.parts.push({x: x - i, y: y});
		}
		this.timeToMove = timeToMove;
		this.timeSinceLastUpdate = 0;
		this.growBy = growBy;
		this.growCounter = 0;

		this.filler = filler;
		this.dx = 1;
		this.dy = 0;
		this.prevdx = 1;
		this.prevdy = 0;
		this.prevPressed = {};
	}

	update(delta) {
		let curPressed = game.pressed;
		if (curPressed.UP && !this.prevPressed.UP && this.prevdy === 0) {
			this.dx = 0;
			this.dy = -1;
		} else if (curPressed.DOWN && !this.prevPressed.DOWN && this.prevdy === 0) {
			this.dx = 0;
			this.dy = 1;
		} else if (curPressed.LEFT && !this.prevPressed.LEFT && this.prevdx === 0) {
			this.dx = -1;
			this.dy = 0;
		} else if (curPressed.RIGHT && !this.prevPressed.RIGHT && this.prevdx === 0) {
			this.dx = 1;
			this.dy = 0;
		}
		this.prevPressed.UP = curPressed.UP;
		this.prevPressed.DOWN = curPressed.DOWN;
		this.prevPressed.LEFT = curPressed.LEFT;
		this.prevPressed.RIGHT = curPressed.RIGHT;

		this.timeSinceLastUpdate += delta;
		if (this.timeSinceLastUpdate >= this.timeToMove) {
			this.timeSinceLastUpdate = 0;
			this.prevdx = this.dx;
			this.prevdy = this.dy;

			let frontPart = this.parts[0];
			this.parts.unshift({x: frontPart.x + this.dx, y: frontPart.y + this.dy});
			if (this.growCounter === 0) {
				this.parts.pop();
			} else {
				this.growCounter--;
			}

			frontPart = this.parts[0];
			if (frontPart.x === 0 || frontPart.x === game.width - 1 || 
				frontPart.y === 0 || frontPart.y === game.height - 1) {
				game.STOP = true;
			}
			for (let i = 1; i < this.parts.length; i++) {
				let part = this.parts[i];
				if (frontPart.x === part.x && frontPart.y === part.y) {
					game.STOP = true;
					break;
				}
			}
			game.mines.some(mine => {
				if (frontPart.x === mine.x && frontPart.y === mine.y) {
					game.STOP = true;
					return true;
				}
			});

			if (frontPart.x === game.fruit.x && frontPart.y === game.fruit.y) {
				this.growCounter = this.growBy;
                let fruits = ['Blueberry', 'Apple', 'Orange', 'Strawberry', 'Cherry', 'Kiwi', 'Passion Fruit'];
                game.fruitType = fruits[Math.floor(Math.random() * fruits.length)];
				game.fruit.collect();
				if (Math.random() < game.chanceOfMine) {
					let mine = new Fruit(0, 0, 0, 'o');
					mine.collect();
					game.mines.push(mine);
				}
			}
		}
	}

	draw() {
		this.parts.forEach(part => game.gameCanvas[part.y][part.x] = this.filler);
	}
}

class Fruit {
	constructor(x, y, value = 5, filler = '+') {
		this.x = x;
		this.y = y;
		this.filler = filler;
		this.value = value;
	}

	collect() {
		let maxX = game.width - 1;
		let minX = 1;
		let maxY = game.height - 1;
		let minY = 1;

		let x, y;
		let isValid = true;
		do {
			isValid = true;
			x = Math.floor(Math.random() * (maxX-minX)+minX);
			y = Math.floor(Math.random() * (maxY-minY)+minY);
			if (x === game.fruit.x && y === game.fruit.y) {
				isValid = false;
			}
			game.mines.some(mine => {
				if (x === mine.x && y == mine.y) {
					isValid = false;
					return true;
				}
			});
		} while (!isValid);

		this.x = x;
		this.y = y;
		game.score += this.value;
	}

	draw() {
		game.gameCanvas[this.y][this.x] = this.filler;
	}
}

class GameBoard {
	constructor(filler = 'X') {
		this.filler = filler;
	}

	draw() {
		game.gameCanvas[0] = game.gameCanvas[0].map(cell => this.filler);
		game.gameCanvas[game.gameCanvas.length - 1] = game.gameCanvas[game.gameCanvas.length - 1].map(cell => this.filler);
		game.gameCanvas.map(row => {
			row[0] = this.filler;
			row[row.length - 1] = this.filler;
		});
	}
}

let game = new Game(canvas, settings.size.width, settings.size.height);
game.countdownToStart();