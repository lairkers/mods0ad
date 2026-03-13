/**
 * Attack Manager
 */
PETRA_EXPERT.AttackManager = function(Config)
{
	this.Config = Config;

	this.totalNumber = 0;
	this.attackNumber = 0;
	this.rushNumber = 0;
	this.raidNumber = 0;
	this.upcomingAttacks = {
		[PETRA_EXPERT.AttackPlan.TYPE_RUSH]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_RAID]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK]: []
	};
	this.startedAttacks = {
		[PETRA_EXPERT.AttackPlan.TYPE_RUSH]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_RAID]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT]: [],
		[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK]: []
	};
	this.bombingAttacks = new Map();// Temporary attacks for siege units while waiting their current attack to start
	this.debugTime = 0;
	this.maxRushes = 0;
	this.rushSize = [];
	this.currentEnemyPlayer = undefined; // enemy player we are currently targeting
	this.defeated = {};
};

/** More initialisation for stuff that needs the gameState */
PETRA_EXPERT.AttackManager.prototype.init = function(gameState)
{
	this.outOfPlan = gameState.getOwnUnits().filter(API3.Filters.byMetadata(PlayerID, "plan", -1));
	this.outOfPlan.registerUpdates();
};

PETRA_EXPERT.AttackManager.prototype.setRushes = function(allowed)
{
	if (this.Config.personality.aggressive > this.Config.personalityCut.strong && allowed > 2)
	{
		this.maxRushes = 3;
		this.rushSize = [ 50, 60, 70 ];
	}
	else if (this.Config.personality.aggressive > this.Config.personalityCut.medium && allowed > 1)
	{
		this.maxRushes = 2;
		this.rushSize = [ 50, 60 ];
	}
	else if (this.Config.personality.aggressive > this.Config.personalityCut.weak && allowed > 0)
	{
		this.maxRushes = 1;
		this.rushSize = [ 60 ];
	}
};

PETRA_EXPERT.AttackManager.prototype.checkEvents = function(gameState, events)
{
	for (let evt of events.PlayerDefeated)
		this.defeated[evt.playerId] = true;

	let answer = "decline";
	let other;
	let targetPlayer;
	for (let evt of events.AttackRequest)
	{
		if (evt.source === PlayerID || !gameState.isPlayerAlly(evt.source) || !gameState.isPlayerEnemy(evt.player))
			continue;
		targetPlayer = evt.player;
		let available = 0;
		for (let attackType in this.upcomingAttacks)
		{
			for (let attack of this.upcomingAttacks[attackType])
			{
				if (attack.state === PETRA_EXPERT.AttackPlan.STATE_COMPLETING)
				{
					if (attack.targetPlayer === targetPlayer)
						available += attack.unitCollection.length;
					else if (attack.targetPlayer !== undefined && attack.targetPlayer !== targetPlayer)
						other = attack.targetPlayer;
					continue;
				}

				attack.targetPlayer = targetPlayer;

				if (attack.unitCollection.length > 2)
					available += attack.unitCollection.length;
			}
		}

		if (available > 12)	// launch the attack immediately
		{
			for (let attackType in this.upcomingAttacks)
			{
				for (let attack of this.upcomingAttacks[attackType])
				{
					if (attack.state === PETRA_EXPERT.AttackPlan.STATE_COMPLETING ||
						attack.targetPlayer !== targetPlayer ||
						attack.unitCollection.length < 3)
						continue;
					attack.forceStart();
					attack.requested = true;
				}
			}
			answer = "join";
		}
		else if (other !== undefined)
			answer = "other";
		break;  // take only the first attack request into account
	}
	if (targetPlayer !== undefined)
		PETRA_EXPERT.chatAnswerRequestAttack(gameState, targetPlayer, answer, other);

	for (let evt of events.EntityRenamed)	// take care of packing units in bombing attacks
	{
		for (let [targetId, unitIds] of this.bombingAttacks)
		{
			if (targetId == evt.entity)
			{
				this.bombingAttacks.set(evt.newentity, unitIds);
				this.bombingAttacks.delete(evt.entity);
			}
			else if (unitIds.has(evt.entity))
			{
				unitIds.add(evt.newentity);
				unitIds.delete(evt.entity);
			}
		}
	}
};

/**
 * Check for any structure in range from within our territory, and bomb it
 */
