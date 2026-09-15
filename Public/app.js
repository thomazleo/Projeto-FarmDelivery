// ==========================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================================
let carrinho = [];
let usuarioLogado = null;
let todosProdutos = [];
let codigoRecuperacaoSimulado = null;
let emailEmRecuperacao = null;

// Catálogo fallback pré-carregado (caso ocorra erro no fetch da API)
const CATALOGO_PADRAO = [
  { id: 1, nome: 'Dipirona Monoidratada 500mg', principio_ativo: 'Dipirona Monoidratada', preco: 8.50, exige_receita: false, is_controlado: false },
  { id: 2, nome: 'Paracetamol 750mg', principio_ativo: 'Paracetamol', preco: 12.00, exige_receita: false, is_controlado: false },
  { id: 3, nome: 'Ibuprofeno 600mg', principio_ativo: 'Ibuprofeno', preco: 18.90, exige_receita: false, is_controlado: false },
  { id: 4, nome: 'Amoxicilina 500mg', principio_ativo: 'Amoxicilina Tri-hidratada', preco: 32.90, exige_receita: true, is_controlado: false },
  { id: 5, nome: 'Azitromicina 500mg', principio_ativo: 'Azitromicina di-hidratada', preco: 29.50, exige_receita: true, is_controlado: false },
  { id: 6, nome: 'Cefalexina 500mg', principio_ativo: 'Cefalexina Monoidratada', preco: 38.00, exige_receita: true, is_controlado: false },
  { id: 7, nome: 'Rivotril 2mg', principio_ativo: 'Clonazepam', preco: 24.50, exige_receita: true, is_controlado: true },
  { id: 8, nome: 'Roacutan 20mg', principio_ativo: 'Isotretinoína', preco: 145.00, exige_receita: true, is_controlado: true },
  { id: 9, nome: 'Zolpidem 10mg', principio_ativo: 'Hemitartarato de Zolpidem', preco: 42.00, exige_receita: true, is_controlado: true },
  { id: 10, nome: 'Dorflex 36 Comprimidos', principio_ativo: 'Dipirona + Orfenadrina', preco: 21.90, exige_receita: false, is_controlado: false },
  { id: 11, nome: 'Omeprazol 20mg', principio_ativo: 'Omeprazol', preco: 15.30, exige_receita: false, is_controlado: false },
  { id: 12, nome: 'Sertralina 50mg', principio_ativo: 'Cloridrato de Sertralina', preco: 36.40, exige_receita: true, is_controlado: true }
];

// Inicialização das funções assim que o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  buscarProdutos();
  verificarSessaoSalva();

  // Permite acionar buscas e envio de mensagens pressionando Enter
  document.getElementById('inputBusca').addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarProdutos(); });
  document.getElementById('inputChat').addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemChat(); });
});

// ==========================================================
// MÁSCARAS E VALIDAÇÕES DE FORMULÁRIO (UX & REGEX)
// ==========================================================
function validarCampoBlur(input) {
  const formGroup = input.closest('.form-group');
  if (!formGroup) return;

  const msgErro = formGroup.querySelector('.erro-campo');

  if (input.hasAttribute('required') && !input.value.trim()) {
    input.classList.add('input-invalido');
    if (msgErro) msgErro.classList.remove('hidden');
  } else {
    input.classList.remove('input-invalido');
    if (msgErro) msgErro.classList.add('hidden');
  }
}

// Verifica no localStorage se o CPF já está cadastrado em tempo de digitação
function checarCpfExistenteLocal(cpfFormatado) {
  const msgErroCpf = document.getElementById('msgErroCpfExistente');
  if (!cpfFormatado || cpfFormatado.length < 14) {
    if (msgErroCpf) msgErroCpf.classList.add('hidden');
    return;
  }

  const usersLocais = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const jaExiste = usersLocais.some(u => u.cpf === cpfFormatado);

  if (jaExiste) {
    msgErroCpf.classList.remove('hidden');
  } else {
    msgErroCpf.classList.add('hidden');
  }
}

function mascaraCPF(input) {
  let v = input.value.replace(/\D/g, "");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  input.value = v;
}

function mascaraTelefone(input) {
  let v = input.value.replace(/\D/g, "");
  v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  input.value = v;
}

