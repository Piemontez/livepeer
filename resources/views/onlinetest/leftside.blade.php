@extends('templates.base')

	@section('container')
    <div class="container"><br/><br/></div>

    <div class="container">
      <!-- Example row of columns -->
      <div class="page-header">
        <h2><i class="fa fa-microphone"></i> Left Side</h2>
      </div>
      <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>

      <div class="row">
        <div class="col-md-8 col-md-offset-2">
            <h3>Radio</h3>
            <div class="row">
            	<div class="col-md-6">
	            <dl class="dl-horizontal">
	              <dt data-toggle="tooltip" title="endereço">Endereço de acesso</dt>
	              <dd>192.168.10.10:8081</dd>
	              <dt data-toggle="tooltip" title="total">Total de ouvintes</dt>
	              <dd>0</dd>
	            </dl>
	            </div>
            	<div class="col-md-6">
	            <dl class="dl-horizontal">
	              <dt data-toggle="tooltip" title="endereço">Servidor - bits por segundo</dt>
	              <dd>0</dd>
	              <dt data-toggle="tooltip" title="total">Pares - bits por segundo</dt>
	              <dd>0</dd>
	            </dl>
	            </div>
            </div>
	        <a class="pull-right btn btn-primary" href="{{ URL::route('leftsidetest') }}" role="button">Iniciar transmissão &raquo;</a>
        </div>
      </div><!-- /row --><br/>

      <div class="row">
        <div class="col-md-4 col-md-offset-2">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">bits por segundo</h3>
          </div>
          <div class="panel-body">
            <p>...</p>
          </div>
        </div>
        </div>

        <div class="col-md-4">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">pacotes por segundo</h3>
          </div>
          <div class="panel-body">
            <p>...</p>
          </div>
        </div>
        </div>

      </div>
    </div><!-- /container -->
	@endsection