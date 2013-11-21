var mongoose = require('mongoose');
var Daily = mongoose.model('Daily');
var moment = require('moment');


exports.index = function(req, res){
  res.render('home/index', {title: 'Express'});
};

exports.search = function(req, res){
	res.send(req.body);
};

exports.getLog = function(req, res){

	// build today's date in format that Mongo expects
	var year = parseInt(moment().format('YYYY'));
	var month = parseInt(moment().format('MM'));
	var day = parseInt(moment().format('DD'));

	// check to see if there is a current log for today's date in the database
	// if not, create one and load it
	Daily.findOne({'date': {	"$gte": new Date(year, month-1, day), 
							"$lt": new Date(year, month-1, day+1)}}, 
		function(err, daily){
			if(daily)
			{
				console.log('yes.  daily = '+daily);
				res.send(daily);
			}
			else 
			{
				new Daily({date: new Date(year, month-1, day)}).save(function(err, daily,count){
					res.send(daily);
				});
			}
	});
};

exports.consume = function(req, res){
	// parse date in req.body into format needed to query the database
	dateArray = req.body.date.split('/');

	Daily.findOne({date: {	"$gte": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]), 
							"$lt": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]+1)}}, 
							function(err, daily){
		daily[req.body.type]++;
		daily.score += req.body.points;
		daily.save(function(err, data){
			res.send(data);
		});								
	}); 							 
};


//new Todo(req.body).save(function(err, todo, count){