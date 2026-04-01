async function carregar() {
  const res = await fetch('sample-data.json');
  const data = await res.json();
  const mural = document.getElementById('mural');
  mural.innerHTML = '';
  data.forEach(e => {
    mural.innerHTML += `<div class="card">
      <b>Para:</b> ${e.para}<br>
      <b>De:</b> ${e.de}<br>
      <p>${e.mensagem}</p>
    </div>`;
  });
}

function enviar() {
  alert('Simulação de envio');
}

carregar();
