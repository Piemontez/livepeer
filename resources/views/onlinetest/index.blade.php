@extends('templates.base')

	@section('container')
    <div class="container"><br/><br/></div>

    <div class="container">
      <!-- Example row of columns -->
      <div class="page-header">
        <h2>Teste online</h2>
      </div>
      <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>

      <div class="row">
        <div class="col-md-3 col-md-offset-3">
          <h3>
          	<i class="fa fa-microphone"></i> LeftSide
          </h3>
          <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>
          <p><a class="btn btn-primary" href="{{ URL::route('leftsidetest') }}" role="button">Iniciar rádio &raquo;</a></p>
        </div>
        <div class="col-md-3">
          <h3>
          	<i class="fa fa-volume-up"></i> RightSide
          </h3>
          <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>
          <p><a class="btn btn-default" href="{{ URL::route('rightsidetest') }}" role="button">Escutar rádio &raquo;</a></p>
        </div>
      </div>
    </div><!-- /container -->
	@endsection