PETRA_EXPERT.AttackManager.prototype.assignBombers = function(gameState)
{
	// First some cleaning of current bombing attacks
	for (let [targetId, unitIds] of this.bombingAttacks)
	{
		let target = gameState.getEntityById(targetId);
		if (!target || !gameState.isPlayerEnemy(target.owner()))
			this.bombingAttacks.delete(targetId);
		else
		{
			for (let entId of unitIds.values())
			{
				let ent = gameState.getEntityById(entId);
				if (ent && ent.owner() == PlayerID)
				{
					let plan = ent.getMetadata(PlayerID, "plan");
					let orders = ent.unitAIOrderData();
					let lastOrder = orders && orders.length ? orders[orders.length-1] : null;
					if (lastOrder && lastOrder.target && lastOrder.target == targetId && plan != -2 && plan != -3)
						continue;
				}
				unitIds.delete(entId);
			}
			if (!unitIds.size)
				this.bombingAttacks.delete(targetId);
		}
	}

	const bombers = gameState.updatingCollection("bombers", API3.Filters.byClasses(["BoltShooter", "StoneThrower"]), gameState.getOwnUnits());
	for (let ent of bombers.values())
	{
		if (!ent.position() || !ent.isIdle() || !ent.attackRange("Ranged"))
			continue;
		if (ent.getMetadata(PlayerID, "plan") == -2 || ent.getMetadata(PlayerID, "plan") == -3)
			continue;
		if (ent.getMetadata(PlayerID, "plan") !== undefined && ent.getMetadata(PlayerID, "plan") != -1)
		{
			let subrole = ent.getMetadata(PlayerID, "subrole");
			if (subrole && (subrole === PETRA_EXPERT.Worker.SUBROLE_COMPLETING || subrole === PETRA_EXPERT.Worker.SUBROLE_WALKING || subrole === PETRA_EXPERT.Worker.SUBROLE_ATTACKING))
				continue;
		}
		let alreadyBombing = false;
		for (let unitIds of this.bombingAttacks.values())
		{
			if (!unitIds.has(ent.id()))
				continue;
			alreadyBombing = true;
			break;
		}
		if (alreadyBombing)
			break;

		let range = ent.attackRange("Ranged").max;
		let entPos = ent.position();
		let access = PETRA_EXPERT.getLandAccess(gameState, ent);
		for (let struct of gameState.getEnemyStructures().values())
		{
			if (!ent.canAttackTarget(struct, PETRA_EXPERT.allowCapture(gameState, ent, struct)))
				continue;

			let structPos = struct.position();
			let x;
			let z;
			if (struct.hasClass("Field"))
			{
				if (!struct.resourceSupplyNumGatherers() ||
				    !gameState.isPlayerEnemy(gameState.ai.HQ.territoryMap.getOwner(structPos)))
					continue;
			}
			let dist = API3.VectorDistance(entPos, structPos);
			if (dist > range)
			{
				let safety = struct.footprintRadius() + 30;
				x = structPos[0] + (entPos[0] - structPos[0]) * safety / dist;
				z = structPos[1] + (entPos[1] - structPos[1]) * safety / dist;
				let owner = gameState.ai.HQ.territoryMap.getOwner([x, z]);
				if (owner != 0 && gameState.isPlayerEnemy(owner))
					continue;
				x = structPos[0] + (entPos[0] - structPos[0]) * range / dist;
				z = structPos[1] + (entPos[1] - structPos[1]) * range / dist;
				if (gameState.ai.HQ.territoryMap.getOwner([x, z]) != PlayerID ||
				    gameState.ai.accessibility.getAccessValue([x, z]) != access)
					continue;
			}
			let attackingUnits;
			for (let [targetId, unitIds] of this.bombingAttacks)
			{
				if (targetId != struct.id())
					continue;
				attackingUnits = unitIds;
				break;
			}
			if (attackingUnits && attackingUnits.size > 4)
				continue;	// already enough units against that target
			if (!attackingUnits)
			{
				attackingUnits = new Set();
				this.bombingAttacks.set(struct.id(), attackingUnits);
			}
			attackingUnits.add(ent.id());
			if (dist > range)
				ent.move(x, z);
			ent.attack(struct.id(), false, dist > range);
			break;
		}
	}
};

PETRA_EXPERT.AttackManager.prototype.rangedUnitsRetreat = function(gameState) {
    const rangedUnits = gameState.getOwnUnits().filter(API3.Filters.byClasses(["Ranged"]));
    const meleeEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Melee"]));

    for (let rangedUnit of rangedUnits.values()) {
        if (!rangedUnit.position())
            continue;

        let nearestEnemy = null;
        let nearestDist = Infinity;

        // Find the nearest Melee enemy within the retreat distance
        for (let meleeEnemy of meleeEnemies.values()) {
            if (!meleeEnemy.position())
                continue;

            let dist = API3.VectorDistance(rangedUnit.position(), meleeEnemy.position());

            // Determine retreat distance based on enemy type (25 for infantry, 40 for cavalry)
            let retreatThreshold = meleeEnemy.hasClass("Cavalry") ? 40 : 25;

            // Skip if the enemy is not within the retreat distance
            if (dist > retreatThreshold)
                continue;

            // Track the nearest enemy
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = meleeEnemy;
            }
        }

        // If a nearby enemy is found, retreat
        if (nearestEnemy) {

            // Calculate retreat direction
            let retreatDirection = [
                rangedUnit.position()[0] - nearestEnemy.position()[0],
                rangedUnit.position()[1] - nearestEnemy.position()[1]
            ];

            // Normalize the direction
            let length = Math.sqrt(retreatDirection[0] * retreatDirection[0] + retreatDirection[1] * retreatDirection[1]);
            retreatDirection[0] /= length;
            retreatDirection[1] /= length;

            // Add randomization to the direction
            let randomAngle = (Math.random() - 0.5) * 0.5; // Randomization within ±0.25 radians
            let newX = retreatDirection[0] * Math.cos(randomAngle) - retreatDirection[1] * Math.sin(randomAngle);
            let newZ = retreatDirection[0] * Math.sin(randomAngle) + retreatDirection[1] * Math.cos(randomAngle);

            // Calculate new retreat position
            let retreatDistance = 20 + Math.random() * 10; // Distance between 20 and 30
            let retreatPos = [
                rangedUnit.position()[0] + newX * retreatDistance,
                rangedUnit.position()[1] + newZ * retreatDistance
            ];
			// Stop the unit
			rangedUnit.stopMoving();
            // Command the unit to move to the new position
            rangedUnit.move(retreatPos[0], retreatPos[1]);

            // Logging
            // if (this.Config.debug > 1) {
            //     API3.warn(`Ranged unit ${rangedUnit.id()} retreating from Melee unit ${nearestEnemy.id()} to [${retreatPos[0]}, ${retreatPos[1]}]`);
            // }
        }
    }
};


// PETRA_EXPERT.AttackManager.prototype.supportUnitsRetreat = function(gameState) {
//     const supportUnits = gameState.getOwnUnits().filter(API3.Filters.byClasses(["Support"]));
//     const meleeEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Melee"]));
//     const rangedEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Ranged"]));