function mascaraCEP(input) {
  let v = input.value.replace(/\D/g, "");
  v = v.replace(/^(\d{5})(\d)/, "$1-$2");
  input.value = v;
}

// Integração com a API pública do ViaCEP
async function buscarEnderecoPorCEP(cepRaw, inputRuaId, inputCidadeId, inputEstadoId, inputProximoId) {
  const cep = cepRaw.replace(/\D/g, "");
  if (cep.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (!data.erro) {
      document.getElementById(inputRuaId).value = data.logradouro;
      document.getElementById(inputCidadeId).value = data.localidade;
      document.getElementById(inputEstadoId).value = data.uf;
      if (inputProximoId) document.getElementById(inputProximoId).focus();
    }
  } catch (e) {
    console.error("Erro ao buscar CEP:", e);
  }
}

function validarSenhas() {
  const senha = document.getElementById('cadSenha').value;
  const confirma = document.getElementById('cadSenhaConfirma').value;
  const msgErro = document.getElementById('msgErroSenha');

  if (confirma.length > 0 && senha !== confirma) {
    msgErro.classList.remove('hidden');
  } else {
    msgErro.classList.add('hidden');
  }
}

// ==========================================================
// GERENCIAMENTO DE SESSÃO E AUTENTICAÇÃO
// ==========================================================
function verificarSessaoSalva() {
  const userSalvo = localStorage.getItem('farmdelivery_user');
  if (userSalvo) {
    try {
      usuarioLogado = JSON.parse(userSalvo);
      document.getElementById('btnEntrar').classList.add('hidden');
      document.getElementById('userDropdown').classList.remove('hidden');
      document.getElementById('lblNomeUsuario').innerText = `${usuarioLogado.nome} ${usuarioLogado.sobrenome}`;
    } catch (e) {
      localStorage.removeItem('farmdelivery_user');
    }
  }
}

function salvarSessao(user) {
  usuarioLogado = user;
  localStorage.setItem('farmdelivery_user', JSON.stringify(user));

  const todos = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const idx = todos.findIndex(u => u.cpf === user.cpf || u.email === user.email);
  if (idx !== -1) todos[idx] = user;
  else todos.push(user);
  localStorage.setItem('farmdelivery_todos_usuarios', JSON.stringify(todos));
}

