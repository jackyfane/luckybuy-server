const assert = require('assert');
const request = require('supertest');

describe('POST /Order', function () {

  //We will place our tests cases here

  it('should create spellhand success', function () {
    request('http://127.0.0.1:3000')
      .post('/controller/spellHand/create')
      .send({
        "goods_id": 2,
        "user_id": 1,
        "person_num": 12,
        "free_num": -1,
        "start_time": "2019-02-21 10:20:00",
        "end_time": "2019-02-21 11:20:00"
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