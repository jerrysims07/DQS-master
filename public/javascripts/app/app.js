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
  $(document).foundation('joyride', 'start');

  // go to database and check for any activity so far today and update view accordingly
  var today = moment().format('MM[/]DD[/]YY')  
  $('#logDate span').text(today);
  initializeLogDisplay(today);

  // click-handlers
  $('#authentication-button').on('click', clickAuthenticationButton);
  $('#register').on('click', clickRegister);
  $('#login').on('click', clickLogin);
  $('.servingButton').click(clickServingButton);
  $('#searchButton').on('click', clickSearchButton);
  $('#prev').on('click', clickPrev);
  $('#next').on('click', clickNext);
  $('#addToJournal').on('click', clickAddToJournal)
  $('#closeClickedConsumed').on('click', ignoreClickConsumed);
  $('#unclick').on('click', clickUnclick);
  $('#actualResults').on('click','.result', clickResult);
  $('#helpMessage').on('click', clickHelpMessage);
  $('#submitServing').on('click', clickSubmitServing);
  $('#submitRecord').on('click', clickSubmitRecord);

  // other event-handlers.
  $('#closeClickedConsumed').on('closed', function(){
    $('.reveal-modal-bg').removeClass('reveal-modal-bg');
  });
  $('#myModal').on('opened', function () {
    $('#foodEntered').focus();
  });
  $('#foodEntry').on('keydown', (function(e){
    if(e.which === 13)
      clickSearchButton(e);
  }));
  $('#foodEntered').on('keydown', (function(e){
    if(e.which === 13)
      $('#addToJournal').trigger('click');
  }));
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
console.log('in clickServing');
  // set focus to the textbox inside the modal that should have fired with this click
  $('#foodEntered').focus();

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
  // if button is not consumed, update DB, new totals, update view
  else
  {
    setServingSizeDescription(foodType);
		// update database with this serving of food and adjust the daily score as well.
    sendGenericAjaxRequest('/consume', {type: foodType, points: points, date: date}, 'post', 'put', e, function(daily, err){
			console.log('back from consume!!: '+daily.date);
      $activeButton.addClass('consumed');
      $activeButton.removeAttr('data-reveal-id');
      // $activeButton.attr('data-reveal-id', 'clickedConsumed');
      db.todaysTotal = daily.score;
      $('#dailyTotalText').text(db.todaysTotal);
		});		
  }
}

function clickHelpMessage()
{
  $('#helpMessage').addClass('hidden'); 
  $('#foodEntry').removeClass('hidden');
  $('#foodEntry input').focus();
}

// Once the user clicks the search button, this function will take the text from 
// the search input field and construct an ajax request.  This is sent off to the 
// nutritionix API and returned.
function clickSearchButton(e)
{	
  $('#activeSearch').removeClass('hidden');
  $('#searchButton').addClass('hidden');
console.log('searching');	
  // get data from input field on the form on the the home page
	var query = $('input[name="food"]').val();

	var data = {
	  "appId":"3e2c3c7e",
	  "appKey":"9a79016225ab7ef6a28745952e2350a5",  
	  "query": query,
	  "fields":["item_name","brand_name","nf_calories","nf_calories_from_fat","nf_total_fat","nf_total_carbohydrate","nf_dietary_fiber","nf_protein","nf_servings_per_container","nf_serving_size_qty","nf_serving_size_unit","nf_serving_weight_grams"],
	  "limit": 50,
	  "sort":{
	    "field":"_score",
	    "order":"desc"
	  },
	  "min_score": .5
	};

	// construct the url using string concatenation and the basic API requirement. 
	// Also, run through the URI encoding function.
	var uri = 'https://api.nutritionix.com/v1_1/search/';
	var url = encodeURI(uri);
	sendGenericAjaxRequest(url, data, 'post', null, e, function(data, status, jqXHR){
  	displaySearchResults(data);
	});
}