function exibirToast(mensagem) {
  const toast = document.getElementById('toastNotification');
  document.getElementById('toastMessage').innerText = mensagem;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// NAVEGAÇÃO ENTRE AS PÁGINAS (SPA - Single Page Application)
function navegarPara(pagina) {
  document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
  document.getElementById('menuPerfil').classList.add('hidden');

  if (pagina === 'home') {
    document.getElementById('pageHome').classList.remove('hidden');
  } else if (pagina === 'dados') {
    if (!usuarioLogado) return abrirModalAuth();
    carregarTelaDados();
    document.getElementById('pageDados').classList.remove('hidden');
  } else if (pagina === 'pedidos') {
    if (!usuarioLogado) return abrirModalAuth();
    carregarTelaPedidos();
    document.getElementById('pagePedidos').classList.remove('hidden');
  } else if (pagina === 'checkout') {
    if (!usuarioLogado) return abrirModalAuth();
    carregarTelaCheckout();
    document.getElementById('pageCheckout').classList.remove('hidden');
  }
}

function abrirModalAuth() { 
  document.getElementById('modalAuthContent').classList.remove('modal-pequeno');
  document.getElementById('formLoginView').classList.remove('hidden');
  document.getElementById('formCadastroView').classList.add('hidden');
  document.getElementById('formEsqueciView').classList.add('hidden');
  document.getElementById('cadastroSucessoView').classList.add('hidden');
  document.getElementById('modalAuth').classList.remove('hidden'); 
}

function fecharModalAuth() { 
  document.getElementById('modalAuth').classList.add('hidden'); 
}

function alternarAuthForm(tipo) {
  document.getElementById('formLoginView').classList.add('hidden');
  document.getElementById('formCadastroView').classList.add('hidden');
  document.getElementById('formEsqueciView').classList.add('hidden');

  if (tipo === 'cadastro') {
    document.getElementById('formCadastroView').classList.remove('hidden');
  } else if (tipo === 'esqueci') {
    document.getElementById('formEsqueciView').classList.remove('hidden');
    document.getElementById('formRedefinirSenha').classList.add('hidden');
    document.getElementById('formEsqueciSenha').classList.remove('hidden');
  } else {
    document.getElementById('formLoginView').classList.remove('hidden');
  }
}

async function realizarCadastro(event) {
  event.preventDefault();

  const cpf = document.getElementById('cadCpf').value;
  const senha = document.getElementById('cadSenha').value;
  const senhaConfirma = document.getElementById('cadSenhaConfirma').value;

  if (senha !== senhaConfirma) {
    document.getElementById('msgErroSenha').classList.remove('hidden');
    return;
  }

  const todosUsuarios = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const cpfExiste = todosUsuarios.some(u => u.cpf === cpf);
  if (cpfExiste) {
    document.getElementById('msgErroCpfExistente').classList.remove('hidden');
    return;
  }

  const dados = {
    id: Date.now(),
    nome: document.getElementById('cadNome').value,
    sobrenome: document.getElementById('cadSobrenome').value,
    email: document.getElementById('cadEmail').value,
    senha: senha,
    cpf: cpf,
    telefone: document.getElementById('cadTelefone').value,
    cep: '', rua: '', numero: '', complemento: '', cidade: '', estado: ''
  };

  try {
    const res = await fetch('/api/cadastrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });

    if (res.ok) {
      const user = await res.json();
      loginSucesso(user, true);
    } else {
      loginSucesso(dados, true);
    }
  } catch (err) {
    loginSucesso(dados, true);
  }
}

async function realizarLogin(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const senha = document.getElementById('loginSenha').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (res.ok) {
      const user = await res.json();
      loginSucesso(user, false);
      return;
    }
  } catch (e) {
    // Fallback local
  }

  const todosUsuarios = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const achou = todosUsuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha);
  
  if (achou) {
    loginSucesso(achou, false);
  } else {
    exibirToast("E-mail ou senha incorretos.");
  }
}

function loginSucesso(user, foiCadastro) {
  salvarSessao(user);
  document.getElementById('btnEntrar').classList.add('hidden');
  document.getElementById('userDropdown').classList.remove('hidden');
  document.getElementById('lblNomeUsuario').innerText = `${user.nome} ${user.sobrenome}`;

  if (foiCadastro) {
    document.getElementById('formCadastroView').classList.add('hidden');
    document.getElementById('cadastroSucessoView').classList.remove('hidden');
    document.getElementById('modalAuthContent').classList.add('modal-pequeno');
  } else {
    fecharModalAuth();
  }
}

function solicitarCodigoRecuperacao(e) {
  e.preventDefault();
  const email = document.getElementById('recuperaEmail').value.trim();
  const todos = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const conta = todos.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!conta) {
    exibirToast("E-mail não encontrado no sistema.");
    return;
  }

  emailEmRecuperacao = email;
  codigoRecuperacaoSimulado = Math.floor(1000 + Math.random() * 9000).toString();

  exibirToast(`📧 [Simulação] Seu código de recuperação é: ${codigoRecuperacaoSimulado}`);

  document.getElementById('formEsqueciSenha').classList.add('hidden');
  document.getElementById('formRedefinirSenha').classList.remove('hidden');
}

function confirmarRedefinicaoSenha(e) {
  e.preventDefault();
  const codDigitado = document.getElementById('recuperaCodigo').value.trim();
  const novaSenha = document.getElementById('novaSenhaInput').value;

  if (codDigitado !== codigoRecuperacaoSimulado) {
    exibirToast("Código incorreto!");
    return;
  }

  const todos = JSON.parse(localStorage.getItem('farmdelivery_todos_usuarios') || '[]');
  const idx = todos.findIndex(u => u.email.toLowerCase() === emailEmRecuperacao.toLowerCase());

  if (idx !== -1) {
    todos[idx].senha = novaSenha;
    localStorage.setItem('farmdelivery_todos_usuarios', JSON.stringify(todos));
    if (usuarioLogado && usuarioLogado.email.toLowerCase() === emailEmRecuperacao.toLowerCase()) {
      usuarioLogado.senha = novaSenha;
      salvarSessao(usuarioLogado);
    }
  }

  exibirToast("Senha redefinida com sucesso! Faça login com a nova senha.");
  alternarAuthForm('login');
}

