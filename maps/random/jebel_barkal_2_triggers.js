/**
 * The city is patroled along its paths by infantry champions that respawn reoccuringly.
 * There are increasingly great gaia attacks started from the different buildings.
 * The players can destroy gaia buildings to reduce the number of attackers for the future.
 */

/**
 * If set to true, it will print how many templates would be spawned if the players were not defeated.
 */
const dryRun = false;

/**
 * If enabled, prints the number of units to the command line output.
 */
const showDebugLog = true;

/**
 * Since Gaia doesn't have a TechnologyManager, Advanced and Elite soldiers have the same statistics as Basic.
 */
var jebelBarkal_rank = "Basic";

/**
 * Limit the total amount of gaia units spawned for performance reasons.
 */
var jebelBarkal_maxPopulation = 8 * 100;

/**
 * These are the templates spawned at the gamestart and during the game.
 */
var jebelBarkal_templateClasses = deepfreeze({
	"heroes": "Hero",
	"champions": "Champion+!Elephant",
	"elephants": "Champion+Elephant",
	"siege_ram": "Siege+Ram",
	"champion_infantry": "Champion+Infantry",
	"champion_infantry_melee": "Champion+Infantry+Melee",
	"champion_infantry_ranged": "Champion+Infantry+Ranged",
	"champion_cavalry": "Champion+Cavalry",
	"champion_cavalry_melee": "Champion+Cavalry+Melee",
	"citizenSoldiers": "CitizenSoldier",
	"citizenSoldier_infantry": "CitizenSoldier+Infantry",
	"citizenSoldier_infantry_melee": "CitizenSoldier+Infantry+Melee",
	"citizenSoldier_infantry_ranged": "CitizenSoldier+Infantry+Ranged",
	"citizenSoldier_cavalry": "CitizenSoldier+Cavalry",
	"citizenSoldier_cavalry_melee": "CitizenSoldier+Cavalry+Melee",
	"healers": "Healer",
	"females": "FemaleCitizen"
});

var jebelBarkal_templates = deepfreeze(Object.keys(jebelBarkal_templateClasses).reduce((templates, name) => {
	templates[name] = TriggerHelper.GetTemplateNamesByClasses(jebelBarkal_templateClasses[name], "kush", undefined, jebelBarkal_rank, true);
	return templates;
}, {}));

/**
 * These are the formations patroling and attacking units can use.
*/
var jebelBarkal_formations = [
	"special/formations/line_closed",
	"special/formations/box"
];

/**
 *  Balancing helper function.
 *
 *  @returns min0 value at the beginning of the game, min60 after 50 minutes of gametime or longer and
 *  a proportionate number between these two values before the first 50 minutes are reached.
 */
var scaleByTime = (minCurrent, min0, min50) => min0 + (min50 - min0) * Math.min(1, minCurrent / 50);

/**
 *  @returns min value at map size 128 (very small), max at map size 512 and
 *  a proportionate number between these two values.
 */
var scaleByMapSize = (min, max) => min + (max - min) * (TriggerHelper.GetMapSizeTiles() - 128) / (512 - 128);

/**
 * Defensive Infantry units patrol along the paths of the city.
 */
var jebelBarkal_cityPatrolGroup_count = time => TriggerHelper.GetMapSizeTiles() > 192 ? scaleByTime(time, 3, scaleByMapSize(3, 10)) : 0;
var jebelBarkal_cityPatrolGroup_interval = time => scaleByTime(time, 5, 3);
var jebelBarkal_cityPatrolGroup_balancing = {
	"buildingClasses": ["Wonder", "Temple", "CivCentre", "Fortress", "Barracks", "Embassy"],
	"unitCount": time => Math.min(20, scaleByTime(time, 10, 45)),
	"unitComposition": (time, heroes) => [
		{
			"templates": jebelBarkal_templates.champion_infantry_melee,
			"frequency": scaleByTime(time, 0, 2)
		},
		{
			"templates": jebelBarkal_templates.champion_infantry_ranged,
			"frequency": scaleByTime(time, 0, 3)
		},
		{
			"templates": jebelBarkal_templates.citizenSoldier_infantry_melee,
			"frequency": scaleByTime(time, 2, 0)
		},
		{
			"templates": jebelBarkal_templates.citizenSoldier_infantry_ranged,
			"frequency": scaleByTime(time, 3, 0)
		}
	],
	"targetClasses": () => "Unit+!Ship"
};

/**
 * Frequently the buildings spawn different units that attack the players groupwise.
 * Leave more time between the attacks in later stages of the game since the attackers become much stronger over time.
 */
var jebelBarkal_attackInterval = (time, difficulty) => randFloat(5, 7) + time / difficulty / 10;            /* Changed here for quicker attacks */

/**
 * Prevent city patrols chasing the starting units in nomad mode.
 */
var jebelBarkal_firstCityPatrolTime = (difficulty, isNomad) =>
	(isNomad ? 7 - difficulty : 0);

/**
 * Delay the first attack in nomad mode.
 */
var jebelBarkal_firstAttackTime = (difficulty, isNomad) =>
	jebelBarkal_attackInterval(0, difficulty) +
	2 * Math.max(0, 3 - difficulty) +
	(isNomad ?  9 - difficulty : 0);

/**
 * Account for varying mapsizes and number of players when spawning attackers.
 */
var jebelBarkal_attackerGroup_sizeFactor = (numPlayers, numInitialSpawnPoints, difficulty) =>
	numPlayers / numInitialSpawnPoints * (difficulty + 2) * 0.85;                                           /* Change here for bigger attack groups */

/**
 * Assume gaia to be the native kushite player.
 */
var jebelBarkal_playerID = 0;

/**
 * City patrols soldiers will patrol along these triggerpoints on the crossings of the city paths.
 */
