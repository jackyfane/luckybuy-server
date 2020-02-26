const assert = require('assert');
const request = require('supertest');

describe('POST /Order', function () {

  //We will place our tests cases here

  it('should create order success', function () {
    request('http://nearhelper2.onefrt.com:3000')
    // request('http://localhost:3000')
        .post('/controller/order/create')
        .send({
          hand_id: '41',
          goods_id: 1,
          user_id: 1,
          addr_id: 8,
          goods_num: 1
        })
        .set('Accept', 'application/json')
        .expect(200)
        .end(function (err, res) {
          console.log(res.text);
          if (err) {
            console.log(err);
          } else {
            console.log('OK');
          }
        });
  });
});