//     for (let supportUnit of supportUnits.values()) {
//         if (!supportUnit.position())
//             continue;

//         let nearestEnemy = null;
//         let nearestDist = Infinity;

//         // Find the nearest enemy (Melee or Ranged) within the retreat distance
//         for (let enemy of [...meleeEnemies.values(), ...rangedEnemies.values()]) {
//             if (!enemy.position())
//                 continue;

//             let dist = API3.VectorDistance(supportUnit.position(), enemy.position());

//             // Determine retreat distance based on enemy type
//             let retreatThreshold = enemy.hasClass("Ranged") ? (enemy.attackRange("Ranged").max + 15) : 40;

//             // Skip if the enemy is not within the retreat distance
//             if (dist > retreatThreshold)
//                 continue;

//             // Track the nearest enemy
//             if (dist < nearestDist) {
//                 nearestDist = dist;
//                 nearestEnemy = enemy;
//             }
//         }

//         // If a nearby enemy is found, retreat
//         if (nearestEnemy) {

//             // Calculate retreat direction
//             let retreatDirection = [
//                 supportUnit.position()[0] - nearestEnemy.position()[0],
//                 supportUnit.position()[1] - nearestEnemy.position()[1]
//             ];

//             // Normalize the direction
//             let length = Math.sqrt(retreatDirection[0] * retreatDirection[0] + retreatDirection[1] * retreatDirection[1]);
//             retreatDirection[0] /= length;
//             retreatDirection[1] /= length;

//             // Add randomization to the direction
//             let randomAngle = (Math.random() - 0.5) * 0.5; // Randomization within ±0.25 radians
//             let newX = retreatDirection[0] * Math.cos(randomAngle) - retreatDirection[1] * Math.sin(randomAngle);
//             let newZ = retreatDirection[0] * Math.sin(randomAngle) + retreatDirection[1] * Math.cos(randomAngle);

//             // Calculate new retreat position
//             let retreatDistance = 20 + Math.random() * 10; // Distance between 20 and 30
//             let retreatPos = [
//                 supportUnit.position()[0] + newX * retreatDistance,
//                 supportUnit.position()[1] + newZ * retreatDistance
//             ];
// 			// Stop the unit
// 			supportUnit.stopMoving();

//             // Command the unit to move to the new position
//             supportUnit.move(retreatPos[0], retreatPos[1]);

//             // Logging
//             // if (this.Config.debug > 1) {
//             //     API3.warn(`Support unit ${supportUnit.id()} retreating from enemy unit ${nearestEnemy.id()} to [${retreatPos[0]}, ${retreatPos[1]}]`);
//             // }
//         }
//     }
// };




PETRA_EXPERT.AttackManager.prototype.supportUnitsRetreat = function(gameState) {
    const supportUnits = gameState.getOwnUnits().filter(API3.Filters.byClasses(["Support"]));
    const meleeEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Melee"]));
    const rangedEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Ranged"]));

    for (let supportUnit of supportUnits.values()) {
        if (!supportUnit.position())
            continue;

        let nearestEnemy = null;
        let nearestDist = Infinity;

        // Find the nearest enemy (Melee or Ranged) within the retreat distance
        for (let enemy of [...meleeEnemies.values(), ...rangedEnemies.values()]) {
            if (!enemy.position())
                continue;

            let dist = API3.VectorDistance(supportUnit.position(), enemy.position());

            // Determine retreat distance based on enemy type
            let retreatThreshold = enemy.hasClass("Ranged") ? (enemy.attackRange("Ranged").max + 15) : 40;

            // Skip if the enemy is not within the retreat distance
            if (dist > retreatThreshold)
                continue;

            // Track the nearest enemy
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = enemy;
            }
        }

        // If a nearby enemy is found, retreat
        if (nearestEnemy) {
            // Check for nearby garrisonable structures within 50 distance
            let garrisonableStructures = gameState.getAllyStructures().filter(ent => 
                ent.isGarrisonHolder() && 
                supportUnit.hasClasses(ent.garrisonableClasses()) && 
                API3.VectorDistance(supportUnit.position(), ent.position()) <= 70
            ).values();

            let nearestStructure = null;
            let minStructureDist = Infinity;

            for (let structure of garrisonableStructures) {
                let dist = API3.VectorDistance(supportUnit.position(), structure.position());
                if (dist < minStructureDist) {
                    minStructureDist = dist;
                    nearestStructure = structure;
                }
            }

            // If a nearby structure is found, garrison it
            if (nearestStructure) {
                gameState.ai.HQ.garrisonManager.garrison(gameState, supportUnit, nearestStructure, PETRA_EXPERT.GarrisonManager.TYPE_SUPPORT);
                continue; // Skip the rest of the retreat logic
            }

            // Otherwise, retreat randomly as before
            let retreatDirection = [
                supportUnit.position()[0] - nearestEnemy.position()[0],
                supportUnit.position()[1] - nearestEnemy.position()[1]
            ];

            // Normalize the direction
            let length = Math.sqrt(retreatDirection[0] * retreatDirection[0] + retreatDirection[1] * retreatDirection[1]);
            retreatDirection[0] /= length;
            retreatDirection[1] /= length;

            // Add randomization to the direction
            let randomAngle = (Math.random() - 0.5) * 0.5;
            let newX = retreatDirection[0] * Math.cos(randomAngle) - retreatDirection[1] * Math.sin(randomAngle);
            let newZ = retreatDirection[0] * Math.sin(randomAngle) + retreatDirection[1] * Math.cos(randomAngle);

            // Calculate new retreat position
            let retreatDistance = 20 + Math.random() * 10;
            let retreatPos = [
                supportUnit.position()[0] + newX * retreatDistance,
                supportUnit.position()[1] + newZ * retreatDistance
            ];

            // Stop the unit and move to the new position
            supportUnit.stopMoving();
            supportUnit.move(retreatPos[0], retreatPos[1]);
        }
    }
};