var jebelBarkal_cityPatrolGroup_triggerPointPath = "A";

/**
 * Attackers will patrol these points after having finished the attack-walk order.
 */
var jebelBarkal_attackerGroup_triggerPointPatrol = "B";

/**
 * Number of points the attackers patrol.
 */
var jebelBarkal_patrolPointCount = 6;

/**
 * Healers near the wonder run these animations when idle.
 */
var jebelBarkal_ritualAnimations = ["attack_capture", "promotion", "heal"];

/**
 * This defines which units are spawned and garrisoned at the gamestart per building.
 */
var jebelBarkal_buildingGarrison = difficulty => [
	{
		"buildingClasses": ["Wonder", "Temple", "CivCentre", "Fortress"],
		"unitTemplates": jebelBarkal_templates.champions,
		"capacityRatio": 1
	},
	{
		"buildingClasses": ["Barracks", "Embassy"],
		"unitTemplates": [...jebelBarkal_templates.citizenSoldier_infantry, ...jebelBarkal_templates.champion_infantry],
		"capacityRatio": 1
	},
	{
		"buildingClasses": ["Tower"],
		"unitTemplates": jebelBarkal_templates.champion_infantry,
		"capacityRatio": 1
	},
	{
		"buildingClasses": ["ElephantStable"],
		"unitTemplates": jebelBarkal_templates.elephants,
		"capacityRatio": 1
	},
	{
		"buildingClasses": ["Arsenal"],
		"unitTemplates": jebelBarkal_templates.siege_ram,
		"capacityRatio": 1

	},
	{
		"buildingClasses": ["Stable"],
		"unitTemplates": [...jebelBarkal_templates.citizenSoldier_cavalry, ...jebelBarkal_templates.champion_cavalry],
		"capacityRatio": 1

	},
	{
		"buildingClasses": ["House"],
		"unitTemplates": [...jebelBarkal_templates.females, ...jebelBarkal_templates.healers],
		"capacityRatio": 0.5
	},
	{
		"buildingClasses": ["WallTower"],
		"unitTemplates": [...jebelBarkal_templates.citizenSoldier_infantry, ...jebelBarkal_templates.champion_infantry],
		"capacityRatio": difficulty >= 3 ? 1 : 0
	},
	{
		"buildingClasses": ["WallLong", "WallMedium", "WallShort"],
		"unitTemplates": jebelBarkal_templates.citizenSoldier_infantry_ranged,
		"capacityRatio": difficulty >= 3 ? 0.5 : 0
	}
];

/**
 * This defines which units are spawned at the different buildings at the given time.
 * The buildings are ordered by strength.
 * Notice that there are always 2 groups of these count spawned, one for each side!
 * The units should do a walk-attack to random player CCs
 */
var jebelBarkal_attackerGroup_balancing = [
	{
		// This should be the most influential building
		"buildingClasses": ["Wonder"],
		"unitCount": time => scaleByTime(time, 0, 85),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.heroes,
				"count": randBool(scaleByTime(time, -0.5, 2)) ? 1 : 0,
				"unique_entities": heroes
			},
			{
				"templates": jebelBarkal_templates.healers,
				"frequency": randFloat(0, 0.1)
			},
			{
				"templates": jebelBarkal_templates.champions,
				"frequency": scaleByTime(time, 0, 0.6)
			},
			{
				"templates": jebelBarkal_templates.champion_infantry_ranged,
				"frequency": scaleByTime(time, 0, 0.4)
			},
			{
				"templates": jebelBarkal_templates.citizenSoldiers,
				"frequency": scaleByTime(time, 1, 0)
			},
			{
				"templates": jebelBarkal_templates.citizenSoldier_infantry_ranged,
				"frequency": scaleByTime(time, 1, 0)
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		"buildingClasses": ["Fortress"],
		"unitCount": time => scaleByTime(time, 0, 45),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.heroes,
				"count": randBool(scaleByTime(time, -0.5, 1.5)) ? 1 : 0,
				"unique_entities": heroes
			},
			{
				"templates": jebelBarkal_templates.champions,
				"frequency": scaleByTime(time, 0, 1)
			},
			{
				"templates": jebelBarkal_templates.citizenSoldiers,
				"frequency": scaleByTime(time, 1, 0)
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		// These should only train the strongest units
		"buildingClasses": ["Temple"],
		"unitCount": time => Math.min(45, scaleByTime(time, -30, 90)),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.heroes,
				"count": randBool(scaleByTime(time, -0.5, 1)) ? 1 : 0,
				"unique_entities": heroes
			},
			{
				"templates": jebelBarkal_templates.champion_infantry_melee,
				"frequency": 0.5
			},
			{
				"templates": jebelBarkal_templates.champion_infantry_ranged,
				"frequency": 0.5
			},
			{
				"templates": jebelBarkal_templates.healers,
				"frequency": randFloat(0.05, 0.2)
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		"buildingClasses": ["CivCentre"],
		"unitCount": time => Math.min(40, scaleByTime(time, 0, 80)),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.heroes,
				"count": randBool(scaleByTime(time, -0.5, 0.5)) ? 1 : 0,
				"unique_entities": heroes
			},
			{
				"templates": jebelBarkal_templates.champion_infantry,
				"frequency": scaleByTime(time, 0, 1)
			},
			{
				"templates": jebelBarkal_templates.citizenSoldiers,
				"frequency": scaleByTime(time, 1, 0)
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		"buildingClasses": ["Stable"],
		"unitCount": time => Math.min(30, scaleByTime(time, 0, 80)),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.citizenSoldier_cavalry_melee,
				"frequency": scaleByTime(time, 2, 0)
			},
			{
				"templates": jebelBarkal_templates.champion_cavalry_melee,
				"frequency": scaleByTime(time, 0, 1)
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		"buildingClasses": ["Barracks", "Embassy"],
		"unitCount": time => Math.min(35, scaleByTime(time, 0, 70)),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.citizenSoldier_infantry,
				"frequency": 1
			}
		],
		"formations": jebelBarkal_formations,
		"targetClasses": () => "Unit+!Ship"
	},
	{
		"buildingClasses": ["ElephantStable", "Wonder"],
		"unitCount": time => scaleByTime(time, 1, 14),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.elephants,
				"frequency": 1
			}
		],
		"formations": [],
		"targetClasses": () => pickRandom(["Defensive SiegeEngine Monument Wonder", "Structure"])
	},
	{
		"buildingClasses": ["Arsenal"],
		"unitCount": time => scaleByTime(time, 1, 14),
		"unitComposition": (time, heroes) => [
			{
				"templates": jebelBarkal_templates.siege_ram,
				"frequency": 1
			}
		],
		"formations": [],
		"targetClasses": () => pickRandom(["Defensive SiegeEngine Monument Wonder", "Structure"])
	}
];

