const assert = require('assert');
const request = require('supertest');

describe('POST /category', function () {

  //We will place our tests cases here

  it('should create category success', function () {
    request('http://127.0.0.1:3000')
        .post('/controller/category/create')
        .send({
          cat_name: '蔬菜',
          cat_desc: "蔬菜类",
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

  // it('should update category success', function () {
  //     request('http://127.0.0.1:3000')
  //         .post('/category/update')
  //         .send({cat_id: 2, cat_name: '野生果', cat_desc: '山上采摘的野生食用果'})
  //         .set('Accept', 'application/json')
  //         .expect(200)
  //         .end(function (err, res) {
  //             if (err) return done(err);
  //             done();
  //         });
  // });

  // Delete action
  // it('should bulk delete category success', function () {
  //     request('http://127.0.0.1:3000')
  //         .post('/category/delete')
  //         .send([1, 2, 3, 4, 5])
  //         // .send({cat_id : 1, cat_name: '蔬菜'})
  //         .set('Accept', 'application/json')
  //         .expect(200)
  //         .end(function (err, res) {
  //             if (err) {
  //                 console.log(err);
  //             } else {
  //                 console.log('OK');
  //             }
  //         });
  // });

  // it('should delete category success', function () {
  //     request('http://127.0.0.1:3000')
  //         .get('/category/12/delete')
  //         .set('Accept', 'application/json')
  //         .expect(200)
  //         .end(function (err, res) {
  //             if (err) {
  //                 console.log(err);
  //             } else {
  //                 console.log('OK');
  //             }
  //         });
  // });

  // it('should find category success', function () {
  //     request('http://127.0.0.1:3000')
  //         .get('/controller/category/list?cat_name=蔬菜&cat_desc=蔬菜类')
  //         // .set('Accept', 'application/json')
  //         .expect(200)
  //         .end(function (err, res) {
  //             if (err) {
  //                 console.log(err);
  //             } else {
  //                 console.log('OK');
  //             }
  //         });
  // });


});