// PETRA_EXPERT.AttackManager.prototype.supportUnitsRetreat = function(gameState) {
//     const supportUnits = gameState.getOwnUnits().filter(API3.Filters.byClasses(["Support"]));
//     const meleeEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Melee"]));
//     const rangedEnemies = gameState.getEnemyUnits().filter(API3.Filters.byClasses(["Ranged"]));
// 	const garrisonHolders = gameState.getOwnStructures().filter(ent => ent.isGarrisonHolder());

//     for (let supportUnit of supportUnits.values()) {
//         if (!supportUnit.position())
//             continue;

//         let nearestEnemy = null;
//         let nearestDist = Infinity;

//         // Find the nearest enemy (Melee or Ranged) within the retreat distance
//         for (let enemy of [...meleeEnemies.values(), ...rangedEnemies.values()]) {
//             if (!enemy.position())
//                 continue;

//             let dist = API3.VectorDistance(supportUnit.position(), enemy.position());

//             // Determine retreat distance based on enemy type
//             let retreatThreshold = enemy.hasClass("Ranged") ? (enemy.attackRange("Ranged").max + 15) : 40;

//             // Skip if the enemy is not within the retreat distance
//             if (dist > retreatThreshold)
//                 continue;

//             // Track the nearest enemy
//             if (dist < nearestDist) {
//                 nearestDist = dist;
//                 nearestEnemy = enemy;
//             }
//         }




//         // If a nearby enemy is found, retreat
//         if (nearestEnemy) {

// 			let nearestHolder = null;
//             let holderDist = Infinity;
//             for (let holder of garrisonHolders.values()) {
//                 if (!holder.position())
//                     continue;
//                 let dist = API3.VectorDistance(supportUnit.position(), holder.position());
//                 if (dist <= 100 && dist < holderDist && holder.garrisonedSlots() < holder.garrisonMax()) {
//                     nearestHolder = holder;
//                     holderDist = dist;
//                 }
//             }

//             // 3. 
//             if (nearestHolder) {
//                 // 
//                 if (supportUnit.getMetadata(PlayerID, "garrisonHolder") !== nearestHolder.id()) {
//                     // 
//                     gameState.ai.HQ.garrisonManager.garrison(gameState, supportUnit, nearestHolder, PETRA_EXPERT.GarrisonManager.TYPE_SUPPORT);
//                 }
//                 continue;
//             }
//             else {
// 				let retreatDirection = [
// 					supportUnit.position()[0] - nearestEnemy.position()[0],
// 					supportUnit.position()[1] - nearestEnemy.position()[1]
// 				];

// 				// Normalize the direction
// 				let length = Math.sqrt(retreatDirection[0] * retreatDirection[0] + retreatDirection[1] * retreatDirection[1]);
// 				retreatDirection[0] /= length;
// 				retreatDirection[1] /= length;

// 				// Add randomization to the direction
// 				let randomAngle = (Math.random() - 0.5) * 0.5;
// 				let newX = retreatDirection[0] * Math.cos(randomAngle) - retreatDirection[1] * Math.sin(randomAngle);
// 				let newZ = retreatDirection[0] * Math.sin(randomAngle) + retreatDirection[1] * Math.cos(randomAngle);

// 				// Calculate new retreat position
// 				let retreatDistance = 20 + Math.random() * 10;
// 				let retreatPos = [
// 					supportUnit.position()[0] + newX * retreatDistance,
// 					supportUnit.position()[1] + newZ * retreatDistance
// 				];

// 				// Stop the unit and move to the new position
// 				supportUnit.stopMoving();
// 				supportUnit.move(retreatPos[0], retreatPos[1]);

// 			}
//         }

//         // 4. 
//         let holderId = supportUnit.getMetadata(PlayerID, "garrisonHolder");
//         if (holderId) {
//             let holder = gameState.getEntityById(holderId);
//             if (holder) {
//                 // 
//                 let enemyNearby = false;
//                 for (let enemy of [...meleeEnemies.values(), ...rangedEnemies.values()]) {
//                     if (!enemy.position())
//                         continue;
//                     if (API3.VectorDistance(holder.position(), enemy.position()) <= 60) {
//                         enemyNearby = true;
//                         break;
//                     }
//                 }
//                 if (!enemyNearby) {
//                     // 
//                     holder.unload(supportUnit.id());
//                     supportUnit.setMetadata(PlayerID, "subrole", PETRA_EXPERT.Worker.SUBROLE_GATHERER);
//                     supportUnit.setMetadata(PlayerID, "garrisonHolder", undefined);
//                     // 
//                 }
//                 continue; // 
//             }


//         }
//     }
// };


/**
 * Some functions are run every turn
 * Others once in a while
 */