function fazerLogout() {
  usuarioLogado = null;
  localStorage.removeItem('farmdelivery_user');
  document.getElementById('userDropdown').classList.add('hidden');
  document.getElementById('btnEntrar').classList.remove('hidden');
  document.getElementById('menuPerfil').classList.add('hidden');
  navegarPara('home');
}

function toggleMenuPerfil() {
  document.getElementById('menuPerfil').classList.toggle('hidden');
}

// ==========================================================
// PREENCHIMENTO E ATUALIZAÇÃO DOS DADOS DO USUÁRIO
// ==========================================================
function carregarTelaDados() {
  document.getElementById('dadoNome').value = usuarioLogado.nome || '';
  document.getElementById('dadoSobrenome').value = usuarioLogado.sobrenome || '';
  document.getElementById('dadoEmail').value = usuarioLogado.email || '';
  document.getElementById('dadoTelefone').value = usuarioLogado.telefone || '';
  document.getElementById('dadoCpf').value = usuarioLogado.cpf || '';
  document.getElementById('dadoCep').value = usuarioLogado.cep || '';
  document.getElementById('dadoRua').value = usuarioLogado.rua || '';
  document.getElementById('dadoNumero').value = usuarioLogado.numero || '';
  document.getElementById('dadoComplemento').value = usuarioLogado.complemento || '';
  document.getElementById('dadoCidade').value = usuarioLogado.cidade || '';
  document.getElementById('dadoEstado').value = usuarioLogado.estado || '';

  carregarCartoesUsados();
}

