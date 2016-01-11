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
	'port'		: '8080',
	'key'		: 'ws',
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

function error(err) {
	console.error(err);
}
function trace(obj, msg) {
	if (isTrace) {
		if (msg === undefined) {
			console.log(obj);
		}
		if (obj.peer instanceof LP.LivePeer) {
			//console.log(obj.peer.type + ':' + msg);
		} else {
			//console.log('undefined type:' + msg);
		}
	}
}
/*
 * Observer
 */

function Observer() {
    this.handlers = [];
};
Observer.prototype = {
    subscribe: function(fn) {
        this.handlers.push(fn);
    },
    unsubscribe: function(fn) {
        this.handlers = this.handlers.filter(
            function(item) {
                if (item !== fn) {
                    return item;
                }
            }
        );
    },
    fire: function(o, thisObj) {
        var scope = thisObj || window;
        this.handlers.forEach(function(item) {
            item.call(scope, o);
        });
    }
};

/*
 * Peer
 */

LP.Peer = function() {
	this.obs = [];
	this._token = null;
	this._description= null;
	this._candidates	= [];
	this.connection	= null;
}
LP.Peer.init = function(token) {
	trace('Starting Peer');

	var peer = new LP.Peer();
	if (token !== undefined) { 
		peer._token = token;
	}

	peer.obs['icecandidate'] = new Observer();
	peer.obs['addstream'] = new Observer();
	peer.obs['setremotedescription'] = new Observer();
	
	peer.on('icecandidate', peer.onicecandidate)
	
	peer.connection = new RTCPeerConnection(servers, pcConstraints);
	peer.connection.onicecandidate = function(event) {
		trace('Peer:onicecandidate');
		peer.obs['icecandidate'].fire(event);
	};
	peer.connection.onaddstream = function(event) {
		trace('Peer:onaddstream');
		peer.obs['addstream'].fire(event);
	};
	
	return peer;
};

LP.Peer.prototype = {

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},
	

	onicecandidate: function(event) 
	{
		this._candidates.push(event);
	},
	
	/*setInputStream: function(lmStream) {
		this.connection.receiveSuccessCallback(lmStream);
	},*/

	description: function() {
		return this._description;
	},

	addStream: function(localStream) {
		this.connection.addStream(localStream);
	},

	setLocalDescription: function(desc)
	{
		this._description = desc;
		var peer = this;
		this.connection.setLocalDescription(desc);
	},
	
	setRemoteDescription: function(sdp) {
		var desc = new RTCSessionDescription(sdp);
		this.connection.setRemoteDescription(desc, function() {
			peer.obs['setremotedescription'].fire();
		}, error);
	},

	candidates: function() {
		return this._candidates;
	},

	addRemoteIceCandidate: function(candidate) {
		this.connection.addIceCandidate(new RTCIceCandidate(candidate),
			function() {
				trace('ICE candidate added');
			}, 
			function () {
				trace('ICE candidate not added');
		});
	},

	token: function() {
		return this._token;
	},

	generateToken: function() {
		return this._token = Math.random();
	}
}

/*
 * Socket
 */

LP.Socket = function() {
	this.obs = [];
	this.websocket = null;
}

LP.Socket.init = function() {
	trace('Starting Socket');

	var socket = new LP.Socket();
	socket.obs['open'] = new Observer();
	socket.obs['close'] = new Observer();
	socket.obs['message'] = new Observer();
	socket.obs['error'] = new Observer();
    
	var websocket = socket.websocket = new WebSocket(socketConstraint.uri());

    websocket.onopen = function(evt) {
    	trace('Socket Open');
    	socket.obs['open'].fire();
    };

    websocket.onclose = function(evt) { 
    	trace('Socket Close');
    	socket.obs['close'].fire();
    };

    websocket.onmessage = function(evt) {
    	trace('Socket Message Receive ' + evt.data);
    	socket.obs['message'].fire(evt.data);
    };
    
    websocket.onerror = function(evt) {
    	trace('Socket Message Error ' + evt.data);
    	socket.obs['error'].fire(evt.data);
    };

	return socket;
}

LP.Socket.prototype = {
	addEventListener: document.addEventListener || document.attachEvent,
	dispatchEvent: document.dispatchEvent,
	fireEvent: document.fireEvent,

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	send: function(func, token, obj) {
		if (obj === undefined) {
			obj = {};
		}
		obj.func = func;
		obj.token = token;
		this.websocket.send(JSON.stringify(obj));		
	},
}
/*
 *  Broadcast
 */