PETRA_EXPERT.AttackManager.prototype.update = function(gameState, queues, events)
{
	if (this.Config.debug > 2 && gameState.ai.elapsedTime > this.debugTime + 60)
	{
		this.debugTime = gameState.ai.elapsedTime;
		API3.warn(" upcoming attacks =================");
		for (let attackType in this.upcomingAttacks)
			for (let attack of this.upcomingAttacks[attackType])
				API3.warn(" plan " + attack.name + " type " + attackType + " state " + attack.state + " units " + attack.unitCollection.length);
		API3.warn(" started attacks ==================");
		for (let attackType in this.startedAttacks)
			for (let attack of this.startedAttacks[attackType])
				API3.warn(" plan " + attack.name + " type " + attackType + " state " + attack.state + " units " + attack.unitCollection.length);
		API3.warn(" ==================================");
	}


	this.rangedUnitsRetreat(gameState);
	this.supportUnitsRetreat(gameState);

	this.checkEvents(gameState, events);
	const unexecutedAttacks = {
		[PETRA_EXPERT.AttackPlan.TYPE_RUSH]: 0,
		[PETRA_EXPERT.AttackPlan.TYPE_RAID]: 0,
		[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT]: 0,
		[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK]: 0
	};
	for (let attackType in this.upcomingAttacks)
	{
		for (let i = 0; i < this.upcomingAttacks[attackType].length; ++i)
		{
			let attack = this.upcomingAttacks[attackType][i];
			attack.checkEvents(gameState, events);

			if (attack.isStarted())
				API3.warn("Petra Expert problem in attackManager: attack in preparation has already started ???");

			let updateStep = attack.updatePreparation(gameState);
			// now we're gonna check if the preparation time is over
			if (updateStep === PETRA_EXPERT.AttackPlan.PREPARATION_KEEP_GOING || attack.isPaused())
			{
				// just chillin'
				if (attack.state === PETRA_EXPERT.AttackPlan.STATE_UNEXECUTED)
					++unexecutedAttacks[attackType];
			}
			else if (updateStep === PETRA_EXPERT.AttackPlan.PREPARATION_FAILED)
			{
				if (this.Config.debug > 1)
					API3.warn("Attack Manager: " + attack.getType() + " plan " + attack.getName() + " aborted.");
				attack.Abort(gameState);
				this.upcomingAttacks[attackType].splice(i--, 1);
			}
			else if (updateStep === PETRA_EXPERT.AttackPlan.PREPARATION_START)
			{
				if (attack.StartAttack(gameState))
				{
					if (this.Config.debug > 1)
						API3.warn("Attack Manager: Starting " + attack.getType() + " plan " + attack.getName());
					if (this.Config.chat)
						PETRA_EXPERT.chatLaunchAttack(gameState, attack.targetPlayer, attack.getType());
					this.startedAttacks[attackType].push(attack);
				}
				else
					attack.Abort(gameState);
				this.upcomingAttacks[attackType].splice(i--, 1);
			}
		}
	}

	for (let attackType in this.startedAttacks)
	{
		for (let i = 0; i < this.startedAttacks[attackType].length; ++i)
		{
			let attack = this.startedAttacks[attackType][i];
			attack.checkEvents(gameState, events);
			// okay so then we'll update the attack.
			if (attack.isPaused())
				continue;
			let remaining = attack.update(gameState, events);
			if (!remaining)
			{
				if (this.Config.debug > 1)
					API3.warn("Military Manager: " + attack.getType() + " plan " + attack.getName() + " is finished with remaining " + remaining);
				attack.Abort(gameState);
				this.startedAttacks[attackType].splice(i--, 1);
			}
		}
	}

	// creating plans after updating because an aborted plan might be reused in that case.

	let barracksNb = gameState.getOwnEntitiesByClass("Barracks", true).filter(API3.Filters.isBuilt()).length;
	if (this.rushNumber < this.maxRushes && barracksNb >= 1)
	{
		if (unexecutedAttacks[PETRA_EXPERT.AttackPlan.TYPE_RUSH] === 0)
		{
			// we have a barracks and we want to rush, rush.
			let data = { "targetSize": this.rushSize[this.rushNumber] };
			const attackPlan = new PETRA_EXPERT.AttackPlan(gameState, this.Config, this.totalNumber, PETRA_EXPERT.AttackPlan.TYPE_RUSH, data);
			if (!attackPlan.failed)
			{
				if (this.Config.debug > 1)
					API3.warn("Military Manager: Rushing plan " + this.totalNumber + " with maxRushes " + this.maxRushes);
				this.totalNumber++;
				attackPlan.init(gameState);
				this.upcomingAttacks[PETRA_EXPERT.AttackPlan.TYPE_RUSH].push(attackPlan);
			}
			this.rushNumber++;
		}
	}
	else if (this.upcomingAttacks[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT].length + 
			this.upcomingAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length +
			this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT].length + 
			this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length < 15)
	{
	if (barracksNb >= 1 || !gameState.ai.HQ.hasPotentialBase())
	{
		const type = this.attackNumber < 15 || this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length > 3 ?
			PETRA_EXPERT.AttackPlan.TYPE_DEFAULT : PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK;
		
		let attackPlan = new PETRA_EXPERT.AttackPlan(gameState, this.Config, this.totalNumber, type);
		if (!attackPlan.failed)
		{
			if (this.Config.debug > 1)
				API3.warn("Military Manager: Creating the plan " + type + "  " + this.totalNumber);
			this.totalNumber++;
			attackPlan.init(gameState);
			this.upcomingAttacks[type].push(attackPlan);
		}
		this.attackNumber++;
	}
	}
	// else if (unexecutedAttacks[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT] == 0 && unexecutedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK] == 0 &&
	// 	this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT].length + this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length <
	// 		Math.min(2, 1 + Math.round(gameState.getPopulationMax() / 100)) &&
	// 	(this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_DEFAULT].length + this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length == 0 ||
	// 	gameState.getPopulationMax() - gameState.getPopulation() > 12))
	// {
	// 	if (barracksNb >= 1 && (gameState.currentPhase() > 1 || gameState.isResearching(gameState.getPhaseName(2))) ||
	// 		!gameState.ai.HQ.hasPotentialBase())	// if we have no base ... nothing else to do than attack
	// 	{
	// 		const type = this.attackNumber < 2 || this.startedAttacks[PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK].length > 0 ? PETRA_EXPERT.AttackPlan.TYPE_DEFAULT : PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK;
	// 		let attackPlan = new PETRA_EXPERT.AttackPlan(gameState, this.Config, this.totalNumber, type);
	// 		if (attackPlan.failed)
	// 			this.attackPlansEncounteredWater = true; // hack
	// 		else
	// 		{
	// 			if (this.Config.debug > 1)
	// 				API3.warn("Military Manager: Creating the plan " + type + "  " + this.totalNumber);
	// 			this.totalNumber++;
	// 			attackPlan.init(gameState);
	// 			this.upcomingAttacks[type].push(attackPlan);
	// 		}
	// 		this.attackNumber++;
	// 	}
	// }

	if (unexecutedAttacks[PETRA_EXPERT.AttackPlan.TYPE_RAID] === 0 && gameState.ai.HQ.defenseManager.targetList.length)
	{
		let target;
		for (let targetId of gameState.ai.HQ.defenseManager.targetList)
		{
			target = gameState.getEntityById(targetId);
			if (!target)
				continue;
			if (gameState.isPlayerEnemy(target.owner()))
				break;
			target = undefined;
		}
		if (target) // prepare a raid against this target
			this.raidTargetEntity(gameState, target);
	}

	// Check if we have some unused ranged siege unit which could do something useful while waiting
	if (this.Config.difficulty > PETRA_EXPERT.DIFFICULTY_VERY_EASY && gameState.ai.playedTurn % 5 == 0)
		this.assignBombers(gameState);
};

