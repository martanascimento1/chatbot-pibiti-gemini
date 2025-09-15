const API_KEY = "KEY"; // <- cole sua chave aqui 

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

const planejamentoInfo = `
    Agora você está na etapa de PLANEJAMENTO, seguindo a metodologia de Polya.
    O aluno deve criar um pseudocódigo ou fluxograma para organizar o raciocínio.
    Sua função:
    1. Incentivar o aluno a escrever um passo a passo simples (pseudocódigo ou fluxograma textual).
    2. Se o aluno ainda não entender, sugira exemplos bem básicos para guiá-lo.
    3. Se o aluno demonstrar clareza (pseudocódigo consistente), confirme com "✅ Legal!" e direcione para o desenvolvimento.
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
      addMessage("Digite um número de questão válido (2 a 42).", false, true); 
    } 
    return; 
  } 

  // ---------------- ENTENDIMENTO ---------------- 

  // ---------------- ENTRADAS ---------------- 

  if (currentStep === "entendimento_input") { 
    const feedback = await sendToAPI(message, "O estudante respondeu sobre as ENTRADAS. Responda amigavelmente e incentive a pensar"); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "planejamento_condicional"; 
      addMessage("🤔 Vamos pensar mais um pouco... Para te ajudar, que tal criar um pseudocódigo ou fluxograma para o problema?");
    } else { 
      entradas = message; 
      currentStep = "entendimento_output"; 
      addMessage("Agora, quais serão as SAÍDAS (resultados) do programa?"); 
    } 
    return; 
  } 

  // ---------------- SAÍDAS ---------------- 

  if (currentStep === "entendimento_output") { 
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as SAÍDAS. Responda amigavelmente"); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "planejamento_condicional"; 
      addMessage("🤔 Vamos pensar mais um pouco... Para te ajudar, que tal criar um pseudocódigo ou fluxograma para o problema?");
    } else { 
      saidas = message; 
      currentStep = "entendimento_condicoes"; 
      addMessage("Existem RESTRIÇÕES ou CONDIÇÕES especiais a considerar?"); 
    } 
    return; 
  } 

  // ---------------- RESTRIÇÕES ---------------- 

  if (currentStep === "entendimento_condicoes") { 
    const feedback = await sendToAPI(message, "O aluno respondeu sobre as RESTRIÇÕES. Responda amigavelmente"); 
    
    if (feedback.startsWith("🤔")) { 
      currentStep = "planejamento_condicional"; 
      addMessage("🤔 Vamos pensar mais um pouco... Para te ajudar, que tal criar um pseudocódigo ou fluxograma para o problema?");
    } else { 
      restricoes = message; 
      currentStep = "desenvolvimento"; 
      addMessage("Muito bem! Agora vamos para a etapa de DESENVOLVIMENTO.\nComo você resolveria este problema passo a passo?"); 
    } 
    return; 
  }

  // ---------------- PLANEJAMENTO CONDICIONAL ----------------

  if (currentStep === "planejamento_condicional") {
  const feedback = await sendToAPI(message, planejamentoInfo);

  if (feedback.includes("✅")) {
    currentStep = "desenvolvimento";
    addMessage("Ótimo! Agora que você tem um plano, vamos para a etapa de DESENVOLVIMENTO.\nComo você resolveria este problema passo a passo?");
  } else {
    addMessage("Continue tentando escrever seu pseudocódigo ou fluxograma. Isso vai te ajudar a entender melhor o problema! 💡");
  }
  return;
}

  // ---------------- DESENVOLVIMENTO ---------------- 

  if (currentStep === "desenvolvimento") { 
    await sendToAPI(message, "Analise este plano de resolução. Se não precisar de melhoria, elogie o estudante e o instrua a iniciar a codificação."); 
    currentStep = "codificacao_variaveis"; 
    addMessage("Legal! Agora que você tem um plano de desenvolvimento, vamos para a etapa de CODIFICAÇÃO.\nComo você declararia as variáveis de entrada?"); 
    return; 
  }


// ---------------- CODIFICAÇÃO ---------------- 

// ---------------- ENTRADA E PROCESSAMENTO ---------------- 

  if (currentStep === "codificacao_variaveis") { 
    await sendToAPI(message, codificacaoInfo + "\nO aluno declarou o código das variáveis de entrada do programa. Se não precisar de melhoria pergunte sobre o processamento ou cálculo"); 
    currentStep = "codificacao_processamento"; 
    //addMessage("Boa! E como ficaria o processamento deste programa?"); 
    return; 
  } 

// ---------------- RESULTADO ----------------

  if (currentStep === "codificacao_processamento") { 
    await sendToAPI(message, codificacaoInfo + "\nO aluno escreveu o código do processamento do programa, ele já tinha te mandado o código da entrada. Se não precisar de melhoria pergunte sobre a saída do programa"); 
    currentStep = "codificacao_saida"; 
    //addMessage("Perfeito 👍 Agora, como você exibiria o resultado?"); 
    return; 
  } 

// ---------------- FINALIZAÇÃO ----------------

  if (currentStep === "codificacao_saida") { 
    await sendToAPI(message, codificacaoInfo + "\nO aluno sugeriu o código da saída do programa.Se não precisar de melhoria elogie o estudante"); 
    currentStep = null; 
    addMessage("🎉 Muito bem! Você completou todas as etapas: ENTENDIMENTO e CODIFICAÇÃO."); 
    return; 
  } 

  // fallback 
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
    addMessage("Digite o número da questão que você quer ajuda (2 a 42)."); 
  } catch (error) { 
    addMessage("Não consegui carregar o banco de questões.", false, true); 
  } 
} 

initAPI();