Trigger.prototype.debugLog = function(txt)
{
	if (showDebugLog)
    {
        let realtime = JSON.stringify(new Date()).split('T')[1].replace('\"', '').replace('Z', '');
        let ingametime = Math.round(TriggerHelper.GetTime());
		print("DEBUG [" + realtime + "] [" + ingametime + "] " + txt + "\n");
    }
};

// Function to create random position inside the map
Trigger.prototype.JebelBarkal_rebuildCity_getRandomPosition = function()
{
    let mapradius = TriggerHelper.GetMapSizeTiles() * 2;
    let alpha = randFloat(0, 2 * Math.PI);              // TODO: restrict to desert?
    let radius = randFloat(0, mapradius);               // TODO: avoid inside the city?
    let x = Math.floor(Math.cos(alpha) * radius + mapradius);
    let y = Math.floor(Math.sin(alpha) * radius + mapradius);

    return { "x": x, "y": y };
}

// Modified version of TryConstructBuilding()
Trigger.prototype.JebelBarkal_rebuildCity_TryConstructBuilding = function(player, cmpPlayer, controlAllUnits, cmd)
{
	var foundationTemplate = "foundation|" + cmd.template;

	// Tentatively create the foundation (we might find later that it's a invalid build command)
	var ent = Engine.AddEntity(foundationTemplate);
	if (ent == INVALID_ENTITY)
	{
		// Error (e.g. invalid template names)
		error("Error creating foundation entity for '" + cmd.template + "'");
		return false;
	}

	// Move the foundation to the right place
	var cmpPosition = Engine.QueryInterface(ent, IID_Position);
	cmpPosition.JumpTo(cmd.x, cmd.z);
	cmpPosition.SetYRotation(cmd.angle);

	// Make it owned by the current player
	var cmpOwnership = Engine.QueryInterface(ent, IID_Ownership);
	cmpOwnership.SetOwner(player);

	// Check whether building placement is valid
	var cmpBuildRestrictions = Engine.QueryInterface(ent, IID_BuildRestrictions);
	if (cmpBuildRestrictions)
	{
		var ret = cmpBuildRestrictions.CheckPlacement();
		if (!ret.success)
		{
			//warn("Invalid command: build restrictions check failed with '"+ret.message+"' for player "+player+": "+uneval(cmd));

			var cmpGuiInterface = Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface);
			ret.players = [player];
			cmpGuiInterface.PushNotification(ret);

			// Remove the foundation because the construction was aborted
			// move it out of world because it's not destroyed immediately.
			cmpPosition.MoveOutOfWorld();
			Engine.DestroyEntity(ent);
			return false;
		}
	}
	else
		error("cmpBuildRestrictions not defined");

	// Check entity limits
	var cmpEntityLimits = QueryPlayerIDInterface(player, IID_EntityLimits);
	if (cmpEntityLimits && !cmpEntityLimits.AllowedToBuild(cmpBuildRestrictions.GetCategory()))
	{
		//warn("Invalid command: build limits check failed for player "+player+": "+uneval(cmd));

		// Remove the foundation because the construction was aborted
		cmpPosition.MoveOutOfWorld();
		Engine.DestroyEntity(ent);
		return false;
	}

	var cmpVisual = Engine.QueryInterface(ent, IID_Visual);
	if (cmpVisual && cmd.actorSeed !== undefined)
		cmpVisual.SetActorSeed(cmd.actorSeed);

	// Initialise the foundation
	var cmpFoundation = Engine.QueryInterface(ent, IID_Foundation);
	cmpFoundation.InitialiseConstruction(cmd.template);

	// Tell the units to start building this new entity
	if (cmd.autorepair)
	{
		ProcessCommand(player, {
			"type": "repair",
			"entities": cmd.entities,
			"target": ent,
			"autocontinue": cmd.autocontinue,
			"queued": cmd.queued,
			"pushFront": cmd.pushFront,
			"formation": cmd.formation || undefined
		});
	}

	return ent;
}

