const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios'); // Utilize axios para requisições HTTP
const { Op } = require('sequelize');
const { Product, PurchaseHistory } = require('./models');


const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoints para produtos (já existentes)
app.post('/api/products', async (req, res) => {
    try {
      const { title, price, image, description } = req.body;
      if (!title || !price || !image) {
        return res.status(400).json({ error: 'Título, preço e imagem são obrigatórios.' });
      }
      const product = await Product.create({ title, price, image, description });
      res.json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao criar produto.' });
    }
  });


// Endpoints para produtos (já existentes)
app.get('/api/products', async (req, res) => {
    try {
      const products = await Product.findAll({ order: [['orderIndex', 'ASC']] });
      res.json(products);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar produtos.' });
    }
  });
  
  
  
  app.put('/api/products/reorder', async (req, res) => {
    try {
      const { order } = req.body; // "order" é um array com os IDs na nova ordem
      if (!order || !Array.isArray(order)) {
        return res.status(400).json({ error: 'Array de ordem é obrigatório.' });
      }
      // Atualiza cada produto com a nova posição
      for (let i = 0; i < order.length; i++) {
        await Product.update({ orderIndex: i }, { where: { id: order[i] } });
      }
      res.json({ message: 'Ordem atualizada com sucesso.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao atualizar a ordem dos produtos.' });
    }
  });
  
  
  

// Endpoint para gerar QR Code de pagamento
app.post('/gerarqrcode', async (req, res) => {
  try {
    const { value, nome, telefone, productTitle, productDescription } = req.body;
    if (!value || !nome || !telefone) {
      return res.status(400).json({ error: "Os campos 'value', 'nome' e 'telefone' são obrigatórios." });
    }
    
    // Define os intervalos de tempo
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);           // 1 hora atrás
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);   // 30 dias atrás

    // Conta as tentativas dos últimos 1 hora e 30 dias para o telefone informado
    const attemptsLastHour = await PurchaseHistory.count({
      where: {
        telefone,
        dataTransacao: { [Op.gte]: oneHourAgo }
      }
    });
    
    const attemptsLastMonth = await PurchaseHistory.count({
      where: {
        telefone,
        dataTransacao: { [Op.gte]: oneMonthAgo }
      }
    });
    
    // Se houver 3 ou mais tentativas na última hora OU 5 ou mais no último mês, retorna erro
    if (attemptsLastHour >= 3 || attemptsLastMonth >= 5) {
      return res.status(429).json({ 
        error: 'você já tentou pagar muitas vezes, procure seu vendedor ou tente novamente depois de algumas horas'
      });
    }
    
    // Se não atingiu os limites, gera o QR code através da API externa
    const url = "https://api.pushinpay.com.br/api/pix/cashIn";
    const headers = {
      "Authorization": "Bearer 19791|u8GA1xGVUbQudFT1kGIUtJ0CVVmjjJsFggskj2ZXd717d62d",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    const payload = {
      value,
      webhook_url: "http://teste.com"
    };
    const response = await axios.post(url, payload, { headers });
    const data = response.data;
    
    const descricao = (productTitle && productDescription)
      ? `${productTitle} - ${productDescription} por R$${(value / 100).toFixed(2)}`
      : `Compra de ${nome} - Café (1kg) por R$${(value / 100).toFixed(2)}`;
    
    // Registra a tentativa no histórico com status "Gerado" e transactionId
    await PurchaseHistory.create({ nome, telefone, transactionId: data.id, status: 'Gerado' });
    
    const resultado = {
      id: data.id,
      qr_code: data.qr_code,
      qr_code_base64: data.qr_code_base64,
      descricao
    };
    console.log("QR Code gerado:", resultado);
    res.json(resultado);
  } catch (error) {
    console.error("Erro ao gerar QR code:", error.message);
    res.status(500).json({ error: "Erro ao gerar QR code" });
  }
});



 

// Endpoint para verificar o status do pagamento (permanece inalterado)
app.post('/verificastatus', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Transaction id not provided" });
    const url = `https://api.pushinpay.com.br/api/transactions/${id}`;
    const headers = {
      "Authorization": "Bearer 19791|u8GA1xGVUbQudFT1kGIUtJ0CVVmjjJsFggskj2ZXd717d62d",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    const response = await axios.get(url, { headers });
    const data = response.data;
    
    // Se o status da transação não for "created", consideramos que o pagamento foi concluído com sucesso.
    if (data.status && data.status.toLowerCase() !== 'created') {
      await PurchaseHistory.update(
        { status: 'Sucesso' },
        { where: { transactionId: data.id } }
      );
    }
    
    const result = {
      id: data.id,
      status: data.status
    };
    res.json(result);
  } catch (error) {
    console.error("Erro ao verificar status:", error.message);
    res.status(500).json({ error: "Erro ao verificar status" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});



// Endpoint para excluir um produto
app.delete('/api/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const rowsDeleted = await Product.destroy({ where: { id } });
      if (rowsDeleted === 0) {
        return res.status(404).json({ error: 'Produto não encontrado.' });
      }
      res.json({ message: 'Produto excluído com sucesso.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao excluir produto.' });
    }
  });


  app.get('/api/purchase-history', async (req, res) => {
    try {
      const { nome, telefone, mes, ano } = req.query;
      let where = {};
  
      if (nome) {
        where.nome = { [Op.like]: `%${nome}%` };
      }
      if (telefone) {
        where.telefone = telefone;
      }
      if (mes && ano) {
        const startDate = new Date(ano, mes - 1, 1);
        const endDate = new Date(ano, mes, 0, 23, 59, 59);
        where.dataTransacao = { [Op.between]: [startDate, endDate] };
      }
  
      const history = await PurchaseHistory.findAll({ where, order: [['dataTransacao', 'DESC']] });
      res.json(history);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
  });
  
  