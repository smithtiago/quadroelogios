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
    de: item.de || item.enviadoPor || item.EnviadoPor || "Equipe",
    para: item.para || item.Title || item.Para || "Colaborador(a)",
    mensagem: item.mensagem || item.Mensagem || "",
    tempo: tempoRelativo(item.dataElogio || item.DataElogio || item.Created),
    emoji: item.emoji || EMOJIS[index % EMOJIS.length],
    tonalidade: item.tonalidade || PALETAS[index % PALETAS.length]
  };
}

function montarCard(item) {
  return `
    <article class="card-elogiado ${escaparHtml(item.tonalidade)}">
      <div class="card-topo">
        <div class="card-topo-esquerda">
          <div class="card-emoji">${escaparHtml(item.emoji)}</div>
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
    mural.innerHTML =
      '<div class="estado-vazio">Ainda não há elogios publicados.</div>';
    return;
  }

  mural.innerHTML = lista
    .map((item, index) => montarCard(normalizarElogio(item, index)))
    .join("");
}

async function carregarMock() {
  const resposta = await fetch("sample-data.json", { cache: "no-store" });
  if (!resposta.ok) throw new Error("Não foi possível carregar o mock.");
  return resposta.json();
}

async function carregarMural() {
  try {
    if (window.CONFIG?.endpointLeitura) {
      const resposta = await fetch(window.CONFIG.endpointLeitura, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*"
        },
        body: JSON.stringify({})
      });

      if (!resposta.ok) {
        const textoErro = await resposta.text();
        console.error("Erro HTTP leitura:", resposta.status, textoErro);
        throw new Error(`Erro na leitura: ${resposta.status}`);
      }

      const dados = await resposta.json();
      console.log("DADOS RECEBIDOS:", dados);
      renderizarMural(dados);
      return;
    }

    const dados = await carregarMock();
    renderizarMural(dados);
  } catch (erro) {
    console.error("Erro ao carregar mural:", erro);

    try {
      const mock = await carregarMock();
      renderizarMural(mock);
    } catch {
      renderizarMural([]);
    }
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
    definirStatus("Preencha todos os campos.", "error");
    return;
  }

  if (!window.CONFIG?.endpointEnvio) {
    definirStatus("Endpoint do Flow não configurado.", "error");
    return;
  }

  botao.disabled = true;
  definirStatus("Enviando...", "");

  try {
    const payload = {
      de: de,
      para: para,
      mensagem: mensagem
    };

    const resposta = await fetch(window.CONFIG.endpointEnvio, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*"
      },
      body: JSON.stringify(payload)
    });

    if (!resposta.ok) {
      const textoErro = await resposta.text();
      console.error("Erro HTTP envio:", resposta.status, textoErro);
      throw new Error(`Erro no envio: ${resposta.status}`);
    }

    definirStatus("Elogio enviado com sucesso!", "success");
    formulario.reset();

    await carregarMural();
  } catch (erro) {
    console.error("Erro no envio", erro);
    definirStatus("Erro ao enviar. Tente novamente.", "error");
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
