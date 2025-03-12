const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Product } = require('./models');
const axios = require('axios'); // Utilize axios para requisições HTTP

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
  
  
  

// Lógica simples de limitação por telefone:
// Variáveis de controle para limitar a geração de QR codes por telefone:
const qrCodeRequests = {};
const MAX_QR_PER_PHONE = 3; // Permite até 3 QR codes por período
const PERIOD_MS = 27 * 24 * 60 * 60 * 1000; // 27 dias em milissegundos (2332800000 ms)

// Endpoint para gerar QR Code de pagamento
app.post('/gerarqrcode', async (req, res) => {
    try {
      const { value, nome, telefone, productTitle, productDescription } = req.body;
      if (!value || !nome || !telefone) {
        return res.status(400).json({ error: "Os campos 'value', 'nome' e 'telefone' são obrigatórios." });
      }
      // Lógica de limitação por telefone...
      const now = Date.now();
      if (qrCodeRequests[telefone]) {
        const record = qrCodeRequests[telefone];
        if (now - record.timestamp < PERIOD_MS && record.count >= MAX_QR_PER_PHONE) {
          return res.status(429).json({ error: 'Limite de QR codes gerados para este telefone atingido. Tente novamente mais tarde.' });
        } else if (now - record.timestamp >= PERIOD_MS) {
          qrCodeRequests[telefone] = { timestamp: now, count: 0 };
        }
      } else {
        qrCodeRequests[telefone] = { timestamp: now, count: 0 };
      }
      qrCodeRequests[telefone].count += 1;
      
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
      // Se os dados do produto foram enviados, componha a descrição personalizada; caso contrário, use um padrão.
      const descricao = (productTitle && productDescription)
        ? `${productTitle} - ${productDescription} por R$${(value / 100).toFixed(2)}`
        : `Compra de ${nome} - Café (1kg) por R$${(value / 100).toFixed(2)}`;
  
      const resultado = {
        id: data.id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        descricao
      };
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