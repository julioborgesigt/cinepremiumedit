const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Product } = require('./models');

const app = express();

// Configura o parser para JSON
app.use(bodyParser.json());

// Serve arquivos estáticos (como admin.html)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para criar um novo produto
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

// Endpoint para listar todos os produtos
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar produtos.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
