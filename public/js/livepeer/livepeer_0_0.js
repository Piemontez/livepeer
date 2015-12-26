/*
 * This is a Heavy Metal FrameWork
 * Autor: Rafael Alexandre Piemontez
 * Version: 0.1
 */

(function(){

var LP = this.LP = function() {};
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

/*
 * LivePeer  
 */
LivePeer = this.LivePeer = function(obj, type) {
	return LP.LivePeer.init(obj, type);	
}

// Class for Radio and Player
// Distinct for parameter in constructor
LP.LivePeer = {
	obj: null,
	type: "",
	peerConnection: null,
	peerDescription: null,
	localMediaStream: null,

	init: function(obj, type) {
		if (typeof obj !== "object") return;
		this.obj = obj;
		
		if (obj._lpStarted === undefined) {
			obj._lpStarted = true;
			obj.peer = this;

			if (type !== undefined) {
				this.type = type;
			}
			this.initRTCPeerConnection();

			if (this.type == "radio") {
				this.initRadio();
			}
			else if (this.type == "player") {
				this.initPlayer();
			}
		}
		return obj.peer;
	},
	
	initRTCPeerConnection: function() {
		console.log(this.obj.peer.type +':Init RTCPeerConnection');

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
		obj.peer.peerConnection.onaddstream = function() { 
			obj.peer.peerConnectionStreamCallback();
		};
	},

	peerConnectionIceCallback: function(event) {
		var obj = this.obj;
		console.log(obj.peer.type +':Adding ICE candidate');

		if (event.candidate) {
			console.log(obj.peer.type +':ICE candidate' + event.candidate.candidate);

			this.peerConnection.addIceCandidate(new RTCIceCandidate(event.candidate), function() {
				console.log(obj.peer.type +':AddIceCandidate success');
			});
		}
	},
	
	peerConnectionStreamCallback: function() {
		console.log(this.obj.peer.type +':On add stream');
		
	},
	
	createAnswer: function(remote) {
		var obj = this.obj;
		console.log(obj.peer.type +':Create Answer');

		obj.peer.peerConnection.setRemoteDescription(remote.peer.description(), function() {
			obj.peer.peerConnection.createAnswer(function (desc) {
				obj.peer.peerDescription = desc;
				obj.peer.peerConnection.setLocalDescription(desc, function() {
					remote.peer.peerConnection.setRemoteDescription(desc);
				}, function(err){});
			}, function(err){});
		}, function(err){});
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
		//crossbrowser
		navigator.getUserMedia = ( navigator.getUserMedia ||
		        navigator.webkitGetUserMedia ||
		        navigator.mozGetUserMedia ||
		        navigator.msGetUserMedia);

		var obj = this.obj;
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
		console.log(obj.peer.type +':Adding Local Stream to peer connection');

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
		/*var audioContext = new AudioContext();
		microphoneInput = audioContext.createMediaStreamSource(localMediaStream);
		microphoneInput.connect(audioContext.destination);*/		
	},
	sendSuccessCallback: function(stream) {
		
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

var radio = {};
var player = {};

LivePeer(radio, "radio");


setTimeout(function() {
	LivePeer(player, "player").createAnswer(radio);
}, 2000);
