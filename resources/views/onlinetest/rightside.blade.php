@extends('templates.base')

	@section('container')
    <div class="container"><br/><br/></div>

    <div class="container">
      <!-- Example row of columns -->
      <div class="page-header">
        <h2><i class="fa fa-volume-up"></i> Right Side</h2>
      </div>
      <p>Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui.</p>

      <div class="row">
        <div class="col-md-8 col-md-offset-2">
            <h3>Player</h3>
            <div class="row">
            	<div class="col-md-6">
	            <dl class="dl-horizontal">
	              <dt data-toggle="tooltip">Token</dt>
	              <dd id="token">....</dd>
	              <dt data-toggle="tooltip">Bytes Received</dt>
	              <dd id="biterate_rec">....</dd>
	              <dt data-toggle="tooltip">Packets Received</dt>
	              <dd id="packets_rec">....</dd>
              	</dl>
	            </div>
            	<div class="col-md-6">
	            <dl class="dl-horizontal">
	              <dt data-toggle="tooltip">&nbsp;</dt>
	              <dd id="token">&nbsp;</dd>
	              <dt data-toggle="tooltip">Bytes last sec.</dt>
	              <dd id="biterate_rec_sec">....</dd>
	              <dt data-toggle="tooltip">Packets  last sec.</dt>
	              <dd id="packets_rec_sec">....</dd>
	            </dl>
	            </div>
            </div>
	        <audio id="audio2" hidden="hidden" autoplay controls></audio>
	        <div class="pull-right form-inline">
	          <div class="checkbox">
			    <label>
			      <input type="checkbox" id="with_peer" checked="checked" autocomplete="off"> With P2P
			    </label>
			  </div>
	          <a id="initPlayer" class="btn btn-primary" role='button'><i class="fa fa-play"></i> Start</a>
            </div>
        </div>
      </div><!-- /row --><br/>

      <div class="row">
        <div class="col-md-4 col-md-offset-2">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Download / Bytes Received</h3>
          </div>
          <div class="panel-body">
		    <div class="graph-container" id="bitrateGraphRec" style="width: 100%">
		      <canvas id="bitrateCanvasRec"></canvas>
		    </div>
          </div>
        </div>
        </div>

        <div class="col-md-4">
        <div class="panel panel-default">
          <div class="panel-heading">
            <h3 class="panel-title">Upload / Bytes Sent</h3>
          </div>
          <div class="panel-body">
		    <div id="bitrateGraphSen" style="width: 100%">
		      <canvas id="bitrateCanvasSen"></canvas>
		    </div>
          </div>
        </div>
        </div>
      </div><!-- /row -->

    </div><!-- /container -->
	@endsection
	
@section('postjs')
<script src="https://webrtc.github.io/samples/src/js/third_party/graph.js"></script>
<script src="/js/livepeer/html5rocks_adapter.js"></script>
<script src="/js/livepeer/livepeer_0_0.js"></script>
<script src="/js/livepeer/teste.js"></script>

<script type="text/javascript">
window.onload = function() {

	var player = null;
	document.querySelector('a#initPlayer').onclick = function(e) {
		e.preventDefault();

		if (player === null || !player.isRunning()) 
		{
			var first = true;
			function startTime() 
			{
				LP.PlayerIntercepted.init();
				if (first) {
			    	setTimeout(startTime, 30000);
			    	first = false
				} else {
					setTimeout(startTime, 8000);
				}
			}
			startTime();

			/*
			if (document.querySelector('input#with_peer').checked) {
				player = LP.PlayerIntercepted.init();
			} else {
				player = LP.Player.init();
			}
			//var audio2 = document.querySelector('audio#audio2');
			//audio2.srcObject = player.streamDestination;
			
			
			player.on('newpeer', function(newpeer) {
				document.querySelector('dd#token').innerHTML = newpeer.token;
		
				receivedDisplay(newpeer);
				sentDisplay(newpeer);
			});*/
			

			document.querySelector('a#initPlayer').setAttribute("class", "btn btn-warning");
			document.querySelector('a#initPlayer').innerHTML = "Stop";
			document.querySelector('input#with_peer').setAttribute("disabled", "disabled");
		} else {
			player.stop();
			document.querySelector('a#initPlayer').setAttribute("class", "btn btn-primary");
			document.querySelector('a#initPlayer').innerHTML = "<i class='fa fa-play'></i> Start";
			document.querySelector('input#with_peer').removeAttribute("disabled", "disabled");
		}
	}
}
</script>
@endsection	