LP.Broadcast = function() {
	this.socket			= null;
	this.localMediaStream	= null;
	this.nodes = [];
}

LP.Broadcast.init = function() {
	var broadcast = new LP.Broadcast();
	broadcast.getUserMedia();

	var socket = broadcast.socket = LP.Socket.init();
	socket.on('open', function() {

	});
	socket.on('message', function(message) {
		message = JSON.parse(message);
		switch(message.func) {
		case 'need_offer':
			var peer = broadcast.createPeer();

			peer.addStream(broadcast.localStream);

			peer.on('createoffer', function(desc) {
				peer.setLocalDescription(desc);
				socket.send('offer', peer.token(), {sdp: peer.description()});
			});
			break;
		case 'answer':
			var peer = this.nodes[message.token];
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				peer.setRemoteDescription(message.sdp);
			} 
			break;
		case 'icecandidates':
			var peer = this.nodes[message.token];
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				if (Array.isArray(message.ices))
				{
					message.ices.forEach(function(ice) {
						peer.addRemoteIceCandidate(ice);
					});
				}
			}
			break;
		case 'need_icecandidate':
			var peer = this.nodes[message.token];
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				socket.send(JSON.stringify({
					func: 'icecandidates',
					token: peer.token(),
					ice: peer.candidates()
				}));
			}
		break;
		};
		return;
	});

	return broadcast;
}

LP.Broadcast.prototype = {

	createPeer: function() {
		var newPeer = LP.Peer.init();
		return this.nodes[ newPeer.generateToken() ] = newPeer;
	},

	getUserMedia: function() {
		trace('Get UserMedia');

		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(lmStream) {
			trace('UserMedia received');
			this.localMediaStream = lmStream;
			//TODO set Nodes stream 
		}).catch(error);
	},

	setOpusCodec: function() {
		
	},
}


/*
 * Player  
 */

// Class for Radio and Player
// Distinct for parameter in constructor
LP.Player = function(obj, type) {
	this.socket	= null;
	this.node	= null; 
}

LP.Player.init = function(obj, type) {
	var player	= new LP.Player();
 
	var socket	= player.socket	= LP.Socket.init();
	socket.on('open', function() {
		socket.send('need_offer');
	});
	socket.on('message', function(message) {

		message = JSON.parse(message);
		switch(message.func) {
		case 'offer':
			
			player.node	= LP.Peer.init(message.token);
			//TODO: remover vinculo com websocket
			player.node.connection.onaddstream = function(event) {
				console.log('on:addstream');
				player.onAddStreamCallback(event);
			};
			player.node.on('setremotedescription', function() {
				console.log('on:setremotedescription');
				//TODO: remover vinculo com websocket
				player.node.connection.createAnswer(function (desc) {
					player.node.setLocalDescription(desc);
					socket.send.send(JSON.stringify({
						token: player.node.token(),
						func: 'answer',
						sdp: player.node.description()
					}));
					socket.send.send(JSON.stringify({
						token: player.node.token(),
						func: 'need_icecandidates'
					}));
				}, error);
			});
			player.node.setRemoteDescription(message.sdp);
			break;
		case 'icecandidates':
			if (player.node.token() == message.token)
			{
				if (Array.isArray(message.ices))
				{
					message.ices.forEach(function(ice) {
						player.node.addRemoteIceCandidate(ice);
					});
					socket.send(JSON.stringify({
						func: 'icecandidates',
						token: player.node.token(),
						ice: peer.candidates()
					}));
				}
			}
			break;
		};
		return;
	});

	return player;
}

