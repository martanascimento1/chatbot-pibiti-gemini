const API_KEY = "AIzaSyBz38TxOhl41GV75onvF3_YbdHiEZQ4Y60"; // <- cole sua chave aqui 

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

let model = null; 
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
    if (model) { 
      const prompt = `${context}\nQuestão: ${questaoAtual}\nAluno: ${message}`; 
      const result = await model.generateContent(prompt); 
      text = result.response.text(); 
    } 
    hideTyping(); 
    addMessage(text); 
    return text; 
  } catch (error) { 
    console.error("Erro:", error); 
    hideTyping(); 
    addMessage("Erro ao consultar a API.", false, true); 
  } 
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
      addMessage("Digite o número da questão: .", false, true); 
    } 
    return; 
  } 

  // ---------------- ENTENDIMENTO ---------------- 

  // ---------------- ENTRADAS ---------------- 

  if (currentStep === "entendimento_input") { 
    const feedback = await sendToAPI(message, "O estudante respondeu sobre as ENTRADAS. Responda amigavelmente e incentive a pensar"); 
    
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
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as SAÍDAS. Responda amigavelmente"); 
    
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
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as RESTRIÇÕES. Responda amigavelmente"); 
    
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
    await sendToAPI(message, "Analise este plano de resolução se não precisar de melhoria, elogie o estudante."); 
    currentStep = "codificacao_variaveis"; 
    addMessage("Legal! Finalizamos a etapa de ENTENDIMENTO."); 
    addMessage("Agora vamos para a etapa de CODIFICAÇÃO.\ncomo você declararia as variáveis de entrada?"); 
    return; 
  } 


// ---------------- CODIFICAÇÃO ---------------- 

// Função auxiliar para detectar dúvidas
function isDuvida(msg) {
  return /não sei|nao sei|não entendi|nao entendi|como faço|como faz|tenho dúvida|tenho duvida/i.test(msg);
}

// Função auxiliar para detectar pedidos de exemplo
function isExemplo(msg) {
  return /me dê um exemplo|me da um exemplo|mostra um exemplo|exemplo/i.test(msg);
}

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
    return; // mantém na mesma etapa
  }

  if (isExemplo(message)) {
    await sendToAPI(
      message,
      codificacaoInfo + "\nMostre apenas um exemplo simples de declaração de variáveis, sem incluir processamento nem saída."
    );
    return; // mantém na mesma etapa
  }

  if (estavaEmDuvida.variaveis) {
    addMessage("Muito bom! Você conseguiu tirar a sua dúvida 👏");
    duvidas.variaveis = 0;
    estavaEmDuvida.variaveis = false;
  }

  await sendToAPI(
    message,
    codificacaoInfo + "\nO aluno declarou as variáveis. Agora peça o PROCESSAMENTO do programa."
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
    codificacaoInfo + "\nO aluno escreveu o processamento. Agora peça a SAÍDA do programa."
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
  addMessage("🎉 Muito bem! Você completou todas as etapas: ENTENDIMENTO e CODIFICAÇÃO."); 
  return; 
} 

// ---------------- FALLBACK ----------------
sendToAPI(message);
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
    console.warn("Nenhuma chave definida. Usando modo simulado."); 
  } else { 
    try { 
      const { GoogleGenerativeAI } = await import("https://esm.run/@google/generative-ai"); 
      const genAI = new GoogleGenerativeAI(API_KEY); 
      model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: entendimentoInfo }); 
      console.log("API carregada com sucesso."); 
    } catch (error) { 
      console.error("Erro ao carregar a API:", error); 
    } 
  } 

  try { 
    dadosPlanilha = await lerCSV(URL_CSV); 
    addMessage("Digite o número da questão:."); 
  } catch (error) { 
    addMessage("Não consegui carregar o banco de questões.", false, true); 
  } 
}

initAPI();
