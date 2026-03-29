
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
var alesia_rank = "Basic";

/**
 * Limit the total amount of gaia units spawned for performance reasons.
 */
var alesia_maxPopulation = 1200;

/**
 * These are the templates spawned at the gamestart and during the game.
 */
var alesia_civ = "gaul";

var alesia_templateClasses = deepfreeze({
    "heroes": "Hero",
    "champions": "Champion",
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

var alesia_templateFallbacks = deepfreeze({
    "siege_ram": "champion_cavalry",
    "healers": "champion_infantry_ranged"
});

var alesia_templates = deepfreeze(Object.keys(alesia_templateClasses).reduce((templates, name) => {
    let templateNames = TriggerHelper.GetTemplateNamesByClasses(
        alesia_templateClasses[name],
        alesia_civ,
        undefined,
        alesia_rank,
        true);

    if (!templateNames.length && alesia_templateFallbacks[name])
        templateNames = templates[alesia_templateFallbacks[name]];

    templates[name] = templateNames;
    return templates;
}, {}));

var sanitizeTemplateComposition = templateComposition =>
    templateComposition.filter(templateBalance =>
        templateBalance &&
        Array.isArray(templateBalance.templates) &&
        templateBalance.templates.length &&
        (
            templateBalance.frequency > 0 ||
            templateBalance.count > 0 ||
            templateBalance.unique_entities
        ));

/**
 * These are the formations patroling and attacking units can use.
*/
var alesia_formations = [
    "special/formations/line_closed",
    "special/formations/box"
];

/**
 *  Balancing helper function.
 *
 *  @returns min0 value at the beginning of the game, min60 after 60 minutes of gametime or longer and
 *  a proportionate number between these two values before the first 60 minutes are reached.
 */
var scaleByTime = (minCurrent, min0, min60) => min0 + (min60 - min0) * Math.min(1, minCurrent / 60);

/**
 *  @returns min value at map size 128 (very small), max at map size 512 and
 *  a proportionate number between these two values.
 */
var scaleByMapSize = (min, max) => min + (max - min) * (TriggerHelper.GetMapSizeTiles() - 128) / (512 - 128);

/**
 * Defensive Infantry units patrol along the paths of the city.
 */
var alesia_cityPatrolGroup_count = time => TriggerHelper.GetMapSizeTiles() > 192 ? scaleByTime(time, 3, scaleByMapSize(3, 10)) : 0;
var alesia_cityPatrolGroup_interval = time => scaleByTime(time, 5, 3);
var alesia_cityPatrolGroup_balancing = {
    "buildingClasses": ["Wonder", "Temple", "CivCentre", "Fortress", "Barracks", "Embassy"],
    "unitCount": time => Math.min(20, scaleByTime(time, 10, 45)),
    "unitComposition": (time, heroes) => [
        {
            "templates": alesia_templates.champion_infantry_melee,
            "frequency": scaleByTime(time, 0, 2)
        },
        {
            "templates": alesia_templates.champion_infantry_ranged,
            "frequency": scaleByTime(time, 0, 3)
        },
        {
            "templates": alesia_templates.citizenSoldier_infantry_melee,
            "frequency": scaleByTime(time, 2, 0)
        },
        {
            "templates": alesia_templates.citizenSoldier_infantry_ranged,
            "frequency": scaleByTime(time, 3, 0)
        }
    ],
    "targetClasses": () => "Unit+!Ship"
};

/**
 * Frequently the buildings spawn different units that attack the players groupwise.
 * Leave more time between the attacks in later stages of the game since the attackers become much stronger over time.
 */
var alesia_attackInterval = (time, difficulty) => randFloat(6.5, 7.5) + time / difficulty / 10;            /* Changed here for quicker attacks */

/**
 * Prevent city patrols chasing the starting units in nomad mode.
 */
var alesia_firstCityPatrolTime = (difficulty, isNomad) =>
    (isNomad ? 7 - difficulty : 0);

/**
 * Delay the first attack in nomad mode.
 */
var alesia_firstAttackTime = (difficulty, isNomad) => 
    alesia_attackInterval(0, difficulty) +
    2 * Math.max(0, 3 - difficulty) +
    (isNomad ?  9 - difficulty : 0);

/**
 * Frequently the buildings spawn different units that expand the city
 */
var alesia_cityExpansionInterval = (difficulty) => randFloat(2, 4) + 10 - 2 * difficulty;     /* Changed here for quicker expansion */

/**
 * Delay the city expansion depending on difficulty
 */
var alesia_firstCityExpansionTime = (difficulty) =>
    alesia_cityExpansionInterval(0, difficulty) +
    15 * Math.max(1, 3 - difficulty);

/**
 * Account for varying mapsizes and number of players when spawning attackers.
 */
var alesia_attackerGroup_sizeFactor = (numPlayers, numInitialSpawnPoints, difficulty) =>
    numPlayers / numInitialSpawnPoints * (difficulty + 2) * 0.85;               /* Change here for bigger attack groups */

/**
 * Assume gaia to be the native city player.
 */
var alesia_playerID = 0;

/**
 * City patrols soldiers will patrol along these triggerpoints on the crossings of the city paths.
 */
var alesia_cityPatrolGroup_triggerPointPath = "A";

/**
 * Attackers will patrol these points after having finished the attack-walk order.
 */
var alesia_attackerGroup_triggerPointPatrol = "B";

/**
 * Number of points the attackers patrol.
 */
var alesia_patrolPointCount = 6;

/**
 * This defines which units are spawned and garrisoned at the gamestart per building.
 */
var alesia_buildingGarrison = difficulty => [
    {
        "buildingClasses": ["Wonder", "Temple", "CivCentre", "Fortress"],
        "unitTemplates": alesia_templates.champions,
        "capacityRatio": 1
    },
    {
        "buildingClasses": ["Barracks"],
        "unitTemplates": [...alesia_templates.citizenSoldier_infantry, ...alesia_templates.champion_infantry],
        "capacityRatio": 1
    },
    {
        "buildingClasses": ["Tower"],
        "unitTemplates": alesia_templates.champion_infantry,
        "capacityRatio": 1
    },
    {
        "buildingClasses": ["Arsenal"],
        "unitTemplates": alesia_templates.siege_ram,
        "capacityRatio": 1

    },
    {
        "buildingClasses": ["Stable"],
        "unitTemplates": [...alesia_templates.citizenSoldier_cavalry, ...alesia_templates.champion_cavalry],
        "capacityRatio": 1

    },
    {
        "buildingClasses": ["House"],
        "unitTemplates": [...alesia_templates.females, ...alesia_templates.healers],
        "capacityRatio": 0.5
    },
    {
        "buildingClasses": ["WallTower"],
        "unitTemplates": [...alesia_templates.citizenSoldier_infantry, ...alesia_templates.champion_infantry],
        "capacityRatio": difficulty >= 3 ? 1 : 0
    },
    {
        "buildingClasses": ["WallLong", "WallMedium", "WallShort"],
        "unitTemplates": alesia_templates.citizenSoldier_infantry_ranged,
        "capacityRatio": difficulty >= 3 ? 0.5 : 0
    }
];

/**
 * This defines which units are spawned at the different buildings at the given time.
 * The buildings are ordered by strength.
 * Notice that there are always 2 groups of these count spawned, one for each side!
 * The units should do a walk-attack to random player CCs
 */
var alesia_attackerGroup_balancing = [
    {
        // This should be the most influential building
        "buildingClasses": ["Wonder"],
        "unitCount": time => scaleByTime(time, 0, 85),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.heroes,
                "count": randBool(scaleByTime(time, -0.5, 2)) ? 1 : 0,
                "unique_entities": heroes
            },
            {
                "templates": alesia_templates.healers,
                "frequency": randFloat(0, 0.1)
            },
            {
                "templates": alesia_templates.champions,
                "frequency": scaleByTime(time, 0, 0.6)
            },
            {
                "templates": alesia_templates.champion_infantry_ranged,
                "frequency": scaleByTime(time, 0, 0.4)
            },
            {
                "templates": alesia_templates.citizenSoldiers,
                "frequency": scaleByTime(time, 1, 0)
            },
            {
                "templates": alesia_templates.citizenSoldier_infantry_ranged,
                "frequency": scaleByTime(time, 1, 0)
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        "buildingClasses": ["Fortress"],
        "unitCount": time => scaleByTime(time, 0, 45),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.heroes,
                "count": randBool(scaleByTime(time, -0.5, 1.5)) ? 1 : 0,
                "unique_entities": heroes
            },
            {
                "templates": alesia_templates.champions,
                "frequency": scaleByTime(time, 0, 1)
            },
            {
                "templates": alesia_templates.citizenSoldiers,
                "frequency": scaleByTime(time, 1, 0)
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        // These should only train the strongest units
        "buildingClasses": ["Temple"],
        "unitCount": time => Math.min(45, scaleByTime(time, -30, 90)),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.heroes,
                "count": randBool(scaleByTime(time, -0.5, 1)) ? 1 : 0,
                "unique_entities": heroes
            },
            {
                "templates": alesia_templates.champion_infantry_melee,
                "frequency": 0.5
            },
            {
                "templates": alesia_templates.champion_infantry_ranged,
                "frequency": 0.5
            },
            {
                "templates": alesia_templates.healers,
                "frequency": randFloat(0.05, 0.2)
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        "buildingClasses": ["CivCentre"],
        "unitCount": time => Math.min(40, scaleByTime(time, 0, 80)),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.heroes,
                "count": randBool(scaleByTime(time, -0.5, 0.5)) ? 1 : 0,
                "unique_entities": heroes
            },
            {
                "templates": alesia_templates.champion_infantry,
                "frequency": scaleByTime(time, 0, 1)
            },
            {
                "templates": alesia_templates.citizenSoldiers,
                "frequency": scaleByTime(time, 1, 0)
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        "buildingClasses": ["Stable"],
        "unitCount": time => Math.min(30, scaleByTime(time, 0, 80)),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.citizenSoldier_cavalry_melee,
                "frequency": scaleByTime(time, 2, 0)
            },
            {
                "templates": alesia_templates.champion_cavalry_melee,
                "frequency": scaleByTime(time, 0, 1)
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        "buildingClasses": ["Barracks"],
        "unitCount": time => Math.min(35, scaleByTime(time, 0, 70)),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.citizenSoldier_infantry,
                "frequency": 1
            }
        ],
        "formations": alesia_formations,
        "targetClasses": () => "Unit+!Ship"
    },
    {
        "buildingClasses": ["Arsenal"],
        "unitCount": time => scaleByTime(time, 1, 14),
        "unitComposition": (time, heroes) => [
            {
                "templates": alesia_templates.siege_ram,
                "frequency": 1
            }
        ],
        "formations": [],
        "targetClasses": () => pickRandom(["Defensive SiegeEngine Monument Wonder", "Structure", "Structure", "Structure"])
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
Trigger.prototype.Alesia_rebuildCity_getRandomPosition = function()
{
    let mapradius = TriggerHelper.GetMapSizeTiles() * 2;
    let alpha = randFloat(0, 2 * Math.PI);              // TODO: restrict to desert?
    let radius = randFloat(0, mapradius);               // TODO: avoid inside the city?
    let x = Math.floor(Math.cos(alpha) * radius + mapradius);
    let y = Math.floor(Math.sin(alpha) * radius + mapradius);

    return { "x": x, "y": y };
}

// Modified version of TryConstructBuilding()
Trigger.prototype.Alesia_rebuildCity_TryConstructBuilding = function(player, cmpPlayer, controlAllUnits, cmd)
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

Trigger.prototype.Alesia_rebuildCity_PlaceAndConstruct = function(template, retryCount)
{
    /* Step 1: Spawn group of units */
    let spawnEnt = pickRandom(this.alesia_patrolGroupSpawnPoints);
    let templateCounts = TriggerHelper.BalancedTemplateComposition(
        sanitizeTemplateComposition(
        [{
            "templates": alesia_templates.citizenSoldier_infantry,
            "frequency": 1
        }],
        ),
        5);
    let groupEntities = this.Alesia_SpawnTemplates(spawnEnt, templateCounts);
    this.Alesia_PrepareEntitiesForRandomAttack(groupEntities);

    /* Step 2: Try to place a foundation somewhere */
    let ent = false;
    for (let i = 0; i < retryCount && !ent; i ++) {
        let pos = this.Alesia_rebuildCity_getRandomPosition();
        
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
            "formation": pickRandom(alesia_formations)
        };
        
        let cmpPlayer = QueryPlayerIDInterface(alesia_playerID);

        ent = this.Alesia_rebuildCity_TryConstructBuilding(
            alesia_playerID,
            cmpPlayer,
            cmpPlayer.CanControlAllUnits(),
            cmd
        );
    }
    
    /* Step 3: If building could be placed, store foundation id for Alesia_StructureBuilt() */
    if (ent)
        this.Alesia_rebuildCity_unfinishedBuildings.push(ent);
        
    /* Step 4: Queue command for random attack, if building finished */
    let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
    let playerEntities = activePlayers.map(playerID =>
        TriggerHelper.GetEntitiesByPlayer(playerID).filter(TriggerHelper.IsInWorld));
    let patrolPoints = this.GetTriggerPoints(alesia_attackerGroup_triggerPointPatrol);
    this.Alesia_SendEntitiesToRandomAttack(playerEntities, patrolPoints, groupEntities, true);
}

Trigger.prototype.Alesia_Init = function()
{
    let isNomad = !TriggerHelper.GetAllPlayersEntitiesByClass("CivCentre").length;

    this.Alesia_Init_TrackUnits();
    this.RegisterTrigger("OnOwnershipChanged", "Alesia_OwnershipChange", { "enabled": true });
    this.RegisterTrigger("OnStructureBuilt", "Alesia_StructureBuilt", { "enabled": true });

    this.Alesia_SetDefenderStance();
    this.Alesia_StartRitualAnimations();
    this.Alesia_GarrisonBuildings();
    this.DoAfterDelay(alesia_firstCityPatrolTime(this.GetDifficulty(), isNomad) * 60 * 1000, "Alesia_SpawnCityPatrolGroups", {});
    this.Alesia_StartAttackTimer(alesia_firstAttackTime(this.GetDifficulty(), isNomad));
    this.Alesia_StartCityExpansionTimer(alesia_firstCityExpansionTime(this.GetDifficulty()));
    
    this.Alesia_rebuildCity_unfinishedBuildings = [];
};

Trigger.prototype.Alesia_StructureBuilt = function(data)
{
    let index = this.Alesia_rebuildCity_unfinishedBuildings.indexOf(data.foundation);
    if (index > -1)
    {
        this.Alesia_rebuildCity_unfinishedBuildings.splice(index, 1);  // Remove foundation id from intermediate buffer
        this.alesia_attackerGroupSpawnPoints.push(data.building);      // Add new building to spawn points
        this.alesia_patrolGroupSpawnPoints.push(data.building);
        
        // Garrison troops in newly finished building
        let entityClasses = Engine.QueryInterface(data.building, IID_Identity).GetClassesList();
        for (let buildingGarrison of alesia_buildingGarrison(this.GetDifficulty()))
        {
            if (buildingGarrison.buildingClasses.filter(value => entityClasses.includes(value)).length > 0)
            {
                this.alesia_SpawnAndGarrisonAtEntity(alesia_playerID, data.building, buildingGarrison.unitTemplates, buildingGarrison.capacityRatio)
                break;
            }
        }
    }
}

Trigger.prototype.Alesia_Init_TrackUnits = function()
{
    // Each item is an entity ID
    this.alesia_heroes = [];

    // Each item is an array of entity IDs
    this.alesia_patrolingUnits = [];

    // Keep track of population limit for attackers
    this.alesia_attackerUnits = [];

    // Array of entityIDs where patrol groups can spawn
    this.alesia_patrolGroupSpawnPoints = TriggerHelper.GetPlayerEntitiesByClass(
        alesia_playerID,
        alesia_cityPatrolGroup_balancing.buildingClasses);

    this.debugLog("Patrol spawn points: " + uneval(this.alesia_patrolGroupSpawnPoints));

    // Array of entityIDs where attacker groups can spawn
    this.alesia_attackerGroupSpawnPoints = TriggerHelper.GetPlayerEntitiesByClass(
        alesia_playerID,
        alesia_attackerGroup_balancing.reduce((classes, attackerSpawning) => classes.concat(attackerSpawning.buildingClasses), []));

    this.numInitialSpawnPoints = this.alesia_attackerGroupSpawnPoints.length;

    this.debugLog("Attacker spawn points: " + uneval(this.alesia_attackerGroupSpawnPoints));
        
    // Save number of walls to detect if 2 are broken
    this.alesia_escalatingDefense_walls = TriggerHelper.GetPlayerEntitiesByClass(
        alesia_playerID,
        "Wall");
    this.alesia_escalatingDefense_started = false;
    this.alesia_escalatingDefense_lastNumDestroyedWalls = 0;
    
    // Save that game is not yet won
    this.alesia_won = false;
};

Trigger.prototype.Alesia_SetDefenderStance = function()
{
    for (let ent of TriggerHelper.GetPlayerEntitiesByClass(alesia_playerID, "Human"))
        TriggerHelper.SetUnitStance(ent, "aggressive");
};

Trigger.prototype.Alesia_StartRitualAnimations = function()
{
    this.DoRepeatedly(5 * 1000, "Alesia_UpdateRitualAnimations", {});
};

Trigger.prototype.Alesia_UpdateRitualAnimations = function()
{  
    // FIXME: Abused to periodically restart attack-walk of idle attacking units
    this.Alesia_RestartAttackWalk();
};

Trigger.prototype.Alesia_RestartAttackWalk = function()
{
    let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
    let playerEntities = activePlayers.map(playerID =>
        TriggerHelper.GetEntitiesByPlayer(playerID).filter(TriggerHelper.IsInWorld));
    let patrolPoints = this.GetTriggerPoints(alesia_attackerGroup_triggerPointPatrol);
    
    let groupEntities = [];
    for (let ent of this.alesia_attackerUnits)
    {
        let cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
        if (!cmpUnitAI || !cmpUnitAI.GetCurrentState().endsWith(".IDLE"))
            continue;
        
        groupEntities.push(ent);
        this.debugLog("Idle = " + ent + uneval(cmpUnitAI))
    }
    
    this.Alesia_SendEntitiesToRandomAttack(playerEntities, patrolPoints, groupEntities, false);
}

Trigger.prototype.alesia_SpawnAndGarrisonAtEntity = function(playerID, entGarrTurrHolder, templates, capacityPercent)
{
    let cmpGarrisonHolder = Engine.QueryInterface(entGarrTurrHolder, IID_GarrisonHolder);
    let cmpTurretHolder = Engine.QueryInterface(entGarrTurrHolder, IID_TurretHolder);
    if (!cmpGarrisonHolder && !cmpTurretHolder)
        return;

    let cmpSpace = cmpGarrisonHolder ? cmpGarrisonHolder.GetCapacity() : cmpTurretHolder.GetTurretPoints().length;
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

Trigger.prototype.alesia_SpawnAndGarrisonAtClasses = function(playerID, classes, templates, capacityPercent)
{
    for (let entGarrTurrHolder of Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager).GetEntitiesByPlayer(playerID))
    {
        let cmpIdentity = Engine.QueryInterface(entGarrTurrHolder, IID_Identity);
        if (!cmpIdentity || !MatchesClassList(cmpIdentity.GetClassesList(), classes))
            continue;
        
        this.alesia_SpawnAndGarrisonAtEntity(playerID, entGarrTurrHolder, templates, capacityPercent);
    }
};

Trigger.prototype.Alesia_GarrisonBuildings = function()
{
    for (let buildingGarrison of alesia_buildingGarrison(this.GetDifficulty()))
        this.alesia_SpawnAndGarrisonAtClasses(alesia_playerID, buildingGarrison.buildingClasses, buildingGarrison.unitTemplates, buildingGarrison.capacityRatio);
};

/**
 * Spawn new groups if old ones were wiped out.
 */
Trigger.prototype.Alesia_SpawnCityPatrolGroups = function()
{
    if (!this.alesia_patrolGroupSpawnPoints.length)
        return;

    let time = TriggerHelper.GetMinutes();
    let targetGroupCount = alesia_cityPatrolGroup_count(time);
    if (this.alesia_escalatingDefense_started)                                                                             /* Escalating defense */
        targetGroupCount = targetGroupCount * (0.5 + this.GetDifficulty() / 3);
    let groupCount = Math.floor(Math.max(0, targetGroupCount) - this.alesia_patrolingUnits.length);

    this.debugLog("Spawning " + groupCount + " city patrol groups, " + this.alesia_patrolingUnits.length + " exist");

    this.Alesia_SpawnCityPatrolGroups_raw(time, groupCount)

    let next_time = alesia_cityPatrolGroup_interval(time) * 60 * 1000;
    if (this.alesia_escalatingDefense_started)                                                                             /* Escalating defense */
        next_time = next_time / 3;
    
    this.DoAfterDelay(next_time, "Alesia_SpawnCityPatrolGroups", {});
};

Trigger.prototype.Alesia_SpawnCityPatrolGroups_raw = function(time, groupCount)
{
    for (let i = 0; i < groupCount; ++i)
    {
        let spawnEnt = pickRandom(this.alesia_patrolGroupSpawnPoints);
        let unitComposition = sanitizeTemplateComposition(
            alesia_cityPatrolGroup_balancing.unitComposition(time, this.alesia_heroes));

        if (!unitComposition.length)
        {
            this.debugLog("Skipping city patrol spawn because no valid templates were found.");
            continue;
        }

        let templateCounts = TriggerHelper.BalancedTemplateComposition(
            unitComposition,
            alesia_cityPatrolGroup_balancing.unitCount(time));

        this.debugLog(uneval(templateCounts));

        let groupEntities = this.Alesia_SpawnTemplates(spawnEnt, templateCounts);

        this.alesia_patrolingUnits.push(groupEntities);

        for (let ent of groupEntities)
            TriggerHelper.SetUnitStance(ent, "defensive");

        TriggerHelper.SetUnitFormation(alesia_playerID, groupEntities, pickRandom(alesia_formations));

        for (let patrolTarget of shuffleArray(this.GetTriggerPoints(alesia_cityPatrolGroup_triggerPointPath)))
        {
            let pos = TriggerHelper.GetEntityPosition2D(patrolTarget);
            ProcessCommand(alesia_playerID, {
                "type": "patrol",
                "entities": groupEntities,
                "x": pos.x,
                "z": pos.y,
                "targetClasses": {
                    "attack": alesia_cityPatrolGroup_balancing.targetClasses()
                },
                "queued": true,
                "allowCapture": false
            });
        }
    }
}

Trigger.prototype.Alesia_SpawnTemplates = function(spawnEnt, templateCounts)
{
    let groupEntities = [];

    for (let templateName in templateCounts)
    {
        let ents = TriggerHelper.SpawnUnits(spawnEnt, templateName, templateCounts[templateName], alesia_playerID);

        groupEntities = groupEntities.concat(ents);

        if (alesia_templates.heroes.indexOf(templateName) != -1 && ents[0])
            this.alesia_heroes.push(ents[0]);
    }

    return groupEntities;
};

/**
 * Spawn a group of attackers at every remaining building.
 */
Trigger.prototype.Alesia_SpawnAttackerGroups = function()
{
    if (!this.alesia_attackerGroupSpawnPoints)
        return;

    let time = TriggerHelper.GetMinutes();
    this.Alesia_StartAttackTimer(alesia_attackInterval(time, this.GetDifficulty()));

    this.debugLog("Attacker wave (at most " + (alesia_maxPopulation - this.alesia_attackerUnits.length) + " attackers)");

    let activePlayers = Engine.QueryInterface(SYSTEM_ENTITY, IID_PlayerManager).GetActivePlayers();
    let playerEntities = activePlayers.map(playerID =>
        TriggerHelper.GetEntitiesByPlayer(playerID).filter(TriggerHelper.IsInWorld));

    let patrolPoints = this.GetTriggerPoints(alesia_attackerGroup_triggerPointPatrol);
    
    let groupSizeFactor = alesia_attackerGroup_sizeFactor(
        activePlayers.length,
        this.numInitialSpawnPoints,
        this.GetDifficulty());

    let totalSpawnCount = 0;
    for (let spawnPointBalancing of alesia_attackerGroup_balancing)
    {
        let targets = playerEntities.reduce((allTargets, playerEnts) =>
            allTargets.concat(shuffleArray(TriggerHelper.MatchEntitiesByClass(playerEnts, spawnPointBalancing.targetClasses())).slice(0, 10)), []);

        if (!targets.length)
            continue;

        for (let spawnEnt of TriggerHelper.MatchEntitiesByClass(this.alesia_attackerGroupSpawnPoints, spawnPointBalancing.buildingClasses))
        {
            let unitCount = groupSizeFactor * spawnPointBalancing.unitCount(time);
            
            // Re-use the "formation" information to ignore the alesia_maxPopulation for siege engines
            // They are very difficult to defeat when mixed with fighting units
            let formation = pickRandom(spawnPointBalancing.formations);
            if (formation)
                unitCount = Math.min(alesia_maxPopulation - this.alesia_attackerUnits.length, unitCount);

            // Spawn between 0 and 1 siege engines per stable in a 1v1 on a normal mapsize at the beginning
            unitCount = Math.floor(unitCount) + (randBool(unitCount % 1) ? 1 : 0);

            if (unitCount <= 0)
                continue;

            let unitComposition = sanitizeTemplateComposition(
                spawnPointBalancing.unitComposition(time, this.alesia_heroes));

            if (!unitComposition.length)
            {
                this.debugLog("Skipping attacker spawn at " + spawnEnt + " because no valid templates were found.");
                continue;
            }

            let templateCounts = TriggerHelper.BalancedTemplateComposition(unitComposition, unitCount);

            totalSpawnCount += unitCount;

            this.debugLog("Spawning " + unitCount + " attackers at " + uneval(spawnPointBalancing.buildingClasses) + " " +
                spawnEnt + ":\n" + uneval(templateCounts));

            if (dryRun)
                continue;

            let spawnedEntities = this.Alesia_SpawnTemplates(spawnEnt, templateCounts);

            this.alesia_attackerUnits = this.alesia_attackerUnits.concat(spawnedEntities);

            if (formation)
                TriggerHelper.SetUnitFormation(alesia_playerID, spawnedEntities, formation);

            let entityGroups = formation ? [spawnedEntities] : spawnedEntities.reduce((entityGroup, ent) => entityGroup.concat([[ent]]), []);
            for (let i = 0; i < alesia_patrolPointCount; ++i)
                for (let entities of entityGroups)
                {
                    let pos = TriggerHelper.GetEntityPosition2D(pickRandom(i == 0 ? targets : patrolPoints));
                    ProcessCommand(alesia_playerID, {
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
    
    if (this.alesia_escalatingDefense_started)                                                         // Escalating defense upgrade == flooding defense
    {
        // Now also send all existing patroling groups towards players
        for (let groupEntities of this.alesia_patrolingUnits)
        {
            this.Alesia_PrepareEntitiesForRandomAttack(groupEntities);
            this.Alesia_SendEntitiesToRandomAttack(playerEntities, patrolPoints, groupEntities, false);
        }
    }
};

Trigger.prototype.Alesia_PrepareEntitiesForRandomAttack = function(groupEntities)
{
    for (let ent of groupEntities)
        TriggerHelper.SetUnitStance(ent, "aggressive");
   
    TriggerHelper.SetUnitFormation(alesia_playerID, groupEntities, pickRandom(alesia_formations));
}


Trigger.prototype.Alesia_SendEntitiesToRandomAttack = function(playerEntities, patrolPoints, groupEntities, queued)
{
    let targets = playerEntities.reduce((allTargets, playerEnts) =>
        allTargets.concat(shuffleArray(TriggerHelper.MatchEntitiesByClass(playerEnts, "Unit+!Ship")).slice(0, 10)), []);
    if (!targets.length)
        return;

    let pos = TriggerHelper.GetEntityPosition2D(pickRandom(randBool(0.9) ? targets : patrolPoints));
    ProcessCommand(alesia_playerID, {
        "type": pickRandom(["walk", "attack-walk", "patrol", "patrol", "patrol"]),  // Some units shall ignore the player's troops in city
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

Trigger.prototype.Alesia_StartAttackTimer = function(delay)
{
    let nextAttack = delay * 60 * 1000;

    Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).AddTimeNotification({
        "message": markForTranslation("Vercingetorix will attack in %(time)s!"),
        "players": [-1, 0],
        "translateMessage": true
    }, nextAttack);

    this.DoAfterDelay(nextAttack, "Alesia_SpawnAttackerGroups", {});
};

Trigger.prototype.Alesia_CityExpansion = function()
{
    this.Alesia_StartCityExpansionTimer(alesia_cityExpansionInterval(this.GetDifficulty()));

    this.Alesia_OwnershipChange_RebuildCity_core();
}


Trigger.prototype.Alesia_StartCityExpansionTimer = function(delay)
{
    this.debugLog("Alesia_StartCityExpansionTimer")
    this.debugLog(delay)
    let nextCityExpansion = delay * 60 * 1000;
    this.debugLog(nextCityExpansion)

    Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).AddTimeNotification({
        "message": markForTranslation("Vercingetorix will expand city in %(time)s!"),
        "players": [-1, 0],
        "translateMessage": true
    }, nextCityExpansion);
    
    this.DoAfterDelay(nextCityExpansion, "Alesia_CityExpansion", {});
};

/**
 * Keep track of heroes, so that each of them remains unique.
 * Keep track of spawn points, as only there units should be spawned.
 */
Trigger.prototype.Alesia_OwnershipChange_KeepTrackOfUnits = function(data)
{
    let trackedEntityArrays = [
        this.alesia_heroes,
        this.alesia_patrolGroupSpawnPoints,
        this.alesia_attackerGroupSpawnPoints,
        this.alesia_attackerUnits,
        ...this.alesia_patrolingUnits,
    ];

    for (let array of trackedEntityArrays)
    {
        let idx = array.indexOf(data.entity);
        if (idx != -1)
            array.splice(idx, 1);
    }

    this.alesia_patrolingUnits = this.alesia_patrolingUnits.filter(entities => entities.length);
}

Trigger.prototype.Alesia_OwnershipChange_DetectEscalatingDefense = function(data)                                                    /* Escalating defense */
{
    if (this.alesia_escalatingDefense_started)
        return;
    
    /* Check if the lost entity is one of the initial walls */
    if (!this.alesia_escalatingDefense_walls.includes(data.entity))
        return;

    let currentWalls = TriggerHelper.GetPlayerEntitiesByClass(alesia_playerID, "Wall");
    let numDestroyedWalls = 0
    for (let w of this.alesia_escalatingDefense_walls)
    {
        if (!currentWalls.includes(w))
            numDestroyedWalls += 1
    }

    if ((this.alesia_escalatingDefense_lastNumDestroyedWalls != numDestroyedWalls) && (numDestroyedWalls <= 3))
        Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
            "message": "Alarm! Alarm!",
            "translateMessage": false
        });
    this.alesia_escalatingDefense_lastNumDestroyedWalls = numDestroyedWalls;
    
    if (numDestroyedWalls < 2)
        return;
    
    Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
        "message": "Jagd Martin, Johannes und Lars aus der Stadt!",
        "translateMessage": false
    });
    
    this.alesia_escalatingDefense_started = true;
    
    // Make an immediate spawning of a lot of city patrol groups. Will be later only filled up to lower numbers bc otherwise it is impossible
    this.Alesia_SpawnCityPatrolGroups_raw(TriggerHelper.GetMinutes(), this.GetDifficulty() * 10)
}

Trigger.prototype.Alesia_OwnershipChange_DetectWin = function(data)
{
    if (this.alesia_won)
        return;
    
    // Game is won if all attack production entities are destroyed
    if (0 == this.alesia_attackerGroupSpawnPoints.length)
    {
        Engine.QueryInterface(SYSTEM_ENTITY, IID_GuiInterface).PushNotification({
            "message": "Vercingetorix wurde besiegt!"
        });
        TriggerHelper.SetPlayerWon(
            1,
            n => markForPluralTranslation(
                "%(lastPlayer)s haben gewonnen (Vercingetorix wurde besiegt).",
                "%(players)s und %(lastPlayer)s haben gewonnen (Vercingetorix wurde besiegt).",
                n),
            n => markForPluralTranslation(
                "%(lastPlayer)s wurden besiegt.",
                "%(players)s und %(lastPlayer)s wurden besiegt.",
                n));
        this.alesia_won = true;
    }
}

Trigger.prototype.Alesia_OwnershipChange_RebuildCity = function(data)
{
    
    if (-1 == this.alesia_attackerGroupSpawnPoints.indexOf(data.entity))
        return;
    if (-1 == this.alesia_patrolGroupSpawnPoints.indexOf(data.entity))
        return;

    this.Alesia_OwnershipChange_RebuildCity_core()
}

Trigger.prototype.Alesia_OwnershipChange_RebuildCity_core = function()
{
    this.debugLog("Alesia_OwnershipChange_RebuildCity_core")
    const temple = "structures/gaul/temple";
    const wonder = "structures/gaul/wonder";
    const fortress = "structures/gaul/fortress";
    const civic = "structures/gaul/civil_centre";
    const barrack = "structures/gaul/barracks";
    const stable = "structures/gaul/stable";
    const arsenal = "structures/gaul/arsenal";
    const rebuild_templates = [
        wonder,
        civic, civic,
        fortress, fortress,
        temple, temple, temple,
        stable, stable, stable, stable,
        barrack, barrack, barrack, barrack,
        arsenal, arsenal
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
        this.Alesia_rebuildCity_PlaceAndConstruct(pickRandom(rebuild_templates), 10);
}

Trigger.prototype.Alesia_OwnershipChange = function(data)
{
    if (data.from != 0) /* Only pass if Gaia units died */
        return;
    this.Alesia_OwnershipChange_DetectWin(data);
    this.Alesia_OwnershipChange_DetectEscalatingDefense(data);
    this.Alesia_OwnershipChange_RebuildCity(data);
    this.Alesia_OwnershipChange_KeepTrackOfUnits(data);
};


{
    Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger).RegisterTrigger("OnInitGame", "Alesia_Init", { "enabled": true });
}
