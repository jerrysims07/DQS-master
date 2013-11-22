'use strict';

// // Firebase Schema
// var Δdb;

// Local Schema (defined in keys.js)

var db = {};

$(document).ready(initialize);

function initialize(fn, flag){
  if(!canRun(flag)) {return;}

  db.todaysTotal = 0;
  $(document).foundation();

  // go to database and check for any activity so far today and update view accordingly
  var today = moment().format('MM[/]DD[/]YY')  
  $('#logDate span').text(today);
  initializeLogDisplay(today);

  // click-handlers
  $('.servingButton').click(clickServingButton);
  $('#searchButton').on('click', clickSearchButton);
  $('#prev').on('click', clickPrev);
  $('#next').on('click', clickNext);
  $('#addToJournal').on('click', clickAddToJournal)

  // highlight specific search results on hover.
  $('#actualResults').on('mouseenter', 'li', function(){
  	$(this).addClass('hover');
  });
  $('#actualResults').on('mouseleave', 'li', function(){
  	$(this).removeClass('hover');
  });
}

// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// click-handlers

function clickServingButton(e)
{
  // get button that was just clicked
  var $clickedButton = $(this);
  var foodType = $(this).parent().parent().attr('id');

  // clicking on any button in a specific row will record the food, but only the latest bubble should
  // blacken and record to the database.  
  var $activeButton = getActiveButton($clickedButton);
  var points = parseInt($activeButton.text());
  var date = $('#logDate span').text();

  // if the button user clicked is already consumed, prompt for removal of that consumption or try again
  if($(this).hasClass('consumed'))
    clickConsumed($clickedButton);
  // if button is not consumed, update DB, get new totals, update view
  else
  {
		// update database with this serving of food and adjust the daily score as well.
    sendGenericAjaxRequest('/consume', {type: foodType, points: points, date: date}, 'post', 'put', e, function(daily, err){
			console.log('back from consume!!: '+daily.date);
      $activeButton.addClass('consumed');
      db.todaysTotal = daily.score;
      $('#dailyTotalText').text(db.todaysTotal);
		});		
  }
}

// Once the user clicks the search button, this function will take the text from 
// the search input field and construct an ajax request.  This is sent off to the 
// nutritionix API and returned.
function clickSearchButton(e)
{	
	// get data from input field on the form on the the home page
	var query = $('input[name="food"]').val();

	var data = {
	  "appId":"3e2c3c7e",
	  "appKey":"9a79016225ab7ef6a28745952e2350a5",  
	  "query": query,
	  "fields":["item_name","brand_name"],
	  "limit": 20,
	  "sort":{
	    "field":"_score",
	    "order":"desc"
	  },
	  "min_score": 1.0
	};

	// construct the url using string concatenation and the basic API requirement. 
	// Also, run through the URI encoding function.
	var uri = 'https://api.nutritionix.com/v1_1/search/';
	var url = encodeURI(uri);
	sendGenericAjaxRequest(url, data, 'post', null, e, function(data, status, jqXHR){
		displaySearchResults(data);

	});
}

function clickPrev()
{
  // get the date that is currently displayed
  var date = $('#actualDate').text();
  date = moment(date, 'MM[/]DD[/]YY').subtract('days',1).format('MM[/]DD[/]YY')
  $('#logDate span').text(date);
  initializeLogDisplay(date);
}

function clickNext()
{
  // get the date that is currently displayed
  var date = $('#actualDate').text();
  date = moment(date, 'MM[/]DD[/]YY').add('days',1).format('MM[/]DD[/]YY')
  $('#logDate span').text(date);
  initializeLogDisplay(date);
}

