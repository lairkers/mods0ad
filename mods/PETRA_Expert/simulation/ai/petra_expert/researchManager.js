/**
 * Manage the research
 */
PETRA_EXPERT.ResearchManager = function(Config)
{
	this.Config = Config;
};

/**
 * Check if we can go to the next phase
 */
PETRA_EXPERT.ResearchManager.prototype.checkPhase = function(gameState, queues)
{
	if (queues.majorTech.hasQueuedUnits())
		return;
	// Don't try to phase up if already trying to gather resources for a civil-centre or wonder
	if (queues.civilCentre.hasQueuedUnits() || queues.wonder.hasQueuedUnits())
		return;

	let currentPhaseIndex = gameState.currentPhase();
	let nextPhaseName = gameState.getPhaseName(currentPhaseIndex+1);
	if (!nextPhaseName)
		return;

	let petraRequirements =
		currentPhaseIndex == 1 && gameState.ai.HQ.getAccountedPopulation(gameState) >= this.Config.Economy.popPhase2 ||
		currentPhaseIndex == 2 && gameState.ai.HQ.getAccountedWorkers(gameState) > this.Config.Economy.workPhase3 ||
		currentPhaseIndex >= 3 && gameState.ai.HQ.getAccountedWorkers(gameState) > this.Config.Economy.workPhase4;
	if (petraRequirements && gameState.hasResearchers(nextPhaseName, true))
	{
		gameState.ai.HQ.phasing = currentPhaseIndex + 1;
		// Reset the queue priority in case it was changed during a previous phase update
		gameState.ai.queueManager.changePriority("majorTech", gameState.ai.Config.priorities.majorTech);
		queues.majorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, nextPhaseName, true));
	}
};

PETRA_EXPERT.ResearchManager.prototype.researchPopulationBonus = function(gameState, queues)
{
	if (queues.minorTech.hasQueuedUnits())
		return;

	let techs = gameState.findAvailableTech();
	for (let tech of techs)
	{
		if (!tech[1]._template.modifications)
			continue;
		// TODO may-be loop on all modifs and check if the effect if positive ?
		if (tech[1]._template.modifications[0].value !== "Population/Bonus")
			continue;
		queues.minorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, tech[0]));
		break;
	}
};

PETRA_EXPERT.ResearchManager.prototype.researchTradeBonus = function(gameState, queues)
{
	if (queues.minorTech.hasQueuedUnits())
		return;

	let techs = gameState.findAvailableTech();
	for (let tech of techs)
	{
		if (!tech[1]._template.modifications || !tech[1]._template.affects)
			continue;
		if (tech[1]._template.affects.indexOf("Trader") === -1)
			continue;
		// TODO may-be loop on all modifs and check if the effect if positive ?
		if (tech[1]._template.modifications[0].value !== "UnitMotion/WalkSpeed" &&
                    tech[1]._template.modifications[0].value !== "Trader/GainMultiplier")
			continue;
		queues.minorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, tech[0]));
		break;
	}
};

