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
        <div class="col-md-4 col-md-offset-2">
            <h3>Radio</h3>
            <dl class="dl-horizontal">
              <dt data-toggle="tooltip" title="endereço">Endereço de acesso</dt>
              <dd>...</dd>
              <dt data-toggle="tooltip" title="total">Total de ouvintes</dt>
              <dd>...</dd>
            </dl>
	        <a class="btn btn-primary" href="{{ URL::route('leftsidetest') }}" role="button">Iniciar transmissão &raquo;</a>
        </div>
        <div class="col-md-4">
            <h3>Conexões</h3>
            <dl class="dl-horizontal">
              <dt data-toggle="tooltip" title="direta">Direta</dt>
              <dd>...</dd>
              <dt data-toggle="tooltip" title="Indireta">Indireta</dt>
              <dd>...</dd>
            </dl>
            <div class="progress">
              <div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100" style="width: 60%;">
                <span class="sr-only">60% Complete</span>
              </div>
            </div>
          </div>
      </div><!-- /row -->
      <div class="row">
        <div class="col-md-8 col-md-offset-2">
            <h3>Transmissão</h3>
        </div>
      </div>
    </div><!-- /container -->
	@endsection