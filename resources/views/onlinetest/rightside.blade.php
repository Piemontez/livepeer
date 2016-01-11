@extends('templates.base')

	@section('container')
    <div class="container"><br/><br/></div>

    <div class="container">
      <!-- Example row of columns -->
      <div class="page-header">
        <h2><i class="fa fa-volume-up"></i> Right Side</h2>
      </div>
      <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>

      <div class="row ">
        <div class="col-md-8 col-md-offset-2">
        <form class="form-inline">
          <div class="form-group has-feedback">
            <div class="input-group">
              <span class="input-group-addon">Endereço servidor</span>
              <input type="text" class="form-control" id="serverid" placeholder="192.168.0.0:8080">
            </div>

  			<span class="glyphicon glyphicon-warning-sign form-control-feedback" aria-hidden="true"></span>
  			<span id="inputWarning2Status" class="sr-only">(warning)</span>

          </div>
          <audio id="audio2" hidden="hidden" autoplay controls></audio>
          <a id="escutar" type="submit" class="btn btn-primary" role='button'><i class="fa fa-play"></i> Escutar rádio</a>
        </form>
        </div>
      </div><!-- /row --><br/>

      <div class="row">
        <div class="col-md-4 col-md-offset-2">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Download</h3>
          </div>
          <div class="panel-body">
            <dl class="dl-horizontal">
              <dt data-toggle="tooltip" title="direta">Conectado com</dt>
              <dd>...</dd>
            </dl>
          </div>
        </div>
        </div>

        <div class="col-md-4">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Upload</h3>
          </div>
          <div class="panel-body">
            <dl class="dl-horizontal">
              <dt data-toggle="tooltip" title="direta">Usuários conectados</dt>
              <dd>...</dd>
            </dl>
          </div>
        </div>
        </div>
      </div>
    </div><!-- /container -->
	@endsection
	
@section('postjs')
<script src="https://webrtc.github.io/samples/src/js/adapter.js"></script>
<script src="/js/livepeer/livepeer_0_0.js"></script>
<script type="text/javascript">
document.querySelector('a#escutar').onclick = function(e) {
	e.preventDefault();

	LP.Player.init();
	//var player = {};
	//LivePeer(player, "player");	
}
</script>
@endsection	