async function salvarMeusDados(event) {
  event.preventDefault();

  usuarioLogado.nome = document.getElementById('dadoNome').value;
  usuarioLogado.sobrenome = document.getElementById('dadoSobrenome').value;
  usuarioLogado.email = document.getElementById('dadoEmail').value;
  usuarioLogado.telefone = document.getElementById('dadoTelefone').value;
  usuarioLogado.cpf = document.getElementById('dadoCpf').value;
  usuarioLogado.cep = document.getElementById('dadoCep').value;
  usuarioLogado.rua = document.getElementById('dadoRua').value;
  usuarioLogado.numero = document.getElementById('dadoNumero').value;
  usuarioLogado.complemento = document.getElementById('dadoComplemento').value;
  usuarioLogado.cidade = document.getElementById('dadoCidade').value;
  usuarioLogado.estado = document.getElementById('dadoEstado').value;

  salvarSessao(usuarioLogado);

  try {
    await fetch(`/api/usuarios/${usuarioLogado.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuarioLogado)
    });
  } catch (e) {
    console.warn("Salvamento em modo local.");
  }

  document.getElementById('lblNomeUsuario').innerText = `${usuarioLogado.nome} ${usuarioLogado.sobrenome}`;
  exibirToast("Alterações realizadas com sucesso!");
}

async function carregarCartoesUsados() {
  try {
    const res = await fetch(`/api/pedidos/${usuarioLogado.id}`);
    const pedidos = await res.json();
    const listaCartoes = document.getElementById('listaCartoes');
    
    const cartoes = [...new Set(pedidos.map(p => p.cartao_final).filter(Boolean))];
    
    if (cartoes.length === 0) {
      listaCartoes.innerHTML = '<li>Nenhum meio de pagamento registrado em compras.</li>';
    } else {
      listaCartoes.innerHTML = cartoes.map(c => `<li>💳 Cartão/Pagamento registrado final ${c}</li>`).join('');
    }
  } catch (e) {
    const pedidosLocais = JSON.parse(localStorage.getItem(`pedidos_${usuarioLogado.id}`) || '[]');
    const cartoes = [...new Set(pedidosLocais.map(p => p.cartao_final).filter(Boolean))];
    const listaCartoes = document.getElementById('listaCartoes');
    if (cartoes.length === 0) {
      listaCartoes.innerHTML = '<li>Nenhum meio de pagamento registrado em compras.</li>';
    } else {
      listaCartoes.innerHTML = cartoes.map(c => `<li>💳 Cartão/Pagamento registrado final ${c}</li>`).join('');
    }
  }
}

async function carregarTelaPedidos() {
  const container = document.getElementById('listaHistoricoPedidos');
  let pedidos = [];

  try {
    const res = await fetch(`/api/pedidos/${usuarioLogado.id}`);
    pedidos = await res.json();
  } catch (e) {
    pedidos = JSON.parse(localStorage.getItem(`pedidos_${usuarioLogado.id}`) || '[]');
  }
  
  if (!pedidos || pedidos.length === 0) {
    container.innerHTML = '<p>Você ainda não realizou nenhum pedido.</p>';
  } else {
    container.innerHTML = pedidos.map(p => `
      <div class="pedido-card">
        <div class="pedido-card-info">
          <strong>Pedido #${p.id}</strong> - <small>${p.data}</small><br>
          <span>Total: R$ ${p.total.toFixed(2)}</span> | 
          <small>Pagamento final: ${p.cartao_final || 'PIX/Cartão'}</small>
        </div>
        <span class="status-badge-concluido">Concluído</span>
      </div>
    `).join('');
  }
}

// ==========================================================
// CATÁLOGO DE MEDICAMENTOS E FILTROS DINÂMICOS
// ==========================================================
async function buscarProdutos() {
  const termo = document.getElementById('inputBusca').value.toLowerCase().trim();
  try {
    const response = await fetch(`/api/produtos?busca=${encodeURIComponent(termo)}`);
    if (response.ok) {
      todosProdutos = await response.json();
    } else {
      todosProdutos = CATALOGO_PADRAO;
    }
  } catch (e) {
    todosProdutos = CATALOGO_PADRAO;
  }

  if (termo) {
    todosProdutos = todosProdutos.filter(p => 
      p.nome.toLowerCase().includes(termo) || p.principio_ativo.toLowerCase().includes(termo)
    );
  }

  // Gerencia a visibilidade do botão 'Voltar' da busca
  gerenciarBotaoVoltarBusca(termo);

  aplicarFiltrosCatalogo();
}

// Cria/exibe o botão "Voltar" quando houver uma pesquisa ativa
function gerenciarBotaoVoltarBusca(termo) {
  let btnVoltar = document.getElementById('btnVoltarBusca');
  
  if (termo !== '') {
    if (!btnVoltar) {
      btnVoltar = document.createElement('button');
      btnVoltar.id = 'btnVoltarBusca';
      btnVoltar.className = 'btn-voltar';
      btnVoltar.style.marginBottom = '15px';
      btnVoltar.style.cursor = 'pointer';
      btnVoltar.innerText = '← Voltar';
      btnVoltar.onclick = limparBusca;

      const secaoProdutos = document.getElementById('listaProdutos');
      if (secaoProdutos && secaoProdutos.parentNode) {
        secaoProdutos.parentNode.insertBefore(btnVoltar, secaoProdutos);
      }
    }
    btnVoltar.classList.remove('hidden');
    btnVoltar.style.display = 'inline-block';
  } else if (btnVoltar) {
    btnVoltar.classList.add('hidden');
    btnVoltar.style.display = 'none';
  }
}

// Funcao para limpar o campo de busca e recarregar o catálogo original
function limparBusca() {
  document.getElementById('inputBusca').value = '';
  buscarProdutos();
}

function aplicarFiltrosCatalogo() {
  const exigeReceita = document.getElementById('filterExigeReceita').checked;
  const apenasControlados = document.getElementById('filterControlado').checked;

  const filtrados = todosProdutos.filter(prod => {
    if (exigeReceita && !prod.exige_receita) return false;
    if (apenasControlados && !prod.is_controlado) return false;
    return true;
  });

  renderizarGridProdutos(filtrados);
}

function renderizarGridProdutos(produtos) {
  const container = document.getElementById('listaProdutos');
  container.innerHTML = '';

  if (produtos.length === 0) {
    container.innerHTML = '<p class="empty-msg">Nenhum medicamento encontrado para os filtros selecionados.</p>';
    return;
  }

  produtos.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'card-produto';
    
    let badgesHtml = '';
    if (prod.exige_receita) badgesHtml += `<span class="badge badge-receita">Exige Receita</span>`;
    if (prod.is_controlado) badgesHtml += `<span class="badge badge-controlado">Controlado</span>`;

    card.innerHTML = `
      <div>
        <h3>${prod.nome}</h3>
        <div class="badges-container">${badgesHtml}</div>
        <p>Composição: ${prod.principio_ativo}</p>
        <div class="preco">R$ ${prod.preco.toFixed(2)}</div>
      </div>
      <button class="btn-add-cart" onclick='adicionarAoCarrinho(${JSON.stringify(prod)})'>+ Adicionar</button>
    `;
    container.appendChild(card);
  });
}

// ==========================================================
// CARRINHO E PROCESSAMENTO DE CHECKOUT
// ==========================================================
function adicionarAoCarrinho(produto) {
  const itemExistente = carrinho.find(item => item.id === produto.id);
  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({ ...produto, quantidade: 1 });
  }
  atualizarCarrinho();
  exibirToast("Produto adicionado ao carrinho!");
}

function alterarQuantidade(id, delta) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;

  item.quantidade += delta;
  if (item.quantidade <= 0) {
    carrinho = carrinho.filter(i => i.id !== id);
  }
  atualizarCarrinho();
}

function removerDoCarrinho(id) {
  carrinho = carrinho.filter(item => item.id !== id);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const totalItens = carrinho.reduce((sum, item) => sum + item.quantidade, 0);
  document.getElementById('cartCount').innerText = totalItens;

  const container = document.getElementById('carrinhoItens');
  const areaReceita = document.getElementById('areaReceita');
  const cartTotal = document.getElementById('cartTotal');

  if (carrinho.length === 0) {
    container.innerHTML = '<p class="empty-msg">Seu carrinho está vazio.</p>';
    areaReceita.classList.add('hidden');
    cartTotal.innerText = 'R$ 0,00';
    return;
  }

  container.innerHTML = '';
  let subtotal = 0;
  let precisaReceita = false;

  carrinho.forEach((prod) => {
    subtotal += prod.preco * prod.quantidade;
    if (prod.exige_receita) precisaReceita = true;

    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <div class="cart-item-info">
        <strong>${prod.nome}</strong>
        <p>R$ ${(prod.preco * prod.quantidade).toFixed(2)}</p>
        <button class="btn-remover-small" onclick="removerDoCarrinho(${prod.id})">remover</button>
      </div>
      <div class="cart-item-controls">
        <button class="btn-qtd" onclick="alterarQuantidade(${prod.id}, -1)">-</button>
        <span class="qtd-num">${prod.quantidade}</span>
        <button class="btn-qtd" onclick="alterarQuantidade(${prod.id}, 1)">+</button>
      </div>
    `;
    container.appendChild(item);
  });

  cartTotal.innerText = `R$ ${subtotal.toFixed(2)}`;
  if (precisaReceita) areaReceita.classList.remove('hidden');
  else areaReceita.classList.add('hidden');
}