function clickAddToJournal()
{
  var foodEntered = $('#foodEntered').val();

// THIS IS WHERE YOU NEED TO SEND AN AJAX REQUEST TO THE DATABASE TO ADD FOOD TO THE JOURNAL

  sendGenericAjaxRequest('/addJournal', foodEntered, 'post', 'put', null, function(data, status, jqXHR){
    var $li = $('<li>');
    $li.text(foodEntered);
    $('#foodJournal ul').append($li);
    $('#foodEntered').val('');
    $('#closeMyModal').trigger('click');
  });

// sendGenericAjaxRequest(url, data, verb, altVerb, event, successFn)  

}

// ------------------------------------------------------
// ------------------------------------------------------
// ------------------------------------------------------
// html handlers

function displaySearchResults(data)
{
	// display the search results area of the html DOM
	$('#searchResults').removeClass('hidden');
	// debugger;

	var items = data.hits
	var $li;
	for (var i=0; i<data.hits.length; i++)
	{
		$li = $('<li>');
		$li.attr('data-id', data.hits[i].id);
		$li.text(data.hits[i].fields.brand_name+', '+data.hits[i].fields.item_name);
		$('#actualResults').append($li);
	}

}

function clickConsumed($clicked)
{
  alert('Please choose a button that has not been consumed.');
}

function getActiveButton($clicked)
{
  // go  to first servingButton even if this is it.
  var $active = $clicked.parent().parent().children().first().children()

  // get out of this function if first child is not consumed.
  while($active.hasClass('consumed'))
    $active = $active.parent().next().children();

  return $active;

  // find the first servingButton on this line which is not consumed
}

function initializeLogDisplay(date)
{
console.log('date before ajax: '+date);
	// construct the ajax call to the server for the handling of the db search & return
	sendGenericAjaxRequest('/log', {date: date}, 'get', null, null, function(data, status, jqXHR){
		// update the bubbles that should be blacked out and the daily score
		htmlUpdateMainDisplay(data);
	});
}

function htmlUpdateMainDisplay(data)
{
  $('#mainDisplay div').removeClass('consumed');
  $('#dailyTotalText').text(data.score); 
	blackOut('fruit', data.fruit);
	blackOut('vegetable', data.vegetable);
	blackOut('leanProtein', data.leanProtein);
	blackOut('nutsAndSeeds', data.nutsAndSeeds);
	blackOut('wholeGrains', data.wholeGrains);
	blackOut('dairy', data.dairy);
	blackOut('refinedGrains', data.refinedGrains);
	blackOut('sweets', data.sweets);
	blackOut('friedFoods', data.friedFoods);
	blackOut('fattyProtein', data.fattyProtein);
}

function blackOut(label, cycles)
{
	for(var i=1; i<=cycles; i++)
		$('#'+label+' div:nth-child('+i+') div').addClass('consumed');
}

// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //

function getValue(selector, fn){
  var value = $(selector).val();
  value = value.trim();
  $(selector).val('');

  if(fn){
    value = fn(value);
  }

  return value;
}

function parseUpperCase(string){
  return string.toUpperCase();
}

function parseLowerCase(string){
  return string.toLowerCase();
}

function formatCurrency(number){
  return '$' + number.toFixed(2);
}

// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //

function canRun(flag){
  var isQunit = $('#qunit').length > 0;
  var isFlag = flag !== undefined;
  var value = isQunit && isFlag || !isQunit;
  return value;
}

// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //

function submitAjaxForm(e, form, successFn){
  var url = $(form).attr('action');
  var data = $(form).serialize();

  var options = {};
  options.url = url;
  options.type = 'POST';
  options.data = data;
  options.success = successFn;
  options.error = function(jqXHR, status, error){console.log('in submitAjax: error = '+error);};

  $.ajax(options);
  e.preventDefault();
}


function sendGenericAjaxRequest(url, data, verb, altVerb, event, successFn){
  var options = {};
  options.url = url;
  options.type = verb;
  options.data = data;
  options.success = successFn;
  options.error = function(jqXHR, status, error){console.log('in genericAjax: error = '+error);};

  if(altVerb) options.data._method = altVerb;
  $.ajax(options);
  if(event) event.preventDefault();
}