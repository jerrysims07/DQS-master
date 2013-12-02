var mongoose = require('mongoose');
var Daily = mongoose.model('Daily');
var moment = require('moment');
var _ = require('lodash');
var chunk = require('./chunk');

var chunks = new chunk;
initializeCategoryVectors();

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
		var year = parseInt(moment().format('YYYY'));
		var month = parseInt(moment().format('MM'));
		var day = parseInt(moment().format('DD'));
	}

	// check to see if there is a current log for today's date in the database
	// if not, create one and load it
	Daily.findOne({$and:[{	'date': {	"$gte": new Date(year, month-1, day), 
																		"$lt": new Date(year, month-1, day+1)}},
											{	'user': res.locals.user}]}, 
		function(err, daily){
			if(daily && daily.user)
			{
				console.log('yes.  daily = '+daily);
				console.log('...and daily.user = '+daily.user);
				res.send(daily);
			}
			else 
			{
				new Daily({date: new Date(year, month-1, day)}).save(function(err, daily, count){
					daily.user = res.locals.user;
					daily.save(function(err, daily){
						res.send(daily);
					})
				});
			}
		}
	);
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
				daily.journal.push(req.body.entry);
				daily.save(function(err, data){
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
			daily.score -= parseInt(req.body.points);
			daily.save(function(err, data){
			if(data)
				res.send(data);
		});								
	}); 							 
};

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  POST '/servings'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.servings = function(req, res){
	// res.send(req.query);
	if(req.query){
		var suggestion = {};
		var item = req.body;
		// define the vector and the total number of calories for this item.
		var targetItem = new Vector(parseInt(item.hits[0].fields.nf_calories), parseInt(item.hits[0].fields.nf_total_fat), parseInt(item.hits[0].fields.nf_total_carbohydrate), parseInt(item.hits[0].fields.nf_protein), parseInt(item.hits[0].fields.nf_dietary_fiber));
		console.log('target = '+targetItem.fatPercent+', '+targetItem.carbPercent+', '+targetItem.proteinPercent);
		console.log('types: '+typeof(targetItem.calories)+', '+typeof(targetItem.fatPercent));
		// test each food category's vector to see which one results in being closest to the point represented by
		// the item's vector and total calories 
		suggestion = getFoodCategorySuggestion(targetItem);
		var response = {};
		res.send(suggestion);
		// once you have got the best option, log that and repeat the process until the best option is actually the 
		// one you started with in the first place


		// send all of the relevant information to the user for confirmation or change
	}
}

//-------------------------------------------------------------------
//-------------------------------------------------------------------
//  PUT '/saveServings'
//-------------------------------------------------------------------
//-------------------------------------------------------------------
exports.saveServings = function(req, res){
	var date = req.body.date;
	var submission = req.body.submission;
	var dateArray = getSearchDate(date);	
	Daily.findOne({	'date': {	"$gte": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]), 
														"$lt": new Date('20'+dateArray[2], dateArray[0]-1, dateArray[1]+1)},
									'user': res.locals.user},  
									function(err, daily){
		// update each individual category
		for( var i=0; i<submission.length; i++)
		{
			daily[submission[i].label]+= parseInt(submission[i].servings);
		}
		// // calculate the daily score
		var dailyScore = calculateDailyScore(daily);
		daily.score = dailyScore;
		daily.journal.push(req.body.journal);
		daily.save(function(err, daily){
			res.send(daily);
		});
	});
};

function calculateDailyScore(daily)
{

}

function getFoodCategorySuggestion(target)
{	var targetPoint = [];
	var targetPoint = [target.calories * target.fatPercent, target.calories * target.carbPercent, target.calories * target.proteinPercent, target.calories * target.fiberPercent];

	// test each vector and get the distance between that point and the target
	var endPoints = [];
	var type;
	var chunkSize = 2.5;
	var originPoint = [0,0,0,0];
	var suggestion = {};
	suggestion.types = {};
	var i = 0;


	var testPoint = originPoint;
	assignCategoryChunks(chunkSize);
	suggestion.sum = 0;
	suggestion = generateSuggestion(targetPoint, suggestion, originPoint);
	// for each category, round any that are closer than 10% up or down and lock in

	for(var a in suggestion.types) console.log(a+': '+suggestion.types[a].toFixed(2));

	return suggestion;
}

function calculateDailyScore(daily)
{
	var dailyScore = 0;
	dailyScore += getCategoryScore('fruit', daily.fruit);
	dailyScore += getCategoryScore('vegetable', daily.vegetable);
	dailyScore += getCategoryScore('leanProtein', daily.leanProtein);
	dailyScore += getCategoryScore('wholeGrains', daily.wholeGrains);
	dailyScore += getCategoryScore('dairy', daily.dairy);
	dailyScore += getCategoryScore('nutsAndSeeds', daily.nutsAndSeeds);
	dailyScore += getCategoryScore('refinedGrains', daily.refinedGrains);
	dailyScore += getCategoryScore('sweets', daily.sweets);
	dailyScore += getCategoryScore('fattyProtein', daily.fattyProtein);
	dailyScore += getCategoryScore('friedFood', daily.friedFood);
	return dailyScore;
}

