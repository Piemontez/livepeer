<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

Route::get('/', ['as' => 'home', function () {
	return view('welcome');
}]);

Route::get('/onlinetest', ['as' => 'onlinetest', function () {
	return view('onlinetest.index');
}]);

Route::get('/onlinetest/leftside',  ['as' => 'leftsidetest', function () {
	return view('onlinetest.leftside');
}]);

Route::get('/onlinetest/rightside',  ['as' => 'rightsidetest', function () {
	return view('onlinetest.rightside');
}]);