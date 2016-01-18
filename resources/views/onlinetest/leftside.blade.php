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
	              <dt data-toggle="tooltip">...</dt>
	              <dd id="token">....</dd>
	              <dt data-toggle="tooltip">Bytes Send</dt>
	              <dd id="biterate_sen">....</dd>
	              <dt data-toggle="tooltip">Packets Send</dt>
	              <dd id="packets_sen">....</dd>
              	</dl>
	            </div>
            	<div class="col-md-6">
	            <dl class="dl-horizontal">
	              <dt data-toggle="tooltip">&nbsp;</dt>
	              <dd id="token">&nbsp;</dd>
	              <dt data-toggle="tooltip">Bytes last sec.</dt>
	              <dd id="biterate_sen_sec">....</dd>
	              <dt data-toggle="tooltip">Packets  last sec.</dt>
	              <dd id="packets_sen_sec">....</dd>
	            </dl>
	            </div>
            </div>
	        <a id ="transmitir" class="pull-right btn btn-primary" href="{{ URL::route('leftsidetest') }}" role="button">Iniciar transmissão via broadcast &raquo;</a>
        </div>
      </div><!-- /row --><br/>

      <div class="row">
        <div class="col-md-4 col-md-offset-2">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Bytes Sent</h3>
          </div>
          <div class="panel-body">
		    <div id="bitrateGraphSen" style="width: 100%">
		      <canvas id="bitrateCanvasSen"></canvas>
		    </div>
          </div>
        </div>
        </div>

        <div class="col-md-4">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Packets Sent</h3>
          </div>
          <div class="panel-body">
		    <div id="packetsGraphSen" style="width: 100%">
		      <canvas id="packetsCanvasSen"></canvas>
		    </div>
          </div>
        </div>
        </div>
      </div><!-- /row --><br/>

      <div class="row">
        <div class="col-md-8 col-md-offset-2">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Ice candidates</h3>
          </div>
          <div class="panel-body">
            <p>...</p>
            <table class="table table-hover table-condensed">
        		<thead><tr>
          		<th>Time</th><th>Component</th><th>Type</th><th>Foundation</th>
          		<th>Protocol</th><th>Address</th><th>Port</th><th>Priority</th>
        		</tr></thead>
        		<tbody id="candidatesBody"></tbody>
      		</table>
          </div>
        </div>
        </div>
      </div><!-- /row -->
    </div><!-- /container -->
    
    
    
    <audio id="audio2" hidden="hidden" autoplay controls></audio>
	@endsection
	
@section('postjs')
<script src="https://webrtc.github.io/samples/src/js/third_party/graph.js"></script>
<script src="https://webrtc.github.io/samples/src/js/adapter.js"></script>
<script src="/js/livepeer/livepeer_0_0.js"></script>
<script src="/js/livepeer/teste.js"></script>
<script type="text/javascript">
function startPeer()
{
	var broadcast = LP.Broadcast.init();
	broadcast.on('newpeer', function(newpeer) {
		newpeer.on('icecandidate', iceCallbackDisplay);
		sentDisplay(newpeer);
	});
}

document.querySelector('a#transmitir').onclick = function(e) {
	e.preventDefault();
	startPeer();
}
</script>
@endsection	