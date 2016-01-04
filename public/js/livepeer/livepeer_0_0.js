/*
 * This is a Heavy Metal FrameWork
 * Autor: Rafael Alexandre Piemontez
 * Version: 0.1
 */

(function(){

var LP = this.LP = function() {};
var isTrace = true;
var servers = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
var constraints = {
    video: false,
    audio: true
};
var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 0,
	voiceActivityDetection: false
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
	this.peerConnection		= null;
	this.peerDescription	= null;
	this.localMediaStream	= null;
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
	initRTCPeerConnection: function() {
		trace(this.obj, 'Starting RTCPeerConnection');

		//crossbrowser
		var RTCPeerConnection = window.RTCPeerConnection || 
			window.webkitRTCPeerConnection || 
			window.mozRTCPeerConnection || 
			window.msRTCPeerConnection;
		
		var obj = this.obj;
		obj.peer.peerConnection = new RTCPeerConnection(servers);
		obj.peer.peerConnection.onicecandidate = function(event) {
			obj.peer.peerConnectionIceCallback(event);
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

			this.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate),
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
	
	createAnswer: function(remote) {
		var obj = this.obj;
		trace(obj, 'Creating answer');

		obj.peer.peerConnection.setRemoteDescription(remote.peer.description(), function() {
			/*obj.peer.peerConnection.createAnswer(function (desc) {
				obj.peer.peerDescription = desc;
				obj.peer.peerConnection.setLocalDescription(desc, function() {
					trace(obj, 'Answer created');
					remote.peer.peerConnection.setRemoteDescription(desc);
				}, function(err){
					console.err(err);
				});
			}, function(err){
				console.err(err);
			});*/
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

		//crossbrowser
		navigator.getUserMedia = ( navigator.getUserMedia ||
		        navigator.webkitGetUserMedia ||
		        navigator.mozGetUserMedia ||
		        navigator.msGetUserMedia);

		navigator.getUserMedia(constraints, 
			function(lmStream) {
				obj.peer.microphoneInputCallbackSucesso(lmStream); 
			},
			this.microphoneInputCallbackErro
		);
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
			obj.peer.peerDescription = desc;
			obj.peer.peerConnection.setLocalDescription(desc);
		}, function (err){}, offerOptions);
	},
	
	/*
	 * For Player
	 */
	
	phoneOutput: null,
	initPlayer: function() {
		//audio2.srcObject = e.stream;

		phoneOutput = new AudioContext();
	},
	sendSuccessCallback: function(event) {
		var aa = phoneOutput.createMediaStreamSource(event.stream);
		aa.connect(phoneOutput.destination);				
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
//https://developer.mozilla.org/pt-BR/docs/Web/API/Navigator/getUserMedia
//http://www.html5rocks.com/en/tutorials/webrtc/basics/?redirect_from_locale=pt
//https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/audio/js/main.js#L241
//https://webrtc.github.io/samples/src/content/peerconnection/audio/