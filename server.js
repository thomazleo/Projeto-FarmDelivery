const express = require('express');
const path = require('path'); // Importa o módulo nativo path
const app = express();

app.use(express.json());

// 1. Serve os arquivos estáticos da pasta 'Public' (com P maiúsculo)
app.use(express.static(path.join(__dirname, 'Public')));

// 2. Rota para a página principal (carrega o index.html da pasta Public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

const usuarios = [];
const pedidos = [];

// Catálogo expandido de produtos (12 itens)
const listaProdutos = [
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

// ROTA: Cadastrar Usuário
app.post('/api/cadastrar', (req, res) => {
  const { nome, sobrenome, email, senha, cpf, telefone } = req.body;

  if (!email || !senha || !nome || !cpf) {
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios.' });
  }

  const emailExiste = usuarios.find(u => u.email === email);
  if (emailExiste) {
    return res.status(400).json({ erro: 'E-mail já cadastrado.' });
  }

  const cpfExiste = usuarios.find(u => u.cpf === cpf);
  if (cpfExiste) {
    return res.status(400).json({ erro: 'CPF já vinculado a uma conta.' });
  }

  const novoUsuario = {
    id: Date.now(),
    nome,
    sobrenome,
    email,
    senha,
    cpf,
    telefone,
    cep: '', rua: '', numero: '', complemento: '', cidade: '', estado: ''
  };

  usuarios.push(novoUsuario);
  const { senha: _, ...userSemSenha } = novoUsuario;
  res.status(201).json(userSemSenha);
});

// ROTA: Atualizar Perfil do Usuário
app.put('/api/usuarios/:id', (req, res) => {
  const usuarioId = Number(req.params.id);
  const index = usuarios.findIndex(u => u.id === usuarioId);

  if (index !== -1) {
    usuarios[index] = { ...usuarios[index], ...req.body };
    const { senha: _, ...userSemSenha } = usuarios[index];
    return res.json(userSemSenha);
  }
  res.status(404).json({ erro: 'Usuário não encontrado.' });
});

// ROTA: Login
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const usuario = usuarios.find(u => u.email === email && u.senha === senha);

  if (!usuario) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  const { senha: _, ...userSemSenha } = usuario;
  res.json(userSemSenha);
});

// ROTA: Buscar Produtos
app.get('/api/produtos', (req, res) => {
  const termo = (req.query.busca || '').toLowerCase();
  
  const filtrados = listaProdutos.filter(p => 
    p.nome.toLowerCase().includes(termo) || p.principio_ativo.toLowerCase().includes(termo)
  );

  res.json(filtrados);
});

// ROTA: Criar Pedido
app.post('/api/pedidos', (req, res) => {
  const { usuario_id, total, cartao_final } = req.body;
  const novoPedido = {
    id: pedidos.length + 1,
    usuario_id,
    total,
    cartao_final,
    data: new Date().toLocaleDateString('pt-BR')
  };
  pedidos.push(novoPedido);
  res.status(201).json(novoPedido);
});

// ROTA: Histórico de Pedidos
app.get('/api/pedidos/:usuarioId', (req, res) => {
  const usuarioId = Number(req.params.usuarioId);
  const historico = pedidos.filter(p => p.usuario_id === usuarioId);
  res.json(historico);
});

// ROTA: Suporte Patinho
app.post('/api/suporte/patinho', (req, res) => {
  const { mensagem } = req.body;
  let resposta = "Quack! Não entendi muito bem, mas posso te ajudar com os medicamentos!";
  
  if (mensagem.toLowerCase().includes('entrega') || mensagem.toLowerCase().includes('prazo')) {
    resposta = "Quack! O prazo médio de entrega é de 30 a 60 minutos na sua região!";
  } else if (mensagem.toLowerCase().includes('receita')) {
    resposta = "Quack! Para remédios com tarja, lembre-se de anexar a foto da receita no carrinho!";
  }

  res.json({ resposta });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});