LP.Player.prototype = {

	onmessage: function (obj, evt) {
		var message = JSON.parse(evt.data);

		switch(message.func) {
			case 'offer':
				if (obj.peer.type == 'player')
				{
					var desc = new RTCSessionDescription(message.sdp);
					obj.peer.peerConnection.setRemoteDescription(desc, function() {
						obj.peer.peerConnection.createAnswer(function (desc) {
							obj.peer.peerDescription = desc;
							obj.peer.peerConnection.setLocalDescription(desc, function() {
								trace(obj, 'Answer created\n' + desc.sdp);
								obj.peer.websocket.send(JSON.stringify({
									targetUser: obj.peer.type,
									func: 'answer',
									sdp: obj.peer.description()
								}));
							}, function(err){
								console.err(err);
							});
						}, function(err){
							console.err(err);
						});
					}, function(err){
							console.err(err);
					});
				}
		};
		return;
	},

	onAddStreamCallback: function(event) {
		trace('Stream added'+ event);
		this.obj.peer.sendSuccessCallback(event);
	},
	
	setOpusCodec: function() {
		
	},

	sendSuccessCallback: function(event) {
		//audio2.srcObject = e.stream;
		//phoneOutput = new AudioContext();

		//var aa = phoneOutput.createMediaStreamSource(event.stream);
		//aa.connect(phoneOutput.destination);
		var audio2 = document.querySelector('audio#audio2');
		  audio2.srcObject = event.stream;
		  
		  
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

		/************************************/
		//var socket = LP.Broadcast.init();
		
		/************************************/
		if (type !== undefined) {
			this.type = type;
		} else {
			throw new Error( "type not defined" );
		}
		obj.peer.initRTCPeerConnection();

		obj.peer.initWebSockect();

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

		this.websocket = new WebSocket(socketConstraint.uri());
	    var websocket = this.websocket;

	    websocket.onopen = function(evt) {
	    	trace(obj, 'Web Sockect opened');
	    	if (obj.peer.type == 'player') {
				websocket.send(JSON.stringify({
					targetUser: obj.peer.type,
					func: 'need_offer'
				}));
	    	}
	    };
	    websocket.onclose = function(evt) { 
	    	trace(obj, 'Web Sockect closed');
	    };
	    websocket.onmessage = function(evt) {
	    	trace(obj, 'Web Sockect Message receive ' + evt.data);
	    	obj.peer.onmessage(obj, evt);
	    };
	    websocket.onerror = function(evt) {
	    	trace(obj, 'Web Sockect erro ' + evt);
	    };
	},

	onmessage: function (obj, evt) {
		var message = JSON.parse(evt.data);

		switch(message.func) {
			case 'need_offer':
				if (obj.peer.type == 'radio')
				{
					obj.peer.websocket.send(JSON.stringify({
						targetUser: obj.peer.type,
						func: 'offer',
						sdp: obj.peer.description()
					}));
				}
				break;
			case 'offer':
				if (obj.peer.type == 'player')
				{
					var desc = new RTCSessionDescription(message.sdp);
					obj.peer.peerConnection.setRemoteDescription(desc, function() {
						obj.peer.peerConnection.createAnswer(function (desc) {
							obj.peer.peerDescription = desc;
							obj.peer.peerConnection.setLocalDescription(desc, function() {
								trace(obj, 'Answer created\n' + desc.sdp);
								obj.peer.websocket.send(JSON.stringify({
									targetUser: obj.peer.type,
									func: 'answer',
									sdp: obj.peer.description()
								}));
							}, function(err){
								console.err(err);
							});
						}, function(err){
							console.err(err);
						});
					}, function(err){
							console.err(err);
					});
				}
			case 'answer':
				if (obj.peer.type == 'radio')
				{
					var desc = new RTCSessionDescription(message.sdp);
					obj.peer.peerConnection.setRemoteDescription(desc);

				}
				break;
			case 'icecandidate':
				obj.peer.peerConnection.addIceCandidate(new RTCIceCandidate(message.ice),
					function() {
						trace(obj, 'ICE candidate added');
					}, 
					function () {
						trace(obj, 'ICE candidate not added');
				});
				break;
		};
		return;
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
			
			obj.peer.peerConnectionIceCallback(obj, event);
			for (callBack in obj.peer.iceCallbacks) {
				obj.peer.iceCallbacks[callBack](event);
			}
		};
		obj.peer.peerConnection.onaddstream = function(event) { 
			obj.peer.peerConnectionStreamCallback(event);
		};
	},

	peerConnectionIceCallback: function(obj, event) {
		trace(obj, 'Adding ICE candidate');

		if (event.candidate) {
			trace(obj, 'ICE candidate' + event.candidate.candidate);
			
			obj.peer.websocket.send(JSON.stringify({
				targetUser: obj.peer.type,
				func: 'icecandidate',
				ice: event.candidate
			}));
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