Trigger.prototype.JebelBarkal_rebuildCity_PlaceAndConstruct = function(template, retryCount)
{
    /* Step 1: Spawn group of units */
    let spawnEnt = pickRandom(this.jebelBarkal_patrolGroupSpawnPoints);
    let templateCounts = TriggerHelper.BalancedTemplateComposition(
        [{
			"templates": jebelBarkal_templates.citizenSoldier_infantry,
			"frequency": 1
		}],
        5);
    let groupEntities = this.JebelBarkal_SpawnTemplates(spawnEnt, templateCounts);
    this.JebelBarkal_PrepareEntitiesForRandomAttack(groupEntities);

    /* Step 2: Try to place a foundation somewhere */
    let ent = false;
    for (let i = 0; i < retryCount && !ent; i ++) {
        let pos = this.JebelBarkal_rebuildCity_getRandomPosition();
        
        let cmd = {
            "type": "construct",
            "template": template,
            "x": pos.x,
            "z": pos.y,
            "angle": 3 * Math.PI / 4,
            "actorSeed": randIntExclusive(0, Math.pow(2, 16)),
            "entities": groupEntities,
            "autorepair": true,
            "autocontinue": false,
            "queued": true,
            "pushFront": false,
            "formation": pickRandom(jebelBarkal_formations)
        };
        
        let cmpPlayer = QueryPlayerIDInterface(jebelBarkal_playerID);

        ent = this.JebelBarkal_rebuildCity_TryConstructBuilding(
            jebelBarkal_playerID,
            cmpPlayer,
            cmpPlayer.CanControlAllUnits(),
            cmd
        );
    }
    
    /* Step 3: If building could be placed, store foundation id for JebelBarkal_StructureBuilt() */
    if (ent)
        this.JebelBarkal_rebuildCity_unfinishedBuildings.push(ent);
        
    /* Step 4: Queue command for random attack, if building finished */
    let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
    let playerEntities = activePlayers.map(playerID =>
        TriggerHelper.GetEntitiesByPlayer(playerID).filter(TriggerHelper.IsInWorld));
    let patrolPoints = this.GetTriggerPoints(jebelBarkal_attackerGroup_triggerPointPatrol);
    this.JebelBarkal_SendEntitiesToRandomAttack(playerEntities, patrolPoints, groupEntities, true);
}

Trigger.prototype.JebelBarkal_Init = function()
{
	let isNomad = !TriggerHelper.GetAllPlayersEntitiesByClass("CivCentre").length;

	this.JebelBarkal_Init_TrackUnits();
	this.RegisterTrigger("OnOwnershipChanged", "JebelBarkal_OwnershipChange", { "enabled": true });
    this.RegisterTrigger("OnStructureBuilt", "JebelBarkal_StructureBuilt", { "enabled": true });

	this.JebelBarkal_SetDefenderStance();
	this.JebelBarkal_StartRitualAnimations();
	this.JebelBarkal_GarrisonBuildings();
	this.DoAfterDelay(jebelBarkal_firstCityPatrolTime(this.GetDifficulty(), isNomad) * 60 * 1000, "JebelBarkal_SpawnCityPatrolGroups", {});
	this.JebelBarkal_StartAttackTimer(jebelBarkal_firstAttackTime(this.GetDifficulty(), isNomad));
    
    this.JebelBarkal_SetApocalypticRidersStartTime(this.GetDifficulty());
    
    this.JebelBarkal_rebuildCity_unfinishedBuildings = [];
};

Trigger.prototype.JebelBarkal_StructureBuilt = function(data)
{
    this.debugLog("JebelBarkal_StructureBuilt Start"); /* FIXME */
    let index = this.JebelBarkal_rebuildCity_unfinishedBuildings.indexOf(data.foundation);
    if (index > -1)
    {
        this.JebelBarkal_rebuildCity_unfinishedBuildings.splice(index, 1);  // Remove foundation id from intermediate buffer
        this.jebelBarkal_attackerGroupSpawnPoints.push(data.building);      // Add new building to spawn points
        this.jebelBarkal_patrolGroupSpawnPoints.push(data.building);
        
        // Garrison troops in newly finished building
		let entityClasses = Engine.QueryInterface(data.building, IID_Identity).GetClassesList();
        for (let buildingGarrison of jebelBarkal_buildingGarrison(this.GetDifficulty()))
        {
            if (buildingGarrison.buildingClasses.filter(value => entityClasses.includes(value)).length > 0)
            {
                this.jebelBarkal_SpawnAndGarrisonAtEntity(jebelBarkal_playerID, data.building, buildingGarrison.unitTemplates, buildingGarrison.capacityRatio)
                break;
            }
        }
    }
    this.debugLog("JebelBarkal_StructureBuilt End"); /* FIXME */
}

Trigger.prototype.JebelBarkal_Init_TrackUnits = function()
{
	// Each item is an entity ID
	this.jebelBarkal_heroes = [];
	this.jebelBarkal_ritualHealers = TriggerHelper.GetPlayerEntitiesByClass(jebelBarkal_playerID, "Healer");

	// Each item is an array of entity IDs
	this.jebelBarkal_patrolingUnits = [];

	// Keep track of population limit for attackers
	this.jebelBarkal_attackerUnits = [];

	// Keep track of apocalyptic riders
    this.numApocalypticRiders = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers().length;
	this.jebelBarkal_apocalypticRiders = [];
    for (let i = 0; i < this.numApocalypticRiders; i ++)
        this.jebelBarkal_apocalypticRiders[i] = 0;

	// Array of entityIDs where patrol groups can spawn
	this.jebelBarkal_patrolGroupSpawnPoints = TriggerHelper.GetPlayerEntitiesByClass(
		jebelBarkal_playerID,
		jebelBarkal_cityPatrolGroup_balancing.buildingClasses);

	this.debugLog("Patrol spawn points: " + uneval(this.jebelBarkal_patrolGroupSpawnPoints));

	// Array of entityIDs where attacker groups can spawn
	this.jebelBarkal_attackerGroupSpawnPoints = TriggerHelper.GetPlayerEntitiesByClass(
		jebelBarkal_playerID,
		jebelBarkal_attackerGroup_balancing.reduce((classes, attackerSpawning) => classes.concat(attackerSpawning.buildingClasses), []));

	this.numInitialSpawnPoints = this.jebelBarkal_attackerGroupSpawnPoints.length;

	this.debugLog("Attacker spawn points: " + uneval(this.jebelBarkal_attackerGroupSpawnPoints));
    
	// Array of entityIDs where apocalyptic riders can spawn                                                        // TODO: Change to other spawn points
	this.jebelBarkal_apocalypticRidersSpawnPoints = TriggerHelper.GetPlayerEntitiesByClass(
		jebelBarkal_playerID,
		"Wonder");
        
    // Save number of walls to detect if 3 are broken
    this.jebelBarkal_escalatingDefense_walls = TriggerHelper.GetPlayerEntitiesByClass(
        jebelBarkal_playerID,
        "Wall");
    this.jebelBarkal_escalatingDefense_started = false;
    this.jebelBarkal_escalatingDefense_lastNumDestroyedWalls = 0;
    
    // Save that game is not yet won
    this.jebelBarkal_won = false;
};