function getCategoryScore(cat, num)
{
	var returnTotal = 0;

	switch(cat)
	{
		case 'fruit':
		case 'vegetable':
			for (var i=1; i<=num; i++)
			{
				switch(i){
					case 1:
					case 2:
					case 3:
						returnTotal+=2;
						break;
					case 4:
						returnTotal++;
					default:
						break;
				}
			}
			break;
		case 'leanProtein':
		case 'wholeGrains':
		case 'nutsAndSeeds':
			for (var i=1; i<=num; i++)
			{
				switch(i){
					case 1:
					case 2:
						returnTotal+=2;
						break;
					case 3:
						returnTotal++;
					case 0:
					case 4:
					case 5:
						break;
					case 6:
						returnTotal--;
						break;
					default:
						returnTotal -= 2;
						break;
				}
			}
			break;
		case 'dairy':
			for (var i=1; i<=num; i++)
			{
				switch(i){
					case 1:
					case 2:
					case 3:
						returnTotal++;
						break;
					case 0:	
					case 4:
						break;
					case 5:
						returnTotal--;
					default:
						returnTotal -= 2;
						break;
				}
			}
			break;
		case 'refinedGrains':
		case 'fattyProtein':
			for (var i=1; i<=num; i++)
			{
				switch(i){
					case 0:
						break;
					case 1:
					case 2:
						returnTotal--;
						break;
					default:
						returnTotal -= 2;
						break;
				}
			}			
			break;
		case 'sweets':
		case 'friedFood':
			for (var i=1; i<=num; i++)
			{
				switch(i){
					case 0:
						break;
					default:
						returnTotal -= 2;
						break;
				}
			}			

	}
	return returnTotal;
}

function initializeCategoryVectors()
{
	chunks.leanProtein = 	new Vector( 110, 3.19,  4.43, 13.96, 1.36);
	chunks.fruit = 			new Vector(  70,  .09, 17.11,   .98, 2.76);
	chunks.vegetable = 		new Vector(  25,  .06,  5.51,  1.43, 1.74);
	chunks.nutsAndSeeds = 	new Vector( 100,10.05,  2.33,  1.53,  .98);
	chunks.wholeGrain = 	new Vector(  75,  .65, 16.32,  2.33, 2.14);
	chunks.dairy = 			new Vector(	100, 3.07,  7.4 , 10.48, 0   );
	chunks.refinedGrain = 	new Vector(	 75,  .65, 16.32,  2.33, 0   );
	chunks.sweets = 		new Vector( 170, 6.99, 24.65,  2.13, 0   );
	chunks.friedFood = 		new Vector( 200,10.33, 24.5 ,  2.25, 0   );
	chunks.fattyProtein = 	new Vector( 180,11   ,  4.95, 15.3 , 1.36);   	
}

function assignCategoryChunks(chunkSize)
{
	// for each category...
	for (var type in chunks)
	{
		// initialize the directional chunks (point at which they would land if traveling chunkSize calories)
		chunks[type].partial = 	chunkSize/chunks[type].calories;
		chunks[type].point25 = [chunkSize * chunks[type].fatPercent, 
								chunkSize * chunks[type].carbPercent, 
								chunkSize * chunks[type].proteinPercent,
								chunkSize * chunks[type].fiberPercent];
	}
}

function generateSuggestion(targetPoint, suggestion, origin)
{
	// while the tempSuggestion does not equal 'origin'÷
	// assign the possible new points
	do
	{
		for (var type in chunks)
		{
			chunks[type].newPoint = [];
			chunks[type].distance = 0;
			chunks[type].newPoint = [	origin[0]+chunks[type].point25[0], origin[1]+chunks[type].point25[1], 
										origin[2]+chunks[type].point25[2], origin[3]+chunks[type].point25[3]	];
			chunks[type].distance = Math.sqrt	( Math.pow((targetPoint[0]-chunks[type].newPoint[0]), 2) 
												+ Math.pow((targetPoint[1]-chunks[type].newPoint[1]), 2) 
												+ Math.pow((targetPoint[2]-chunks[type].newPoint[2]), 2) 
												+ Math.pow((targetPoint[3]-chunks[type].newPoint[3]), 2));
		}	

		// set the standard shortest distance as the distance from the target point to the current "origin"
		var distanceFromOrigin = Math.sqrt(	  Math.pow((targetPoint[0]-origin[0]), 2) 
											+ Math.pow((targetPoint[1]-origin[1]), 2) 
											+ Math.pow((targetPoint[2]-origin[2]), 2)
											+ Math.pow((targetPoint[3]-origin[3]), 2)	);
		tempSuggestion = 'origin'
		var shortestDistance = distanceFromOrigin;

		// test each category's distance to target point against that shortest distance set above
		for (var type in chunks)
		{
			if(chunks[type].distance < shortestDistance){
				shortestDistance = chunks[type].distance;
				tempSuggestion = type;
			}
		}
		if(tempSuggestion != 'origin'){
			if(!suggestion.types[tempSuggestion])
				suggestion.types[tempSuggestion] = 0;	
			suggestion.types[tempSuggestion] += chunks[tempSuggestion].partial;
			origin = chunks[tempSuggestion].newPoint;
		}
	} while(tempSuggestion != 'origin');

	for(var b in suggestion.types) suggestion.sum += suggestion.types[b]*chunks[b].calories;
	return suggestion;
}