PETRA_EXPERT.AttackManager.prototype.getPlan = function(planName)
{
	for (let attackType in this.upcomingAttacks)
	{
		for (let attack of this.upcomingAttacks[attackType])
			if (attack.getName() == planName)
				return attack;
	}
	for (let attackType in this.startedAttacks)
	{
		for (let attack of this.startedAttacks[attackType])
			if (attack.getName() == planName)
				return attack;
	}
	return undefined;
};

PETRA_EXPERT.AttackManager.prototype.pausePlan = function(planName)
{
	let attack = this.getPlan(planName);
	if (attack)
		attack.setPaused(true);
};

PETRA_EXPERT.AttackManager.prototype.unpausePlan = function(planName)
{
	let attack = this.getPlan(planName);
	if (attack)
		attack.setPaused(false);
};

PETRA_EXPERT.AttackManager.prototype.pauseAllPlans = function()
{
	for (let attackType in this.upcomingAttacks)
		for (let attack of this.upcomingAttacks[attackType])
			attack.setPaused(true);

	for (let attackType in this.startedAttacks)
		for (let attack of this.startedAttacks[attackType])
			attack.setPaused(true);
};

PETRA_EXPERT.AttackManager.prototype.unpauseAllPlans = function()
{
	for (let attackType in this.upcomingAttacks)
		for (let attack of this.upcomingAttacks[attackType])
			attack.setPaused(false);

	for (let attackType in this.startedAttacks)
		for (let attack of this.startedAttacks[attackType])
			attack.setPaused(false);
};

PETRA_EXPERT.AttackManager.prototype.getAttackInPreparation = function(type)
{
	return this.upcomingAttacks[type].length ? this.upcomingAttacks[type][0] : undefined;
};

/**
 * Determine which player should be attacked: when called when starting the attack,
 * attack.targetPlayer is undefined and in that case, we keep track of the chosen target
 * for future attacks.
 */
PETRA_EXPERT.AttackManager.prototype.getEnemyPlayer = function(gameState, attack)
{
	let enemyPlayer;

	// First check if there is a preferred enemy based on our victory conditions.
	// If both wonder and relic, choose randomly between them TODO should combine decisions

	if (gameState.getVictoryConditions().has("wonder"))
		enemyPlayer = this.getWonderEnemyPlayer(gameState, attack);

	if (gameState.getVictoryConditions().has("capture_the_relic"))
		if (!enemyPlayer || randBool())
			enemyPlayer = this.getRelicEnemyPlayer(gameState, attack) || enemyPlayer;

	if (enemyPlayer)
		return enemyPlayer;

	let veto = {};
	for (let i in this.defeated)
		veto[i] = true;
	// No rush if enemy too well defended (i.e. iberians)
	if (attack.type === PETRA_EXPERT.AttackPlan.TYPE_RUSH)
	{
		for (let i = 1; i < gameState.sharedScript.playersData.length; ++i)
		{
			if (!gameState.isPlayerEnemy(i) || veto[i])
				continue;
			if (this.defeated[i])
				continue;
			let enemyDefense = 0;
			for (let ent of gameState.getEnemyStructures(i).values())
				if (ent.hasClasses(["Tower", "WallTower", "Fortress"]))
					enemyDefense++;
			if (enemyDefense > 20)
				veto[i] = true;
		}
	}

	// then if not a huge attack, continue attacking our previous target as long as it has some entities,
	// otherwise target the most accessible one
	if (attack.type !== PETRA_EXPERT.AttackPlan.TYPE_HUGE_ATTACK)
	{
		if (attack.targetPlayer === undefined && this.currentEnemyPlayer !== undefined &&
			!this.defeated[this.currentEnemyPlayer] &&
			gameState.isPlayerEnemy(this.currentEnemyPlayer) &&
			gameState.getEntities(this.currentEnemyPlayer).hasEntities())
			return this.currentEnemyPlayer;

		let distmin;
		let ccmin;
		let ccEnts = gameState.updatingGlobalCollection("allCCs", API3.Filters.byClass("CivCentre"));
		for (let ourcc of ccEnts.values())
		{
			if (ourcc.owner() != PlayerID)
				continue;
			let ourPos = ourcc.position();
			let access = PETRA_EXPERT.getLandAccess(gameState, ourcc);
			for (let enemycc of ccEnts.values())
			{
				if (veto[enemycc.owner()])
					continue;
				if (!gameState.isPlayerEnemy(enemycc.owner()))
					continue;
				if (access !== PETRA_EXPERT.getLandAccess(gameState, enemycc))
					continue;
				let dist = API3.SquareVectorDistance(ourPos, enemycc.position());
				if (distmin && dist > distmin)
					continue;
				ccmin = enemycc;
				distmin = dist;
			}
		}
		if (ccmin)
		{
			enemyPlayer = ccmin.owner();
			if (attack.targetPlayer === undefined)
				this.currentEnemyPlayer = enemyPlayer;
			return enemyPlayer;
		}
	}

	// then let's target our strongest enemy (basically counting enemies units)
	// with priority to enemies with civ center
	let max = 0;
	for (let i = 1; i < gameState.sharedScript.playersData.length; ++i)
	{
		if (veto[i])
			continue;
		if (!gameState.isPlayerEnemy(i))
			continue;
		let enemyCount = 0;
		let enemyCivCentre = false;
		for (let ent of gameState.getEntities(i).values())
		{
			enemyCount++;
			if (ent.hasClass("CivCentre"))
				enemyCivCentre = true;
		}
		if (enemyCivCentre)
			enemyCount += 500;
		if (!enemyCount || enemyCount < max)
			continue;
		max = enemyCount;
		enemyPlayer = i;
	}
	if (attack.targetPlayer === undefined)
		this.currentEnemyPlayer = enemyPlayer;
	return enemyPlayer;
};