Trigger.prototype.JebelBarkal_SetApocalypticRidersStartTime = function(difficulty)
{                                                                       
    let startTimes = 
        [
            [99, 99],      /* Very easy */
            [45, 60],      /* Easy */
            [35, 50],      /* Medium */
            [25, 35],      /* Hard */
            [20, 30],      /* Very hard */
        ];
    let startTime = startTimes[difficulty - 1];
    this.apocalypticRidersStartTime = 999; //randFloat(startTime[0], startTime[1]);                           // FIXME: deactivated until fully implemented
    this.jebelBarkal_apocalypticRidersMsg = true
}

Trigger.prototype.JebelBarkal_SetDefenderStance = function()
{
	for (let ent of TriggerHelper.GetPlayerEntitiesByClass(jebelBarkal_playerID, "Human"))
		TriggerHelper.SetUnitStance(ent, "defensive");
};

Trigger.prototype.JebelBarkal_StartRitualAnimations = function()
{
	this.DoRepeatedly(5 * 1000, "JebelBarkal_UpdateRitualAnimations", {});
};

Trigger.prototype.JebelBarkal_UpdateRitualAnimations = function()
{
    this.debugLog("JebelBarkal_UpdateRitualAnimations Start"); /* FIXME */
	for (let ent of this.jebelBarkal_ritualHealers)
	{
		let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		if (!cmpUnitAI || cmpUnitAI.GetCurrentState() != "INDIVIDUAL.IDLE")
			continue;

		let cmpVisual = Engine.QueryInterface(ent, IID_Visual);
		if (cmpVisual && jebelBarkal_ritualAnimations.indexOf(cmpVisual.GetAnimationName()) == -1)
			cmpVisual.SelectAnimation(pickRandom(jebelBarkal_ritualAnimations), false, 1, "");
	}
    this.debugLog("JebelBarkal_UpdateRitualAnimations End"); /* FIXME */
};

Trigger.prototype.jebelBarkal_SpawnAndGarrisonAtEntity = function(playerID, entGarrTurrHolder, templates, capacityPercent)
{
    let cmpGarrisonHolder = Engine.QueryInterface(entGarrTurrHolder, IID_GarrisonHolder);
    let cmpTurrentHolder = Engine.QueryInterface(entGarrTurrHolder, IID_TurretHolder);
    if (!cmpGarrisonHolder && !cmpTurrentHolder)
        return;

    let cmpSpace = cmpGarrisonHolder ? cmpGarrisonHolder.GetCapacity() : cmpTurrentHolder.GetTurretPoints().length;
    let numUnitsMax = Math.floor(cmpSpace * capacityPercent);
    let numUnits = cmpGarrisonHolder ? numUnitsMax : randIntInclusive(0, numUnitsMax);
    let templateCompositions = TriggerHelper.RandomTemplateComposition(templates, numUnits);

    if (cmpGarrisonHolder)
        for (let template in templateCompositions)
            TriggerHelper.SpawnGarrisonedUnits(entGarrTurrHolder, template, templateCompositions[template], playerID);
    else
        for (let template in templateCompositions)
            TriggerHelper.SpawnTurretedUnits(entGarrTurrHolder, template, templateCompositions[template], playerID);
};

Trigger.prototype.jebelBarkal_SpawnAndGarrisonAtClasses = function(playerID, classes, templates, capacityPercent)
{
	for (let entGarrTurrHolder of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetEntitiesByPlayer(playerID))
	{
		let cmpIdentity = Engine.QueryInterface(entGarrTurrHolder, IID_Identity);
		if (!cmpIdentity || !MatchesClassList(cmpIdentity.GetClassesList(), classes))
			continue;
        
        this.jebelBarkal_SpawnAndGarrisonAtEntity(playerID, entGarrTurrHolder, templates, capacityPercent);
	}
};

Trigger.prototype.JebelBarkal_GarrisonBuildings = function()
{
	for (let buildingGarrison of jebelBarkal_buildingGarrison(this.GetDifficulty()))
		this.jebelBarkal_SpawnAndGarrisonAtClasses(jebelBarkal_playerID, buildingGarrison.buildingClasses, buildingGarrison.unitTemplates, buildingGarrison.capacityRatio);
};

/**
 * Spawn new groups if old ones were wiped out.
 */
