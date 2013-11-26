var mongoose = require('mongoose');
var Daily = mongoose.model('Daily');
var moment = require('moment');
var _ = require('lodash');

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  GET '/'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.index = function(req, res){
  res.render('home/index', {title: 'Diet Quality Score'});
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  POST '/search'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.search = function(req, res){
	res.send(req.body);
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  PUT '/getLog'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.getLog = function(req, res){
	// build today's date in format that Mongo expects
	if(req.query.date)
	{
		date = req.query.date.split('/');
		var year = parseInt('20'+date[2]);
		var month = parseInt(date[0]);
		var day = parseInt(date[1]);
	}
	else
	{
		console.log('else');
		var year = parseInt(moment().format('YYYY'));
		var month = parseInt(moment().format('MM'));
		var day = parseInt(moment().format('DD'));
	}

console.log('local user is ... '+res.locals.user);

	// check to see if there is a current log for today's date in the database
	// if not, create one and load it
	Daily.findOne({$and:[{	'date': {	"$gte": new Date(year, month-1, day), 
																		"$lt": new Date(year, month-1, day+1)}},
											{	'user': res.locals.user}]}, 
		function(err, daily){
			if(daily)
			{
				console.log('yes.  daily = '+daily);
				console.log('...and daily.user = '+daily.user);
				res.send(daily);
			}
			else 
			{
console.log('ready to create anew');
				new Daily({date: new Date(year, month-1, day)}).save(function(err, daily, count){
					daily.user = res.locals.user;
					daily.save(function(err, daily){
						res.send(daily);
					})
				});
			}
	});
};


//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  PUT '/consume'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.consume = function(req, res){
	dateArray = getSearchDate(req.body.date);
	Daily.findOne({	'date': {	"$gte": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]), 
													"$lt": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]+1)},
									'user': res.locals.user},  
							function(err, daily){
		daily[req.body.type]++;
		daily.score += parseInt(req.body.points);
		daily.save(function(err, data){
			if(data)
				res.send(data);
		});								
	}); 							 
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  PUT '/addJournal'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.addJournal = function(req, res){
console.log(req.body);
	dateArray = getSearchDate(req.body.date);
	Daily.findOne({	'date': {	"$gte": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]), 
														"$lt": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]+1)},
									'user': res.locals.user}, 
		function(err, daily){
			if(daily){
	console.log(daily);
				daily.journal.push(req.body.entry);
				daily.save(function(err, data){
	console.log(daily);
				if(data)
					res.send(data);
				});
			}else{ console.log('error = '+err)}
	});
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  PUT '/unclick'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.unclick = function(req, res){
	dateArray = getSearchDate(req.body.date);
	Daily.findOne({	'date': {	"$gte": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]), 
														"$lt": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]+1)},
									'user': res.locals.user}, 
		function(err, daily){
			daily[req.body.type]--;
console.log(daily.score +' - '+req.body.points +' = ');
			daily.score -= parseInt(req.body.points);
console.log(daily.score);
			daily.save(function(err, data){
			if(data)
				res.send(data);
		});								
	}); 							 
};


function getSearchDate(dateString)
{
console.log('in getSearchDate');
	// parse date in req.body into format needed to query the database
	var dateArray = dateString.split('/');
	dateArray = _.map(dateArray, function(num){return parseInt(num)});
	return dateArray;
}
