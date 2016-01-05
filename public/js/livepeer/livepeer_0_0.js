/*
 * This is a Heavy Metal FrameWork
 * Autor: Rafael Alexandre Piemontez
 * Version: 0.1
 */

/**
 * This Library Required adapter.js for crossbrowser solution
 * Download adapter.js in https://github.com/webrtc/adapter 
 */

(function(){

var LP = this.LP = function() {};
var isTrace = true;
var socketConstraint = {
	'securite'	: 'ws',
	'host'		: 'localhost',
	'port'		: '9998',
	'key'		: 'livepeertracker',
	uri: function() {
		return this.securite + '://' + this.host + ':' + this.port + '/' + this.key;
	}
}

var servers = {
	"iceServers": [
		{"url": "stun:stun.l.google.com:19302"}
	]
};
var pcConstraints = {
	'optional': []
};
var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 0,
	voiceActivityDetection: false
};
var mediaConstraints = {
	video: false,
	audio: true
};

function trace(obj, msg) {
	if (isTrace) {
		if (obj.peer instanceof LP.LivePeer) {
			console.log(obj.peer.type + ':' + msg);
		} else {
			console.log('undefined type:' + msg);
		}
	}
}

/*
 * LivePeer  
 */
LivePeer = this.LivePeer = function(obj, type) {
	return LP.LivePeer.init(obj, type);	
}

// Class for Radio and Player
// Distinct for parameter in constructor
LP.LivePeer = function(obj, type) {
	this.obj 				= obj;
	this.type				= type;
	this.websocket			= null;
	this.peerConnection		= null;
	this.peerDescription	= null;
	this.localMediaStream	= null;
	this.iceCallbacks		= [];
}

LP.LivePeer.init = function(obj, type) {
	if (typeof obj !== "object") return;
	
	if (obj._lpStarted === undefined) {
		obj._lpStarted = true;
		obj.peer = new LP.LivePeer(obj, type);

		trace(obj, 'Starting LivePeer');

		if (type !== undefined) {
			this.type = type;
		} else {
			throw new Error( "type not defined" );
		}
		obj.peer.initWebSockect();

		obj.peer.initRTCPeerConnection();

		if (this.type == "radio") {
			obj.peer.initRadio();
		}
		else if (this.type == "player") {
			obj.peer.initPlayer();
		}

		trace(obj, 'LivePeer started');
	}
	return obj.peer;
}

LP.LivePeer.prototype = {

	/*
	 * Web Sockect 
	 */
	initWebSockect: function() {
		trace(this.obj, 'Starting Web Sockect');

		var obj = this.obj;

	    websocket = new WebSocket(socketConstraint.uri());
	    websocket.onopen = function(evt) {
	    	trace(obj, 'Web Sockect opened');
	    };
	    websocket.onclose = function(evt) { 
	    	trace(obj, 'Web Sockect closed');
	    };
	    websocket.onmessage = function(evt) {
	    	trace(obj, 'Web Sockect Message receive ' + evt);
	    	obj.peer.onmessage(evt);
	    };
	    websocket.onerror = function(evt) {
	    	trace(obj, 'Web Sockect erro ' + evt);
	    };
	},

	onmessage: function (evt) {
		if (!pc)
		    start();
		
		var message = JSON.parse(evt.data);
		if (message.sdp) {
		    var desc = new RTCSessionDescription(message.sdp);
		
		    // if we get an offer, we need to reply with an answer
		    if (desc.type == "offer") {
		        pc.setRemoteDescription(desc).then(function () {
		            return pc.createAnswer();
		        })
		        .then(function (answer) {
		            return pc.setLocalDescription(answer);
		        })
		        .then(function () {
		            signalingChannel.send(JSON.stringify({ "sdp": pc.localDescription }));
		        })
		        .catch(logError);
		    } else
		        pc.setRemoteDescription(desc).catch(logError);
		} else
		    pc.addIceCandidate(new RTCIceCandidate(message.candidate)).catch(logError);
	},
		
	/*
	 * Web RTC Peer Connection
	 */
	addOnIceCallback: function(func) {
		this.obj.peer.iceCallbacks.push(func);
	},
	
	initRTCPeerConnection: function() {
		trace(this.obj, 'Starting RTCPeerConnection');

		var obj = this.obj;
		obj.peer.peerConnection = new RTCPeerConnection(servers, pcConstraints);
		obj.peer.peerConnection.onicecandidate = function(event) {
			
			obj.peer.peerConnectionIceCallback(event);
			for (callBack in obj.peer.iceCallbacks) {
				obj.peer.iceCallbacks[callBack](event);
			}
		};
		obj.peer.peerConnection.onaddstream = function(event) { 
			obj.peer.peerConnectionStreamCallback(event);
		};
	},

	peerConnectionIceCallback: function(event) {
		var obj = this.obj;
		trace(obj, 'Adding ICE candidate');

		if (event.candidate) {
			trace(obj, 'ICE candidate' + event.candidate.candidate);

			//TODO
			obj.remote.peer.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate),
				function() {
					trace(obj, 'ICE candidate added');
				}, 
				function () {
					trace(obj, 'ICE candidate not added');
			});
		}
	},
	
	peerConnectionStreamCallback: function(event) {
		trace(this.obj, 'Stream added'+ event);
		this.obj.peer.sendSuccessCallback(event);
	},
	
	setRemote: function(remote) {
		this.obj.remote = remote;
		this;
	},
	
	createAnswer: function(remote) {
		var obj = this.obj;
		trace(obj, 'Creating answer');

		obj.peer.peerConnection.setRemoteDescription(remote.peer.description(), function() {
			obj.peer.peerConnection.createAnswer(function (desc) {
				
				obj.peer.peerDescription = desc;
				obj.peer.peerConnection.setLocalDescription(desc, function() {
					trace(obj, 'Answer created\n' + desc.sdp);

					remote.peer.peerConnection.setRemoteDescription(desc, function() {});
				}, function(err){
					console.err(err);
				});
			}, function(err){
				console.err(err);
			});
		}, function(err){
			console.err(err);
		});
	},
	
	description: function() {
		return this.obj.peer.peerDescription;
	},

	setOpusCodec: function() {
		
	},

	/*
	 * For Radio
	 */	
	microphoneInput: null,
	nodesForSend: null,

	initRadio: function() {
		var obj = this.obj; 
		obj.peer.getUserMedia();
	},
	
	getUserMedia: function() {
		var obj = this.obj;
		trace(obj, 'Get user media');

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then( 
		function(lmStream) {
			obj.peer.microphoneInputCallbackSucesso(lmStream); 
		})
		.catch(this.microphoneInputCallbackErro);
	},

	microphoneInputCallbackSucesso: function(lmStream) {
		localMediaStream = lmStream;
		this.receiveSuccessCallback(lmStream);
	},

	microphoneInputCallbackErro: function(err) {
		console.err(err);
	},

	receiveSuccessCallback: function(localStream) {
		var obj = this.obj;
		
		trace(obj, 'Adding Local Stream to peer connection');
		obj.peer.peerConnection.addStream(localStream);

		obj.peer.peerConnection.createOffer(function(desc) {

				trace(obj, 'Create Offer for peer connection\n' + desc.sdp);
				obj.peer.peerDescription = desc;
				obj.peer.peerConnection.setLocalDescription(desc);
			}, 
			function (err) {
				console.err(err);
			}, 
			offerOptions
		);
	},
	
	/*
	 * For Player
	 */
	
	phoneOutput: null,
	initPlayer: function() {
		//audio2.srcObject = e.stream;

		//phoneOutput = new AudioContext();
	},
	sendSuccessCallback: function(event) {
		//var aa = phoneOutput.createMediaStreamSource(event.stream);
		//aa.connect(phoneOutput.destination);
		var audio2 = document.querySelector('audio#audio2');
		  audio2.srcObject = event.stream;
		  
		  
	}
	
}
/*
 * Live Peer Interceptor
 */	
var
LPI = this.LPI = function(obj) {
	return LP.I.init(obj);	
};

LP.I = LP.prototype = {
	type: "peer",
	init: function(obj) {
		if (typeof obj !== "object") return;
		
		if (obj._peerStarted === undefined) {
			throw new Error( "Peer not started" );
		}
		
		if (obj._lpiStarted === undefined) {
			obj._lpiStarted = true;
			obj.peer += this;
		}
		return obj.peer;
	}
};

/*
 * Live Peer Tracker
 */
var
LPT = this.LPT = function(obj) {
	return LP.T.init(obj);	
};
LP.T = LP.prototype = {
	init: function(obj) {
		if (typeof obj !== "object") return;

		if (obj._lptStarted === undefined) {
			obj._lptStarted = true;
		}
		return this;

	}
};

})()

//Exemplos
//https://www.webrtc-experiment.com/docs/how-to-switch-streams.html
//https://developer.mozilla.org/pt-BR/docs/Web/API/Navigator/getUserMedia
//http://www.html5rocks.com/en/tutorials/webrtc/basics/?redirect_from_locale=pt
//https://webrtc.github.io/samples/src/content/peerconnection/audio/
//https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/audio/js/main.js#L241