Trigger.prototype.JebelBarkal_SpawnCityPatrolGroups = function()
{
    this.debugLog("JebelBarkal_SpawnCityPatrolGroups Start"); /* FIXME */
	if (!this.jebelBarkal_patrolGroupSpawnPoints.length)
		return;

	let time = TriggerHelper.GetMinutes();
    let targetGroupCount = jebelBarkal_cityPatrolGroup_count(time);
    if (this.jebelBarkal_escalatingDefense_started)                                                                             /* Escalating defense */
        targetGroupCount = targetGroupCount * (0.5 + this.GetDifficulty() / 3);
	let groupCount = Math.floor(Math.max(0, targetGroupCount) - this.jebelBarkal_patrolingUnits.length);

	this.debugLog("Spawning " + groupCount + " city patrol groups, " + this.jebelBarkal_patrolingUnits.length + " exist");

    this.JebelBarkal_SpawnCityPatrolGroups_raw(time, groupCount)

    let next_time = jebelBarkal_cityPatrolGroup_interval(time) * 60 * 1000;
    if (this.jebelBarkal_escalatingDefense_started)                                                                             /* Escalating defense */
        next_time = next_time / 3;
    
    this.DoAfterDelay(next_time, "JebelBarkal_SpawnCityPatrolGroups", {});
    this.debugLog("JebelBarkal_SpawnCityPatrolGroups End"); /* FIXME */
};

Trigger.prototype.JebelBarkal_SpawnCityPatrolGroups_raw = function(time, groupCount)
{
	for (let i = 0; i < groupCount; ++i)
	{
		let spawnEnt = pickRandom(this.jebelBarkal_patrolGroupSpawnPoints);

		let templateCounts = TriggerHelper.BalancedTemplateComposition(
			jebelBarkal_cityPatrolGroup_balancing.unitComposition(time, this.jebelBarkal_heroes),
			jebelBarkal_cityPatrolGroup_balancing.unitCount(time));

		this.debugLog(uneval(templateCounts));

		let groupEntities = this.JebelBarkal_SpawnTemplates(spawnEnt, templateCounts);

		this.jebelBarkal_patrolingUnits.push(groupEntities);

		for (let ent of groupEntities)
			TriggerHelper.SetUnitStance(ent, "defensive");

		TriggerHelper.SetUnitFormation(jebelBarkal_playerID, groupEntities, pickRandom(jebelBarkal_formations));

		for (let patrolTarget of shuffleArray(this.GetTriggerPoints(jebelBarkal_cityPatrolGroup_triggerPointPath)))
		{
			let pos = TriggerHelper.GetEntityPosition2D(patrolTarget);
			ProcessCommand(jebelBarkal_playerID, {
				"type": "patrol",
				"entities": groupEntities,
				"x": pos.x,
				"z": pos.y,
				"targetClasses": {
					"attack": jebelBarkal_cityPatrolGroup_balancing.targetClasses()
				},
				"queued": true,
				"allowCapture": false
			});
		}
	}
}

Trigger.prototype.JebelBarkal_SpawnTemplates = function(spawnEnt, templateCounts)
{
	let groupEntities = [];

	for (let templateName in templateCounts)
	{
		let ents = TriggerHelper.SpawnUnits(spawnEnt, templateName, templateCounts[templateName], jebelBarkal_playerID);

		groupEntities = groupEntities.concat(ents);

		if (jebelBarkal_templates.heroes.indexOf(templateName) != -1 && ents[0])
			this.jebelBarkal_heroes.push(ents[0]);
	}

	return groupEntities;
};

/**
 * Spawn a group of attackers at every remaining building.
 */
Trigger.prototype.JebelBarkal_SpawnAttackerGroups = function()
{
    this.debugLog("JebelBarkal_SpawnAttackerGroups Start"); /* FIXME */
	if (!this.jebelBarkal_attackerGroupSpawnPoints)
		return;

	let time = TriggerHelper.GetMinutes();
	this.JebelBarkal_StartAttackTimer(jebelBarkal_attackInterval(time, this.GetDifficulty()));

	this.debugLog("Attacker wave (at most " + (jebelBarkal_maxPopulation - this.jebelBarkal_attackerUnits.length) + " attackers)");

	let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
	let playerEntities = activePlayers.map(playerID =>
		TriggerHelper.GetEntitiesByPlayer(playerID).filter(TriggerHelper.IsInWorld));

	let patrolPoints = this.GetTriggerPoints(jebelBarkal_attackerGroup_triggerPointPatrol);

	let groupSizeFactor = jebelBarkal_attackerGroup_sizeFactor(
		activePlayers.length,
		this.numInitialSpawnPoints,
		this.GetDifficulty());

	let totalSpawnCount = 0;
	for (let spawnPointBalancing of jebelBarkal_attackerGroup_balancing)
	{
		let targets = playerEntities.reduce((allTargets, playerEnts) =>
			allTargets.concat(shuffleArray(TriggerHelper.MatchEntitiesByClass(playerEnts, spawnPointBalancing.targetClasses())).slice(0, 10)), []);

		if (!targets.length)
			continue;

		for (let spawnEnt of TriggerHelper.MatchEntitiesByClass(this.jebelBarkal_attackerGroupSpawnPoints, spawnPointBalancing.buildingClasses))
		{
			let unitCount = Math.min(
				jebelBarkal_maxPopulation - this.jebelBarkal_attackerUnits.length,
				groupSizeFactor * spawnPointBalancing.unitCount(time));

			// Spawn between 0 and 1 elephants per stable in a 1v1 on a normal mapsize at the beginning
			unitCount = Math.floor(unitCount) + (randBool(unitCount % 1) ? 1 : 0);

			if (unitCount <= 0)
				continue;

			let templateCounts = TriggerHelper.BalancedTemplateComposition(spawnPointBalancing.unitComposition(time, this.jebelBarkal_heroes), unitCount);

			totalSpawnCount += unitCount;

			this.debugLog("Spawning " + unitCount + " attackers at " + uneval(spawnPointBalancing.buildingClasses) + " " +
				spawnEnt + ":\n" + uneval(templateCounts));

			if (dryRun)
				continue;

			let spawnedEntities = this.JebelBarkal_SpawnTemplates(spawnEnt, templateCounts);

			this.jebelBarkal_attackerUnits = this.jebelBarkal_attackerUnits.concat(spawnedEntities);

			let formation = pickRandom(spawnPointBalancing.formations);
			if (formation)
				TriggerHelper.SetUnitFormation(jebelBarkal_playerID, spawnedEntities, formation);

			let entityGroups = formation ? [spawnedEntities] : spawnedEntities.reduce((entityGroup, ent) => entityGroup.concat([[ent]]), []);
			for (let i = 0; i < jebelBarkal_patrolPointCount; ++i)
				for (let entities of entityGroups)
				{
					let pos = TriggerHelper.GetEntityPosition2D(pickRandom(i == 0 ? targets : patrolPoints));
					ProcessCommand(jebelBarkal_playerID, {
						"type": "patrol",
						"entities": entities,
						"x": pos.x,
						"z": pos.y,
						"targetClasses": {
							"attack": spawnPointBalancing.targetClasses()
						},
						"queued": true,
						"allowCapture": false
					});
				}
		}
	}

	this.debugLog("Total attackers: " + totalSpawnCount);
    
    if (this.jebelBarkal_escalatingDefense_started)                                                         // Escalating defense upgrade == flooding defense
    {
        // Now also send all existing patroling groups towards players
        for (let groupEntities of this.jebelBarkal_patrolingUnits)
        {
            this.JebelBarkal_PrepareEntitiesForRandomAttack(groupEntities);
            this.JebelBarkal_SendEntitiesToRandomAttack(playerEntities, patrolPoints, groupEntities, false);
        }
    }

	if (totalSpawnCount)
		Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
			"message": markForTranslation("Napata is attacking!"),
			"translateMessage": true
		});
    this.debugLog("JebelBarkal_SpawnAttackerGroups End"); /* FIXME */
};

