// These integers must be sequential
PETRA_EXPERT.DIFFICULTY_SANDBOX = 0;
PETRA_EXPERT.DIFFICULTY_VERY_EASY = 1;
PETRA_EXPERT.DIFFICULTY_EASY = 2;
PETRA_EXPERT.DIFFICULTY_MEDIUM = 3;
PETRA_EXPERT.DIFFICULTY_HARD = 4;
PETRA_EXPERT.DIFFICULTY_VERY_HARD = 5;

PETRA_EXPERT.Config = function(difficulty = PETRA_EXPERT.DIFFICULTY_MEDIUM, behavior)
{
	this.difficulty = difficulty;

	// for instance "balanced", "aggressive" or "defensive"
	this.behavior = behavior || "random";

	// debug level: 0=none, 1=sanity checks, 2=debug, 3=detailed debug, -100=serializatio debug
	this.debug = 0;

	this.chat = true;	// false to prevent AI's chats

	this.popScaling = randFloat(.8, 1.2);	// scale factor depending on the max population

	this.Military = {
		"towerLapseTime": 90,	// Time to wait between building 2 towers
		"fortressLapseTime": 1000,	// Time to wait between building 2 fortresses
		"popForBarracks1": 25,
		"popForBarracks2": 85,
		"popForBarracks3": 100,
		"popForBarracks4": 135,
		"popForBarracks5": 165,

		"popForStable1": 55,
		"popForStable2": 135,
		"popForForge": 65,
		"numSentryTowers": 1
	};

	this.DamageTypeImportance = {
		"Hack": 0.095,
		"Pierce": 0.075,
		"Crush": 0.065,
		"Fire": 0.095
	};

	this.Economy = {
		"popPhase2": 60,	// How many units we want before aging to phase2.
		"workPhase3": 110,	// How many workers we want before aging to phase3.
		"workPhase4": 190,	// How many workers we want before aging to phase4 or higher.
		"popForDock": 25,
		"targetNumWorkers": 200,	// dummy, will be changed later
		"targetNumTraders": 1,	// Target number of traders
		"targetNumFishers": 5,	// Target number of fishers per sea
		"supportRatio": 0.4,	// fraction of support workers among the workforce
		"provisionFields": 5
	};

	// Note: attack settings are set directly in attack_plan.js
	// defense
	this.Defense =
	{
		"defenseRatio": { "ally": 1.3, "neutral": 1.3, "own": 1.3 },	// ratio of defenders/attackers.
		"armyCompactSize": 2000,	// squared. Half-diameter of an army.
		"armyBreakawaySize": 3500,	// squared.
		"armyMergeSize": 1400	// squared.
	};

	// Additional buildings that the AI does not yet know when to build
	// and that it will try to build on phase 3 when enough resources.
	this.buildings =
	{
		"default": [],
		"athen": [
			"structures/{civ}/gymnasium",
			"structures/{civ}/prytaneion",
			"structures/{civ}/theater"
		],
		"brit": [
			"structures/{civ}/kennel"

		],
		"cart": [
			"structures/{civ}/embassy_celtic",
			"structures/{civ}/embassy_iberian",
			"structures/{civ}/embassy_italic",
			"structures/{civ}/super_dock",

		],
		"gaul": [
			"structures/{civ}/assembly"
		],
		"han": [
			"structures/{civ}/academy",
			"structures/{civ}/ministry"

		],
		"iber": [
			"structures/{civ}/monument"
		],
		"kush": [
			"structures/{civ}/camp_blemmye",
			"structures/{civ}/camp_noba",
			"structures/{civ}/pyramid_large",
			"structures/{civ}/pyramid_small",
			"structures/{civ}/temple_amun"
		],
		"mace": [
			"structures/{civ}/theater"
		],
		"maur": [
			"structures/{civ}/palace",
			"structures/{civ}/pillar_ashoka"
		],
		"pers": [
			"structures/{civ}/tachara"
		],
		"ptol": [
			"structures/{civ}/library",
			"structures/{civ}/theater",
			//"structures/{civ}/lighthouse",
			//"structures/{civ}/mercenary_camp",
			"structures/{civ}/temple_2"

		],
		"rome": [
			"structures/{civ}/army_camp",
			"structures/{civ}/temple_vesta"
		],
		"sele": [
			"structures/{civ}/theater"
		],
		"spart": [
			"structures/{civ}/gerousia",
			"structures/{civ}/syssiton",
			"structures/{civ}/theater"

		]
	};

	this.priorities =
	{
		"villager": 5000,
		"support": 2000,
		"siege": 2000,
		"elephants": 2000,
		"citizenSoldierRanged": 940,
		"citizenSoldierMelee": 2000,
		"cavalry": 2000,
		"hero": 3000,
		"championInfantryMelee": 2100,
		"championInfantryRanged": 340,
		"championCavalryMelee": 340,
		"championCavalryRanged": 340,
		"trader": 50,
		"healer": 2000,
		"ships": 70,
		"house": 350,
		"dropsites": 250,
		"field": 350,
		"dock": 90,
		"corral": 100,
		"economicBuilding": 90,
		"militaryBuilding": 300,
		"defenseBuilding": 70,
		"civilCentre": 3900,
		"majorTech": 1500,
		"minorTech": 250,
		"wonder": 1000,
		"emergency": 1000    // used only in emergency situations, should be the highest one
	};

	// Default personality (will be updated in setConfig)
	this.personality =
	{
		"aggressive": 0.5,
		"cooperative": 0.5,
		"defensive": 0.5
	};

	// See PETRA_EXPERT.QueueManager.prototype.wantedGatherRates()
	this.queues =
	{
		"firstTurn": {
			"food": 10,
			"wood": 10,
			"default": 0
		},
		"short": {
			//"food": 200,
			//"wood": 200,
			"default": 0
		},
		"medium": {
			"default": 0
		},
		"long": {
			"default": 0
		}
	};

	this.garrisonHealthLevel = { "low": 0.4, "medium": 0.55, "high": 0.7 };

	this.unusedNoAllyTechs = [
		"Player/sharedLos",
		"Market/InternationalBonus",
		"Player/sharedDropsites"
	];

	this.criticalPopulationFactors = [
		0.8,
		0.8,
		0.7,
		0.6,
		0.5,
		0.7
	];

	this.criticalStructureFactors = [
		0.8,
		0.8,
		0.7,
		0.6,
		0.5,
		0.7
	];

	this.criticalRootFactors = [
		0.8,
		0.8,
		0.67,
		0.5,
		0.35,
		0.7
	];
};

