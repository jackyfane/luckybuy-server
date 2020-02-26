const assert = require('assert');
const request = require('supertest');

describe('POST /User', function () {

  //We will place our tests cases here

  it('should user login success', function () {
    request('http://127.0.0.1:3000')
        .post('/controller/user/login')
        .send({
          user_name: 'zhangxueyo',
          weixin_name: 'Mr.Zhang',
          create_time: new Date()
        })
        .set('Accept', 'application/json')
        .expect(200)
        .end(function (err, res) {
          if (err) {
            console.log(err);
          } else {
            console.log('OK');
          }
        });
  });
});