Trigger.prototype.JebelBarkal_PrepareEntitiesForRandomAttack = function(groupEntities)
{
    for (let ent of groupEntities)
        TriggerHelper.SetUnitStance(ent, "aggressive");
   
    TriggerHelper.SetUnitFormation(jebelBarkal_playerID, groupEntities, pickRandom(jebelBarkal_formations));
}


Trigger.prototype.JebelBarkal_SendEntitiesToRandomAttack = function(playerEntities, patrolPoints, groupEntities, queued)
{
    let targets = playerEntities.reduce((allTargets, playerEnts) =>
        allTargets.concat(shuffleArray(TriggerHelper.MatchEntitiesByClass(playerEnts, "Unit+!Ship")).slice(0, 10)), []);
    if (!targets.length)
        return;

    let pos = TriggerHelper.GetEntityPosition2D(pickRandom(randBool(0.9) ? targets : patrolPoints));
    ProcessCommand(jebelBarkal_playerID, {
        "type": pickRandom(["attack-walk", "patrol", "patrol", "patrol"]),  // Some units shall ignore the player's troops in Napatas city
        "entities": groupEntities,
        "x": pos.x,
        "z": pos.y,
        "targetClasses": {
            "attack": "Unit+!Ship"
        },
        "queued": queued,
        "allowCapture": false
    });
}

Trigger.prototype.JebelBarkal_StartAttackTimer = function(delay)
{
	let nextAttack = delay * 60 * 1000;

	Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).AddTimeNotification({
		"message": markForTranslation("Napata will attack in %(time)s!"),
		"players": [-1, 0],
		"translateMessage": true
	}, nextAttack);

	this.DoAfterDelay(nextAttack, "JebelBarkal_SpawnAttackerGroups", {});
};

/**
 * Keep track of heroes, so that each of them remains unique.
 * Keep track of spawn points, as only there units should be spawned.
 */
Trigger.prototype.JebelBarkal_OwnershipChange_KeepTrackOfUnits = function(data)
{
	let trackedEntityArrays = [
		this.jebelBarkal_heroes,
		this.jebelBarkal_ritualHealers,
		this.jebelBarkal_patrolGroupSpawnPoints,
		this.jebelBarkal_attackerGroupSpawnPoints,
        this.jebelBarkal_apocalypticRidersSpawnPoints,
		this.jebelBarkal_attackerUnits,
		...this.jebelBarkal_patrolingUnits,
	];

	for (let array of trackedEntityArrays)
	{
		let idx = array.indexOf(data.entity);
		if (idx != -1)
			array.splice(idx, 1);
	}

	this.jebelBarkal_patrolingUnits = this.jebelBarkal_patrolingUnits.filter(entities => entities.length);
}

Trigger.prototype.JebelBarkal_OwnershipChange_AssertApocalypticRidersRespawn = function(data)                                                    /* Apocalyptic riders */
{                                  
    if (TriggerHelper.GetMinutes() < this.apocalypticRidersStartTime)
        return;

	let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
    for (let activePlayer of activePlayers)
    {
        
        if ((this.jebelBarkal_apocalypticRiders[activePlayer - 1] != data.entity) && /* Only pass if apocalyptic rider is the newly dead unit */
            (this.jebelBarkal_apocalypticRiders[activePlayer - 1] != 0))             /* OR Initial value */
            continue;
            
        if (this.jebelBarkal_apocalypticRidersSpawnPoints.length == 0)
            continue;
            
        let targets = TriggerHelper.GetPlayerEntitiesByClass(activePlayer, "CivCentre");
        if (targets.length == 0)/* Do not spawn riders for (almost) dead players */
            continue;
        
        if (this.jebelBarkal_apocalypticRidersMsg)
            Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
                "message": "Apokalyptische Reiter am Horizont!",
                "players": [-1, 0, activePlayer],
                "translateMessage": false
            });
        this.jebelBarkal_apocalypticRidersMsg = false
        
        /* Spawn new apocalyptic rider and give command to attack */
        let spawnedEntities = TriggerHelper.SpawnUnits(
            this.jebelBarkal_apocalypticRidersSpawnPoints[0],
            pickRandom(jebelBarkal_templates.champion_cavalry),
            1,
            jebelBarkal_playerID);
        this.jebelBarkal_apocalypticRiders[activePlayer - 1] = spawnedEntities[0];
        
        let pos = TriggerHelper.GetEntityPosition2D(pickRandom(targets));
        ProcessCommand(jebelBarkal_playerID, {
            "type": "patrol",
            "entities": spawnedEntities,
            "x": pos.x,
            "z": pos.y,
            "targetClasses": {
                "attack": "Unit+!Ship"
            },
            "queued": true,
            "allowCapture": false
        });
    };
}

