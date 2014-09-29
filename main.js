// Taille de l'écran
const SAFE_ZONE_WIDTH = 1080;
const SAFE_ZONE_HEIGHT = 1775;
var ratioWH =  SAFE_ZONE_WIDTH / SAFE_ZONE_HEIGHT;

var widthTemp, heightTemp;
var width, height;
var ratio;

calculRatio();

function calculRatio() {
	widthTemp = window.innerWidth * window.devicePixelRatio;
	heightTemp = window.innerHeight * window.devicePixelRatio;

	width = heightTemp * ratioWH;
	height = heightTemp;
	if(widthTemp / height < ratioWH) {
		width = widthTemp;
		height = widthTemp / ratioWH;
	}
	ratio = width / SAFE_ZONE_WIDTH;
}

// Variables qui nous permettront de savoir quand le jeu démarre ou quand il y a un GAME OVER
var GAME_START = false;
var GAME_OVER = false;

// Phaser
var game = new Phaser.Game(width, height, Phaser.AUTO, 'timberman');
game.transparent = true;

// On déclare un objet qui contiendra les états "load" et "main"
var gameState = {};
gameState.load = function() { };
gameState.main = function() { };

// Va contenir le code qui chargera les ressources
gameState.load.prototype = {
	preload: function() {

		/**** SPRITES *****/
		// man - png et json
		game.load.atlas('man', 'img/man.png', 'data/man.json');
		// tombe rip
		game.load.image('rip', 'img/rip.png');
		// temps
		game.load.image('timeContainer', 'img/time-container.png');
		game.load.image('timeBar', 'img/time-bar.png');
		// background
		game.load.image('background', 'img/background.png');
		// arbre
		game.load.image('trunk1', 'img/trunk1.png');
		game.load.image('trunk2', 'img/trunk2.png');
		game.load.image('branchLeft', 'img/branch1.png');
		game.load.image('branchRight', 'img/branch2.png');
		game.load.image('stump', 'img/stump.png');
		// Chiffres pour le score
		game.load.atlas('numbers', 'img/numbers.png', 'data/numbers.json');
		// Niveaux
		game.load.atlas('levelNumbers', 'img/levelNumbers.png', 'data/numbers.json');
		game.load.image('level', 'img/level.png');
		// game over
		game.load.image('gameOver', 'img/game-over.png');
		// Bouton play
		game.load.image('buttonPlay', 'img/btn-play.png');

		/**** AUDIO *****/
		game.load.audio('soundCut', ['sons/cut.ogg']);
		game.load.audio('soundMenu', ['sons/menu.ogg']);
		game.load.audio('soundTheme', ['sons/theme.ogg']);
		game.load.audio('soundDeath', ['sons/death.ogg']);
	},

	create: function() {
		game.state.start('main');
	}
};

