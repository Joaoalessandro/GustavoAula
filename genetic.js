
// Listener do formulário: lê parâmetros da UI e executa o GA
document.getElementById('formGenetico').addEventListener('submit', function (e) {
  e.preventDefault();

  // pega os parâmetros do formulário e converte para os tipos corretos
  var parametros = {
    tamanhoPopulacao: parseInt(document.getElementById('tamanhoPopulacao').value, 10),
    geracoes: parseInt(document.getElementById('geracoes').value, 10),
    elitismoTotal: document.getElementById('elitismoTotal').value === 'true',
    taxaElitismo: parseInt(document.getElementById('taxaElitismo').value, 10),
    tipoSelecao: document.getElementById('tipoSelecao').value,
    tamanhoTorneio: parseInt(document.getElementById('tamanhoTorneio').value, 10),
    tipoCruzamento: document.getElementById('tipoCruzamento').value,
    pontosCruzamento: parseInt(document.getElementById('pontosCruzamento').value, 10),
    taxaMutacao: parseFloat(document.getElementById('taxaMutacao').value),
    numeroGenes: 20
  };

  // executa o algoritmo e exibe o melhor indivíduo encontrado
  var resultado = executarAlgoritmoGenetico(parametros);
  document.getElementById('saida').innerText =
    'Melhor configuração encontrada: ' + resultado.melhor.join('') + ' \n(Iluminação: ' + resultado.aptidao + ')';
});

// Função principal que controla a evolução
function executarAlgoritmoGenetico(config) {
  // gera população inicial aleatória (0/1)
  var populacao = gerarPopulacao(config.tamanhoPopulacao, config.numeroGenes);
  var ger;

  // loop principal por número de gerações
  for (ger = 0; ger < config.geracoes; ger++) {
    // calcula aptidão de cada indivíduo
    var aptidoes = [];
    var i;
    for (i = 0; i < populacao.length; i++) {
      aptidoes.push(aptidao(populacao[i]));
    }

    var novaPopulacao = [];

    // calcula quantidade de elites (considera elitismo total ou percentual)
    var qtdElite;
    if (config.elitismoTotal) {
      qtdElite = config.tamanhoPopulacao;
    } else {
      qtdElite = Math.floor(config.tamanhoPopulacao * (config.taxaElitismo / 100));
    }
    // garante limites válidos
    if (qtdElite < 0) { qtdElite = 0; }
    if (qtdElite > config.tamanhoPopulacao) { qtdElite = config.tamanhoPopulacao; }

    // seleciona elites e adiciona direto na nova população
    var elites = selecionarElites(populacao, aptidoes, qtdElite);
    for (i = 0; i < elites.length; i++) {
      novaPopulacao.push(elites[i]);
    }

    // preenche o restante da população com filhos (cruzamento + mutação)
    while (novaPopulacao.length < config.tamanhoPopulacao) {
      var pais = selecionarPais(populacao, aptidoes, config);
      var filhos = cruzamento(pais[0], pais[1], config);
      var f;
      for (f = 0; f < filhos.length && novaPopulacao.length < config.tamanhoPopulacao; f++) {
        novaPopulacao.push(mutacao(filhos[f], config.taxaMutacao));
      }
    }

    // substitui a população antiga pela nova (clonando referências de indivíduo)
    populacao = [];
    for (i = 0; i < config.tamanhoPopulacao; i++) {
      populacao.push(novaPopulacao[i]);
    }
  }

  // após todas as gerações: calcula aptidões finais e encontra o melhor
  var aptidoesFinais = [];
  var j;
  for (j = 0; j < populacao.length; j++) {
    aptidoesFinais.push(aptidao(populacao[j]));
  }

  var melhorIndex = 0;
  var melhorVal = aptidoesFinais[0];
  for (j = 1; j < aptidoesFinais.length; j++) {
    if (aptidoesFinais[j] > melhorVal) {
      melhorVal = aptidoesFinais[j];
      melhorIndex = j;
    }
  }

  // retorna o melhor indivíduo e sua aptidão
  return {
    melhor: populacao[melhorIndex],
    aptidao: aptidoesFinais[melhorIndex]
  };
}

// Gera população inicial com genes 0 ou 1 aleatórios
function gerarPopulacao(tamanho, numeroGenes) {
  var populacao = [];
  var i, j;
  for (i = 0; i < tamanho; i++) {
    var individuo = [];
    for (j = 0; j < numeroGenes; j++) {
      if (Math.random() < 0.5) {
        individuo.push(0);
      } else {
        individuo.push(1);
      }
    }
    populacao.push(individuo);
  }
  return populacao;
}