PETRA_EXPERT.Config.prototype.setConfig = function(gameState)
{
	if (this.difficulty > PETRA_EXPERT.DIFFICULTY_SANDBOX)
	{
		// Setup personality traits according to the user choice:
		// The parameter used to define the personality is basically the aggressivity or (1-defensiveness)
		// as they are anticorrelated, although some small smearing to decorelate them will be added.
		// And for each user choice, this parameter can vary between min and max
		let personalityList = {
			"random": { "min": 0, "max": 1 },
			"defensive": { "min": 0, "max": 0.27 },
			"balanced": { "min": 0.37, "max": 0.63 },
			"aggressive": { "min": 0.73, "max": 1 }
		};
		let behavior = randFloat(-0.5, 0.5);
		// make agressive and defensive quite anticorrelated (aggressive ~ 1 - defensive) but not completelety
		let variation = 0.15 * randFloat(-1, 1) * Math.sqrt(Math.square(0.5) - Math.square(behavior));
		let aggressive = Math.max(Math.min(behavior + variation, 0.5), -0.5) + 0.5;
		let defensive = Math.max(Math.min(-behavior + variation, 0.5), -0.5) + 0.5;
		let min = personalityList[this.behavior].min;
		let max = personalityList[this.behavior].max;
		this.personality = {
			"aggressive": min + aggressive * (max - min),
			"defensive": 1 - max + defensive * (max - min),
			"cooperative": randFloat(0, 1)
		};
	}
	// Petra Expert usually uses the continuous values of personality.aggressive and personality.defensive
	// to define its behavior according to personality. But when discontinuous behavior is needed,
	// it uses the following personalityCut which should be set such that:
	// behavior="aggressive" => personality.aggressive > personalityCut.strong &&
	//                          personality.defensive  < personalityCut.weak
	// and inversely for behavior="defensive"
	this.personalityCut = { "weak": 0.3, "medium": 0.5, "strong": 0.7 };

	if (gameState.playerData.teamsLocked)
		this.personality.cooperative = Math.min(1, this.personality.cooperative + 0.30);
	else if (gameState.getAlliedVictory())
		this.personality.cooperative = Math.min(1, this.personality.cooperative + 0.15);

	// changing settings based on difficulty or personality
	this.Military.towerLapseTime = Math.round(this.Military.towerLapseTime * (1.1 - 0.2 * this.personality.defensive));
	this.Military.fortressLapseTime = Math.round(this.Military.fortressLapseTime * (1.1 - 0.2 * this.personality.defensive));
	this.priorities.defenseBuilding = Math.round(this.priorities.defenseBuilding * (0.9 + 0.2 * this.personality.defensive));

	if (this.difficulty < PETRA_EXPERT.DIFFICULTY_EASY)
	{
		this.popScaling = 0.5;
		this.Economy.supportRatio = 0.5;
		this.Economy.provisionFields = 1;
		this.Military.numSentryTowers = this.personality.defensive > this.personalityCut.strong ? 1 : 0;
	}
	else if (this.difficulty < PETRA_EXPERT.DIFFICULTY_MEDIUM)
	{
		this.popScaling = 0.7;
		this.Economy.supportRatio = 0.4;
		this.Economy.provisionFields = 1;
		this.Military.numSentryTowers = this.personality.defensive > this.personalityCut.strong ? 1 : 0;
	}
	else
	{
		if (this.difficulty == PETRA_EXPERT.DIFFICULTY_MEDIUM)
			this.Military.numSentryTowers = 1;
		else
			this.Military.numSentryTowers = 2;
		if (this.personality.defensive > this.personalityCut.strong)
			++this.Military.numSentryTowers;
		else if (this.personality.defensive < this.personalityCut.weak)
			--this.Military.numSentryTowers;

		if (this.personality.aggressive > this.personalityCut.strong)
		{
			this.Military.popForBarracks1 = 30;
			//this.Economy.popPhase2 = 50;
			//this.priorities.healer = 10;
		}
	}

	let maxPop = gameState.getPopulationMax();
	if (this.difficulty < PETRA_EXPERT.DIFFICULTY_EASY)
		this.Economy.targetNumWorkers = Math.max(1, Math.min(40, maxPop));
	else if (this.difficulty < PETRA_EXPERT.DIFFICULTY_MEDIUM)
		this.Economy.targetNumWorkers = Math.max(1, Math.min(60, Math.floor(maxPop/2)));
	else
		this.Economy.targetNumWorkers = Math.max(1, Math.max(140, Math.floor(maxPop/3)));
	this.Economy.targetNumTraders = 2 + this.difficulty;




	if (gameState.getVictoryConditions().has("wonder"))
	{
		this.Economy.workPhase3 = Math.floor(0.9 * this.Economy.workPhase3);
		this.Economy.workPhase4 = Math.floor(0.9 * this.Economy.workPhase4);
	}

	if (maxPop <= 300)
		this.popScaling *= Math.sqrt(maxPop / 300);

	//this.Military.popForBarracks1 = Math.min(Math.max(Math.floor(this.Military.popForBarracks1 * this.popScaling), 12), Math.floor(maxPop/5));
	//this.Military.popForBarracks2 = Math.min(Math.max(Math.floor(this.Military.popForBarracks2 * this.popScaling), 45), Math.floor(maxPop*2/3));

	this.Military.popForBarracks1 = Math.floor(this.Military.popForBarracks1 * this.popScaling);
	this.Military.popForBarracks2 = Math.floor(this.Military.popForBarracks2 * this.popScaling);
	this.Military.popForBarracks3 = Math.floor(this.Military.popForBarracks1 * this.popScaling);
	this.Military.popForBarracks4 = Math.floor(this.Military.popForBarracks2 * this.popScaling);
	this.Military.popForBarracks5 = Math.floor(this.Military.popForBarracks1 * this.popScaling);


	this.Military.popForStable1 = Math.floor(this.Military.popForStable1 * this.popScaling);
	this.Military.popForStable2 = Math.floor(this.Military.popForStable1 * this.popScaling);

	this.Military.popForForge = Math.floor(this.Military.popForForge * this.popScaling);
	this.Economy.popPhase2 = Math.floor(this.Economy.popPhase2 * this.popScaling);
	this.Economy.workPhase3 = Math.floor(this.Economy.workPhase3 * this.popScaling);
	this.Economy.workPhase4 = Math.floor(this.Economy.workPhase4 * this.popScaling);
	this.Economy.targetNumTraders = Math.round(this.Economy.targetNumTraders * this.popScaling);
	this.Economy.targetNumWorkers = Math.round(this.Economy.targetNumWorkers * this.popScaling);
	this.Economy.workPhase3 = Math.round(this.Economy.workPhase3 * this.popScaling);
	this.Economy.workPhase4 = Math.round(this.Economy.workPhase4 * this.popScaling);
	if (this.difficulty < PETRA_EXPERT.DIFFICULTY_EASY)
		this.Economy.workPhase3 = Infinity;	// prevent the phasing to city phase






	this.emergencyValues = {
		"population": this.criticalPopulationFactors[this.difficulty],
		"structures": this.criticalStructureFactors[this.difficulty],
		"roots": this.criticalRootFactors[this.difficulty],
	};

	this.Cheat(gameState);

	if (this.debug < 2)
		return;
	API3.warn(" >>>  Petra Expert bot: personality = " + uneval(this.personality));
};