// Fecha o modal do carrinho quando o usuário clica no overlay (fora da janela)
function fecharCarrinhoAoClicarFora(event) {
  const modalCart = document.getElementById('modalCarrinho');
  if (event.target === modalCart) {
    toggleCarrinho();
  }
}

function toggleCarrinho() { 
  const modalCart = document.getElementById('modalCarrinho');
  modalCart.classList.toggle('hidden');
}

function irParaCheckout() {
  if (!usuarioLogado) {
    exibirToast("Faça login para continuar com a compra.");
    abrirModalAuth();
    return;
  }

  if (carrinho.length === 0) {
    exibirToast("Seu carrinho está vazio!");
    return;
  }

  const precisaReceita = carrinho.some(p => p.exige_receita);
  const fileInput = document.getElementById('inputFileReceita');
  if (precisaReceita && (!fileInput.files || fileInput.files.length === 0)) {
    exibirToast("Anexe a receita médica antes de prosseguir!");
    return;
  }

  toggleCarrinho();
  navegarPara('checkout');
}

function carregarTelaCheckout() {
  document.getElementById('selectEnderecoCheckout').value = 'principal';
  alternarOpcaoEnderecoCheckout('principal');

  const subtotal = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
  const totalFinal = subtotal + 10;

  document.getElementById('chkSubtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
  document.getElementById('chkTotal').innerText = `R$ ${totalFinal.toFixed(2)}`;
}

function alternarOpcaoEnderecoCheckout(opcao) {
  const boxPrincipal = document.getElementById('boxEnderecoPrincipal');
  const boxNovo = document.getElementById('boxNovoEnderecoCheckout');

  if (opcao === 'principal') {
    boxPrincipal.classList.remove('hidden');
    boxNovo.classList.add('hidden');

    const rua = usuarioLogado.rua || 'Rua não cadastrada';
    const num = usuarioLogado.numero || 'S/N';
    const cidade = usuarioLogado.cidade || '';
    const estado = usuarioLogado.estado || '';
    const cep = usuarioLogado.cep || '';

    document.getElementById('checkoutEnderecoResumo').innerText = `${rua}, ${num} - ${cidade}/${estado} (CEP: ${cep})`;
  } else {
    boxPrincipal.classList.add('hidden');
    boxNovo.classList.remove('hidden');
  }
}

function alternarFormaPagamento(forma) {
  if (forma === 'cartao') {
    document.getElementById('pagamentoCartaoBox').classList.remove('hidden');
    document.getElementById('pagamentoPixBox').classList.add('hidden');
  } else {
    document.getElementById('pagamentoCartaoBox').classList.add('hidden');
    document.getElementById('pagamentoPixBox').classList.remove('hidden');
  }
}

async function confirmarPedidoCheckout() {
  const opcaoEndereco = document.getElementById('selectEnderecoCheckout').value;
  
  if (opcaoEndereco === 'novo') {
    const novoRua = document.getElementById('chkNovoRua').value;
    const novoNum = document.getElementById('chkNovoNumero').value;
    if (!novoRua || !novoNum) {
      exibirToast("Preencha ao menos a rua e o número do novo endereço!");
      return;
    }
  }

  const forma = document.querySelector('input[name="formaPagamento"]:checked').value;
  let cartaoFinal = 'PIX';

  if (forma === 'cartao') {
    const numCartao = document.getElementById('chkCartaoNumero').value;
    cartaoFinal = numCartao ? numCartao.slice(-4) : '1234';
  }

  const subtotal = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
  const total = subtotal + 10;
  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const novoPedido = {
    id: Date.now().toString().slice(-4),
    usuario_id: usuarioLogado.id,
    total: total,
    cartao_final: cartaoFinal,
    data: dataHoje
  };

  try {
    await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoPedido)
    });
  } catch (e) {
    console.warn("Pedido simulado localmente.");
  }

  const pedidosSalvos = JSON.parse(localStorage.getItem(`pedidos_${usuarioLogado.id}`) || '[]');
  pedidosSalvos.unshift(novoPedido);
  localStorage.setItem(`pedidos_${usuarioLogado.id}`, JSON.stringify(pedidosSalvos));

  carrinho = [];
  atualizarCarrinho();
  exibirToast("Pedido realizado com sucesso!");
  navegarPara('pedidos');
}

// ==========================================================
// CHATBOT DO PATINHO (SUPORTE AO CLIENTE)
// ==========================================================
function toggleChat() {
  const chatBody = document.getElementById('chatBody');
  const btnTrigger = document.getElementById('btnChatTrigger');

  chatBody.classList.toggle('hidden');

  if (!chatBody.classList.contains('hidden')) {
    btnTrigger.classList.add('hidden');
  } else {
    btnTrigger.classList.remove('hidden');
  }
}

async function enviarMensagemChat() {
  const input = document.getElementById('inputChat');
  const texto = input.value.trim();
  if (!texto) return;

  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML += `<p class="user-msg"><b>Você:</b> ${texto}</p>`;
  input.value = '';
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const response = await fetch('/api/suporte/patinho', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensagem: texto })
    });
    const data = await response.json();
    chatMessages.innerHTML += `<p class="bot-msg"><b>Patinho:</b> ${data.resposta}</p>`;
  } catch (e) {
    chatMessages.innerHTML += `<p class="bot-msg"><b>Patinho:</b> Quack! Estou offline no momento.</p>`;
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}