// Função de aptidão simples: soma dos genes (conta quantos postes estão ligados)
// Quanto maior, melhor (maximização)
function aptidao(individuo) {
  var soma = 0;
  var i;
  for (i = 0; i < individuo.length; i++) {
    soma += individuo[i];
  }
  return soma;
}

// Seleciona as melhores soluções (elitismo)
// Estratégia: copia arrays e remove (marca) os escolhidos uma a uma
function selecionarElites(populacao, aptidoes, quantidade) {
  var copiaApt = [];
  var copiaPop = [];
  var i;
  for (i = 0; i < aptidoes.length; i++) {
    copiaApt.push(aptidoes[i]);
    copiaPop.push(populacao[i]);
  }

  var elites = [];
  var k;
  for (k = 0; k < quantidade; k++) {
    var idxMax = -1;
    var valMax = -1;
    for (i = 0; i < copiaApt.length; i++) {
      if (copiaApt[i] > valMax) {
        valMax = copiaApt[i];
        idxMax = i;
      }
    }
    if (idxMax === -1) {
      break;
    }
    elites.push(copiaPop[idxMax]);
    // "remove" o escolhido marcando sua aptidão como -1 para não ser reescolhido
    copiaApt[idxMax] = -1;
  }

  return elites;
}

// Seleção de pais: implementa roleta, ranking (top2) e torneio
function selecionarPais(populacao, aptidoes, config) {
  if (config.tipoSelecao === 'roleta') {
    // roleta proporcional à aptidão
    var totalFit = 0;
    var i;
    for (i = 0; i < aptidoes.length; i++) {
      totalFit += aptidoes[i];
    }

    function escolherRoleta() {
      if (totalFit <= 0) {
        // se todas aptidões são zero, escolhe aleatoriamente
        var idxRand = Math.floor(Math.random() * populacao.length);
        return populacao[idxRand];
      }

      var r = Math.random() * totalFit;
      var acumulado = 0;
      for (i = 0; i < populacao.length; i++) {
        acumulado += aptidoes[i];
        if (r <= acumulado) {
          return populacao[i];
        }
      }
      // retorna último se algo estranho acontecer
      return populacao[populacao.length - 1];
    }

    return [escolherRoleta(), escolherRoleta()];

  } else if (config.tipoSelecao === 'ranking') {
    // ranking simples: encontra os dois melhores índices
    var primeiroIdx = -1;
    var segundoIdx = -1;
    var primeiroVal = -1;
    var segundoVal = -1;
    var i;
    for (i = 0; i < aptidoes.length; i++) {
      var v = aptidoes[i];
      if (v > primeiroVal) {
        segundoVal = primeiroVal;
        segundoIdx = primeiroIdx;
        primeiroVal = v;
        primeiroIdx = i;
      } else if (v > segundoVal) {
        segundoVal = v;
        segundoIdx = i;
      }
    }

    // garante índices válidos
    if (primeiroIdx === -1) { primeiroIdx = 0; }
    if (segundoIdx === -1) { segundoIdx = 0; }
    return [populacao[primeiroIdx], populacao[segundoIdx]];

  } else if (config.tipoSelecao === 'torneio') {
    // torneio: escolhe k indivíduos aleatórios e pega o melhor
    function escolherTorneio() {
      var melhorIdx = -1;
      var melhorVal = -1;
      var t;
      for (t = 0; t < config.tamanhoTorneio; t++) {
        var idx = Math.floor(Math.random() * populacao.length);
        if (aptidoes[idx] > melhorVal) {
          melhorVal = aptidoes[idx];
          melhorIdx = idx;
        }
      }
      if (melhorIdx === -1) {
        melhorIdx = 0;
      }
      return populacao[melhorIdx];
    }
    return [escolherTorneio(), escolherTorneio()];
  }

  // padrão: retorna dois primeiros (pode ser alterado para aleatório se desejar)
  return [populacao[0], populacao[1]];
}

// Ordena um array de inteiros
// Usado para ordenar pontos de corte no cruzamento (evita usar sort nativo)
function ordenacaoInsercao(arr) {
  var i, j;
  for (i = 1; i < arr.length; i++) {
    var chave = arr[i];
    j = i - 1;
    while (j >= 0 && arr[j] > chave) {
      arr[j + 1] = arr[j];
      j = j - 1;
    }
    arr[j + 1] = chave;
  }
  return arr;
}