/**
 * Target the player with the most advanced wonder.
 * TODO currently the first built wonder is kept, should chek on the minimum wonderDuration left instead.
 */
PETRA_EXPERT.AttackManager.prototype.getWonderEnemyPlayer = function(gameState, attack)
{
	let enemyPlayer;
	let enemyWonder;
	let moreAdvanced;
	for (let wonder of gameState.getEnemyStructures().filter(API3.Filters.byClass("Wonder")).values())
	{
		if (wonder.owner() == 0)
			continue;
		let progress = wonder.foundationProgress();
		if (progress === undefined)
		{
			enemyWonder = wonder;
			break;
		}
		if (enemyWonder && moreAdvanced > progress)
			continue;
		enemyWonder = wonder;
		moreAdvanced = progress;
	}
	if (enemyWonder)
	{
		enemyPlayer = enemyWonder.owner();
		if (attack.targetPlayer === undefined)
			this.currentEnemyPlayer = enemyPlayer;
	}
	return enemyPlayer;
};

/**
 * Target the player with the most relics (including gaia).
 */
PETRA_EXPERT.AttackManager.prototype.getRelicEnemyPlayer = function(gameState, attack)
{
	let enemyPlayer;
	let allRelics = gameState.updatingGlobalCollection("allRelics", API3.Filters.byClass("Relic"));
	let maxRelicsOwned = 0;
	for (let i = 0; i < gameState.sharedScript.playersData.length; ++i)
	{
		if (!gameState.isPlayerEnemy(i) || this.defeated[i] ||
		    i == 0 && !gameState.ai.HQ.victoryManager.tryCaptureGaiaRelic)
			continue;

		let relicsCount = allRelics.filter(relic => relic.owner() == i).length;
		if (relicsCount <= maxRelicsOwned)
			continue;
		maxRelicsOwned = relicsCount;
		enemyPlayer = i;
	}
	if (enemyPlayer !== undefined)
	{
		if (attack.targetPlayer === undefined)
			this.currentEnemyPlayer = enemyPlayer;
		if (enemyPlayer == 0)
			gameState.ai.HQ.victoryManager.resetCaptureGaiaRelic(gameState);
	}
	return enemyPlayer;
};

/** f.e. if we have changed diplomacy with another player. */
PETRA_EXPERT.AttackManager.prototype.cancelAttacksAgainstPlayer = function(gameState, player)
{
	for (let attackType in this.upcomingAttacks)
		for (let attack of this.upcomingAttacks[attackType])
			if (attack.targetPlayer === player)
				attack.targetPlayer = undefined;

	for (let attackType in this.startedAttacks)
		for (let i = 0; i < this.startedAttacks[attackType].length; ++i)
		{
			let attack = this.startedAttacks[attackType][i];
			if (attack.targetPlayer === player)
			{
				attack.Abort(gameState);
				this.startedAttacks[attackType].splice(i--, 1);
			}
		}
};

PETRA_EXPERT.AttackManager.prototype.raidTargetEntity = function(gameState, ent)
{
	let data = { "target": ent };
	const attackPlan = new PETRA_EXPERT.AttackPlan(gameState, this.Config, this.totalNumber, PETRA_EXPERT.AttackPlan.TYPE_RAID, data);
	if (attackPlan.failed)
		return null;
	if (this.Config.debug > 1)
		API3.warn("Military Manager: Raiding plan " + this.totalNumber);
	this.raidNumber++;
	this.totalNumber++;
	attackPlan.init(gameState);
	this.upcomingAttacks[PETRA_EXPERT.AttackPlan.TYPE_RAID].push(attackPlan);
	return attackPlan;
};

/**
 * Return the number of units from any of our attacking armies around this position
 */
PETRA_EXPERT.AttackManager.prototype.numAttackingUnitsAround = function(pos, dist)
{
	let num = 0;
	for (let attackType in this.startedAttacks)
		for (let attack of this.startedAttacks[attackType])
		{
			if (!attack.position)	// this attack may be inside a transport
				continue;
			if (API3.SquareVectorDistance(pos, attack.position) < dist*dist)
				num += attack.unitCollection.length;
		}
	return num;
};

