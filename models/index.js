const { Sequelize, DataTypes } = require('sequelize');

// Configure a conexão conforme seu ambiente:
// Substitua 'meubanco', 'usuario' e 'senha' pelos valores reais.
const sequelize = new Sequelize('cinepremiumedit_banco', 'cinepremiumedit', 'T918bZ)_-HdUep42kM', {
  host: 'sao.domcloud.co',
  dialect: 'mysql'
});

const Product = require('./product')(sequelize, DataTypes);

// Sincroniza os modelos com o banco (em produção, prefira migrations)
sequelize.sync({alter: true})
.then(() => console.log('Banco sincronizado com sucesso'))
  .catch(err => console.error('Erro ao sincronizar o banco:', err));

module.exports = { sequelize, Product };
