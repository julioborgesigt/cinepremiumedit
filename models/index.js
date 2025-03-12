const { Sequelize, DataTypes } = require('sequelize');

// Configure a conexão conforme seu ambiente:
// Substitua 'meubanco', 'usuario' e 'senha' pelos valores reais.
const sequelize = new Sequelize('meubanco', 'usuario', 'senha', {
  host: 'localhost',
  dialect: 'mysql'
});

const Product = require('./product')(sequelize, DataTypes);

// Sincroniza os modelos com o banco (em produção, prefira migrations)
sequelize.sync();

module.exports = { sequelize, Product };