/** Techs to be searched for as soon as they are available */
PETRA_EXPERT.ResearchManager.prototype.researchWantedTechs = function(gameState, techs)
{
	let phase1 = gameState.currentPhase() === 1;
	let available = gameState.ai.queueManager.getAvailableResources(gameState);
	const numWorkers = gameState.getOwnEntitiesByRole(PETRA_EXPERT.Worker.ROLE_WORKER, true).length;
	for (let tech of techs)
	{

		
		//if (tech[0] == "unlock_females_house")
			//return { "name": tech[0], "increasePriority": true };


		if (tech[0] == "soldier_attack_melee_01" && numWorkers > 100)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_attack_ranged_01" && numWorkers > 100)
			return { "name": tech[0], "increasePriority": true };

		if (tech[0] == "soldier_resistance_hack_01" && numWorkers > 100)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_resistance_pierce_01" && numWorkers > 100)
			return { "name": tech[0], "increasePriority": true };


		if (tech[0] == "soldier_attack_melee_02" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_attack_ranged_02" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };

		if (tech[0] == "soldier_resistance_hack_02" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_resistance_pierce_02" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };


		if (tech[0] == "barracks_batch_training" && numWorkers > 120)
			return { "name": tech[0], "increasePriority": true };

		if (tech[0].indexOf("unlock_champion") == 0 && numWorkers > 50)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "traditional_army_sele" || tech[0] == "reformed_army_sele" && numWorkers > 75)
			return { "name": pickRandom(["traditional_army_sele", "reformed_army_sele"]), "increasePriority": true };

		

		if (tech[0] == "roman_reforms" && numWorkers > 75)
			return { "name": tech[0], "increasePriority": true };


		if (tech[0] == "soldier_attack_melee_03" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_attack_ranged_03" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };

		if (tech[0] == "soldier_resistance_hack_03" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };
		if (tech[0] == "soldier_resistance_pierce_03" && numWorkers > 150)
			return { "name": tech[0], "increasePriority": true };








		if (!tech[1]._template.modifications)
			continue;
		let template = tech[1]._template;
		if (phase1)
		{
			let cost = template.cost;
			let costMax = 0;
			for (let res in cost)
				costMax = Math.max(costMax, Math.max(cost[res]-available[res], 0));
			if (10*numWorkers < costMax)
				continue;
		}
		for (let i in template.modifications)
		{
			if (gameState.ai.HQ.navalMap && template.modifications[i].value === "ResourceGatherer/Rates/food.fish")
				return { "name": tech[0], "increasePriority": true };
			//else if (template.modifications[i].value === "ResourceGatherer/Rates/food.fruit")
				//return { "name": tech[0], "increasePriority": true };

			else if (template.modifications[i].value === "ResourceGatherer/Rates/wood.tree" && numWorkers > 25)
				return { "name": tech[0], "increasePriority": true };

			else if (template.modifications[i].value.startsWith("ResourceGatherer/Capacities") && numWorkers > 85)
				return { "name": tech[0], "increasePriority": true };
			else if (template.modifications[i].value === "ResourceGatherer/Rates/food.grain" && numWorkers > 55)
				return { "name": tech[0], "increasePriority": true };
			else if (template.modifications[i].value === "ResourceGatherer/Rates/metal.ore" && gameState.currentPhase() > 1 && numWorkers > 100)
				return { "name": tech[0], "increasePriority": true };
			else if (template.modifications[i].value === "Attack/Ranged/MaxRange" && numWorkers > 100)
				return { "name": tech[0], "increasePriority": true };
		}
	}
	return null;
};

/** Techs to be searched for as soon as they are available, but only after phase 2 */
PETRA_EXPERT.ResearchManager.prototype.researchPreferredTechs = function(gameState, techs)
{
	let phase2 = gameState.currentPhase() === 2;
	let available = phase2 ? gameState.ai.queueManager.getAvailableResources(gameState) : null;
	const numWorkers = gameState.getOwnEntitiesByRole(PETRA_EXPERT.Worker.ROLE_WORKER, true).length;
	for (let tech of techs)
	{
		if (!tech[1]._template.modifications)
			continue;
		let template = tech[1]._template;
		if (phase2)
		{
			let cost = template.cost;
			let costMax = 0;
			for (let res in cost)
				costMax = Math.max(costMax, Math.max(cost[res]-available[res], 0));
			if (10*numWorkers < costMax)
				continue;
		}
		for (let i in template.modifications)
		{
			if (template.modifications[i].value === "ResourceGatherer/Rates/stone.rock" && numWorkers > 140)
				return { "name": tech[0], "increasePriority": true };

			else if (template.modifications[i].value === "BuildingAI/DefaultArrowCount" && numWorkers > 150)
				return { "name": tech[0], "increasePriority": true };
			else if (template.modifications[i].value === "Health/RegenRate" && numWorkers > 120)
				return { "name": tech[0], "increasePriority": false };
			else if (template.modifications[i].value === "Health/IdleRegenRate" && numWorkers > 130)
				return { "name": tech[0], "increasePriority": false };
		}
	}
	return null;
};

PETRA_EXPERT.ResearchManager.prototype.update = function(gameState, queues)
{
	if (queues.minorTech.hasQueuedUnits() || queues.majorTech.hasQueuedUnits())
		return;

	let techs = gameState.findAvailableTech();

	let techName = this.researchWantedTechs(gameState, techs);
	const numWorkers = gameState.getOwnEntitiesByRole(PETRA_EXPERT.Worker.ROLE_WORKER, true).length;
	if (techName)
	{
		if (techName.increasePriority)
		{
			gameState.ai.queueManager.changePriority("minorTech", 8 * this.Config.priorities.minorTech);
			let plan = new PETRA_EXPERT.ResearchPlan(gameState, techName.name);
			plan.queueToReset = "minorTech";
			queues.minorTech.addPlan(plan);
		}
		else
			queues.minorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, techName.name));
		return;
	}

	if (gameState.currentPhase() < 2)
		return;

	techName = this.researchPreferredTechs(gameState, techs);
	if (techName)
	{
		if (techName.increasePriority)
		{
			gameState.ai.queueManager.changePriority("minorTech", 8 * this.Config.priorities.minorTech);
			let plan = new PETRA_EXPERT.ResearchPlan(gameState, techName.name);
			plan.queueToReset = "minorTech";
			queues.minorTech.addPlan(plan);
		}
		else
			queues.minorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, techName.name));
		return;
	}

	if (gameState.currentPhase() < 3)
		return;

	// remove some techs not yet used by this AI
	// remove also sharedLos if we have no ally
	for (let i = 0; i < techs.length; ++i)
	{
		let template = techs[i][1]._template;
		if (template.affects && template.affects.length === 1 &&
			(template.affects[0] === "Healer" || template.affects[0] === "Outpost" || template.affects[0] === "Wall"))
		{
			techs.splice(i--, 1);
			continue;
		}
		if (template.modifications && template.modifications.length === 1 &&
			this.Config.unusedNoAllyTechs.includes(template.modifications[0].value) &&
			!gameState.hasAllies())
		{
			techs.splice(i--, 1);
			continue;
		}
	}
	if (!techs.length)
		return;

	// randomly pick one. No worries about pairs in that case.
	//if (numWorkers > 175)
	//queues.minorTech.addPlan(new PETRA_EXPERT.ResearchPlan(gameState, pickRandom(techs)[0]));
};

PETRA_EXPERT.ResearchManager.prototype.CostSum = function(cost)
{
	let costSum = 0;
	for (let res in cost)
		costSum += cost[res];
	return costSum;
};

PETRA_EXPERT.ResearchManager.prototype.Serialize = function()
{
	return {};
};

PETRA_EXPERT.ResearchManager.prototype.Deserialize = function(data)
{
};
