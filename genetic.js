// Algoritmo Genético para maximizar iluminação pública

document.getElementById('geneticForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const params = {
    populationSize: parseInt(document.getElementById('populationSize').value),
    generations: parseInt(document.getElementById('generations').value),
    elitismTotal: document.getElementById('elitismTotal').value === 'true',
    elitismRate: parseInt(document.getElementById('elitismRate').value),
    selectionType: document.getElementById('selectionType').value,
    tournamentSize: parseInt(document.getElementById('tournamentSize').value),
    crossoverType: document.getElementById('crossoverType').value,
    crossoverPoints: parseInt(document.getElementById('crossoverPoints').value),
    mutationRate: parseFloat(document.getElementById('mutationRate').value),
    numGenes: 20 // número de postes
  };

  const result = runGeneticAlgorithm(params);
  document.getElementById('output').innerText = `Melhor configuração encontrada: ${result.best.join('')} (Iluminação: ${result.fitness})`;
});

// Funções principais do algoritmo genético

function runGeneticAlgorithm(config) {
  let population = generatePopulation(config.populationSize, config.numGenes);

  for (let gen = 0; gen < config.generations; gen++) {
    const fitnesses = population.map(ind => fitness(ind));
    const newPopulation = [];

    const eliteCount = config.elitismTotal ? config.populationSize : Math.floor(config.populationSize * (config.elitismRate / 100));
    const elites = selectElites(population, fitnesses, eliteCount);
    newPopulation.push(...elites);

    while (newPopulation.length < config.populationSize) {
      const parents = selectParents(population, fitnesses, config);
      const children = crossover(parents[0], parents[1], config);
      newPopulation.push(...children.map(child => mutate(child, config.mutationRate)));
    }

    population = newPopulation.slice(0, config.populationSize);
  }

  const finalFitnesses = population.map(ind => fitness(ind));
  const bestIndex = finalFitnesses.indexOf(Math.max(...finalFitnesses));
  return { best: population[bestIndex], fitness: finalFitnesses[bestIndex] };
}

function generatePopulation(size, numGenes) {
  return Array.from({ length: size }, () =>
    Array.from({ length: numGenes }, () => Math.random() < 0.5 ? 0 : 1)
  );
}

function fitness(individual) {
  return individual.reduce((sum, gene) => sum + gene, 0);
}

function selectElites(population, fitnesses, count) {
  return population
    .map((ind, i) => ({ ind, fit: fitnesses[i] }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, count)
    .map(e => e.ind);
}

function selectParents(population, fitnesses, config) {
  if (config.selectionType === 'roleta') {
    const totalFit = fitnesses.reduce((a, b) => a + b, 0);
    const pick = () => {
      let r = Math.random() * totalFit;
      for (let i = 0; i < population.length; i++) {
        r -= fitnesses[i];
        if (r <= 0) return population[i];
      }
      return population[population.length - 1];
    };
    return [pick(), pick()];
  } else if (config.selectionType === 'ranking') {
    const ranked = population
      .map((ind, i) => ({ ind, fit: fitnesses[i] }))
      .sort((a, b) => b.fit - a.fit);
    return [ranked[0].ind, ranked[1].ind];
  } else if (config.selectionType === 'torneio') {
    const pick = () => {
      const group = Array.from({ length: config.tournamentSize }, () =>
        Math.floor(Math.random() * population.length)
      );
      return group.map(i => ({ ind: population[i], fit: fitnesses[i] }))
        .sort((a, b) => b.fit - a.fit)[0].ind;
    };
    return [pick(), pick()];
  }
}

function crossover(parent1, parent2, config) {
  const points = config.crossoverType === 'um' ? [Math.floor(Math.random() * parent1.length)] :
    Array.from({ length: config.crossoverPoints }, () => Math.floor(Math.random() * parent1.length)).sort((a, b) => a - b);

  let child1 = [], child2 = [];
  let toggle = false, last = 0;

  for (let p of [...points, parent1.length]) {
    if (toggle) {
      child1.push(...parent2.slice(last, p));
      child2.push(...parent1.slice(last, p));
    } else {
      child1.push(...parent1.slice(last, p));
      child2.push(...parent2.slice(last, p));
    }
    toggle = !toggle;
    last = p;
  }

  return [child1, child2];
}

function mutate(individual, rate) {
  return individual.map(gene => Math.random() < rate ? 1 - gene : gene);
}