// va contenir le coeur du jeu
gameState.main.prototype = {
	create: function() {
		game.physics.startSystem(Phaser.Physics.ARCADE);

		// On fait en sorte que le jeu se redimensionne selon la taille de l'écran (Pour les PC)
		game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		game.scale.setShowAll();
		window.addEventListener('resize', function () {
			game.scale.refresh();
		});

		// création de l'arrière-plan
		this.background = game.add.sprite(0, 0, 'background');
		this.background.width = game.width;
		this.background.height = game.height;

		// Au click, on appelle la fonction "listener()"
		game.input.onDown.add(this.listener, this);

		// ---- ARBRE
		// souche
		this.stump = game.add.sprite(0, 0, 'stump');
		this.stump.scale = {x: ratio, y: ratio};
		this.stump.x = 352 * ratio;
		this.stump.y = 1394 * ratio;
		// construction de l'arbre
		this.HEIGHT_TRUNK = 243 * ratio;
		this.constructTree();
		this.canCut = true;

		// ---- BÛCHERON
		// Création du bûcheron
		this.man = game.add.sprite(0, 1070 * ratio, 'man');
		this.man.scale = {x: ratio, y: ratio};
		// On ajoute l'animation de la respiration
		this.man.animations.add('breath', [0,1]);
		// On ajoute l'animation de la coupe
		this.man.animations.add('cut', [1,2,3,4]);
		// On fait démarrer l'animation, avec 3 images par seconde et répétée en boucle
		this.man.animations.play('breath', 3, true);
		// Position du bûcheron
		this.manPosition = 'left';

		// ---- BARRE DE TEMPS
		// Container
		this.timeContainer = game.add.sprite(0, 100 * ratio, 'timeContainer');
		this.timeContainer.scale = {x: ratio, y: ratio};
		this.timeContainer.x = game.width / 2 - this.timeContainer.width / 2;
		// Barre
		this.timeBar = game.add.sprite(0, 130 * ratio, 'timeBar');
		this.timeBar.scale = {x: ratio, y: ratio};
		this.timeBar.x = game.width / 2 - this.timeBar.width / 2;
		this.timeBarWidth = this.timeBar.width / 2;
		var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth / ratio, this.timeBar.height / ratio);
		this.timeBar.crop(cropRect);
		this.timeBar.updateCrop();

		// Score
		this.currentScore = 0;
		var spriteScoreNumber = game.add.sprite(game.width / 2, 440 * ratio, 'numbers');
		spriteScoreNumber.scale = {x: ratio, y: ratio};
		spriteScoreNumber.animations.add('number');
		spriteScoreNumber.animations.frame = this.currentScore;
		spriteScoreNumber.x -= spriteScoreNumber.width / 2;
		this.spritesScoreNumbers = new Array();
		this.spritesScoreNumbers.push(spriteScoreNumber);

		// Level
		this.currentLevel = 1;
		var levelPosY = 290 * ratio;
		// Sprite level
		this.level = game.add.sprite(0, levelPosY, 'level');
		this.level.scale = {x: ratio, y: ratio};
		this.level.alpha = 0;
		// Numéro du level
		var spriteLevelNumber = game.add.sprite(0, levelPosY, 'levelNumbers');
		spriteLevelNumber.scale = {x: ratio, y: ratio};
		spriteLevelNumber.alpha = 0;
		spriteLevelNumber.animations.add('number');
		spriteLevelNumber.animations.frame = this.currentLevel;
		this.spritesLevelNumbers = new Array();
		this.spritesLevelNumbers.push(spriteLevelNumber);
		
		// Bouton play
		this.buttonPlay = game.add.sprite(0, 1200 * ratio, 'buttonPlay');
		this.buttonPlay.scale = {x: ratio, y:ratio};
		this.buttonPlay.x = game.width / 2 - this.buttonPlay.width / 2;
		this.buttonPlay.alpha = 0;

		/**** AUDIO ****/

		this.soundTheme = game.add.audio('soundTheme', 0.5, true);
		this.soundTheme.play();
		this.soundMenu = game.add.audio('soundMenu', 1);
		this.soundDeath = game.add.audio('soundDeath', 1);
		this.soundCut = game.add.audio('soundCut', 1);
	},

	update: function() {
		if(GAME_START) {
			// Mise à jour de la barre de temps
			if(this.timeBarWidth > 0) {
				this.timeBarWidth -= (0.6 + 0.1 * this.currentLevel) * ratio;
				var cropRect = new Phaser.Rectangle(0, 0, this.timeBarWidth / ratio, this.timeBar.height / ratio);
				this.timeBar.crop(cropRect);
				this.timeBar.updateCrop();
			} else {
				this.death();
			}
		}
		if(!GAME_OVER) {
			// Détection des touches left et right du clavier
			if (game.input.keyboard.justPressed(Phaser.Keyboard.LEFT)) {
		        this.listener('left');
		    } else if (game.input.keyboard.justPressed(Phaser.Keyboard.RIGHT))  {
		        this.listener('right');
		    }
		} else {
			if (game.input.keyboard.justPressed(Phaser.Keyboard.ENTER)) {
				GAME_OVER = false;
				this.soundMenu.play();
				game.state.start('main');
			}
		}
	},

	constructTree: function() {
		this.tree = game.add.group();
		this.tree.create(37 * ratio, 1151 * ratio, 'trunk1');
		this.tree.create(37 * ratio, 1151 * ratio - this.HEIGHT_TRUNK, 'trunk2');

		this.tree.setAll('scale', {x: ratio, y: ratio});

		for(var i = 0; i < 4; i++) {
			this.addTrunk();
		}
	},

	increaseScore: function() {
		this.currentScore++;

		if(this.currentScore % 20 == 0)
			this.increaseLevel();

		this.timeBarWidth += 12 * ratio;

		// On "kill" chaque sprite (chaque chiffre) qui compose le score
		for(var j = 0; j < this.spritesScoreNumbers.length; j++)
			this.spritesScoreNumbers[j].kill();
		this.spritesScoreNumbers = new Array();
		
		// On recrée les sprites qui vont composer le score
		this.spritesScoreNumbers = this.createSpritesNumbers(this.currentScore, 'numbers', 440 * ratio, 1);
	},

	increaseLevel: function() {
		this.currentLevel++;

		for(var j = 0; j < this.spritesLevelNumbers.length; j++)
			this.spritesLevelNumbers[j].kill();
		this.spritesLevelNumbers = new Array();

		this.spritesLevelNumbers = this.createSpritesNumbers(this.currentLevel, 'levelNumbers', this.level.y, 0);
		// On fait apparaître le level

		// On positionne le titre "level" et le numéro au milieu de l'écran
		this.level.x = 0;
		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			this.spritesLevelNumbers[i].x = this.level.width + 20;
			if(i != 0)
				this.spritesLevelNumbers[i].x = this.level.width + 20 + this.spritesLevelNumbers[i - 1].width;
			console.log(this.spritesLevelNumbers[i].y);
		}

		var levelGroup = game.add.group();
		levelGroup.add(this.level);
		for(var i = 0; i < this.spritesLevelNumbers.length; i++)
			levelGroup.add(this.spritesLevelNumbers[i]);
		levelGroup.x = game.width / 2 - levelGroup.width / 2;

		for(var i = 0; i < this.spritesLevelNumbers.length; i++) {
			game.add.tween(this.spritesLevelNumbers[i]).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
		}
		game.add.tween(this.level).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);	
		var self = this;
		setTimeout(function() {
			for(var i = 0; i < self.spritesLevelNumbers.length; i++) {
				game.add.tween(self.spritesLevelNumbers[i]).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
			}
			game.add.tween(self.level).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		}, 1500);
	},

	cutTrunk: function() {
		this.soundCut.stop();
		this.soundCut.play();

		this.addTrunk();
		this.increaseScore();

		// Suppression et animation sur le tronc coupé
		var trunkCut = game.add.sprite(37 * ratio, 1151 * ratio, this.tree.getAt(0).key);
		trunkCut.scale = {x: ratio, y: ratio};
		game.physics.enable(trunkCut, Phaser.Physics.ARCADE);
		trunkCut.anchor.setTo(0.5, 0.5);
		trunkCut.x += trunkCut.width / 2;
		trunkCut.y += trunkCut.height / 2;
		var angle = 0;
		if(this.manPosition == 'left') {
			trunkCut.body.velocity.x = 800 * window.devicePixelRatio;
			angle = -500;
		} else {
			trunkCut.body.velocity.x = -800 * window.devicePixelRatio;
			angle = 500;
		}
		trunkCut.body.velocity.y = -600 * window.devicePixelRatio;
		trunkCut.body.gravity.y = 2000 * window.devicePixelRatio;

		game.add.tween(trunkCut).to({angle: trunkCut.angle + angle}, 1000, Phaser.Easing.Linear.None,true);

		this.tree.remove(this.tree.getAt(0));
		this.canCut = false;

		var self = this;
		this.tree.forEach(function(trunk) {
			var tween = game.add.tween(trunk).to({y: trunk.y + self.HEIGHT_TRUNK}, 100, Phaser.Easing.Linear.None,true);
			tween.onComplete.add(function() {
				self.canCut = true;
			}, self);
		});
	},

	addTrunk: function() {
		var trunks = ['trunk1', 'trunk2'];
		var branchs = ['branchLeft', 'branchRight'];
		// le tronc précédent n'est pas une branche
		if(branchs.indexOf(this.tree.getAt(this.tree.length - 1).key) == -1) {
			// 1 chance sur 4 d'avoir un tronc sans branche
			if(Math.random() * 4 <= 1)
				this.tree.create(37 * ratio, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);
			// 3 chances sur 4 d'avoir une branche
			else	
				this.tree.create(37 * ratio, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), branchs[Math.floor(Math.random() * 2)]);
		}
		else
			this.tree.create(37 * ratio, this.stump.y - this.HEIGHT_TRUNK * (this.tree.length + 1), trunks[Math.floor(Math.random() * 2)]);

		this.tree.setAll('scale', {x: ratio, y: ratio});
	},

	listener: function(directionTemp) {
		if(this.canCut) {
			
			if(!GAME_START)
				GAME_START = true;

			if(directionTemp == 'left' || directionTemp == 'right') {
				if(directionTemp == 'left') {
					// Set Anchor to the center of your sprite
					this.man.anchor.setTo(0, 0);
					// Invert scale.x to flip left/right
					this.man.scale.x = ratio;
					this.man.x = 0;
					this.manPosition = 'left';
				} else {
					// Set Anchor to the center of your sprite
					this.man.anchor.setTo(1, 0);
					// Invert scale.x to flip left/right
					this.man.scale.x = -ratio;
					this.man.x = game.width - Math.abs(this.man.width);
					this.manPosition = 'right';
				}
			} else {

				if(game.input.activePointer.x <= game.width / 2) {
					// Set Anchor to the center of your sprite
					this.man.anchor.setTo(0, 0);
					// Invert scale.x to flip left/right
					this.man.scale.x = ratio;
					this.man.x = 0;
					this.manPosition = 'left';
				} else {
					// Set Anchor to the center of your sprite
					this.man.anchor.setTo(1, 0);
					// Invert scale.x to flip left/right
					this.man.scale.x = -ratio;
					this.man.x = game.width - Math.abs(this.man.width);
					this.manPosition = 'right';
				}
			}

			// Nom du tronc à couper
			var nameTrunkToCut = this.tree.getAt(0).key;
			// Nom du tronc qui se trouve juste au-dessus du tronc "nameTrunkToCut"
			var nameTrunkJustAfter = this.tree.getAt(1).key;

			// Si le personnage heurte une branche alors qu'il vient de changer de côté
			if(nameTrunkToCut == 'branchLeft' && this.manPosition == 'left' || nameTrunkToCut == 'branchRight' && this.manPosition == 'right') {
				// Game Over
				this.death();
			// Si tout va bien, le personnage coupe le tronc
			} else {
				this.man.animations.stop('breath', true);
				// On fait démarrer l'animation, avec 3 images par seconde
				var animationCut = this.man.animations.play('cut', 15);
				animationCut.onComplete.add(function() {
					this.man.animations.play('breath', 3, true);
				}, this);

				this.cutTrunk();

				if(nameTrunkJustAfter == 'branchLeft' && this.manPosition == 'left' || nameTrunkJustAfter == 'branchRight' && this.manPosition == 'right') {
					// Game Over
					this.death();
				}
			}
		}
	},

	death: function() {
		GAME_START = false;
		GAME_OVER = true;
		this.canCut = false;

		game.input.onDown.removeAll();
		this.soundDeath.play();
		this.soundTheme.stop();

		var self = this;
		
		// Disparition de la barre de temps
		game.add.tween(this.timeBar).to({y: this.timeBar.y - 550 * ratio}, 150, Phaser.Easing.Linear.None,true);
		game.add.tween(this.timeContainer).to({y: this.timeContainer.y - 550 * ratio}, 150, Phaser.Easing.Linear.None,true);

		// Disparition du score
		for(var i = 0; i < this.spritesScoreNumbers.length; i++) {
			game.add.tween(this.spritesScoreNumbers[i]).to({y: this.spritesScoreNumbers[i].y - 550 * ratio}, 150, Phaser.Easing.Linear.None,true);
		}

		var ripTween = game.add.tween(this.man).to({alpha: 0}, 300, Phaser.Easing.Linear.None,true);
		ripTween.onComplete.add(function() {
			self.rip = game.add.sprite(0, 0, 'rip');
			self.rip.alpha = 0;
			game.add.tween(self.rip).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
			self.rip.scale = {x: ratio, y: ratio};
			self.rip.x = (this.manPosition == 'left') ? (this.man.x + 50 * ratio) : (this.man.x + 200 * ratio);
			self.rip.y = this.man.y + this.man.height - self.rip.height;
			self.gameFinish();
		}, this);
	},

	gameFinish: function() {
		// Panneau Game Over
		this.gameOver = game.add.sprite(0, 0, 'gameOver');
		this.gameOver.scale = {x: ratio, y:ratio};
		this.gameOver.x = game.width / 2 - this.gameOver.width / 2;
		this.gameOver.y -= game.height;

		var self = this;

		// Best score
		var bestScore = localStorage.getItem("bestScore");
		if(bestScore == null || (bestScore != null && bestScore < this.currentScore)) {
			localStorage.setItem("bestScore", this.currentScore);
			bestScore = this.currentScore;
		}

		// on découpe le nombre en des chiffres individuels
		var digits = bestScore.toString().split('');
		var widthNumbers = 0;

		this.spritesBestScoreNumbers = this.createSpritesNumbers(bestScore, 'numbers', 730 * ratio, 0);
		this.spritesScoreNumbers = this.createSpritesNumbers(this.currentScore, 'numbers', 945 * ratio, 0);

		// Apparition des éléments
		game.add.tween(this.gameOver).to({y: 0}, 300, Phaser.Easing.Linear.None,true)
			.onComplete.add(function() {
				// Best score
				for(var i = 0; i < self.spritesBestScoreNumbers.length; i++) {
					game.add.tween(self.spritesBestScoreNumbers[i]).to({alpha: 1}, 150, Phaser.Easing.Linear.None,true);
				}
				// Score
				for(var i = 0; i < self.spritesScoreNumbers.length; i++) {
					game.add.tween(self.spritesScoreNumbers[i]).to({alpha: 1}, 150, Phaser.Easing.Linear.None,true);
				}
				// Bouton play
				game.add.tween(self.buttonPlay).to({alpha: 1}, 300, Phaser.Easing.Linear.None,true);
				// Evénements sur le bouton play
				self.buttonPlay.inputEnabled = true;
				self.buttonPlay.events.onInputDown.add(function() {
					self.buttonPlay.y += 10 * ratio;
				}, this);
				this.buttonPlay.events.onInputUp.add(function() {
					self.buttonPlay.y -= 10 * ratio;
					GAME_OVER = false;
					self.soundMenu.play();
					game.state.start('main');
				}, this);
			}, self);
	},

	createSpritesNumbers: function(number /* Nombre à créer en sprite */, imgRef /* Image à utiliser pour créer le score */, posY, alpha) {
		// on découpe le nombre en des chiffres individuels
		var digits = number.toString().split('');
		var widthNumbers = 0;

		var arraySpritesNumbers = new Array();
		
		// on met en forme le nombre avec les sprites
		for(var i = 0; i < digits.length; i++) {
			var spaceBetweenNumbers = 0;
			if(i > 0)
				spaceBetweenNumbers = 5 * ratio;
			var spriteNumber = game.add.sprite(widthNumbers + spaceBetweenNumbers, posY, imgRef);
			spriteNumber.scale = {x: ratio, y: ratio};
			spriteNumber.alpha = alpha;
			// On ajoute le JSON des nombres dans l'animation de "spriteNumber"
			spriteNumber.animations.add('number');
			// On sélection la frame n° "digits[i]" dans le JSON
			spriteNumber.animations.frame = +digits[i];
			arraySpritesNumbers.push(spriteNumber);
			// On calcule la width totale du sprite du score
			widthNumbers += spriteNumber.width + spaceBetweenNumbers;
		}

		// On ajoute les sprites du score dans le groupe "numbersGroup" afin de centrer le tout
		var numbersGroup = game.add.group();
		for(var i = 0; i < arraySpritesNumbers.length; i++)
			numbersGroup.add(arraySpritesNumbers[i]);
		// On centre horizontalement
		numbersGroup.x = game.width / 2 - numbersGroup.width / 2;

		return arraySpritesNumbers;
	}
};


// On ajoute les 2 fonctions "gameState.load" et "gameState.main" à notre objet Phaser
game.state.add('load', gameState.load);
game.state.add('main', gameState.main);
// Il ne reste plus qu'à lancer l'état "load"
game.state.start('load');