function clickResult(e)
{
  var id = $(this).attr('data-id');
  var data = {
  "appId":"3e2c3c7e",
  "appKey":"9a79016225ab7ef6a28745952e2350a5",  
  "fields":["item_name","brand_name","nf_calories","nf_calories_from_fat","nf_total_fat","nf_total_carbohydrate","nf_dietary_fiber","nf_protein","nf_servings_per_container","nf_serving_size_qty","nf_serving_size_unit","nf_serving_weight_grams"],
  "filters":{
    "item_id": id
  },
  "limit": 1,
  };

  // construct the url using string concatenation and the basic API requirement. 
  // Also, run through the URI encoding function.
  var uri = 'https://api.nutritionix.com/v1_1/search/';
  var url = encodeURI(uri);
  sendGenericAjaxRequest(url, data, 'post', null, e, function(item, status, jqXHR){
    if(item){
      // prepare an ajax request to move on to a new view to deal with the serving algorithm
      sendGenericAjaxRequest('/servings', item, 'post', null, null, function(reply, status, jqXHR){
        console.log('reply = '+reply);
        htmlFireServingsModal(reply, item);          
      });
    }
  });
}

function clickSubmitServing(e)
{
  $('#suggestion').empty();
  var numOfServings = $('#numberOfServings').val();
  var suggestion = $('#submitServing').data('suggestion');

  for( var category in suggestion.types)
  {
    var $li = $('<li>');
    var $div = $('<div>');
    var $div2 = $('<div>');
    $div.text(category +':  ');
    $div.addClass('catName');
    $li.append($div);
    $div2.text((parseFloat(suggestion.types[category]*numOfServings)).toFixed(2));
    $div2.addClass('catNum');
    $li.append($div2);
    $('#suggestion').append($li);    
  } 
  $('#suggestionSide').removeClass('hidden');
}

