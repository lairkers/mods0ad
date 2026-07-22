/**
 * Radial map with one mountain-separated sector per player.
 *
 * Player IDs are deliberately shuffled instead of grouped by team. Each sector
 * has exactly one base and one route to the shared central plain.
 */

Engine.LoadLibrary("rmgen");
Engine.LoadLibrary("rmgen-common");
Engine.LoadLibrary("rmbiome");

export function* generateMap(mapSettings)
{
	setBiome(mapSettings.Biome);

	const tMain = g_Terrains.mainTerrain;
	const tForestFloor1 = g_Terrains.forestFloor1;
	const tForestFloor2 = g_Terrains.forestFloor2;
	const tCliff = g_Terrains.cliff;
	const tHill = g_Terrains.hill;
	const tRoad = g_Terrains.road;
	const tRoadWild = g_Terrains.roadWild;
	const tDirt = g_Terrains.tier1Terrain;

	const oTree1 = g_Gaia.tree1;
	const oTree2 = g_Gaia.tree2;
	const oTree4 = g_Gaia.tree4;
	const oFruitBush = g_Gaia.fruitBush;
	const oMainHuntableAnimal = g_Gaia.mainHuntableAnimal;
	const oSecondaryHuntableAnimal = g_Gaia.secondaryHuntableAnimal;
	const oStoneLarge = g_Gaia.stoneLarge;
	const oStoneSmall = g_Gaia.stoneSmall;
	const oMetalLarge = g_Gaia.metalLarge;
	const oMetalSmall = g_Gaia.metalSmall;
	const oWonder = "structures/iber/wonder";
	const oTriggerPointCityPath = "trigger/trigger_point_A";
	const oTriggerPointAttackerPatrol = "trigger/trigger_point_B";

	const iberCityBuildings = [
		"structures/iber/civil_centre",
		"structures/iber/fortress",
		"structures/iber/temple",
		"structures/iber/barracks",
		"structures/iber/stable",
		"structures/iber/arsenal"
	];
	const iberCityOuterBuildings = [
		"structures/iber/fortress",
		"structures/iber/defense_tower",
		"structures/iber/barracks",
		"structures/iber/stable",
		"structures/iber/arsenal",
		"structures/iber/house"
	];

	const heightLand = 3;
	const heightMountain = 32;
	globalThis.g_Map = new RandomMap(heightLand, tMain);

	const mapCenter = g_Map.getCenter();
	const numPlayers = getNumPlayers();
	const segmentCount = Math.ceil(numPlayers * 1.5);
	const startAngle = randomAngle();

	const clPlayer = g_Map.createTileClass();
	const clBaseResource = g_Map.createTileClass();
	const clMountain = g_Map.createTileClass();
	const clCenter = g_Map.createTileClass();
	const clPass = g_Map.createTileClass();
	const clForest = g_Map.createTileClass();
	const clDirt = g_Map.createTileClass();
	const clRock = g_Map.createTileClass();
	const clMetal = g_Map.createTileClass();
	const clFood = g_Map.createTileClass();
	const clCity = g_Map.createTileClass();
	const clWall = g_Map.createTileClass();
	const clCityTrigger = g_Map.createTileClass();
	const clAttackTrigger = g_Map.createTileClass();

	const playerIDs = shuffleArray(sortAllPlayers());
	const playerRadius = fractionToTiles(0.34);
	const playerSegment = playerIDs.map((id, i) =>
		Math.round(i * segmentCount / numPlayers) % segmentCount);
	const playerAngle = playerSegment.map(segment =>
		startAngle + segment * 2 * Math.PI / segmentCount);
	const playerPosition = playerIDs.map((id, i) =>
		Vector2D.add(
			mapCenter,
			new Vector2D(playerRadius, 0).rotate(-playerAngle[i])));

	placePlayerBases({
		"PlayerPlacement": [playerIDs, playerPosition],
		"PlayerTileClass": clPlayer,
		"BaseResourceClass": clBaseResource,
		"CityPatch": {
			"outerTerrain": tRoadWild,
			"innerTerrain": tRoad
		},
		"StartingAnimal": {},
		"Berries": { "template": oFruitBush },
		"Mines": {
			"types": [
				{ "template": oMetalLarge },
				{ "template": oStoneLarge }
			]
		},
		"Trees": {
			"template": oTree1,
			"count": scaleByMapSize(5, 18)
		}
	});

	yield 15;

	// The common destination remains broad enough to prevent a single choke point.
	const centerRadius = fractionToTiles(numPlayers > 6 ? 0.15 : 0.13);
	createArea(
		new DiskPlacer(centerRadius, mapCenter),
		[
			new LayeredPainter([tDirt, tMain], [3]),
			new SmoothElevationPainter(ELEVATION_SET, heightLand, 3),
			new TileClassPainter(clCenter)
		]);

	// Each ridge lies precisely between two player sectors. It starts outside the
	// central plain and reaches the circular map edge, creating isolated valleys.
	const ridgeWidth = Math.max(5, scaleByMapSize(9, 16) - segmentCount);
	for (let i = 0; i < segmentCount; ++i)
	{
		const angle = startAngle + (i + 0.5) * 2 * Math.PI / segmentCount;
		const start = Vector2D.add(
			mapCenter,
			new Vector2D(centerRadius - 1, 0).rotate(-angle));
		const end = Vector2D.add(
			mapCenter,
			new Vector2D(fractionToTiles(0.49), 0).rotate(-angle));

		createArea(
			new PathPlacer(start, end, ridgeWidth, 0.25, 0.25, 0.15, -0.4),
			[
				new LayeredPainter([tCliff, tHill], [2]),
				new SmoothElevationPainter(ELEVATION_SET, heightMountain, 3),
				new TileClassPainter(clMountain)
			]);
	}

	// Visually emphasize the star arms and guarantee a clear approach to mid.
	for (let i = 0; i < playerPosition.length; ++i)
	{
		const passEnd = Vector2D.add(
			mapCenter,
			new Vector2D(centerRadius + 2, 0).rotate(-playerAngle[i]));
		createArea(
			new PathPlacer(playerPosition[i], passEnd, scaleByMapSize(8, 14), 0.15, 0.2, 0.1, 0),
			[
				new LayeredPainter([tRoadWild, tRoad], [2]),
				new SmoothElevationPainter(ELEVATION_SET, heightLand, 2),
				new TileClassPainter(clPass)
			]);
	}

	// A fortified Gaia city occupies the entire common plain. The radial roads
	// enter through frequent gates and continue as avenues towards the wonder.
	const cityRadius = centerRadius - scaleByMapSize(3, 5);
	createArea(
		new DiskPlacer(cityRadius, mapCenter),
		[
			new TerrainPainter(tRoadWild),
			new SmoothElevationPainter(ELEVATION_SET, heightLand, 2),
			new TileClassPainter(clCity)
		]);

	g_WallStyles.star_city = {
		"short": readyWallElement("uncapturable|structures/iber/wall_short"),
		"medium": readyWallElement("uncapturable|structures/iber/wall_medium"),
		"tower": readyWallElement("uncapturable|structures/iber/wall_tower"),
		"gate": readyWallElement("uncapturable|structures/iber/wall_gate"),
		"overlap": 0.05
	};
	const wallEntities = placeCircularWall(
		mapCenter,
		cityRadius,
		["tower", "medium", "tower", "gate", "tower", "medium"],
		"star_city",
		0,
		startAngle,
		2 * Math.PI,
		true,
		0,
		0).filter(Boolean);
	createArea(
		new EntitiesObstructionPlacer(wallEntities, 0, Infinity),
		new TileClassPainter(clWall));

	const placeGaiaRing = (templates, count, radius, angleOffset) =>
	{
		for (let i = 0; i < count; ++i)
		{
			const angle = startAngle + angleOffset + i * 2 * Math.PI / count;
			const position = Vector2D.add(mapCenter, new Vector2D(radius, 0).rotate(-angle));
			g_Map.placeEntityPassable(
				"uncapturable|" + templates[i % templates.length],
				0,
				position,
				-angle + Math.PI);
		}
	};

	placeGaiaRing(
		iberCityBuildings,
		Math.max(8, Math.min(10, numPlayers * 2)),
		cityRadius * 0.48,
		Math.PI / Math.max(8, Math.min(10, numPlayers * 2)));
	placeGaiaRing(
		iberCityOuterBuildings,
		Math.max(12, Math.min(18, numPlayers * 2)),
		cityRadius * 0.78,
		0);

	// The only capturable Gaia structure is the flag-equivalent victory target.
	g_Map.placeEntityPassable(oWonder, 0, mapCenter, startAngle);

	// Alesia patrols use A points as a route through the city and B points as
	// destinations after their initial attack-walk.
	const cityPatrolPointCount = Math.max(12, numPlayers * 3);
	for (let i = 0; i < cityPatrolPointCount; ++i)
	{
		const angle = startAngle + i * 2 * Math.PI / cityPatrolPointCount;
		const radius = i % 2 ? cityRadius * 0.32 : cityRadius * 0.63;
		const position = Vector2D.add(mapCenter, new Vector2D(radius, 0).rotate(-angle));
		g_Map.placeEntityPassable(oTriggerPointCityPath, 0, position, 0);
		clCityTrigger.add(position);
	}
	for (let i = 0; i < Math.max(6, numPlayers); ++i)
	{
		const angle = startAngle + i * 2 * Math.PI / Math.max(6, numPlayers);
		const position = Vector2D.add(
			mapCenter,
			new Vector2D(fractionToTiles(0.27), 0).rotate(-angle));
		g_Map.placeEntityPassable(oTriggerPointAttackerPatrol, 0, position, 0);
		clAttackTrigger.add(position);
	}

	yield 35;

	createBumps(avoidClasses(clPlayer, 12, clMountain, 2, clPass, 2, clCenter, 2, clCity, 2));

	const [forestTrees, stragglerTrees] = getTreeCounts(...rBiomeTreeCount(4.0));
	createDefaultForests(
		[tMain, tForestFloor1, tForestFloor2,
			tForestFloor1 + TERRAIN_SEPARATOR + oTree1,
			tForestFloor2 + TERRAIN_SEPARATOR + oTree2],
		avoidClasses(clPlayer, 18, clMountain, 2, clPass, 3, clCenter, 3, clCity, 3, clForest, 12),
		clForest,
		forestTrees);

	createLayeredPatches(
		[scaleByMapSize(3, 6), scaleByMapSize(5, 10), scaleByMapSize(8, 18)],
		[tMain, tDirt],
		[2],
		avoidClasses(clPlayer, 10, clMountain, 1, clPass, 1, clCenter, 2, clCity, 2, clForest, 1, clDirt, 5),
		scaleByMapSize(15, 45),
		clDirt);

	yield 55;

	createBalancedMetalMines(
		oMetalSmall,
		oMetalLarge,
		clMetal,
		avoidClasses(clPlayer, 20, clMountain, 2, clPass, 3, clCenter, 4, clCity, 4, clForest, 1));
	createBalancedStoneMines(
		oStoneSmall,
		oStoneLarge,
		clRock,
		avoidClasses(clPlayer, 20, clMountain, 2, clPass, 3, clCenter, 4, clCity, 4, clForest, 1, clMetal, 10));

	createFood(
		[
			[new SimpleObject(oMainHuntableAnimal, 5, 7, 0, 4)],
			[new SimpleObject(oSecondaryHuntableAnimal, 2, 3, 0, 2)]
		],
		[3 * numPlayers, 3 * numPlayers],
		avoidClasses(clPlayer, 16, clMountain, 2, clPass, 2, clCity, 3, clForest, 1, clMetal, 4, clRock, 4, clFood, 18),
		clFood);

	createStragglerTrees(
		[oTree1, oTree2, oTree4],
		avoidClasses(clPlayer, 10, clMountain, 1, clPass, 2, clCenter, 2, clCity, 2, clForest, 7, clMetal, 5, clRock, 5, clFood, 2),
		clForest,
		stragglerTrees);

	yield 85;

	placePlayersNomad(
		clPlayer,
		avoidClasses(clMountain, 4, clForest, 1, clMetal, 4, clRock, 4, clFood, 2));

	setSkySet("cirrus");
	setFogFactor(0.15);
	setFogThickness(0.12);
	setPPEffect("hdr");
	setPPContrast(0.55);
	setPPSaturation(0.55);
	setPPBloom(0.1);

	return g_Map;
}