PETRA_EXPERT.Config.prototype.Cheat = function(gameState)
{
	// Sandbox, Very Easy, Easy, Medium, Hard, Very Hard
	// rate apply on resource stockpiling as gathering and trading
	// time apply on building, upgrading, packing, training and technologies
	const rate = [ 0.42, 0.56, 0.75, 1.00, 1.25, 1.56 ];
	const time = [ 1.40, 1.25, 1.10, 1.00, 1.00, 1.00 ];
	const vision = [ 1.0, 1.0, 1.10, 1.00, 1.5, 2.0 ];
	const influence = [ 1.0, 1.0, 1.10, 1.00, 1.15, 1.3 ];
	const AIDiff = Math.min(this.difficulty, rate.length - 1);
	SimEngine.QueryInterface(Sim.SYSTEM_ENTITY, Sim.IID_ModifiersManager).AddModifiers("AI Bonus", {
		"ResourceGatherer/BaseSpeed": [{ "affects": ["Unit", "Structure"], "multiply": rate[AIDiff] }],
		"Trader/GainMultiplier": [{ "affects": ["Unit", "Structure"], "multiply": rate[AIDiff] }],
		"Cost/BuildTime": [{ "affects": ["Unit", "Structure"], "multiply": time[AIDiff] }],
		"Vision/Range": [{ "affects": ["Soldier"], "multiply": vision[AIDiff] }],
		"TerritoryInfluence/Radius": [{ "affects": ["Structure"], "multiply": influence[AIDiff] }],

	}, gameState.playerData.entity);
};

PETRA_EXPERT.Config.prototype.Serialize = function()
{
	var data = {};
	for (let key in this)
		if (this.hasOwnProperty(key) && key != "debug")
			data[key] = this[key];
	return data;
};

PETRA_EXPERT.Config.prototype.Deserialize = function(data)
{
	for (let key in data)
		this[key] = data[key];
};