// The next two functions are not currently used in this application. They are integral to an algorithm
// that I was not able to perfect in time for presentation. I hope to come back to this algorithm and 
// tune it in so that the suggestion module is more effective.

// function cleanUpAndHoneSuggestion(suggestion)
// {
// 	var changeCount = 0;
	
// 	// find the ones that are close and round up
// 	for (var category in suggestion.types)
// 	{
// 			if(	Math.abs(Math.round(suggestion.types[category])-suggestion.types[category]) < .20 &&
// 					Math.round(suggestion.types[category])>suggestion.types[category]) 
// 			{
// 				changeCount ++;
// 				// round the item up
// 				suggestion.types[category] = Math.ceil(suggestion.types[category]);
// 			}
// 	}

// 	// If none of the categories got close enough to round up
// 	if(!changeCount)
// 	{
// 		// find the highest one and round it up
// 		var minDiff = .9999;
// 		var maxCat;
// 		for (var cat in suggestion.types)
// 		{
// 			if(	Math.ceil(suggestion.types[cat])-suggestion.types[cat] < minDiff && 
// 					Math.ceil(suggestion.types[cat] != suggestion.types[cat]))
// 			{
// 				minDiff = Math.ceil(suggestion.types[cat])-suggestion.types[cat];
// 				maxCat = cat;
// 			}
// 		}
// 		if(maxCat)
// 			suggestion.types[maxCat] = Math.ceil(suggestion.types[maxCat]);	
// 	}

// 	// Now that you have rounded up any that you needed to, round down every category
// 	for( var b in suggestion.types) 		
// 			suggestion.types[b] = Math.floor(suggestion.types[b]);
// 	// get the sum of the calories of the current suggestion of categories
// 	for (var category in suggestion.types){
// 			if(suggestion.types[category])
// 			{
// 				suggestion.sum += (chunks[category].calories*suggestion.types[category]);
// 			}
// 	}
// 	return suggestion;
// }

// function rebuildOrigin(suggestion)
// {
// 	var origin = [0,0,0,0];
// 	for (var cat in suggestion)
// 	{
// 		if(chunks[cat]){

// 			origin[0] += suggestion.types[cat] * (chunks[cat].calories * chunks[cat].fatPercent);
// 			origin[1] += suggestion.types[cat] * (chunks[cat].calories * chunks[cat].carbPercent);
// 			origin[2] += suggestion.types[cat] * (chunks[cat].calories * chunks[cat].proteinPercent);
// 			origin[3] += suggestion.types[cat] * (chunks[cat].calories * chunks[cat].fiberPercent);
// 		}
// 	}
// 	return origin;
// }

function getSearchDate(dateString)
{
	// parse date in req.body into format needed to query the database
	var dateArray = dateString.split('/');
	dateArray = _.map(dateArray, function(num){return parseInt(num)});
	return dateArray;
}

// This function will create a new instance of the object Vector. It takes the 4-D components of 
// any food category / point and the number of calories that are 'ideal' for a serving of that type of food
function Vector(totalCalories, fat, carbs, protein, fiber)
{
	this.calories = totalCalories;
	this.fat = fat;
	this.carbs = carbs;
	this.protein = protein;
	this.fiber = fiber;
	this.fatCalories=fat * 9;
	this.carbCalories=carbs * 4;
	this.proteinCalories=protein * 4;
	this.fatPercent = ((fat*9) / ((fat*9) + (carbs*4) + (protein*4)));
	this.carbPercent = (((carbs-fiber)*4) / ((fat*9) + (carbs*4) + (protein*4)));
	this.proteinPercent = ((protein*4) / ((fat*9) + (carbs*4) + (protein*4)));
	this.fiberPercent = ((fiber*4) / ((fat*9) + (carbs*4) + (protein*4)));
}