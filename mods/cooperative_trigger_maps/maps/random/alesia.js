/**
 * Alesia-inspired siege scenario derived from Jebel Barkal.
 */

Engine.LoadLibrary("rmgen");
Engine.LoadLibrary("rmgen-common");
Engine.LoadLibrary("heightmap");

export function* generateMap(mapSettings)
{
	TILE_CENTERED_HEIGHT_MAP = true;

	const tSand = "steppe_grass_green_a";
	const tRoadDesert = "savanna_tile_a";
	const tRoadFertileLand = "savanna_tile_a";
	const tWater = "desert_sand_wet";
	const tGrass = ["savanna_shrubs_a_wetseason", "alpine_grass_b_wild", "medit_shrubs_a", "steppe_grass_green_a"];
	const tForestFloorFertile = pickRandom(tGrass);
	const tGrassTransition1 = "desert_grass_a";
	const tGrassTransition2 = "steppe_grass_dirt_66";
	const tPath = "road2";
	const tPathWild = "road_med";
	const tDistrictDebugA = "savanna_tile_a_red";
	const tDistrictDebugB = "savanna_dirt_rocks_a";
	const tDistrictDebugCore = "savanna_cliff_a";

	const oAcacia = "gaia/tree/oak";
	const oPalmPath = "gaia/tree/poplar";
	const oPalms = [
		"gaia/tree/oak",
		"gaia/tree/oak_new",
		"gaia/tree/euro_beech",
		"gaia/tree/euro_birch",
		"gaia/tree/poplar",
		"gaia/tree/pine"
	];
	const oBerryBushGrapes = "gaia/fruit/grapes";
	const oBerryBushDesert = "gaia/fruit/berry_05";
	const oStoneLargeDesert = "gaia/rock/desert_large";
	const oStoneSmallDesert = "gaia/rock/desert_small";
	const oMetalLargeDesert = "gaia/ore/desert_large";
	const oMetalSmallDesert = "gaia/ore/desert_small";
	const oStoneLargeFertileLand = "gaia/rock/desert_large";
	const oStoneSmallFertileLand = "gaia/rock/greece_small";
	const oMetalLargeFertileLand = "gaia/ore/desert_large";
	const oMetalSmallFertileLand = "gaia/ore/temperate_small";
	const oWoodTreasure = "gaia/treasure/wood";
	const oStoneTreasure = "gaia/treasure/stone";
	const oMetalTreasure = "gaia/treasure/metal";
	const oDeer = "gaia/fauna_deer";
	const oGoat = "gaia/fauna_goat";
	const oBoar = "gaia/fauna_boar";
	const oPig = "gaia/fauna_pig";
	const oRabbit = "gaia/fauna_rabbit";
	const oWolf = "gaia/fauna_wolf";
	const oFish = "gaia/fish/generic";
	const oHawk = "birds/buzzard";
	const oFortress = "structures/gaul/fortress";
	const oTower = mapSettings.Size >= 256 && getDifficulty() >= 3 ? "structures/gaul/defense_tower" : "structures/gaul/sentry_tower";
	const oHouse = "structures/gaul/house";
	const oNobaCamp = "structures/gaul/range";
	const oCivicCenter = "structures/gaul/civil_centre";
	const oWonder = "structures/gaul/wonder";
	const oBarracks = "structures/gaul/barracks";
	const oStable = "structures/gaul/stable";
	const oArsenal = "structures/gaul/arsenal";
	const oWallMedium = "structures/gaul/wall_medium";
	const oWallGate = "structures/gaul/wall_gate";
	const oWallTower = "structures/gaul/wall_tower";
	const oPalisadeMedium = "structures/palisades_medium";
	const oPalisadeGate = "structures/palisades_gate";
	const oPalisadeTower = "structures/palisades_tower";
	const oGaulCitizenArcher = "units/gaul/infantry_slinger_b";
	const oAulChampionSwordsman = "units/gaul/champion_infantry_swordsman";
	const oGaulChampions = [
		oAulChampionSwordsman,
		"units/gaul/champion_fanatic",
		"units/gaul/hero_vercingetorix_infantry"
	];
	const oRomanSiegWall = [
		"units/rome/siege_scorpio_unpacked",
		"units/rome/siege_scorpio_unpacked",
		"units/rome/siege_onager_unpacked"
	];
	const oTriggerPointCityPath = "trigger/trigger_point_A";
	const oTriggerPointAttackerPatrol = "trigger/trigger_point_B";

	const aPalmPath = actorTemplate("flora/trees/palm_cretan_date_tall");
	const aRock = actorTemplate("geology/stone_savanna_med");
	const aHandcart = actorTemplate("props/special/eyecandy/handcart_1");
	const aPlotFence = actorTemplate("props/special/common/plot_fence");
	const aBushesFertileLand = [
		...new Array(3).fill("props/flora/shrub_spikes"),
		...new Array(3).fill("props/flora/ferns"),
		"props/flora/shrub_tropic_plant_a",
		"props/flora/shrub_tropic_plant_b",
		"props/flora/shrub_tropic_plant_flower",
		"props/flora/foliagebush",
		"props/flora/bush",
		"props/flora/bush_medit_la",
		"props/flora/bush_medit_la_lush",
		"props/flora/bush_medit_me_lush",
		"props/flora/bush_medit_sm",
		"props/flora/bush_medit_sm_lush",
		"props/flora/bush_tempe_la_lush"
	].map(actorTemplate);
	const aBushesCity = [
		"props/flora/bush_dry_a",
		"props/flora/bush_medit_la_dry",
		"props/flora/bush_medit_me_dry",
		"props/flora/bush_medit_sm",
		"props/flora/bush_medit_sm_dry",
	].map(actorTemplate);
	const aBushesDesert = [
		"props/flora/bush_tempe_me_dry",
		"props/flora/grass_soft_dry_large_tall",
		"props/flora/grass_soft_dry_small_tall"
	].map(actorTemplate).concat(aBushesCity);
	const aWaterDecoratives = ["props/flora/reeds_pond_lush_a"].map(actorTemplate);

	const pForestPalms = [
		tForestFloorFertile,
		...oPalms.map(tree => tForestFloorFertile + TERRAIN_SEPARATOR + tree),
		tForestFloorFertile];

	const heightScale = num => num * mapSettings.Size / 320;

	globalThis.g_Map = new RandomMap(0, tSand);
	const mapSize = g_Map.getSize();
	const mapCenter = g_Map.getCenter();
	const mapBounds = g_Map.getBounds();
	const numPlayers = getNumPlayers();

	const clDesert = g_Map.createTileClass();
	const clFertileLand = g_Map.createTileClass();
	const clWater = g_Map.createTileClass();
	const clIrrigationCanal = g_Map.createTileClass();
	const clPassage = g_Map.createTileClass();
	const clPlayer = g_Map.createTileClass();
	const clBaseResource = g_Map.createTileClass();
	const clFood = g_Map.createTileClass();
	const clForest = g_Map.createTileClass();
	const clRock = g_Map.createTileClass();
	const clMetal = g_Map.createTileClass();
	const clTreasure = g_Map.createTileClass();
	const clCity = g_Map.createTileClass();
	const clPath = g_Map.createTileClass();
	const clPathCrossing = g_Map.createTileClass();
	const clWall = g_Map.createTileClass();
	const clGate = g_Map.createTileClass();
	const clRoad = g_Map.createTileClass();
	const clSiegeRing = g_Map.createTileClass();
	const clMidRing = g_Map.createTileClass();
	const clTriggerPointCityPath = g_Map.createTileClass();
	const clTriggerPointMap = g_Map.createTileClass();
	const clSoldier = g_Map.createTileClass();
	const clTower = g_Map.createTileClass();
	const clFortress = g_Map.createTileClass();
	const clHouse = g_Map.createTileClass();
	const clStable = g_Map.createTileClass();
	const clArsenal = g_Map.createTileClass();                                                                      /* Added arsenal and siege creation, spread over the file */
	const clCivicCenter = g_Map.createTileClass();
	const clBarracks = g_Map.createTileClass();

	const riverAngle = randFloat(-0.1, 0.1) * Math.PI;
	const northRiverAngle = randFloat(-0.1, 0.1) * Math.PI;

	const pathWidth = 2;
	const pathWidthCenter = 4;
	const pathWidthSecondary = 3;
	const outerSiegePlayerRadius = fractionToTiles(0.41);
	const outerSiegeGapAngle = 0.22 * Math.PI;
	const outerSiegeArcAngle = 0.82 * Math.PI;
	const debugShowCityDistricts = false;
	const debugPaintCityGridOnly = false;
	const placeCitySetpieces = false;
	const stayCity = new StaticConstraint(stayClasses(clCity, 0));

	const placeCityWall = mapSize < 192 || getDifficulty() < 2 ? false : getDifficulty() < 3 ? "city_palisade" : "city_wall";

	const layoutFertileLandTextures = [
		{
			"left": fractionToTiles(0),
			"right": fractionToTiles(0.04),
			"terrain": createTerrain(tGrassTransition1),
			"tileClass": clFertileLand
		},
		{
			"left": fractionToTiles(0.04),
			"right": fractionToTiles(0.08),
			"terrain": createTerrain(tGrassTransition2),
			"tileClass": clDesert
		}
	];

	/**
	 * The buildings are set as uncapturable, otherwise the player would gain the buildings via root territory and can delete them without effort.
	 * Keep the entire city uncapturable as a consistent property of the city.
	 */
	const layoutCity = [
		{
			"templateName": oFortress,
			"difficulty": "Medium",
			"constraints": [avoidClasses(clFortress, 25), new NearTileClassConstraint(clPath, 8)],
			"painters": new TileClassPainter(clFortress)
		},
		{
			"templateName": oCivicCenter,
			"difficulty": "Easy",
			"constraints": [avoidClasses(clCivicCenter, 40), new NearTileClassConstraint(clPath, 8)],
			"painters": new TileClassPainter(clCivicCenter)
		},
		{
			"templateName": oArsenal,
			"difficulty": "Medium",
			"constraints": avoidClasses(clArsenal, 10),
			"painters": new TileClassPainter(clArsenal)
		},
		{
			"templateName": oStable,
			"difficulty": "Easy",
			"constraints": avoidClasses(clStable, 20),
			"painters": new TileClassPainter(clStable)
		},
		{
			"templateName": oBarracks,
			"difficulty": "Easy",
			"constraints": avoidClasses(clBarracks, 12),
			"painters": new TileClassPainter(clBarracks)
		},
		{
			"templateName": oTower,
			"difficulty": "Easy",
			"constraints": avoidClasses(clTower, 10),
			"painters": new TileClassPainter(clTower)
		},
		{
			"templateName": "uncapturable|" + oHouse,
			"difficulty": "Very Easy",
			"constraints": [avoidClasses(clHouse, 7, clPath, 2)],
			"painters": new TileClassPainter(clHouse)
		},
	].filter(building => getDifficulty() >= getDifficulties().find(difficulty => difficulty.Name == building.difficulty).Difficulty);

	g_WallStyles.city_wall = {
		"short": readyWallElement("uncapturable|" + oWallMedium),
		"medium": readyWallElement("uncapturable|" + oWallMedium),
		"tower": readyWallElement("uncapturable|" + oWallTower),
		"gate": readyWallElement("uncapturable|" + oWallGate),
		"overlap": 0.05
	};

	g_WallStyles.city_palisade = {
		"short": readyWallElement("uncapturable|" + oPalisadeMedium),
		"medium": readyWallElement("uncapturable|" + oPalisadeMedium),
		"tower": readyWallElement("uncapturable|" + oPalisadeTower),
		"gate": readyWallElement("uncapturable|" + oPalisadeGate),
		"overlap": 0.05
	};

	yield 10;

	g_Map.log("Skipping external heightmap");
	const heightDesert = 0;
	const heightFertileLand = heightDesert - heightScale(2);
	const heightShoreline = heightFertileLand - heightScale(0.5);
	const heightWaterLevel = heightFertileLand - heightScale(3);
	const heightPassage = heightWaterLevel - heightScale(1.5);
	const heightIrrigationCanal = heightWaterLevel - heightScale(4);
	const heightSeaGround = heightWaterLevel - heightScale(8);
	const heightOffsetPath = heightScale(-2.5);
	const heightOffsetRoad = heightScale(-1.5);
	const heightOffsetWalls = heightScale(2.5);

	g_Map.log("Flattening land");
	createArea(
		new MapBoundsPlacer(),
		new ElevationPainter(heightDesert),
		new HeightConstraint(-Infinity, heightDesert));

	// Fertile land
	const widthFertileLand = fractionToTiles(0.33);
	paintRiver({
		"parallel": true,
		"start": new Vector2D(mapBounds.left, mapBounds.bottom).rotateAround(-riverAngle, mapCenter),
		"end": new Vector2D(mapBounds.right, mapBounds.bottom).rotateAround(-riverAngle, mapCenter),
		"width": 2 * widthFertileLand,
		"fadeDist": 8,
		"deviation": 0,
		"heightLand": heightDesert,
		"heightRiverbed": heightFertileLand,
		"meanderShort": 40,
		"meanderLong": 0,
		"waterFunc": (position, height, riverFraction) => {
			createTerrain(tGrass).place(position);
			clFertileLand.add(position);
		},
		"landFunc": (position, shoreDist1, shoreDist2) => {

			for (const riv of layoutFertileLandTextures)
				if (riv.left < +shoreDist1 && +shoreDist1 < riv.right ||
					riv.left < -shoreDist2 && -shoreDist2 < riv.right)
				{
					riv.tileClass.add(position);
					riv.terrain.place(position);
				}
		}
	});

	paintRiver({
		"parallel": true,
		"start": new Vector2D(mapBounds.left, mapBounds.top).rotateAround(-northRiverAngle, mapCenter),
		"end": new Vector2D(mapBounds.right, mapBounds.top).rotateAround(-northRiverAngle, mapCenter),
		"width": 2 * widthFertileLand,
		"fadeDist": 8,
		"deviation": 0,
		"heightLand": heightDesert,
		"heightRiverbed": heightFertileLand,
		"meanderShort": 40,
		"meanderLong": 0,
		"waterFunc": (position, height, riverFraction) => {
			createTerrain(tGrass).place(position);
			clFertileLand.add(position);
		},
		"landFunc": (position, shoreDist1, shoreDist2) => {

			for (const riv of layoutFertileLandTextures)
				if (riv.left < +shoreDist1 && +shoreDist1 < riv.right ||
					riv.left < -shoreDist2 && -shoreDist2 < riv.right)
				{
					riv.tileClass.add(position);
					riv.terrain.place(position);
				}
		}
	});

	// Nile
	paintRiver({
		"parallel": true,
		"start": new Vector2D(mapBounds.left, mapBounds.bottom).rotateAround(-riverAngle, mapCenter),
		"end": new Vector2D(mapBounds.right, mapBounds.bottom).rotateAround(-riverAngle, mapCenter),
		"width": fractionToTiles(0.2),
		"fadeDist": 4,
		"deviation": 0,
		"heightLand": heightFertileLand,
		"heightRiverbed": heightSeaGround,
		"meanderShort": 40,
		"meanderLong": 0
	});

	paintRiver({
		"parallel": true,
		"start": new Vector2D(mapBounds.left, mapBounds.top).rotateAround(-northRiverAngle, mapCenter),
		"end": new Vector2D(mapBounds.right, mapBounds.top).rotateAround(-northRiverAngle, mapCenter),
		"width": fractionToTiles(0.2),
		"fadeDist": 4,
		"deviation": 0,
		"heightLand": heightFertileLand,
		"heightRiverbed": heightSeaGround,
		"meanderShort": 40,
		"meanderLong": 0
	});
	yield 30;

	g_Map.log("Computing player locations");
	let playerIDs = sortAllPlayers();
	let teamIDs = playerIDs.map(getPlayerTeam);
	let teamSizes = {};
	for (let n of teamIDs) {
		teamSizes[n] = teamSizes[n] ? teamSizes[n] + 1 : 1;
	}
	let biggestTeamID = 0;
	let biggestTeamSize = 0;
	for (let teamID of Object.keys(teamSizes)) {
		if (biggestTeamSize < teamSizes[teamID])
		{
			biggestTeamID = teamID;
			biggestTeamSize = teamSizes[teamID];
		}
	}
	let biggestTeamPlayerIDs = [];
	for (let i = 0; i < playerIDs.length - 1; i = i + 1) {
		if (teamIDs[i] == biggestTeamID) {
			biggestTeamPlayerIDs = biggestTeamPlayerIDs.concat([playerIDs[i]]);
		}
	}
	let centerPlayerID = 0;
	let centerPlayerID_index = 0;
	let numOfTeams = Array.from(new Set(playerIDs.map(getPlayerTeam))).length;
	let mapAngle = riverAngle - 0.5 * Math.PI;
	let playerPosition = [];
	let centerPlayerPosition = [];

	/* Alesia layout: players occupy the outer siege ring instead of the old river-facing arc. */
	let doCenterPlayer = false;
	if (doCenterPlayer)
	{
		centerPlayerID = pickRandom(biggestTeamPlayerIDs);
		centerPlayerID_index = playerIDs.indexOf(centerPlayerID);
		playerIDs.splice(centerPlayerID_index, 1)
		centerPlayerPosition = playerPlacementArc([centerPlayerID], mapCenter, fractionToTiles(0.28), mapAngle, mapAngle)[0];
	}

	/* All other players */
	if (numOfTeams == 1)
	{
		playerPosition = playerPlacementArcs(
			playerIDs,
			mapCenter,
			outerSiegePlayerRadius,
			mapAngle,
			outerSiegeGapAngle,
			outerSiegeArcAngle);
	}
	else
	{
		playerPosition = playerPlacementArcs(
			playerIDs,
			mapCenter,
			outerSiegePlayerRadius,
			mapAngle,
			outerSiegeGapAngle,
			outerSiegeArcAngle);
	}

	if (doCenterPlayer)
	{
		playerIDs.splice(centerPlayerID_index, 0, centerPlayerID);
		playerPosition.splice(centerPlayerID_index, 0, centerPlayerPosition);
	}

	if (!mapSettings.Nomad)
	{
		g_Map.log("Marking player positions");
		for (const position of playerPosition)
			addCivicCenterAreaToClass(position, clPlayer);
	}

	g_Map.log("Marking water");
	createArea(
			new MapBoundsPlacer(),
			[
				new TileClassPainter(clWater),
				new TileClassUnPainter(clFertileLand)
			],
			new HeightConstraint(-Infinity, heightWaterLevel));

	g_Map.log("Marking desert");
	const avoidWater = new StaticConstraint(avoidClasses(clWater, 0));
	createArea(
		new MapBoundsPlacer(),
		new TileClassPainter(clDesert),
		[
			avoidWater,
			avoidClasses(clFertileLand, 0)
		]);

	const stayDesert = new StaticConstraint(stayClasses(clDesert, 0));
	const stayFertileLand = new StaticConstraint(stayClasses(clFertileLand, 0));

	g_Map.log("Finding possible irrigation canal locations");
	const irrigationCanalAreas = [];
	for (let i = 0; i < 30; ++i)
	{
		const x = fractionToTiles(randFloat(0, 1));
		irrigationCanalAreas.push(
			createArea(
				new PathPlacer(
					new Vector2D(x, mapBounds.bottom).rotateAround(-riverAngle, mapCenter),
					new Vector2D(x, mapBounds.bottom + widthFertileLand).rotateAround(-riverAngle, mapCenter),
					3,
					0,
					10,
					0.1,
					0.01,
					Infinity),
				undefined,
				avoidClasses(clDesert, randIntInclusive(30, scaleByMapSize(35, 50)))));
	}

	g_Map.log("Creating irrigation canals");
	const irrigationCanalLocations = [];
	for (const area of irrigationCanalAreas)
		{
			if (!area.getPoints().length ||
				area.getPoints().some(point => !avoidClasses(clPlayer, scaleByMapSize(8, 13), clIrrigationCanal, scaleByMapSize(20, 30)).allows(point)))
				continue;

			irrigationCanalLocations.push(pickRandom(area.getPoints()).clone().rotateAround(riverAngle, mapCenter).x);
			createArea(
				new MapBoundsPlacer(),
				[
					new SmoothElevationPainter(ELEVATION_SET, heightIrrigationCanal, 1),
					new TileClassPainter(clIrrigationCanal)
				],
				[new StayAreasConstraint([area]), new HeightConstraint(heightIrrigationCanal, heightDesert)]);
		}

	g_Map.log("Creating passages");
	let previousPassageY = randIntInclusive(0, widthFertileLand);
	const areasPassages = [];
	irrigationCanalLocations.sort((a, b) => a - b);
	for (let i = 0; i < irrigationCanalLocations.length; ++i)
	{
		let previous = i == 0 ? mapBounds.left : irrigationCanalLocations[i - 1];
		let next = i == irrigationCanalLocations.length - 1 ? mapBounds.right : irrigationCanalLocations[i + 1];

		const x1 = (irrigationCanalLocations[i] + previous) / 2;
		const x2 = (irrigationCanalLocations[i] + next) / 2;
		let y;

		// The passages should be at different locations, so that enemies can't attack each other easily
		for (let tries = 0; tries < 100; ++tries)
		{
			y = (previousPassageY + randIntInclusive(0.2 * widthFertileLand, 0.8 * widthFertileLand)) % widthFertileLand;

			const pos = new Vector2D((x1 + x2) / 2, y).rotateAround(-riverAngle, mapCenter).round();

			if (g_Map.validTilePassable(new Vector2D(pos.x, pos.y)) &&
				avoidClasses(clDesert, 12).allows(pos) &&
				new HeightConstraint(heightIrrigationCanal, heightFertileLand).allows(pos))
				break;
		}

		const area =
			createArea(
				new PathPlacer(
					new Vector2D(x1, y).rotateAround(-riverAngle, mapCenter),
					new Vector2D(x2, y).rotateAround(-riverAngle, mapCenter),
					10,
					0,
					1,
					0,
					0,
					Infinity),
				[
					new ElevationPainter(heightPassage),
					new TileClassPainter(clPassage)
				],
				[
					new HeightConstraint(-Infinity, heightPassage),
					stayClasses(clFertileLand, 2)
				]);

		if (!area || !area.getPoints().length)
			continue;

		previousPassageY = y;
		areasPassages.push(area);
	}

	g_Map.log("Finding possible northern irrigation canal locations");
	const northIrrigationCanalAreas = [];
	for (let i = 0; i < 24; ++i)
	{
		const x = fractionToTiles(randFloat(0, 1));
		northIrrigationCanalAreas.push(
			createArea(
				new PathPlacer(
					new Vector2D(x, mapBounds.top - widthFertileLand).rotateAround(-northRiverAngle, mapCenter),
					new Vector2D(x, mapBounds.top).rotateAround(-northRiverAngle, mapCenter),
					3,
					0,
					10,
					0.08,
					0.015,
					Infinity),
				undefined,
				avoidClasses(clDesert, randIntInclusive(30, scaleByMapSize(35, 50)))));
	}

	g_Map.log("Creating northern irrigation canals");
	const northIrrigationCanalLocations = [];
	for (const area of northIrrigationCanalAreas)
	{
		if (!area.getPoints().length ||
			area.getPoints().some(point => !avoidClasses(clPlayer, scaleByMapSize(8, 13), clIrrigationCanal, scaleByMapSize(20, 30)).allows(point)))
			continue;

		northIrrigationCanalLocations.push(pickRandom(area.getPoints()).clone().rotateAround(northRiverAngle, mapCenter).x);
		createArea(
			new MapBoundsPlacer(),
			[
				new SmoothElevationPainter(ELEVATION_SET, heightIrrigationCanal, 1),
				new TileClassPainter(clIrrigationCanal)
			],
			[new StayAreasConstraint([area]), new HeightConstraint(heightIrrigationCanal, heightDesert)]);
	}

	g_Map.log("Creating northern passages");
	let previousNorthPassageY = mapBounds.top - randIntInclusive(0, widthFertileLand);
	northIrrigationCanalLocations.sort((a, b) => a - b);
	for (let i = 0; i < northIrrigationCanalLocations.length; ++i)
	{
		let previous = i == 0 ? mapBounds.left : northIrrigationCanalLocations[i - 1];
		let next = i == northIrrigationCanalLocations.length - 1 ? mapBounds.right : northIrrigationCanalLocations[i + 1];

		const x1 = (northIrrigationCanalLocations[i] + previous) / 2;
		const x2 = (northIrrigationCanalLocations[i] + next) / 2;
		let y;

		for (let tries = 0; tries < 100; ++tries)
		{
			y = mapBounds.top - ((mapBounds.top - previousNorthPassageY + randIntInclusive(0.2 * widthFertileLand, 0.8 * widthFertileLand)) % widthFertileLand);

			const pos = new Vector2D((x1 + x2) / 2, y).rotateAround(-northRiverAngle, mapCenter).round();

			if (g_Map.validTilePassable(new Vector2D(pos.x, pos.y)) &&
				avoidClasses(clDesert, 12).allows(pos) &&
				new HeightConstraint(heightIrrigationCanal, heightFertileLand).allows(pos))
				break;
		}

		const area =
			createArea(
				new PathPlacer(
					new Vector2D(x1, y).rotateAround(-northRiverAngle, mapCenter),
					new Vector2D(x2, y).rotateAround(-northRiverAngle, mapCenter),
					10,
					0,
					1,
					0,
					0,
					Infinity),
				[
					new ElevationPainter(heightPassage),
					new TileClassPainter(clPassage)
				],
				[
					new HeightConstraint(-Infinity, heightPassage),
					stayClasses(clFertileLand, 2)
				]);

		if (!area || !area.getPoints().length)
			continue;

		previousNorthPassageY = y;
		areasPassages.push(area);
	}
	yield 40;

	g_Map.log("Marking water");
	const areaWater = createArea(
		new MapBoundsPlacer(),
		new TileClassPainter(clWater),
		new HeightConstraint(-Infinity, heightWaterLevel));

	g_Map.log("Painting water and shoreline");
	createArea(
		new MapBoundsPlacer(),
		new TerrainPainter(tWater),
		new HeightConstraint(-Infinity, heightShoreline));

	yield 50;


	function Alesia_placePlayerBaseStartingAnimal(args)
	{
		for (let i = 0; i < args.groupCount; ++i)
		{
			let success = false;
			for (let tries = 0; tries < 30; ++tries)
			{
				let position = new Vector2D(0, args.distance).rotate(randomAngle()).add(args.basePosition);
				if (createObjectGroup(
					new SimpleGroup(
						[
							new SimpleObject(
								args.template,
								args.minGroupCount,
								args.maxGroupCount,
								args.minGroupDistance,
								args.maxGroupDistance)
						],
						true,
						args.BaseResourceClass,
						position),
					0,
					args.baseResourceConstraint))
				{
					success = true;
					break;
				}
			}

			if (!success)
			{
				error("Could not place startingAnimal for player " + args.playerID);
				return;
			}
		}
	}

	for (let i = 0; i < numPlayers; ++i)
	{
		const isDesert = clDesert.has(playerPosition[i]);
		placePlayerBase({
			"playerID": playerIDs[i],
			"playerPosition": playerPosition[i],
			"PlayerTileClass": clPlayer,
			"BaseResourceClass": clBaseResource,
			"baseResourceConstraint": avoidClasses(clPlayer, 4, clWater, 4),
			"Walls": mapSize <= 256 || getDifficulty() >= 3 ? "towers" : "walls",
			"CityPatch": {
				"outerTerrain": isDesert ? tRoadDesert : tRoadFertileLand,
				"innerTerrain": isDesert ? tRoadDesert : tRoadFertileLand
			},
			"Chicken": {
				"template": oRabbit,
				"distance": 15,
				"minGroupDistance": 2,
				"maxGroupDistance": 4,
				"minGroupCount": 2,
				"maxGroupCount": 3
			},
			"Berries": {
				"template": isDesert ? oBerryBushDesert : oBerryBushGrapes
			},
			"Mines": {
				"types": [
					{ "template": isDesert ? oMetalLargeDesert : oMetalLargeFertileLand },
					{ "template": isDesert ? oStoneLargeDesert : oStoneLargeFertileLand }
				]
			},
			"Trees": {
				"template": isDesert ? oAcacia : pickRandom(oPalms),
				"count": isDesert ? scaleByMapSize(10, 20) : scaleByMapSize(30, 60)
			},
			"Treasures": {
				"types":
				[
					{
						"template": oWoodTreasure,
						"count": isDesert ? 4 : 0
					},
					{
						"template": oStoneTreasure,
						"count": isDesert ? 1 : 0
					},
					{
						"template": oMetalTreasure,
						"count": isDesert ? 1 : 0
					}
				]
			},
			"Decoratives": {
				"template": isDesert ? aRock : pickRandom(aBushesFertileLand)
			}
		});
		
		let breakfast = 
			[
				[2, 3],                                                                     /* Very easy */
				[1, 1, 1, 1, 1, 2, 2, 2, 3, 3],                                             /* Easy */
				[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3],               /* Medium */
				[1, 2],                                                                     /* Hard */
				[0, 1, 1, 1, 1, 1, 2, 2],                                                   /* Very hard */
			];
		Alesia_placePlayerBaseStartingAnimal({                                                     /* Place additional breakfast (early game) */
				"basePosition": playerPosition[i],
				"BaseResourceClass": clBaseResource,
				"baseResourceConstraint": avoidClasses(clPlayer, 4, clWater, 4),
				"template": oGoat,
				"groupCount" : pickRandom(breakfast[getDifficulty() - 1]) * 8,
				"distance": 5,
				"minGroupDistance": 3,
				"maxGroupDistance": 6,
				"minGroupCount": 1,
				"maxGroupCount": 1
			}
		);
	}

	yield 60;

	g_Map.log("Computing city grid");
	const gridCenter = mapCenter;
	const wallGridStartAngle = -Math.PI;
	const gridMaxAngle = 1.999 * Math.PI;
	const gridRadius = y => scaleByMapSize(30, 60) * y;

	const gridPointsX = 9;
	const gridPointsY = Math.floor(scaleByMapSize(2, 3.5));
	const gridPointXCenter = Math.floor(gridPointsX / 2);
	const gridPointYCenter = Math.floor(gridPointsY / 2);
	const gridStepAngle = gridMaxAngle / (gridPointsX + 1);
	const gridAngleOffset = gridStepAngle / 2;
	const gridStartAngle = wallGridStartAngle + gridAngleOffset;

	// Maps from grid position to map position
	const cityGridPosition = [];
	const cityGridAngle = [];
	for (let y = 0; y < gridPointsY; ++y)
		[cityGridPosition[y], cityGridAngle[y]] = distributePointsOnCircularSegment(
			gridPointsX, gridMaxAngle, gridStartAngle, gridRadius(y), gridCenter);

	g_Map.log("Marking city path crossings");
	for (const y in cityGridPosition)
		for (const x in cityGridPosition[y])
		{
			cityGridPosition[y][x].round();
			createArea(
				new DiskPlacer(0, cityGridPosition[y][x]),
					[
						new TileClassPainter(clPath),
						new TileClassPainter(clPathCrossing)
					]);
		}

	g_Map.log("Marking horizontal city paths");
	const areasCityPaths = [];
	for (let y = 0; y < gridPointsY; ++y)
		for (let x = 1; x < gridPointsX; ++x)
		{
			const width = y == gridPointYCenter ? pathWidthSecondary : pathWidth;
			areasCityPaths.push(
				createArea(
					new PathPlacer(cityGridPosition[y][x - 1], cityGridPosition[y][x], width, 0, 8, 0, 0, Infinity),
					new TileClassPainter(clPath)));
		}

	g_Map.log("Marking vertical city paths");
	for (let y = 1; y < gridPointsY; ++y)
		for (let x = 0; x < gridPointsX; ++x)
		{
			const width =
				Math.abs(x - gridPointXCenter) == 0 ?
					pathWidthCenter :
				Math.abs(x - gridPointXCenter) == 1 ?
					pathWidthSecondary :
					pathWidth;

			areasCityPaths.push(
				createArea(
					new PathPlacer(cityGridPosition[y - 1][x], cityGridPosition[y][x], width, 0, 8, 0, 0, Infinity),
					new TileClassPainter(clPath)));
		}
	yield 70;

	const centralPathStart = cityGridPosition[0][gridPointXCenter];
	const centralPathLength = centralPathStart.distanceTo(cityGridPosition[gridPointsY - 1][gridPointXCenter]);
	const centralPathAngle = cityGridAngle[0][gridPointXCenter];

	const cityCrossingPoints = cityGridPosition.reduce((points, row) => points.concat(row), []);

	g_Map.log("Painting city paths");
	const areaPaths = createArea(
			new MapBoundsPlacer(),
			[
				new LayeredPainter([tPathWild, tPath], [1])
			],
			stayClasses(clPath, 0));

	g_Map.log("Placing triggerpoints on city paths");
	createObjectGroupsByAreas(
		new SimpleGroup([new SimpleObject(oTriggerPointCityPath, 1, 1, 0, 0)], true, clTriggerPointCityPath),
		0,
		[avoidClasses(clTriggerPointCityPath, 8), stayClasses(clPathCrossing, 0)],
		scaleByMapSize(20, 100),
		30,
		[areaPaths]);

	g_Map.log("Placing city districts");
	for (let y = 1; y < gridPointsY; ++y)
		for (let x = 1; x < gridPointsX; ++x)
		{
			createArea(
				new ConvexPolygonPlacer([
					cityGridPosition[y - 1][x - 1],
					cityGridPosition[y - 1][x],
					cityGridPosition[y][x],
					cityGridPosition[y][x - 1]
				], Infinity),
				[
					new TerrainPainter(debugShowCityDistricts ? ((x + y) % 2 ? tDistrictDebugA : tDistrictDebugB) : tRoadDesert),
					!debugPaintCityGridOnly && new CityPainter(layoutCity, (-cityGridAngle[y][x - 1] - cityGridAngle[y][x]) / 2, 0),
					new TileClassPainter(clCity)
				].filter(Boolean),
				new StaticConstraint(avoidClasses(clPath, 0)));
		}

	g_Map.log("Placing central city core");
	const centralPlazaRadius = Math.max(6, (gridRadius(0) - pathWidthCenter) * 0.7);
	createArea(
		new DiskPlacer(centralPlazaRadius, gridCenter),
		[
			new TerrainPainter(debugShowCityDistricts ? tDistrictDebugCore : tRoadDesert),
			new TileClassPainter(clCity)
		].filter(Boolean),
		new StaticConstraint());

	if (!debugPaintCityGridOnly)
		g_Map.placeEntityPassable(oWonder, 0, gridCenter, 0);

	createArea(
		new DiskPlacer(centralPlazaRadius, gridCenter),
		[
			new LayeredPainter([tPathWild, tPath], [2]),
			new TileClassPainter(clPath)
		],
		undefined);

	createArea(
		new MapBoundsPlacer(),
		[
			new LayeredPainter([tPathWild, tPath], [1])
		],
		stayClasses(clPath, 0));


	g_Map.log("Creating outer siegeworks");
	const siegeRingRadius = gridRadius(gridPointsY - 1) + scaleByMapSize(10, 16);
	const siegeRingWidth = scaleByMapSize(7, 10);
	const siegeRingCount = Math.max(gridPointsX + 4, Math.floor(scaleByMapSize(12, 22)));
	const siegeRingMaxAngle = Math.min(gridMaxAngle + 0.55 * Math.PI, 1.85 * Math.PI);
	const siegeRingStartAngle = gridStartAngle - (siegeRingMaxAngle - gridMaxAngle) / 2;
	const siegeRingConstraint = avoidClasses(clCity, 1, clPath, 1, clPlayer, scaleByMapSize(14, 22));
	const [siegeRingPositions, siegeRingAngles] = distributePointsOnCircularSegment(
		siegeRingCount,
		siegeRingMaxAngle,
		siegeRingStartAngle,
		siegeRingRadius,
		gridCenter);

	for (let i = 0; i < siegeRingPositions.length; ++i)
	{
		siegeRingPositions[i].round();
		createArea(
			new DiskPlacer(pathWidthSecondary, siegeRingPositions[i]),
			new TileClassPainter(clSiegeRing));
	}

	for (let i = 1; i < siegeRingPositions.length; ++i)
		createArea(
			new PathPlacer(siegeRingPositions[i - 1], siegeRingPositions[i], siegeRingWidth, 0.15, 2, 0, 0, Infinity),
			[
				new LayeredPainter([tRoadDesert, tPathWild], [2]),
				new SmoothElevationPainter(ELEVATION_MODIFY, heightScale(-0.7), 2),
				new TileClassPainter(clSiegeRing)
			],
			siegeRingConstraint);

	createArea(
		new PathPlacer(siegeRingPositions[siegeRingPositions.length - 1], siegeRingPositions[0], siegeRingWidth, 0.15, 2, 0, 0, Infinity),
		[
			new LayeredPainter([tRoadDesert, tPathWild], [2]),
			new SmoothElevationPainter(ELEVATION_MODIFY, heightScale(-0.7), 2),
			new TileClassPainter(clSiegeRing)
		],
		siegeRingConstraint);

	createArea(
		new MapBoundsPlacer(),
		[
			new TerrainPainter(tRoadDesert),
			new SmoothElevationPainter(ELEVATION_MODIFY, heightScale(-0.6), 2)
		],
		[
			new NearTileClassConstraint(clSiegeRing, Math.max(2, Math.floor(siegeRingWidth / 2))),
			siegeRingConstraint
		]);

	for (let i = 1; i < siegeRingPositions.length - 1; ++i)
	{
		if (i % 3 == 1)
			continue;

		const campPos = siegeRingPositions[i];
		const campAngle = siegeRingAngles[i] + Math.PI / 2;

		createArea(
			new DiskPlacer(scaleByMapSize(3, 5), campPos),
			[
				new LayeredPainter([tPathWild, tRoadDesert], [1]),
				new TileClassPainter(clRoad)
			],
			siegeRingConstraint);

		g_Map.placeEntityPassable(aHandcart, 0, campPos, campAngle);
		g_Map.placeEntityPassable(aPlotFence, 0, new Vector2D(0, 3).rotate(campAngle).add(campPos), campAngle);
		g_Map.placeEntityPassable(aPlotFence, 0, new Vector2D(0, -3).rotate(campAngle).add(campPos), campAngle + Math.PI);
		if (i % 2 == 0)
			g_Map.placeEntityPassable(aRock, 0, new Vector2D(2, 0).rotate(campAngle).add(campPos), randomAngle());
	}

	let entitiesGates;
	let wallArtillerySpots = [];
	if (placeCityWall)
	{
		g_Map.log("Placing front walls");
		const wallGridRadiusFront = gridRadius(gridPointsY - 1) + pathWidth - 1;
		const wallGridMaxAngleFront = 1.999 * Math.PI;
		let entitiesWalls = [];
			for (let woffset = 0; woffset <= 2; woffset += 2)
				entitiesWalls = entitiesWalls.concat(placeCircularWall(
					gridCenter,
					wallGridRadiusFront + woffset,
				["tower", "medium", "tower", "gate", "tower", "medium", "tower", "medium", "tower", "medium", "tower", "gate", "tower", "medium", "tower", "medium"],
				placeCityWall,
				0,
				wallGridStartAngle,
				wallGridMaxAngleFront,
					true,
					0,
					0));
			entitiesWalls = entitiesWalls.filter(Boolean);

			g_Map.log("Marking walls");
			createArea(
				new EntitiesObstructionPlacer(entitiesWalls, 0, Infinity),
				new TileClassPainter(clWall));

			g_Map.log("Marking gates");
			entitiesGates = entitiesWalls.filter(entity => entity && entity.templateName.endsWith(oWallGate));
		createArea(
			new EntitiesObstructionPlacer(entitiesGates, 0, Infinity),
			new TileClassPainter(clGate));

		g_Map.log("Computing wall artillery spots");
		const gatePositions = entitiesGates.map(entity => entity.GetPosition2D());
		const wallArtilleryInset = scaleByMapSize(3, 4);
		const wallArtilleryGateClearance = scaleByMapSize(4, 6);
		wallArtillerySpots = entitiesWalls
			.filter(entity => entity && !entity.templateName.endsWith(oWallGate))
			.filter(entity => entity.templateName.endsWith(oWallMedium) || entity.templateName.endsWith(oWallTower))
			.filter(entity => entity.GetPosition2D().distanceTo(gridCenter) <= wallGridRadiusFront + 1)
			.map(entity => {
				const wallPosition = entity.GetPosition2D();
				const wallAngle = Math.atan2(wallPosition.y - gridCenter.y, wallPosition.x - gridCenter.x);
				const wallRadius = wallPosition.distanceTo(gridCenter);
				const position = new Vector2D(0, wallRadius - wallArtilleryInset).rotate(wallAngle).add(gridCenter).round();
				return {
					"angle": wallAngle,
					"position": position,
					"wallPosition": wallPosition
				};
			})
			.filter(spot =>
				gatePositions.every(gatePosition =>
					spot.wallPosition.distanceTo(gatePosition) >= wallArtilleryGateClearance &&
					spot.position.distanceTo(gatePosition) >= wallArtilleryGateClearance))
			.sort((a, b) => a.angle - b.angle);
		g_Map.log("Wall artillery spot count: " + wallArtillerySpots.length);

		g_Map.log("Painting wall terrain");
		createArea(
			new MapBoundsPlacer(),
			[
				new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetWalls, 2),
				new TerrainPainter(tPathWild)
			],
			new NearTileClassConstraint(clWall, 1));

		g_Map.log("Painting gate terrain");
		for (const entity of entitiesGates)
			createArea(
				new DiskPlacer(pathWidth, entity.GetPosition2D()),
				[
					new LayeredPainter([tPathWild, tPath], [1]),
					new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetPath, 2),
				],
				[
					avoidClasses(clPath, 0, clCity, 0),
					new NearTileClassConstraint(clPath, pathWidth + 1)
				]);
	}
	yield 75;

	if (placeCityWall)
	{        
		g_Map.log("Marking wall palm area");
		var areaWallPalms = createArea(
			new MapBoundsPlacer(),
			undefined,
			new StaticConstraint([
				new NearTileClassConstraint(clWall, 2),
				avoidClasses(clPath, 2, clRoad, 1, clWall, 1, clGate, 3)
			]));

		g_Map.log("Placing wall palms");
		createObjectGroupsByAreas(
			new SimpleGroup([new SimpleObject(oPalmPath, 1, 1, 0, 0)], true, clForest),
			0,
			avoidClasses(clForest, 2),
			scaleByMapSize(40, 250),
			50,
			[areaWallPalms]);
		
		g_Map.log("Marking wall siege area");
		var areaWallSiege = createArea(
			new MapBoundsPlacer(),
			undefined,
			new AndConstraint([
				stayCity,
				new StaticConstraint([
					new NearTileClassConstraint(clWall, scaleByMapSize(5, 8)),
					new NearTileClassConstraint(clCity, scaleByMapSize(14, 28)),
					avoidClasses(clWall, 1, clForest, 2, clGate, 2)
				])
			]));
		}

	g_Map.log("Marking contested middle ring");
	const areaMidRing = createArea(
		new DiskPlacer(
			siegeRingRadius + scaleByMapSize(28, 48),
			gridCenter),
		new TileClassPainter(clMidRing),
		new StaticConstraint([
			new NearTileClassConstraint(clCity, scaleByMapSize(26, 52)),
			avoidClasses(clCity, 2, clWall, 4, clGate, 8, clPlayer, 14, clWater, 1)
		]));

	g_Map.log("Painting contested middle ring");
	createArea(
		new MapBoundsPlacer(),
		[
			new LayeredPainter(["steppe_grass_dirt_66", "savanna_dirt_rocks_b"], [2]),
			new SmoothElevationPainter(ELEVATION_MODIFY, heightOffsetRoad / 2, 2)
		],
		[
			new NearTileClassConstraint(clMidRing, scaleByMapSize(3, 6)),
			avoidClasses(clCity, 1, clWall, 3, clGate, 5, clWater, 1)
		]);

	createBumps(
		new StaticConstraint(avoidClasses(clPlayer, 6, clCity, 0, clWater, 2, clPath, 0, clRoad, 0, clWall, 0, clGate, 4)),
		scaleByMapSize(30, 300),
		6,
		10,
		4,
		0,
		2);
	yield 80;

	g_Map.log("Setting up common constraints and areas");
	const avoidCollisionsNomad = new AndConstraint(
		[
			new StaticConstraint(avoidClasses(
				clPlayer, 15, clWater, 1, clPath, 2,
				clCity, 4, clWall, 4, clGate, 8)),
			avoidClasses(clForest, 1, clRock, 4, clMetal, 4, clFood, 2, clSoldier, 1, clTreasure, 1)
		]);

	let avoidCollisions = new AndConstraint(
		[
			avoidCollisionsNomad,
			new StaticConstraint(avoidClasses(clRoad, 6, clFood, 6))
		]);

	const areaDesert = createArea(new MapBoundsPlacer(), undefined, stayDesert);
	const areaFertileLand = createArea(new MapBoundsPlacer(), undefined, stayFertileLand);

	createForests(
		[tForestFloorFertile, tForestFloorFertile, tForestFloorFertile, pForestPalms, pForestPalms],
		[
			stayFertileLand,
			avoidClasses(clForest, 15, clMidRing, 4),
			new StaticConstraint([avoidClasses(clWater, 2), avoidCollisions])
		],
		clForest,
		{
			"nbForests": scaleByMapSize(12, 22),
			"treesPerForest": scaleByMapSize(120, 220)
		},
		10);

	createForests(
		[tForestFloorFertile, tForestFloorFertile, tForestFloorFertile, pForestPalms, pForestPalms],
		[
			stayDesert,
			avoidClasses(clForest, 12, clPlayer, 18, clRoad, 6, clCity, 8, clWall, 6, clMidRing, 4),
			new StaticConstraint([avoidClasses(clWater, 2), avoidCollisions])
		],
		clForest,
		{
			"nbForests": scaleByMapSize(14, 26),
			"treesPerForest": scaleByMapSize(100, 300)
		},
		10);

	g_Map.log("Creating mines");
	const avoidCollisionsMines = [
		avoidClasses(clRock, 10, clMetal, 10),
		new StaticConstraint(avoidClasses(
			clWater, 4, clCity, 4, clPlayer, 20, clForest, 4,
			clPath, 4, clRoad, 4, clGate, 8))
	];

	const mineObjects = (templateSmall, templateLarge) => ({
		"large": [
			new SimpleObject(templateSmall, 0, 2, 0, 4, 0, 2 * Math.PI, 1),
			new SimpleObject(templateLarge, 1, 1, 0, 4, 0, 2 * Math.PI, 4)
		],
		"small": [
			new SimpleObject(templateSmall, 3, 4, 1, 3, 0, 2 * Math.PI, 1)
		]
	});

	const mineObjectsPerBiome = [
		{
			"desert": mineObjects(oMetalSmallDesert, oMetalLargeDesert),
			"fertileLand": mineObjects(oMetalSmallFertileLand, oMetalLargeFertileLand),
			"tileClass": clMetal
		},
		{
			"desert": mineObjects(oStoneSmallDesert, oStoneLargeDesert),
			"fertileLand": mineObjects(oStoneSmallFertileLand, oStoneLargeFertileLand),
			"tileClass": clRock
		}
	];

	for (let i = 0; i < scaleByMapSize(6, 22); ++i)
	{
		const mineObjectsBiome = pickRandom(mineObjectsPerBiome);
		for (const k in mineObjectsBiome.desert)
			createObjectGroupsByAreas(
				new SimpleGroup(mineObjectsBiome.desert[k], true, mineObjectsBiome.tileClass),
				0,
				avoidCollisionsMines.concat([avoidClasses(clFertileLand, 12, mineObjectsBiome.tileClass, 15)]),
				1,
				60,
				[areaDesert]);
	}

	for (let i = 0; i < (mapSettings.Nomad ? scaleByMapSize(6, 16) : scaleByMapSize(0, 8)); ++i)
	{
		let mineObjectsBiome = pickRandom(mineObjectsPerBiome);
		createObjectGroupsByAreas(
			new SimpleGroup(mineObjectsBiome.fertileLand.small, true, mineObjectsBiome.tileClass),
			0,
			avoidCollisionsMines.concat([avoidClasses(clDesert, 5, clMetal, 15, clRock, 15, mineObjectsBiome.tileClass, 20)]),
			1,
			80,
			[areaFertileLand]);
	}

	g_Map.log("Creating contested ring mines");
	for (let i = 0; i < scaleByMapSize(14, 40); ++i)
	{
		const mineObjectsBiome = pickRandom(mineObjectsPerBiome);
		createObjectGroupsByAreas(
			new SimpleGroup(mineObjectsBiome.fertileLand.large, true, mineObjectsBiome.tileClass),
			0,
			avoidCollisionsMines.concat([avoidClasses(clMetal, 12, clRock, 12, mineObjectsBiome.tileClass, 14)]),
			1,
			80,
			[areaMidRing]);
	}

	g_Map.log("Creating extra contested ring metal");
	for (let i = 0; i < scaleByMapSize(8, 24); ++i)
		createObjectGroupsByAreas(
			new SimpleGroup(mineObjectsPerBiome[0].fertileLand.large, true, clMetal),
			0,
			avoidCollisionsMines.concat([avoidClasses(clMetal, 10, clRock, 10)]),
			1,
			80,
			[areaMidRing]);

	g_Map.log("Creating extra contested ring stone");
	for (let i = 0; i < scaleByMapSize(8, 24); ++i)
		createObjectGroupsByAreas(
			new SimpleGroup(mineObjectsPerBiome[1].fertileLand.large, true, clRock),
			0,
			avoidCollisionsMines.concat([avoidClasses(clMetal, 10, clRock, 10)]),
			1,
			80,
			[areaMidRing]);

	g_Map.log("Placing triggerpoints for attackers");
	createObjectGroups(
		new SimpleGroup([new SimpleObject(oTriggerPointAttackerPatrol, 1, 1, 0, 0)], true, clTriggerPointMap),
		0,
		[avoidClasses(clCity, 8, clWater, 0, clWall, 2, clForest, 1, clRock, 4, clMetal, 4, clTriggerPointMap, 15)],
		scaleByMapSize(20, 100),
		30);

	g_Map.log("Creating berries");
	createObjectGroupsByAreas(
		new SimpleGroup([new SimpleObject(oBerryBushGrapes, 4, 6, 1, 2)], true, clFood),
		0,
		avoidCollisions,
		scaleByMapSize(3, 15),
		50,
		[areaFertileLand]);

	g_Map.log("Creating contested ring berries");
	createObjectGroupsByAreas(
		new SimpleGroup([new SimpleObject(oBerryBushGrapes, 6, 10, 1, 3)], true, clFood),
		0,
		avoidCollisions,
		scaleByMapSize(4, 18),
		50,
		[areaMidRing]);

	g_Map.log("Creating boars");
	createObjectGroupsByAreas(
		new SimpleGroup([new SimpleObject(oBoar, 1, 1, 0, 1)], true, clFood),
		0,
		avoidCollisions,
		scaleByMapSize(2, 10),
		50,
		[areaDesert]);

	g_Map.log("Creating warthogs");
	createObjectGroupsByAreas(
		new SimpleGroup([new SimpleObject(oPig, 1, 1, 0, 1)], true, clFood),
		0,
		avoidCollisions,
		scaleByMapSize(2, 10),
		50,
		[areaFertileLand]);

	g_Map.log("Creating deers");
	createObjectGroups(
		new SimpleGroup([new SimpleObject(oDeer, 2, 3, 2, 4), new SimpleObject(oGoat, 2, 3, 2, 4)], true, clFood),
		0,
		avoidCollisions,
		scaleByMapSize(2, 10),
		50);

	if (!mapSettings.Nomad)
	{
		g_Map.log("Creating wolfs");
		createObjectGroupsByAreas(
			new SimpleGroup([new SimpleObject(oWolf, 1, 2, 2, 6)], true, clFood),
			0,
			[avoidCollisions, avoidClasses(clPlayer, 30)],
			scaleByMapSize(2, 10),
			50,
			[areaDesert]);
	}

	yield 85;

	createStragglerTrees(
		oPalms,
		[stayFertileLand, avoidCollisions],
		clForest,
		scaleByMapSize(50, 400),
		200);

	createStragglerTrees(
		[oAcacia],
		[stayDesert, avoidCollisions],
		clForest,
		scaleByMapSize(50, 400),
		200);

	if (placeCityWall)
		{        
			g_Map.log("Placing siege engines inside the city wall");
			let wallArtilleryPlaced = 0;
			const wallArtilleryRows = [0, 3];
			const wallArtilleryLateralOffsets = [-1, 1];

			for (const spot of wallArtillerySpots)
			{
				const angle = spot.angle + Math.PI / 2;
				for (const rowOffset of wallArtilleryRows)
					for (const lateralOffset of wallArtilleryLateralOffsets)
					{
						const position = new Vector2D(lateralOffset, rowOffset).rotate(angle).add(spot.position).round();
						g_Map.placeEntityPassable(pickRandom(oRomanSiegWall), 0, position, angle);
						clSoldier.add(position);
						++wallArtilleryPlaced;
					}
			}
			g_Map.log("Wall artillery placed: " + wallArtilleryPlaced);

			g_Map.log("Placing siege engines around the wonder");
			let wonderArtilleryPlaced = 0;
			const wonderArtilleryRings = [
				{ "radius": Math.max(8, centralPlazaRadius + 2), "count": 12 },
				{ "radius": Math.max(10, centralPlazaRadius + 4), "count": 18 },
				{ "radius": Math.max(12, centralPlazaRadius + 6), "count": 12 }
			];

			for (const ring of wonderArtilleryRings)
			{
				for (let i = 0; i < ring.count; ++i)
				{
					const angle = i / ring.count * 2 * Math.PI;
					const position = new Vector2D(0, ring.radius).rotate(angle).add(gridCenter).round();
					const facing = angle + Math.PI / 2;
					g_Map.placeEntityPassable(pickRandom(oRomanSiegWall), 0, position, facing);
					clSoldier.add(position);
					++wonderArtilleryPlaced;
				}
			}
			g_Map.log("Wonder artillery placed: " + wonderArtilleryPlaced);
		}

	g_Map.log("Creating fish");
	createObjectGroups(
		new SimpleGroup([new SimpleObject(oFish, 3, 4, 2, 3)], true, clFood),
		0,
		[new StaticConstraint(stayClasses(clWater, 6)), avoidClasses(clFood, 12)],
		scaleByMapSize(20, 120),
		50);

	yield 95;

	avoidCollisions = new StaticConstraint(avoidCollisions);

	createDecoration(
		aBushesDesert.map(bush => [new SimpleObject(bush, 0, 3, 2, 4)]),
		aBushesDesert.map(bush => scaleByMapSize(20, 120) * randIntInclusive(1, 3)),
		[stayDesert, avoidCollisions]);

	createDecoration(
		aBushesFertileLand.map(bush => [new SimpleObject(bush, 0, 4, 2, 4)]),
		aBushesFertileLand.map(bush => scaleByMapSize(20, 120) * randIntInclusive(1, 3)),
		[stayFertileLand, avoidCollisions]);

	createDecoration(
		[[new SimpleObject(aRock, 0, 4, 2, 4)]],
		[[scaleByMapSize(80, 500)]],
		[stayDesert, avoidCollisions]);

	createDecoration(
		aBushesFertileLand.map(bush => [new SimpleObject(bush, 0, 3, 2, 4)]),
		aBushesFertileLand.map(bush => scaleByMapSize(100, 800)),
		[new HeightConstraint(heightWaterLevel, heightShoreline), avoidCollisions]);

	g_Map.log("Creating reeds");
	createObjectGroupsByAreas(
		new SimpleGroup([new RandomObject(aWaterDecoratives, 2, 4, 1, 2)], true),
		0,
		new StaticConstraint(new NearTileClassConstraint(clFertileLand, 4)),
		scaleByMapSize(50, 400),
		20,
		[areaWater]);

	g_Map.log("Creating reeds at the irrigation canals");
	for (const area of areasPassages)
		createObjectGroupsByAreas(
			new SimpleGroup([new RandomObject(aWaterDecoratives, 2, 4, 1, 2)], true),
			0,
			undefined,
			15,
			20,
			[area]);

	g_Map.log("Creating hawk");
	for (let i = 0; i < scaleByMapSize(0, 2); ++i)
		g_Map.placeEntityAnywhere(oHawk, 0, mapCenter, randomAngle());

	placePlayersNomad(clPlayer, [avoidClasses(clDesert, 0, clSoldier, 20, clCity, 15, clWall, 20), avoidCollisionsNomad]);

	setWindAngle(-0.43);
	setWaterHeight(heightWaterLevel + SEA_LEVEL);
	setWaterTint(0.161, 0.286, 0.353);
	setWaterColor(0.129, 0.176, 0.259);
	setWaterWaviness(8);
	setWaterMurkiness(0.87);
	setWaterType("lake");

	setAmbientColor(0.58, 0.443, 0.353);

	setSunColor(0.733, 0.746, 0.574);
	setSunRotation(Math.PI / 2 * randFloat(-1, 1));
	setSunElevation(Math.PI / 7);

	setFogFactor(0);
	setFogThickness(0);
	setFogColor(0.69, 0.616, 0.541);

	setPPEffect("hdr");
	setPPContrast(0.67);
	setPPSaturation(0.42);
	setPPBloom(0.23);

	return g_Map;
}
