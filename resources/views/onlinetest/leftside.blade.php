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
	        <a id ="transmitir" class="pull-right btn btn-primary" href="{{ URL::route('leftsidetest') }}" role="button">Iniciar transmissão &raquo;</a>
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
	@endsection
	
@section('postjs')
<script src="https://webrtc.github.io/samples/src/js/adapter.js"></script>
<script src="/js/livepeer/livepeer_0_0.js"></script>
<script type="text/javascript">
function startPeer()
{
	var radio = {};
	LivePeer(radio, "radio").addOnIceCallback(iceCallback);

	/*var player = {};
	LivePeer(radio).setRemote(player);
	LivePeer(player).setRemote(radio);

	setTimeout(function() {
		LivePeer(player).createAnswer(radio);
	},2000);*/
}

document.querySelector('a#transmitir').onclick = function(e) {
	e.preventDefault();
	startPeer();
}
</script>

<script type="text/javascript">
/**
 * The next functions created from webrtc
 * https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ 
 */
function iceCallback(event) {
  var elapsed = 0; //((window.performance.now() - begin) / 1000).toFixed(3);
  var row = document.createElement('tr');
  appendCell(row, elapsed);
  if (event.candidate) {
    var c = parseCandidate(event.candidate.candidate);
    appendCell(row, c.component);
    appendCell(row, c.type);
    appendCell(row, c.foundation);
    appendCell(row, c.protocol);
    appendCell(row, c.address);
    appendCell(row, c.port);
    appendCell(row, formatPriority(c.priority));
    //candidates.push(c);
  } else {
    appendCell(row, 'Done', 7);
  }
  document.querySelector('tbody#candidatesBody').appendChild(row);
}
//Parse a candidate:foo string into an object, for easier use by other methods.
function parseCandidate(text) {
  var candidateStr = 'candidate:';
  var pos = text.indexOf(candidateStr) + candidateStr.length;
  var fields = text.substr(pos).split(' ');
  return {
    'component': fields[1],
    'type': fields[7],
    'foundation': fields[0],
    'protocol': fields[2],
    'address': fields[4],
    'port': fields[5],
    'priority': fields[3]
  };
}

function appendCell(row, val, span) {
	var cell = document.createElement('td');
	cell.textContent = val;
	if (span) {
	  cell.setAttribute('colspan', span);
	}
	row.appendChild(cell);
}

// Parse the uint32 PRIORITY field into its constituent parts from RFC 5245,
// type preference, local preference, and (256 - component ID).
// ex: 126 | 32252 | 255 (126 is host preference, 255 is component ID 1)
function formatPriority(priority) {
  var s = '';
  s += (priority >> 24);
  s += ' | ';
  s += (priority >> 8) & 0xFFFF;
  s += ' | ';
  s += priority & 0xFF;
  return s;
}
</script>
@endsection	