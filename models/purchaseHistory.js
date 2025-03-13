module.exports = (sequelize, DataTypes) => {
  const PurchaseHistory = sequelize.define('PurchaseHistory', {
    nome: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telefone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dataTransacao: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    }
  }, {
    tableName: 'purchase_histories',
    timestamps: false
  });
  return PurchaseHistory;
};