Trigger.prototype.JebelBarkal_OwnershipChange_DetectEscalatingDefense = function(data)                                                    /* Escalating defense */
{
    if (this.jebelBarkal_escalatingDefense_started)
        return;
    
    /* Check if the lost entity is one of the initial walls */
    if (!this.jebelBarkal_escalatingDefense_walls.includes(data.entity))
        return;
    
    let currentWalls = TriggerHelper.GetPlayerEntitiesByClass(jebelBarkal_playerID, "Wall");
    let numDestroyedWalls = 0
    for (let w of this.jebelBarkal_escalatingDefense_walls)
    {
        if (!currentWalls.includes(w))
            numDestroyedWalls += 1
    }
        
    if ((this.jebelBarkal_escalatingDefense_lastNumDestroyedWalls != numDestroyedWalls) && (numDestroyedWalls <= 3))
        Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
            "message": "DefCon " + (3 - numDestroyedWalls),
            "translateMessage": false
        });
    this.jebelBarkal_escalatingDefense_lastNumDestroyedWalls = numDestroyedWalls;
        
    if (numDestroyedWalls < 3)
        return;
    
    Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
        "message": "Alle zu den Waffen!",
        "translateMessage": false
    });
    
    this.jebelBarkal_escalatingDefense_started = true;
    
    // Make an immediate spawning of a lot of city patrol groups. Will be later only filled up to lower numbers bc otherwise it is impossible
    this.JebelBarkal_SpawnCityPatrolGroups_raw(TriggerHelper.GetMinutes(), this.GetDifficulty() * 10)
}

Trigger.prototype.JebelBarkal_OwnershipChange_DetectWin = function(data)
{
    if (this.jebelBarkal_won)
        return;
    
    // Game is won if all attack production entities are destroyed
    if (0 == this.jebelBarkal_attackerGroupSpawnPoints.length)
    {
        Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
            "message": "Napata wurde besiegt!"
        });
        TriggerHelper.SetPlayerWon(
            1,
            n => markForPluralTranslation(
                "%(lastPlayer)s haben gewonnen (Napata wurde besiegt).",
                "%(players)s und %(lastPlayer)s haben gewonnen (Napata wurde besiegt).",
                n),
            n => markForPluralTranslation(
                "%(lastPlayer)s wurden besiegt (Napatas Dampfwalze).",
                "%(players)s und %(lastPlayer)s wurden besiegt (Napatas Dampfwalze).",
                n));
        this.jebelBarkal_won = true;
    }
}

Trigger.prototype.JebelBarkal_OwnershipChange_RebuildCity = function(data)
{
    
    if (-1 == this.jebelBarkal_attackerGroupSpawnPoints.indexOf(data.entity))
        return;
    if (-1 == this.jebelBarkal_patrolGroupSpawnPoints.indexOf(data.entity))
        return;
    
    const temple = "structures/kush/temple";
    const wonder = "structures/ptol/wonder";
    const fortress = "structures/kush/fortress";
    const blemmy = "structures/kush/camp_blemmye";
    const noba = "structures/kush/camp_noba";
    const civic = "structures/kush/civil_centre";
    const barrack = "structures/kush/barracks";
    const stable = "structures/kush/stable";
    const elephants = "structures/kush/elephant_stable";
    const arsenal = "structures/kush/arsenal";
    const rebuild_templates = [
        wonder,
        fortress, fortress,
        temple, temple, temple,
        stable, stable, stable, stable,
        barrack, barrack, barrack, barrack,
        blemmy, blemmy,
        noba, noba,
        arsenal, arsenal,
        elephants, elephants
    ];
    
    let rebuildCitySpeed = 
    [
        [0, 1],             /* Very easy */
        [0, 0, 1, 1, 2],    /* Easy */
        [0, 1, 1, 2, 2],    /* Medium */
        [1, 1, 2, 2, 2],    /* Hard */
        [1, 2, 2, 2, 3],    /* Very hard */
    ];
        
    /* For every destructed building, try to construct a few new */
    let nNewBuildings = pickRandom(rebuildCitySpeed[this.GetDifficulty() - 1]);
    for (let i = 0; i < nNewBuildings; i ++)
        this.JebelBarkal_rebuildCity_PlaceAndConstruct(pickRandom(rebuild_templates), 20);
}

Trigger.prototype.JebelBarkal_OwnershipChange = function(data)
{
	if (data.from != 0) /* Only pass if Gaia units died */
		return;
    
    this.debugLog("JebelBarkal_OwnershipChange Start"); /* FIXME */
    this.JebelBarkal_OwnershipChange_DetectWin(data);
    this.JebelBarkal_OwnershipChange_DetectEscalatingDefense(data);
    this.JebelBarkal_OwnershipChange_AssertApocalypticRidersRespawn(data);
    this.JebelBarkal_OwnershipChange_RebuildCity(data);
    this.JebelBarkal_OwnershipChange_KeepTrackOfUnits(data);
    this.debugLog("JebelBarkal_OwnershipChange End"); /* FIXME */
};


{
	Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger).RegisterTrigger("OnInitGame", "JebelBarkal_Init", { "enabled": true });
}