/**
 * Switch defense armies into an attack one against the given target
 * data.range: transform all defense armies inside range of the target into a new attack
 * data.armyID: transform only the defense army ID into a new attack
 * data.uniqueTarget: the attack will stop when the target is destroyed or captured
 */
PETRA_EXPERT.AttackManager.prototype.switchDefenseToAttack = function(gameState, target, data)
{
	if (!target || !target.position())
		return false;
	if (!data.range && !data.armyID)
	{
		API3.warn(" attackManager.switchDefenseToAttack inconsistent data " + uneval(data));
		return false;
	}
	let attackData = data.uniqueTarget ? { "uniqueTargetId": target.id() } : undefined;
	let pos = target.position();
	const attackType = PETRA_EXPERT.AttackPlan.TYPE_DEFAULT;
	let attackPlan = new PETRA_EXPERT.AttackPlan(gameState, this.Config, this.totalNumber, attackType, attackData);
	if (attackPlan.failed)
		return false;
	this.totalNumber++;
	attackPlan.init(gameState);
	this.startedAttacks[attackType].push(attackPlan);

	let targetAccess = PETRA_EXPERT.getLandAccess(gameState, target);
	for (let army of gameState.ai.HQ.defenseManager.armies)
	{
		if (data.range)
		{
			army.recalculatePosition(gameState);
			if (API3.SquareVectorDistance(pos, army.foePosition) > data.range * data.range)
				continue;
		}
		else if (army.ID != +data.armyID)
			continue;

		while (army.foeEntities.length > 0)
			army.removeFoe(gameState, army.foeEntities[0]);
		while (army.ownEntities.length > 0)
		{
			let unitId = army.ownEntities[0];
			army.removeOwn(gameState, unitId);
			let unit = gameState.getEntityById(unitId);
			let accessOk = unit.getMetadata(PlayerID, "transport") !== undefined ||
			               unit.position() && PETRA_EXPERT.getLandAccess(gameState, unit) == targetAccess;
			if (unit && accessOk && attackPlan.isAvailableUnit(gameState, unit))
			{
				unit.setMetadata(PlayerID, "plan", attackPlan.name);
				unit.setMetadata(PlayerID, "role", PETRA_EXPERT.Worker.ROLE_ATTACK);
				attackPlan.unitCollection.updateEnt(unit);
			}
		}
	}
	if (!attackPlan.unitCollection.hasEntities())
	{
		attackPlan.Abort(gameState);
		return false;
	}
	// if (!attackPlan.unitCollection.hasEntities()) {
	// 	for (let unit of army.ownEntities) {
	// 		let ent = gameState.getEntityById(unit);
	// 		if (!ent) continue;
	// 		ent.setMetadata(PlayerID, "role", PETRA_EXPERT.Worker.ROLE_WORKER);
	// 		ent.setMetadata(PlayerID, "subrole", PETRA_EXPERT.Worker.SUBROLE_IDLE);
	// 	}
	// 	attackPlan.Abort(gameState);
	// 	return false;
	// }
	for (let unit of attackPlan.unitCollection.values())
		unit.setMetadata(PlayerID, "role", PETRA_EXPERT.Worker.ROLE_ATTACK);
	attackPlan.targetPlayer = target.owner();
	attackPlan.targetPos = pos;
	attackPlan.target = target;
	attackPlan.state = PETRA_EXPERT.AttackPlan.STATE_ARRIVED;
	return true;
};

PETRA_EXPERT.AttackManager.prototype.Serialize = function()
{
	let properties = {
		"totalNumber": this.totalNumber,
		"attackNumber": this.attackNumber,
		"rushNumber": this.rushNumber,
		"raidNumber": this.raidNumber,
		"debugTime": this.debugTime,
		"maxRushes": this.maxRushes,
		"rushSize": this.rushSize,
		"currentEnemyPlayer": this.currentEnemyPlayer,
		"defeated": this.defeated
	};

	let upcomingAttacks = {};
	for (let key in this.upcomingAttacks)
	{
		upcomingAttacks[key] = [];
		for (let attack of this.upcomingAttacks[key])
			upcomingAttacks[key].push(attack.Serialize());
	}

	let startedAttacks = {};
	for (let key in this.startedAttacks)
	{
		startedAttacks[key] = [];
		for (let attack of this.startedAttacks[key])
			startedAttacks[key].push(attack.Serialize());
	}

	return { "properties": properties, "upcomingAttacks": upcomingAttacks, "startedAttacks": startedAttacks };
};

PETRA_EXPERT.AttackManager.prototype.Deserialize = function(gameState, data)
{
	for (let key in data.properties)
		this[key] = data.properties[key];

	this.upcomingAttacks = {};
	for (let key in data.upcomingAttacks)
	{
		this.upcomingAttacks[key] = [];
		for (let dataAttack of data.upcomingAttacks[key])
		{
			let attack = new PETRA_EXPERT.AttackPlan(gameState, this.Config, dataAttack.properties.name);
			attack.Deserialize(gameState, dataAttack);
			attack.init(gameState);
			this.upcomingAttacks[key].push(attack);
		}
	}

	this.startedAttacks = {};
	for (let key in data.startedAttacks)
	{
		this.startedAttacks[key] = [];
		for (let dataAttack of data.startedAttacks[key])
		{
			let attack = new PETRA_EXPERT.AttackPlan(gameState, this.Config, dataAttack.properties.name);
			attack.Deserialize(gameState, dataAttack);
			attack.init(gameState);
			this.startedAttacks[key].push(attack);
		}
	}
};