function clickSubmitRecord()
{
  // get data out of the select boxes
  var submission = [];
  var $selects = $('#categorySelects select');
  $.each($selects, function(i, n){
    var newObj = {};   
    newObj.label = $(n).attr('id').substring(0,$(n).attr('id').length-9);
    newObj.servings = $(n).val();
    submission.push(newObj);
  });

  // get date and package data for ajax call
  var date = $('#logDate span').text();
  sendGenericAjaxRequest('/saveServings', {submission: submission, date: date}, 'post', 'put', null, function(data, status, jqXHR){
    console.log(data);
    $('#closeClickedResult').trigger('click');
    htmlUpdateMainDisplay(data);
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
  var entry = $('#foodEntered').val();
  var date = $('#logDate span').text();
// THIS IS WHERE YOU NEED TO SEND AN AJAX REQUEST TO THE DATABASE TO ADD FOOD TO THE JOURNAL

  sendGenericAjaxRequest('/addJournal', {entry: entry, date: date}, 'post', 'put', null, function(data, status, jqXHR){
    console.log(data);
    if(entry){
      var $li = $('<li>');
      $li.text(data.journal.pop());
      $('#foodJournal ul').append($li);
    }
    $('#foodEntered').val('');
    $('#closeMyModal').trigger('click');
  });
}

function ignoreClickConsumed()
{
  $('#clickedConsumed').foundation('reveal', 'close');
}

function clickUnclick($this)
{
  // debugger;
  var category = $(this).attr('data-clickedcat');
  var $clicked = $(this);
  var date = $('#logDate span').text();
  var points = getUnclickPoints($clicked);
  // hit the database with the category that needs to be decremented
  sendGenericAjaxRequest('/unclick', {type: category, date: date, points: points}, 'post', 'put', null, function(data, status, jqXHR){
    console.log(data);
    db.todaysTotal = data.score;
    $('#dailyTotalText').text(db.todaysTotal);
  });
 // sendGenericAjaxRequest(url, data, verb, altVerb, event, successFn)

  console.log('this = '+$this);
  ignoreClickConsumed();
}

// ------------------------------------------------------
// ------------------------------------------------------
// ------------------------------------------------------
// html handlers

function displaySearchResults(data)
{
  $('#actualResults').empty();
	// display the search results area of the html DOM
	$('#searchResults').removeClass('hidden');
  $('#activeSearch').addClass('hidden');
  $('#searchButton').removeClass('hidden');

	var items = data.hits
	var $li;
	for (var i=0; i<data.hits.length; i++)
	{
console.log('calories = '+data.hits[i].fields.nf_calories);
console.log('fat = '+data.hits[i].fields.nf_total_fat);
console.log('carb = '+data.hits[i].fields.nf_total_carbohydrate);
console.log('pro = '+data.hits[i].fields.nf_protein);
console.log(' ');
		$li = $('<li>');
    // $li.attr('data-reveal-id', 'clickedResult');
		$li.text(data.hits[i].fields.brand_name+', '+data.hits[i].fields.item_name);
    $li.addClass('result');
    $li.attr('data-id', data.hits[i]._id);
		$('#actualResults').append($li);
	}
}

function clickConsumed($clicked)
{
  // debugger;
  console.log('line b4 modal in clickConsumed');
  var category = $clicked.parent().parent().attr('id');
  $('#unclick').attr('data-clickedCat', category);
  $('#clickedConsumed').foundation('reveal', 'open');

  console.log('line after modal in clickConsumed');
}

function getActiveButton($clicked)
{
  // go  to first servingButton even if this is it.
  var $active = $clicked.parent().parent().children().first().children();

  // get out of this function if first child is not consumed.
  while($active.hasClass('consumed'))
    $active = $active.parent().next().children();

  return $active;

  // find the first servingButton on this line which is not consumed
}

function getUnclickPoints($clicked)
{
  // this function will return the points of the last-clicked button in this food category
  // so that the proper amount is subtracted from the daily total on unclick  

  // go  to first servingButton even if this is it.
  var category = $clicked.attr('data-clickedcat');
  var $active = $('#'+category);
  $active = $active.children().first().children()

  // check next sibling for 'consumed' class and only move along if it is true
  while($active.parent().next().children().hasClass('consumed'))
  {
    $active = $active.parent().next().children();
  }
  var points = parseInt($active.text());
  $active.removeClass('consumed').attr('data-reveal-id', 'myModal');
  return points
}


function initializeLogDisplay(date)
{
  $('.servingButton').attr('data-reveal-id', 'myModal');
	// construct the ajax call to the server for the handling of the db search & return
	sendGenericAjaxRequest('/log', {date: date}, 'get', null, null, function(data, status, jqXHR){
		// update the bubbles that should be blacked out and the daily score
		htmlUpdateMainDisplay(data);
	});
}

function htmlFireServingsModal(suggestion, item)
{
  for (var i=0; i<100; i++)
  {
    var $option = $('<option value='+i+'>'+i+'</option>');
    $('#numberOfServings').append($option);
  }
  $('#clickedResult').foundation('reveal', 'open');
  $('#resultItem').text(item.hits[0].fields.item_name);
  $('#serving').text(item.hits[0].fields.nf_serving_size_qty +' '+item.hits[0].fields.nf_serving_size_unit+' -- '+item.hits[0].fields.nf_calories+' calories');
  $('#submitServing').data('suggestion', suggestion);
}


function htmlUpdateMainDisplay(data)
{
  // update the serving buttons 
  $('#wrapper').removeClass('hidden');
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

  // update the food journal by erasing it and then filling it back out
  $('#actualJournal').empty()
  for (var i = 0; i<data.journal.length; i++)
  {
    if(data.journal[i]){
      var $li = $('<li>');
      $li.text(data.journal[i]);
      $('#actualJournal').append($li);    
    }
  }

}

function blackOut(label, cycles)
{
	for(var i=1; i<=cycles; i++)
  {
    $('#'+label+' div:nth-child('+i+') div').addClass('consumed');
    $('#'+label+' div:nth-child('+i+') div').removeAttr('data-reveal-id');
    // $('#'+label+' div:nth-child('+i+') div').attr('data-reveal-id', 'clickedConsumed');
  }
}

function setServingSizeDescription(foodType)
{
  var sizeHelpText;
  switch(foodType){
    case 'fruit':
      sizeHelpText = '"Commonsense fruit serving sizes include one medium-size piece of whole fruit, a big handful of berries, and a medium-size glass of 100 percent fruit juice."';
      break;
    case 'vegetable':
      sizeHelpText = '"Commonsense vegtable serving sizes are a fist-sized portion of solid veggies, a half cup of tomato sauce, and a medium-sized bowl of vegetable soup or salad."';
      break;
    case 'leanProtein':
      sizeHelpText = '"A commonsense serving of meat or fish is the size of your open hand."';
      break;
    case 'nutsAndSeeds':
      sizeHelpText = '"A commonsense serving of nuts or seeds is a palmful.  A commonsense serving of any nut butter is a heaping tablespoon."';
      break;
    case 'dairy':
      sizeHelpText = '"Commonsense servings of dairy include a glass of milk or the amount of milk you\'d normally use in a bowl of breakfast cereal, two slices of deli cheese, and a single-serving tub of yogurt."';
      break;
    case 'wholeGrains':
      sizeHelpText = '"Commonsense servings of whole grains are a fist-sized portion of brown rice, a medium-sized bowl of cereal or pasta, and two slices of bread."';
      break;
    case 'refinedGrains':
      sizeHelpText = '"Commonsense servings are... a fist-sized portion of white rice, a medium-sized bowl of cereal or pasta, and two slices of bread."';
      break;
    case 'fattyProtein':
      sizeHelpText = '"Fatty-protein serving sizes are the same as low-fat meat serving sizes -- enough meat to fit in your open hand."';
      break;
    case 'friedFoods':
      sizeHelpText = '"Commonsense servings of fried foods include one small bag of potato chips, one fried hamburger patty, three or four buffalo wings, one small bag of chips, one small order of french fries, and one donut."';
      break;
    case 'sweets':
      sizeHelpText = '"Commonsense serving sizes of sweets include one small cookie, 12 ounces of soft drink, one label-defined serving of candy or chocolate, one reular-sized slice of pie or cake, and a scoop or bowl of ice cream."';
      break;
  }

  $('#sizeHelp').text(sizeHelpText);
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

// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //
// -------------------------------------------------------------------- //


function clickAuthenticationButton(e){
  var isAnonymous = $('#authentication-button[data-email="anonymous"]').length === 1;

  if(isAnonymous){
    $('form#authentication').toggleClass('hidden');
    $('input[name="email"]').focus();
  } else {
    var url = '/logout';
    sendAjaxRequest(url, {}, 'post', 'delete', null, function(data){
      htmlLogout(data);
    });
  }

  e.preventDefault();
}

function clickRegister(e){
  var url = '/users';
  var data = $('form#authentication').serialize();
  sendAjaxRequest(url, data, 'post', null, e, function(data){
    console.log('in clickRegister, back from ajax ...' +data);
    htmlRegisterComplete(data);
  });
}

function htmlRegisterComplete(result){
  $('input[name="email"]').val('');
  $('input[name="password"]').val('');

  if(result.status === 'ok'){
    $('form#authentication').toggleClass('hidden');
    // $('#wrapper').toggleClass('hidden');
  }
}

function clickLogin(e){
  var url = '/login';
  var data = $('form#authentication').serialize();
  sendAjaxRequest(url, data, 'post', 'put', e, function(data){
    htmlUpdateLoginStatus(data);
  });
}

function htmlUpdateLoginStatus(result){
  $('input[name="email"]').val('');
  $('input[name="password"]').val('');

  if(result.status === 'ok'){
    $('form#authentication').toggleClass('hidden');
    $('#wrapper').removeClass('hidden');
    $('#authentication-button').attr('data-email', result.email);
    $('#authentication-button').text(result.email);
    $('#authentication-button').addClass('alert');
    // $('#the-application').removeClass('hidden');
    var today = moment().format('MM[/]DD[/]YY')  
    $('#logDate span').text(today);
    initializeLogDisplay(today);

  }
}

function htmlLogout(data){
  $('#authentication-button').attr('data-email', 'anonymous');
  $('#authentication-button').text('Login | Sign Up');
  $('#authentication-button').addClass('alert');
  // $('#wrapper').addClass('hidden');
  $('#actualJournal').empty();
  $('#mainDisplay div').removeClass('consumed');
  $('#dailyTotalText').text('0');

  // window.location.href = '/';
}
