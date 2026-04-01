const PALETAS = ["pastel-1", "pastel-2", "pastel-3", "pastel-4"];
const EMOJIS = ["✨", "💙", "🌟", "👏", "💜", "🤍"];

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tempoRelativo(valor) {
  if (!valor) return "recentemente";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "recentemente";

  const agora = new Date();
  const diffMs = agora - data;
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras > 1 ? "s" : ""}`;
  if (diffDias === 1) return "ontem";
  if (diffDias < 30) return `há ${diffDias} dias`;
  return data.toLocaleDateString("pt-BR");
}

function normalizarElogio(item, index) {
  return {
    de: item.de || item.enviadoPor || "Equipe",
    para: item.para || item.destinatario || "Colaborador(a)",
    mensagem: item.mensagem || "",
    tempo: item.tempo || tempoRelativo(item.dataElogio || item.data || item.createdAt),
    emoji: item.emoji || EMOJIS[index % EMOJIS.length],
    tonalidade: item.tonalidade || PALETAS[index % PALETAS.length]
  };
}

function montarCard(item) {
  return `
    <article class="card-elogiado ${escaparHtml(item.tonalidade)}">
      <div class="card-topo">
        <div class="card-topo-esquerda">
          <div class="card-emoji" aria-hidden="true">${escaparHtml(item.emoji)}</div>
          <div>
            <p class="card-legenda">Para</p>
            <h3 class="card-nome">${escaparHtml(item.para)}</h3>
          </div>
        </div>
        <div class="card-tempo">${escaparHtml(item.tempo)}</div>
      </div>

      <p class="card-mensagem">“${escaparHtml(item.mensagem)}”</p>

      <div class="card-rodape">
        <div class="card-remetente">
          <p>De</p>
          <strong>${escaparHtml(item.de)}</strong>
        </div>
        <div class="card-tag">Equipe PRIMETOUR</div>
      </div>
    </article>
  `;
}

function renderizarMural(lista) {
  const mural = document.getElementById("mural");
  if (!mural) return;

  if (!Array.isArray(lista) || lista.length === 0) {
    mural.innerHTML = '<div class="estado-vazio">Ainda não há elogios publicados. Seja a primeira pessoa a reconhecer alguém do time.</div>';
    return;
  }

  mural.innerHTML = lista.map((item, index) => montarCard(normalizarElogio(item, index))).join("");
}

async function carregarMock() {
  const resposta = await fetch("sample-data.json", { cache: "no-store" });
  if (!resposta.ok) throw new Error("Não foi possível carregar o mock.");
  return resposta.json();
}

async function carregarMural() {
  try {
    let dados = [];

    if (window.CONFIG?.usarMock || !window.CONFIG?.endpointLeitura) {
      dados = await carregarMock();
    } else {
      const resposta = await fetch(window.CONFIG.endpointLeitura, { method: "GET" });
      if (!resposta.ok) throw new Error("Falha ao carregar elogios.");
      dados = await resposta.json();
    }

    renderizarMural(dados);
  } catch (erro) {
    console.error(erro);
    renderizarMural([]);
  }
}

function definirStatus(texto = "", tipo = "") {
  const status = document.getElementById("statusMensagem");
  if (!status) return;
  status.textContent = texto;
  status.className = "status-mensagem" + (tipo ? ` ${tipo}` : "");
}

async function enviarElogio(evento) {
  evento.preventDefault();

  const formulario = document.getElementById("formElogio");
  const botao = document.getElementById("btnEnviar");

  const de = document.getElementById("de").value.trim();
  const para = document.getElementById("para").value.trim();
  const mensagem = document.getElementById("mensagem").value.trim();

  if (!de || !para || !mensagem) {
    definirStatus("Preencha todos os campos antes de publicar o elogio.", "error");
    return;
  }

  botao.disabled = true;
  definirStatus("Enviando elogio...", "");

  const payload = {
    de,
    para,
    mensagem,
    dataElogio: new Date().toISOString()
  };

  try {
    if (window.CONFIG?.usarMock || !window.CONFIG?.endpointEnvio) {
      definirStatus("Modo de demonstração: elogio simulado com sucesso.", "success");
      formulario.reset();
      await carregarMural();
    } else {
      const resposta = await fetch(window.CONFIG.endpointEnvio, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resposta.ok) throw new Error("Falha no envio.");

      definirStatus("Elogio publicado com sucesso.", "success");
      formulario.reset();
      await carregarMural();
    }
  } catch (erro) {
    console.error(erro);
    definirStatus("Não foi possível enviar agora. Tente novamente.", "error");
  } finally {
    botao.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const formulario = document.getElementById("formElogio");
  if (formulario) {
    formulario.addEventListener("submit", enviarElogio);
  }

  carregarMural();
});
