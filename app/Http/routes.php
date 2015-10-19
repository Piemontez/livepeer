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

Route::get('/', function () {
	return view('welcome');
});

Route::get('/onlineteste', function () {
	return view('onlineteste.index');
});

Route::get('/onlineteste/leftside', function () {
	return view('onlineteste.leftside');
});

Route::get('/onlineteste/rightside', function () {
	return view('onlineteste.rightside');
});