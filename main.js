const API_KEY = ""; // <- cole sua chave aqui 

// Link CSV da planilha 
const URL_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdy74VMFCuowXzxgtAcYPDLmU6cj4crafrcd5DrvbltDRYN-_2JbaJZonYOK710n8sVUOhwS5bf9Tl/pub?output=csv"; 
let dadosPlanilha = []; 

async function lerCSV(url) { 
  const resp = await fetch(url); 
  const text = await resp.text(); 
  const linhas = text.trim().split("\n").map(l => l.split(",")); 
  return linhas; 
}

// ---------------------- Prompts ----------------------

const entendimentoInfo = `
    Você é um assistente educacional de programação que segue a metodologia de Polya. 
    Fluxo para cada questão: 
    1. Perguntar ENTRADAS e validar. 
    2. Perguntar SAÍDAS e validar. 
    3. Perguntar RESTRIÇÕES e validar. 
    4. Conduzir o aluno a propor um PLANO DE DESENVOLVIMENTO. 
    Responda sempre de forma breve, clara e incentivadora: 
    - Se estiver incompleto: use a tag fixa "🤔 Vamos pensar mais um pouco..." (máx. 2 frases) 
    - Se a resposta estiver completa: comece com "✅ Legal!" e confirme de forma breve. 
    Não repita instruções já dadas.
    Utilize emojis sempre que conveniente. 
`; 

const codificacaoInfo = `
    Agora você está na etapa de CODIFICAÇÃO, seguindo a metodologia de Polya.  
    Fluxo:  
    1. Incentivar o aluno a propor um esqueleto inicial de código (mesmo que incompleto).  
    2. Conduzir o aluno em pequenas etapas:  
       - Declaração das variáveis de entrada.  
       - Processamento ou cálculos.  
       - Exibição dos resultados.
       - Código completo  
    3. Sempre dar feedback curto, motivador e claro.  
    4. Sugerir UMA melhoria ou próximo passo por vez.  
    Use exemplos simples e trechos de código quando for útil.  
`;

// ---------------------- INTERFACE ----------------------

const chatWindow = document.getElementById('chatWindow'); 
const chatBtn = document.getElementById('chatBtn'); 
const closeBtn = document.getElementById('closeBtn'); 
const messageInput = document.getElementById('messageInput'); 
const sendBtn = document.getElementById('sendBtn'); 
const chatMessages = document.getElementById('chatMessages'); 

let currentStep = null; 
let questaoAtual = "";

// Variáveis para as dúvidas
let duvidas = { variaveis: 0, processamento: 0, saida: 0 };
let estavaEmDuvida = { variaveis: false, processamento: false, saida: false }; 

// variáveis para armazenar respostas 
let entradas = ""; 
let hipoteseEntradas = ""; 
let saidas = ""; 
let hipoteseSaidas = ""; 
let restricoes = ""; 
let hipoteseRestricoes = ""; 

// ---------------------- Funções de UI ----------------------

function toggleChat() { 
  chatWindow.classList.toggle('open'); 
  if (chatWindow.classList.contains('open')) { 
    messageInput.focus(); 
  } 
} 

function addMessage(content, isUser = false, isError = false) { 
  const messageDiv = document.createElement('div'); 
  messageDiv.className = `message ${isUser ? 'user' : isError ? 'error' : 'bot'}`; 
  messageDiv.textContent = content; 
  chatMessages.appendChild(messageDiv); 
  chatMessages.scrollTop = chatMessages.scrollHeight; 
} 

function showTyping() { 
  const typingDiv = document.createElement('div'); 
  typingDiv.className = 'typing-indicator'; 
  typingDiv.id = 'typing'; 
  typingDiv.innerHTML = `<div class="typing-dots"> <span></span><span></span><span></span> </div>`; 
  chatMessages.appendChild(typingDiv); 
  chatMessages.scrollTop = chatMessages.scrollHeight; 
} 

