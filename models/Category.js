const {DataTypes} = require('sequelize');
const {commonMySQL, dateFormat} = require('../commons/mysql');

/**
 * 产品分类
 */
const Category = commonMySQL.define("category", {
  cat_id: {
    type: DataTypes.MEDIUMINT(8).UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  cat_name: DataTypes.STRING(80),
  cat_desc: DataTypes.STRING(255),
  created_time: {
    type: DataTypes.DATE,
    get: function (attribute) {
      // console.log(this);
      return dateFormat(this, attribute);
    }
  }
});


// Category.findAll(
//     // {
//     //     attributes: ['cat_name', [commonMySQL.fn('COUNT', commonMySQL.col('cat_name')), 'test']],
//     //     where: {
//     //         cat_name: '蔬菜'
//     //         // [Op.or]: [{authorId: 12}, {authorId: 13}]
//     //     },
//     //     group: ['cat_name', 'cat_desc'],
//     //     order: ['cat_name']
//     // }
// ).then(rows => {
//     console.log(JSON.stringify(rows));
// })
//     .catch(error => console.log(error));

module.exports = Category;