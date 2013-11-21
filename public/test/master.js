'use strict';

module('Integration Testing', {setup: setupTest, teardown: teardownTest});

function setupTest(){
  initialize(null, true);
}

function teardownTest(){
}

test('click on consumed button', function(){
  expect(3);

  $('#fruitServings > div:first-child > .servingButton:first-child').trigger('click');

  deepEqual($('#fruitServings > div > .servingButton:first-child').hasClass('consumed'), true, 'clicked button should have class, "consumed"');
  deepEqual(db.todaysTotal, 2, 'today\'s total should be 2');

  $('#fruitServings > div:first-child > .servingButton:first-child').trigger('click');

  deepEqual(db.todaysTotal, 2, 'today\'s total should still be  2');
});