function hideTyping() { 
  const typing = document.getElementById('typing'); 
  if (typing) typing.remove(); 
} 

// ---------------------- API ---------------------- 

async function sendToAPI(message, context = "") { 
  showTyping(); 
  try { 
    let text = "Resposta simulada."; 
    
    if (API_KEY) {
      // Combina o contexto com o prompt do sistema
      const systemPrompt = context || entendimentoInfo;
      const fullPrompt = `${systemPrompt}\n\nQuestão: ${questaoAtual}\n\nAluno: ${message}\n\nAssistente:`;
      
      // main.js - LINHA 131 (CORREÇÃO)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Erro da API:", errorData);
        throw new Error(`API retornou status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        text = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Resposta da API em formato inesperado");
      }
    }
    
    hideTyping(); 
    addMessage(text); 
    return text; 
  } catch (error) { 
    console.error("Erro completo:", error); 
    hideTyping(); 
    addMessage("Erro ao consultar a API: " + error.message, false, true); 
    return ""; 
  } 
} 

// Função auxiliar para detectar dúvidas
function isDuvida(msg) {
  return /não sei|nao sei|não entendi|nao entendi|como faço|como faz|tenho dúvida|tenho duvida/i.test(msg);
}

// Função auxiliar para detectar pedidos de exemplo
function isExemplo(msg) {
  return /me dê um exemplo|me da um exemplo|mostra um exemplo|exemplo/i.test(msg);
}

// ---------------------- Fluxo ----------------------

async function sendMessage() { 
  const message = messageInput.value.trim(); 
  if (!message) return; 

  addMessage(message, true); 
  messageInput.value = ''; 

  // Caso inicial: aluno escolhe a questão 
  if (!questaoAtual) { 
    const numero = parseInt(message); 
    if (!isNaN(numero) && numero >= 2 && numero <= 42) { 
      questaoAtual = dadosPlanilha[numero - 1][0]; 
      addMessage(`Questão ${numero}: "${questaoAtual}"`); 
      addMessage("Vamos começar pela etapa de ENTENDIMENTO.\nQuais são as ENTRADAS (dados de entrada) que o programa receberá?"); 
      currentStep = "entendimento_input"; 
    } else { 
      addMessage("Digite o número da questão: 2 a 42.", false, true); 
    } 
    return; 
  } 

  // ---------------- ENTENDIMENTO ---------------- 
  // ---------------- ENTRADAS ---------------- 
  if (currentStep === "entendimento_input") { 
    const feedback = await sendToAPI(message, entendimentoInfo + "\nO estudante respondeu sobre as ENTRADAS. Valide se está completo."); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "entendimento_input_faltante"; 
    } else { 
      entradas = message; 
      currentStep = "entendimento_output"; 
      addMessage("Agora, quais serão as SAÍDAS (resultados) do programa?"); 
    } 
    return; 
  } 

  if (currentStep === "entendimento_input_faltante") { 
    hipoteseEntradas = message; 
    addMessage("Boa! Vamos continuar."); 
    currentStep = "entendimento_output"; 
    addMessage("Quais serão as SAÍDAS (resultados) do programa?"); 
    return; 
  } 

  // ---------------- SAÍDAS ---------------- 
  if (currentStep === "entendimento_output") { 
    const feedback = await sendToAPI(message, entendimentoInfo + "\nO aluno respondeu sobre as SAÍDAS. Valide se está completo."); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "entendimento_output_faltante"; 
    } else { 
      saidas = message; 
      currentStep = "entendimento_condicoes"; 
      addMessage("Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?"); 
    } 
    return; 
  } 

  if (currentStep === "entendimento_output_faltante") { 
    hipoteseSaidas = message; 
    addMessage("Boa! Vamos em frente."); 
    currentStep = "entendimento_condicoes"; 
    addMessage("Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?"); 
    return; 
  } 

  // ---------------- RESTRIÇÕES ---------------- 
  if (currentStep === "entendimento_condicoes") { 
    const feedback = await sendToAPI(message, entendimentoInfo + "\nO aluno respondeu sobre as RESTRIÇÕES. Valide se está completo."); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "entendimento_condicoes_faltante"; 
    } else { 
      restricoes = message; 
      currentStep = "desenvolvimento"; 
      addMessage("Muito bem! Agora vamos para a etapa de DESENVOLVIMENTO.\nComo você resolveria este problema passo a passo?"); 
    } 
    return; 
  } 

  if (currentStep === "entendimento_condicoes_faltante") { 
    hipoteseRestricoes = message; 
    addMessage("Isso mesmo, você está pegando o jeito."); 
    currentStep = "desenvolvimento"; 
    addMessage("Vamos para a etapa de DESENVOLVIMENTO. Como você resolveria este problema passo a passo?"); 
    return; 
  } 

  // ---------------- DESENVOLVIMENTO ---------------- 
  if (currentStep === "desenvolvimento") { 
    await sendToAPI(message, entendimentoInfo + "\nAnalise este plano de resolução. Se estiver bom, elogie o estudante."); 
    currentStep = "codificacao_variaveis"; 
    addMessage("Legal! Finalizamos a etapa de ENTENDIMENTO."); 
    addMessage("Agora vamos para a etapa de CODIFICAÇÃO.\nComo você declararia as variáveis de entrada?"); 
    return; 
  } 

  // ---------------- CODIFICAÇÃO ---------------- 
  // ---------------- ENTRADA ---------------- 
  if (currentStep === "codificacao_variaveis") { 
    if (isDuvida(message)) {
      duvidas.variaveis++;
      estavaEmDuvida.variaveis = true;

      let contexto;
      if (duvidas.variaveis === 1) {
        contexto = codificacaoInfo + "\nO aluno demonstrou dúvida sobre declarar variáveis. Explique passo a passo e dê um exemplo CURTO, só de variáveis.";
      } else if (duvidas.variaveis === 2) {
        contexto = codificacaoInfo + "\nO aluno ainda tem dúvida sobre declarar variáveis. Use uma analogia simples (ex: 'caixa') e mostre um exemplo comentado, só de variáveis.";
      } else {
        contexto = codificacaoInfo + "\nO aluno continua com dificuldade sobre variáveis. Mostre um exemplo resolvido com 2-3 variáveis e comentários, mas sem processamento ou saída.";
      }

      await sendToAPI(message, contexto);
      return;
    }

    if (isExemplo(message)) {
      await sendToAPI(
        message,
        codificacaoInfo + "\nMostre apenas um exemplo simples de declaração de variáveis, sem incluir processamento nem saída."
      );
      return;
    }

    if (estavaEmDuvida.variaveis) {
      addMessage("Muito bom! Você conseguiu tirar a sua dúvida 👏");
      duvidas.variaveis = 0;
      estavaEmDuvida.variaveis = false;
    }

    await sendToAPI(
      message,
      codificacaoInfo + "\nO aluno declarou as variáveis. Valide e peça o PROCESSAMENTO do programa."
    ); 
    currentStep = "codificacao_processamento"; 
    return; 
  } 

  // ---------------- PROCESSAMENTO ----------------
  if (currentStep === "codificacao_processamento") { 
    if (isDuvida(message)) {
      duvidas.processamento++;
      estavaEmDuvida.processamento = true;

      let contexto;
      if (duvidas.processamento === 1) {
        contexto = codificacaoInfo + "\nO aluno demonstrou dúvida sobre o processamento. Explique passo a passo e dê um exemplo curto só do cálculo.";
      } else if (duvidas.processamento === 2) {
        contexto = codificacaoInfo + "\nO aluno ainda tem dúvida sobre o processamento. Quebre em subpassos e mostre exemplos curtos de cálculo.";
      } else {
        contexto = codificacaoInfo + "\nO aluno continua com dificuldade. Mostre um exemplo completo de processamento com comentários, mas sem a parte de saída.";
      }

      await sendToAPI(message, contexto);
      return;
    }

    if (isExemplo(message)) {
      await sendToAPI(
        message,
        codificacaoInfo + "\nMostre apenas um exemplo simples de processamento (cálculo), sem variáveis novas e sem saída."
      );
      return;
    }

    if (estavaEmDuvida.processamento) {
      addMessage("Bom trabalho! Você avançou após a dúvida! 👏");
      duvidas.processamento = 0;
      estavaEmDuvida.processamento = false;
    }

    await sendToAPI(
      message,
      codificacaoInfo + "\nO aluno escreveu o processamento. Valide e peça a SAÍDA do programa."
    ); 
    currentStep = "codificacao_saida"; 
    return; 
  } 

  // ---------------- SAÍDA ----------------
  if (currentStep === "codificacao_saida") { 
    if (isDuvida(message)) {
      duvidas.saida++;
      estavaEmDuvida.saida = true;

      let contexto;
      if (duvidas.saida === 1) {
        contexto = codificacaoInfo + "\nO aluno demonstrou dúvida sobre saída. Explique formas comuns (print/console/HTML) e mostre exemplo curto só da saída.";
      } else if (duvidas.saida === 2) {
        contexto = codificacaoInfo + "\nO aluno ainda tem dúvida sobre saída. Mostre como formatar resultados (ex: 2 casas decimais) e dê exemplo comentado só de saída.";
      } else {
        contexto = codificacaoInfo + "\nO aluno continua com dificuldade na saída. Mostre um exemplo completo de entrada→processamento→saída, mas só ofereça o código final se ele pedir explicitamente.";
      }

      await sendToAPI(message, contexto);
      return;
    }

    if (isExemplo(message)) {
      await sendToAPI(
        message,
        codificacaoInfo + "\nMostre apenas um exemplo simples de saída (printar um valor), sem incluir todo o programa."
      );
      return;
    }

    if (estavaEmDuvida.saida) {
      addMessage("Excelente! Parabéns 🎉");
      duvidas.saida = 0;
      estavaEmDuvida.saida = false;
    }

    await sendToAPI(
      message,
      codificacaoInfo + "\nO aluno sugeriu a saída do programa. Elogie o estudante pela conclusão."
    ); 
    currentStep = null; 
    questaoAtual = "";
    addMessage("🎉 Muito bem! Você completou todas as etapas: ENTENDIMENTO e CODIFICAÇÃO."); 
    addMessage("Digite o número de outra questão (2 a 42) para continuar praticando!"); 
    return; 
  } 

  // ---------------- FALLBACK ----------------
  await sendToAPI(message, "Responda de forma educada e útil.");
} 

// ---------------------- Eventos ---------------------- 
chatBtn.addEventListener('click', toggleChat); 
closeBtn.addEventListener('click', toggleChat); 
sendBtn.addEventListener('click', sendMessage); 

messageInput.addEventListener('keypress', (e) => { 
  if (e.key === 'Enter' && !e.shiftKey) { 
    e.preventDefault(); 
    sendMessage(); 
  } 
}); 

// ---------------------- Inicialização ---------------------- 
async function initAPI() {
    if (!API_KEY) {
        console.warn("Nenhuma chave da API definida. Usando modo simulado.");
        addMessage("⚠️ Nenhuma chave configurada. O assistente está em modo simulado.");
    } else {
        console.log("Chave API configurada. Pronto para usar!");
        addMessage("✅ Conexão com a API estabelecida com sucesso!");
    }

    // carregamento da planilha
    try {
        dadosPlanilha = await lerCSV(URL_CSV);
        console.log("Planilha carregada:", dadosPlanilha.length, "linhas.");
        addMessage("Olá! Digite o número da questão que você quer ajuda (2 a 42).");
    } catch (error) {
        console.error("Erro ao carregar planilha:", error);
        addMessage("❌ Não foi possível carregar os dados da planilha.", false, true);
    }
}

initAPI();