// Cruzamento: suporta 1 ponto ou vários pontos de corte
// Não usa spread; constrói filhos manualmente respeitando a alternância entre pais
function cruzamento(pai1, pai2, config) {
  var pontos = [];
  var len = pai1.length;
  var i;

  if (config.tipoCruzamento === 'um') {
    // um ponto aleatório entre 0 e len-1
    pontos.push(Math.floor(Math.random() * len));
  } else {
    // gera múltiplos pontos aleatórios
    var p;
    for (p = 0; p < config.pontosCruzamento; p++) {
      pontos.push(Math.floor(Math.random() * len));
    }
    // ordena os pontos para garantir intervalos corretos
    ordenacaoInsercao(pontos);
  }

  // adiciona o fim como ponto final para completar todos os segmentos
  pontos.push(len);

  var filho1 = [];
  var filho2 = [];
  var alterna = false; // controla de qual pai vem o segmento
  var ultimo = 0;
  var q;
  for (q = 0; q < pontos.length; q++) {
    var pto = pontos[q];
    var k;
    if (alterna) {
      // pega segmento do pai2 para filho1 e do pai1 para filho2
      for (k = ultimo; k < pto; k++) {
        filho1.push(pai2[k]);
      }
      for (k = ultimo; k < pto; k++) {
        filho2.push(pai1[k]);
      }
    } else {
      // pega segmento do pai1 para filho1 e do pai2 para filho2
      for (k = ultimo; k < pto; k++) {
        filho1.push(pai1[k]);
      }
      for (k = ultimo; k < pto; k++) {
        filho2.push(pai2[k]);
      }
    }
    alterna = !alterna; // alterna para próximo segmento
    ultimo = pto;
  }

  return [filho1, filho2];
}

// Mutação: percorre genes e troca 0<->1 com probabilidade taxa
// Não usa operador ternário para manter estilo solicitado
function mutacao(individuo, taxa) {
  var novo = [];
  var i;
  for (i = 0; i < individuo.length; i++) {
    var gene = individuo[i];
    if (Math.random() < taxa) {
      // inverte bit (0->1 ou 1->0)
      novo.push(1 - gene);
    } else {
      novo.push(gene);
    }
  }
  return novo;
}
// Código para gerenciar a interface do formulário
document.addEventListener("DOMContentLoaded", function () {

    // elementos do formulário usados
    var tipoSelecao = document.getElementById("tipoSelecao");
    var tamanhoTorneio = document.getElementById("tamanhoTorneio");
    var elitismoTotal = document.getElementById("elitismoTotal");
    var taxaElitismo = document.getElementById("taxaElitismo");
    var tipoCruzamento = document.getElementById("tipoCruzamento");
    var pontosCruzamento = document.getElementById("pontosCruzamento");

    // habilita o campo "Tamanho do Torneio" apenas quando tipoSelecao === "torneio"
    function atualizarCampoTorneio() {
        if (tipoSelecao.value === "torneio") {
            tamanhoTorneio.disabled = false;
        } else {
            tamanhoTorneio.disabled = true;
            tamanhoTorneio.value = 0;
        }
    }

    // habilita/desabilita o campo "Taxa de Elitismo" conforme elitismoTotal ('true' = Sim)
    function atualizarCampoElitismo() {
        if (elitismoTotal.value === "true") {
            taxaElitismo.disabled = true;
            taxaElitismo.value = 0; // valor padrão
        } else {
            taxaElitismo.disabled = false;
        }
    }

    // habilita o campo "Quantidade de pontos de cruzamento" somente se tipoCruzamento === "multi"
    function atualizarCampoCruzamento() {
        if (tipoCruzamento.value === "multi") {
            pontosCruzamento.disabled = false;
        } else {
            // quando for "um" (ou qualquer outro valor diferente de "multi"), desabilita
            pontosCruzamento.disabled = true;
            pontosCruzamento.value = 1; // valor padrão
        }
    }

    // Executa ao carregar a página para definir os estados iniciais corretos
    atualizarCampoTorneio();
    atualizarCampoElitismo();
    atualizarCampoCruzamento();

    // Listeners para reagir às mudanças do usuário
    tipoSelecao.addEventListener("change", atualizarCampoTorneio);
    elitismoTotal.addEventListener("change", atualizarCampoElitismo);
    tipoCruzamento.addEventListener("change", atualizarCampoCruzamento);

});

