module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        // Valor em centavos (por exemplo, 100 para R$1,00)
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      image: {
        // Pode ser uma URL ou uma string em base64
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      }
    });
    return Product;
  };
  