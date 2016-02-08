/**
 * The next functions created from webrtc
 * https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ 
 * https://webrtc.github.io/samples/src/content/peerconnection/audio/
 */

/**
 * BEGIN BITRATE & PACKETS DISPLAY 
 */

var globalLastBytes = 0; 
var globalLastPackets = 0;
var globalBytes = -1; 
var globalPackets = -1;

function sentDisplay(newPeer) {
	if (globalPackets < 0) 
	{
		globalBytes = 0; 
		globalPackets = 0;
		
	    var byterateSeries = new TimelineDataSeries();
	    var byterateGraph = new TimelineGraphView('bitrateGraphSen', 'bitrateCanvasSen');
	    byterateGraph.updateEndDate();
	    
	    var packetSeries = new TimelineDataSeries();
	    var packetGraph = new TimelineGraphView('packetsGraphSen', 'packetsCanvasSen');
	    packetGraph.updateEndDate();

		setInterval(function() {
			var now = Date.now();

	        var byterate = (globalBytes - globalLastBytes);
	        globalLastBytes = globalBytes;
	        var packrate = (globalPackets - globalLastPackets);
	        globalLastPackets = globalPackets;

	        document.querySelector('dd#biterate_sen').innerHTML = globalBytes; 
	        document.querySelector('dd#biterate_sen_sec').innerHTML = byterate; 
	        document.querySelector('dd#packets_sen').innerHTML = globalPackets; 
	        document.querySelector('dd#packets_sen_sec').innerHTML = packrate; 

	        byterateSeries.addPoint(now, byterate);
	        byterateGraph.setDataSeries([byterateSeries]);
	        byterateGraph.updateEndDate();

	        packetSeries.addPoint(now, packrate);
	        packetGraph.setDataSeries([packetSeries]);
	        packetGraph.updateEndDate();
		}, 1000);
	}

	var lastResult;

	setInterval(function() {
	  if (!newPeer) {
	    return;
	  }

	  newPeer.connection.getStats(null).then(function(res) {
	    Object.keys(res).forEach(function(key) {
	      var report = res[key];

	      if ((report.type === 'outboundrtp') ||
	          (report.type === 'outbound-rtp') ||
	          (report.type === 'ssrc' && report.bytesSent)) 
	      {
	        if (lastResult && lastResult[report.id]) {
	          var byterate = (report.bytesSent   - lastResult[report.id].bytesSent);
	          var packrate = (report.packetsSent - lastResult[report.id].packetsSent);

	          globalBytes += byterate;
	          globalPackets += packrate;

	        }
	      }
	    });
	    lastResult = res;
	  });
	}, 1000);
}

function receivedDisplay(newPeer) {
	var lastResult;
    var bytes;
    var packets;
    var now;

    var byterateSeries = new TimelineDataSeries();
    var byterateGraph = new TimelineGraphView('bitrateGraphRec', 'bitrateCanvasRec');
    byterateGraph.updateEndDate();

	setInterval(function() {
	  if (!newPeer) {
	    return;
	  }

	  newPeer.connection.getStats(null).then(function(res) {
	    Object.keys(res).forEach(function(key) {
	      var report = res[key];
	      var now = report.timestamp;

	      if ((report.type === 'outboundrtp') ||
	          (report.type === 'outbound-rtp') ||
	          (report.type === 'ssrc' && report.bytesReceived)) {

	        bytes = report.bytesReceived;
	        packets = report.packetsReceived;
	        now = report.timestamp;
	        if (lastResult && lastResult[report.id]) {

	          var byterate = (bytes - lastResult[report.id].bytesReceived);

	          document.querySelector('dd#biterate_rec').innerHTML = bytes; 
	          document.querySelector('dd#biterate_rec_sec').innerHTML = bytes - lastResult[report.id].bytesReceived; 
	          document.querySelector('dd#packets_rec').innerHTML = packets; 
	          document.querySelector('dd#packets_rec_sec').innerHTML = packets - lastResult[report.id].packetsReceived; 

	          byterateSeries.addPoint(now, byterate);
	          byterateGraph.setDataSeries([byterateSeries]);
	          byterateGraph.updateEndDate();
	        }
	      }
	    });
	    lastResult = res;
	  });
	}, 1000);
}

/**
 * END BITRATE & PACKETS DISPLAY
 */

/**
 * BEGIN ICE CALLBACK DISPLAY
 */
function iceCallbackDisplay(event) {
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
/**
 * END ICE CALLBACK DISPLAY
 */